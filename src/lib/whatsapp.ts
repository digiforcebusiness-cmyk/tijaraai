/**
 * WhatsApp Session Manager — Baileys-based
 *
 * All Baileys imports are DYNAMIC to avoid Next.js ESM bundling errors.
 * Baileys is ESM-only; static top-level imports break Next.js's webpack bundler.
 */

import type { WASocket, proto } from "baileys";
import qrcode from "qrcode";
import { prisma } from "./prisma";
import { generateReply } from "./claude";
import { pushOrderToPlatform } from "./integrations";

// In-process registry — survives hot-reload via global ref
const g = globalThis as typeof globalThis & {
  _waSessions?: Map<string, { socket: WASocket }>;
};
if (!g._waSessions) g._waSessions = new Map();
const activeSessions = g._waSessions;

// ─── Callbacks ────────────────────────────────────────────────────────────────

type QrCallback = (qr: string) => void;
type StatusCallback = (status: string) => void;

const qrCallbacks = new Map<string, QrCallback>();
const statusCallbacks = new Map<string, StatusCallback>();

export function onQrCode(sessionId: string, cb: QrCallback) {
  qrCallbacks.set(sessionId, cb);
}
export function onStatusChange(sessionId: string, cb: StatusCallback) {
  statusCallbacks.set(sessionId, cb);
}

// ─── Create / Reconnect ───────────────────────────────────────────────────────

export async function createSession(sessionId: string): Promise<void> {
  // Dynamic import — keeps Baileys out of the webpack bundle
  const {
    default: makeWASocket,
    DisconnectReason,
    fetchLatestBaileysVersion,
  } = await import("baileys");

  const { default: pino } = await import("pino");
  const logger = pino({ level: "silent" });

  const { useSupabaseAuthState } = await import("./whatsapp-auth-state");
  const { state, saveCreds } = await useSupabaseAuthState(sessionId);
  const { version } = await fetchLatestBaileysVersion();

  const socket = makeWASocket({
    version,
    auth: state,
    logger,
    printQRInTerminal: false,
    generateHighQualityLinkPreview: false,
  });

  activeSessions.set(sessionId, { socket });

  // ── Connection events ──────────────────────────────────────────────────────

  socket.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      try {
        const qrDataUrl = await qrcode.toDataURL(qr);
        await prisma.whatsAppSession.update({
          where: { id: sessionId },
          data: { qrCode: qrDataUrl, status: "QR_PENDING" },
        });
        qrCallbacks.get(sessionId)?.(qrDataUrl);
        statusCallbacks.get(sessionId)?.("QR_PENDING");
      } catch (e) {
        console.error("[whatsapp] QR update error:", e);
      }
    }

    if (connection === "open") {
      const phoneNumber =
        socket.user?.id?.replace(/:.*@/, "@").split("@")[0] ?? null;
      await prisma.whatsAppSession.update({
        where: { id: sessionId },
        data: { status: "CONNECTED", qrCode: null, phoneNumber },
      }).catch(console.error);
      statusCallbacks.get(sessionId)?.("CONNECTED");
    }

    if (connection === "close") {
      const { Boom } = await import("@hapi/boom");
      const err = lastDisconnect?.error;
      const statusCode = (err instanceof Boom) ? err.output.statusCode : 0;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

      await prisma.whatsAppSession.update({
        where: { id: sessionId },
        data: { status: shouldReconnect ? "DISCONNECTED" : "LOGGED_OUT" },
      }).catch(console.error);

      statusCallbacks.get(sessionId)?.(
        shouldReconnect ? "DISCONNECTED" : "LOGGED_OUT"
      );
      activeSessions.delete(sessionId);

      if (shouldReconnect) {
        setTimeout(() => createSession(sessionId), 4_000);
      }
    }
  });

  socket.ev.on("creds.update", saveCreds);

  socket.ev.on("messages.upsert", async ({ messages: msgs, type }) => {
    if (type !== "notify") return;
    for (const msg of msgs) {
      await handleIncomingMessage(sessionId, socket, msg).catch(console.error);
    }
  });
}

// ─── Handle Incoming Message ──────────────────────────────────────────────────

async function handleIncomingMessage(
  sessionId: string,
  socket: WASocket,
  msg: proto.IWebMessageInfo
): Promise<void> {
  if (!msg.message || msg.key.fromMe) return;

  const jid = msg.key.remoteJid;
  if (!jid || jid.endsWith("@g.us")) return;

  const body =
    msg.message.conversation ??
    msg.message.extendedTextMessage?.text ??
    "";

  if (!body.trim()) return;

  const session = await prisma.whatsAppSession.findUnique({
    where: { id: sessionId },
  });
  if (!session) return;

  const rawPhone = jid.split("@")[0].split(":")[0]; // strip device suffix (e.g. "212612345678:5" → "212612345678")
  // Cap to 15 digits max (ITU-T E.164) — take first 15 to preserve country code
  const phoneNumber = rawPhone.length > 15 ? rawPhone.slice(0, 15) : rawPhone;
  // pushName = WhatsApp display name sent by the device (e.g. "Ahmed Benali")
  // Ignore if it looks like a phone number (digits only) or is a generic placeholder
  const rawPushName = (msg.pushName ?? "").trim();
  const pushName = rawPushName && !/^\+?[\d\s\-().]+$/.test(rawPushName) ? rawPushName : null;

  const contact = await prisma.contact.upsert({
    where: { sessionId_jid: { sessionId, jid } },
    create: {
      userId: session.userId,
      sessionId,
      jid,
      phoneNumber,
      name: pushName,
      lastMessageAt: new Date(),
      totalMessages: 1,
    },
    update: {
      lastMessageAt: new Date(),
      totalMessages: { increment: 1 },
      // Only set name from WhatsApp pushName if no real name is stored yet
      // (avoids overwriting manually-set or WooCommerce-imported names)
    },
  });

  // Backfill name from pushName if the contact has no name or has a store placeholder
  if (pushName && (!contact.name || /customer$/i.test(contact.name))) {
    await prisma.contact.update({
      where: { id: contact.id },
      data: { name: pushName },
    }).catch(() => null);
  }

  await prisma.message.create({
    data: {
      sessionId,
      contactId: contact.id,
      waMessageId: msg.key.id ?? undefined,
      direction: "INBOUND",
      type: "TEXT",
      body,
      status: "DELIVERED",
      metadata: JSON.parse(JSON.stringify(msg)),
    },
  });

  if (session.aiEnabled) {
    try {
      const recentMessages = await prisma.message.findMany({
        where: { sessionId, contactId: contact.id },
        orderBy: { timestamp: "desc" },
        take: 20,
      });

      const history = recentMessages
        .reverse()
        .slice(0, -1)
        .map((m) => ({
          role: m.direction === "INBOUND" ? ("user" as const) : ("assistant" as const),
          content: m.body,
        }));

      const productCatalog = await buildProductCatalog(session.userId);

      const reply = await generateReply({
        history,
        incomingMessage: body,
        customSystemPrompt: session.aiPrompt ?? undefined,
        contactName: contact.name ?? undefined,
        productCatalog,
      });

      // Send the reply back via WhatsApp
      await socket.sendMessage(jid, { text: reply.text });

      // Save outbound AI message
      await prisma.message.create({
        data: {
          sessionId,
          contactId: contact.id,
          direction: "OUTBOUND",
          type: "TEXT",
          body: reply.text,
          status: "SENT",
          isAiReply: true,
        },
      });

      // ── Post-reply actions based on detected intent ──────────────────────

      // Tag contact as lead
      if (reply.intent === "lead" || reply.intent === "order") {
        await prisma.contact.update({
          where: { id: contact.id },
          data: {
            isLead: true,
            ...(reply.leadInfo?.name && !contact.name ? { name: reply.leadInfo.name } : {}),
          },
        }).catch(console.error);
      }

      // Auto-create/update order when AI detected purchase intent with items
      if (reply.intent === "order" && reply.orderItems?.length) {
        const validItems = reply.orderItems.filter((i) => i.name && i.qty > 0);
        if (validItems.length) {
          const totalAmount = validItems.reduce((sum, i) => sum + i.price * i.qty, 0);
          const note = `Auto-created from WhatsApp.\nMessage: "${body.slice(0, 200)}"`;

          // Find all contacts with same phone (WooCommerce import may create a separate record)
          const last9 = contact.phoneNumber.replace(/\D/g, "").slice(-9);
          const samePhoneContacts = await prisma.contact.findMany({
            where: { userId: session.userId, phoneNumber: { endsWith: last9 } },
            select: { id: true },
          }).catch(() => [{ id: contact.id }]);
          const contactIds = samePhoneContacts.map((c) => c.id);

          // Check for existing PENDING order within 24h to avoid duplicates
          const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
          const recentOrder = await prisma.order.findFirst({
            where: {
              contactId: { in: contactIds },
              status: "PENDING",
              createdAt: { gte: oneDayAgo },
            },
            orderBy: { createdAt: "desc" },
          }).catch(() => null);

          if (recentOrder) {
            await prisma.order.update({
              where: { id: recentOrder.id },
              data: { items: validItems as never, totalAmount: totalAmount || 0, notes: note },
            }).catch(console.error);
          } else {
            const platformResult = await pushOrderToPlatform(session.userId, {
              items: validItems,
              customerName: contact.name ?? undefined,
              customerPhone: contact.phoneNumber,
              note,
            }).catch(() => null);

            await prisma.order.create({
              data: {
                userId: session.userId,
                contactId: contact.id,
                items: validItems as never,
                totalAmount: totalAmount || 0,
                currency: "MAD",
                status: "PENDING",
                notes: note,
                ...(platformResult ? {
                  platform: platformResult.platform,
                  externalOrderId: platformResult.externalOrderId,
                  externalOrderUrl: platformResult.externalOrderUrl,
                } : {}),
              },
            }).catch(console.error);
          }
        }
      }
    } catch (err) {
      console.error("[auto-reply] Failed for", jid, ":", (err as Error).message);
    }
  }
}

// ─── Send Message ─────────────────────────────────────────────────────────────

export async function sendMessage(
  sessionId: string,
  jid: string,
  text: string
): Promise<void> {
  const entry = activeSessions.get(sessionId);
  if (!entry) throw new Error(`Session ${sessionId} is not active. Connect it first.`);
  await entry.socket.sendMessage(jid, { text });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getSessionStatus(sessionId: string): "active" | "inactive" {
  return activeSessions.has(sessionId) ? "active" : "inactive";
}

export async function disconnectSession(sessionId: string): Promise<void> {
  const entry = activeSessions.get(sessionId);
  if (!entry) return;
  await entry.socket.logout().catch(() => {});
  activeSessions.delete(sessionId);
}

// ─── Product catalog for AI (cached 5 min per user) ─────────────────────────

const _catalogCache = new Map<string, { value: string | undefined; expiresAt: number }>();

async function buildProductCatalog(userId: string): Promise<string | undefined> {
  const now = Date.now();
  const hit = _catalogCache.get(userId);
  if (hit && hit.expiresAt > now) return hit.value;

  try {
    const products = await prisma.product.findMany({
      where: { userId, isActive: true },
      orderBy: { name: "asc" },
      take: 80,
      select: { name: true, price: true, sku: true, stock: true, description: true },
    });

    const value = products.length ? products.map((p) => {
      const stockInfo = p.stock !== null ? (p.stock > 0 ? `${p.stock} in stock` : "out of stock") : "";
      const parts: string[] = [String(p.price)];
      if (p.sku) parts.push(`SKU: ${p.sku}`);
      if (stockInfo) parts.push(stockInfo);
      const desc = p.description ? ` — ${p.description.slice(0, 80)}` : "";
      return `• ${p.name} (${parts.join(" | ")})${desc}`;
    }).join("\n") : undefined;

    _catalogCache.set(userId, { value, expiresAt: now + 5 * 60 * 1000 });
    return value;
  } catch {
    return undefined;
  }
}
