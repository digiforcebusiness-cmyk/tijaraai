import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fetchWooOrders, type WooRemoteOrder } from "@/lib/integrations/woocommerce";
import { fetchShopifyOrders, type ShopifyRemoteOrder } from "@/lib/integrations/shopify";
import { fetchYouCanOrders, mapYouCanStatus } from "@/lib/integrations/youcan";
import { fetchLFOrders, mapLFStatus } from "@/lib/integrations/lightfunnels";
import { runFlowsForOrder } from "@/lib/flow-executor";

// ─── Status maps ──────────────────────────────────────────────────────────────

const WOO_STATUS: Record<string, string> = {
  pending:    "PENDING",
  processing: "CONFIRMED",
  "on-hold":  "PROCESSING",
  completed:  "DELIVERED",
  cancelled:  "CANCELLED",
  refunded:   "REFUNDED",
  failed:     "CANCELLED",
};

const SHOPIFY_STATUS: Record<string, string> = {
  pending:    "PENDING",
  authorized: "CONFIRMED",
  paid:       "CONFIRMED",
  partially_paid: "CONFIRMED",
  voided:     "CANCELLED",
  refunded:   "REFUNDED",
  partially_refunded: "REFUNDED",
};

// ─── Shared: find or create contact ──────────────────────────────────────────

async function upsertContact(
  userId: string,
  phone: string,
  name: string
) {
  // Normalize to digits only, cap to 15 (ITU-T E.164 max), keep international number
  const rawDigits = phone.replace(/\D/g, "");
  const digits = rawDigits.length > 15 ? rawDigits.slice(0, 15) : rawDigits;
  const last9 = digits.slice(-9);

  if (last9.length === 9) {
    // Match any existing contact by last 9 digits of phone
    const existing = await prisma.contact.findFirst({
      where: { userId, phoneNumber: { endsWith: last9 } },
    });
    if (existing) {
      // Fill in name only if missing or placeholder
      const isPlaceholder = !existing.name || /customer$/i.test(existing.name);
      if (isPlaceholder && name && !/customer$/i.test(name)) {
        await prisma.contact.update({ where: { id: existing.id }, data: { name } });
      }
      return existing;
    }
  }

  // No existing contact — create one on the user's CONNECTED session (same session WhatsApp will use)
  const waSession = await prisma.whatsAppSession.findFirst({
    where: { userId, status: { in: ["CONNECTED", "CONNECTING"] } },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  }) ?? await prisma.whatsAppSession.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  if (!waSession) return null;

  // JID must match exactly what Baileys produces so the upsert in handleIncomingMessage merges correctly
  const jid = digits ? `${digits}@s.whatsapp.net` : `import_${Date.now()}@s.whatsapp.net`;
  const phoneNumber = digits || rawDigits || jid;

  return prisma.contact.upsert({
    where: { sessionId_jid: { sessionId: waSession.id, jid } },
    create: { userId, sessionId: waSession.id, jid, phoneNumber, name },
    update: name && !/customer$/i.test(name) ? { name } : {},
  });
}

// ─── WooCommerce import ───────────────────────────────────────────────────────

async function importWoo(
  userId: string,
  creds: { siteUrl: string; consumerKey: string; consumerSecret: string },
  storeUrl: string
): Promise<{ created: number; skipped: number; updated: number }> {
  let created = 0, skipped = 0, updated = 0;
  let page = 1;

  while (true) {
    const orders: WooRemoteOrder[] = await fetchWooOrders(creds, page, 100);
    if (!orders.length) break;

    for (const wo of orders) {
      const extId = String(wo.id);
      const ourStatus = WOO_STATUS[wo.status] ?? "PENDING";
      const phone = (wo.billing?.phone ?? "").replace(/\D/g, "");
      const customerName = [wo.billing?.first_name, wo.billing?.last_name].filter(Boolean).join(" ") || "WooCommerce Customer";
      const items = (wo.line_items ?? []).map((li) => ({
        name: li.name,
        qty: li.quantity,
        price: parseFloat(li.price) || (parseFloat(li.total) / (li.quantity || 1)) || 0,
      }));
      const totalAmount = parseFloat(wo.total) || 0;
      const externalOrderUrl = `${storeUrl}/wp-admin/post.php?post=${wo.id}&action=edit`;

      // Check existing
      const existing = await prisma.order.findFirst({
        where: { userId, externalOrderId: extId, platform: "WOOCOMMERCE" },
      });

      if (existing) {
        // Update status if changed
        if (existing.status !== ourStatus) {
          await prisma.order.update({
            where: { id: existing.id },
            data: { status: ourStatus as never },
          });
          updated++;
        } else {
          skipped++;
        }
        continue;
      }

      const contact = await upsertContact(userId, phone, customerName);
      if (!contact) { skipped++; continue; }

      const newWooOrder = await prisma.order.create({
        data: {
          userId,
          contactId: contact.id,
          items,
          totalAmount,
          currency: wo.currency || "MAD",
          status: ourStatus as never,
          notes: wo.customer_note || `Imported from WooCommerce #${wo.number}`,
          platform: "WOOCOMMERCE",
          externalOrderId: extId,
          externalOrderUrl,
        },
      });
      runFlowsForOrder(userId, newWooOrder.id, "WOOCOMMERCE").catch(console.error);
      created++;
    }

    if (orders.length < 100) break;
    page++;
  }

  return { created, skipped, updated };
}

// ─── Shopify import ───────────────────────────────────────────────────────────

async function importShopify(
  userId: string,
  creds: { shopDomain: string; accessToken: string }
): Promise<{ created: number; skipped: number; updated: number }> {
  let created = 0, skipped = 0, updated = 0;
  let pageInfo: string | null = null;
  let isFirst = true;

  while (true) {
    const { orders, nextPageInfo } = await fetchShopifyOrders(creds, 250, isFirst ? undefined : (pageInfo ?? undefined));
    isFirst = false;
    if (!orders.length) break;

    for (const so of orders) {
      const extId = String(so.id);
      const ourStatus = SHOPIFY_STATUS[so.financial_status] ?? "PENDING";
      const phone = (so.customer?.phone ?? so.billing_address?.phone ?? "").replace(/\D/g, "");
      const customerName = [so.customer?.first_name ?? so.billing_address?.first_name, so.customer?.last_name ?? so.billing_address?.last_name].filter(Boolean).join(" ") || "Shopify Customer";
      const items = so.line_items.map((li) => ({
        name: li.title,
        qty: li.quantity,
        price: parseFloat(li.price) || 0,
      }));
      const totalAmount = parseFloat(so.total_price) || 0;
      const externalOrderUrl = `https://${creds.shopDomain}/admin/orders/${so.id}`;

      const existing = await prisma.order.findFirst({
        where: { userId, externalOrderId: extId, platform: "SHOPIFY" },
      });

      if (existing) {
        if (existing.status !== ourStatus) {
          await prisma.order.update({ where: { id: existing.id }, data: { status: ourStatus as never } });
          updated++;
        } else {
          skipped++;
        }
        continue;
      }

      const contact = await upsertContact(userId, phone, customerName);
      if (!contact) { skipped++; continue; }

      const newShopifyOrder = await prisma.order.create({
        data: {
          userId,
          contactId: contact.id,
          items,
          totalAmount,
          currency: so.currency || "MAD",
          status: ourStatus as never,
          notes: so.note || `Imported from Shopify ${so.name}`,
          platform: "SHOPIFY",
          externalOrderId: extId,
          externalOrderUrl,
        },
      });
      runFlowsForOrder(userId, newShopifyOrder.id, "SHOPIFY").catch(console.error);
      created++;
    }

    if (!nextPageInfo) break;
    pageInfo = nextPageInfo;
  }

  return { created, skipped, updated };
}

// ─── YouCan import ───────────────────────────────────────────────────────────

async function importYouCan(
  userId: string,
  creds: { accessToken: string }
): Promise<{ created: number; skipped: number; updated: number }> {
  let created = 0, skipped = 0, updated = 0;
  let page = 1;

  while (true) {
    const { orders, hasMore } = await fetchYouCanOrders(creds, page, 100);
    if (!orders.length) break;

    for (const yo of orders) {
      const extId = String(yo.id);
      const ourStatus = mapYouCanStatus(yo);
      const addr = yo.payment?.address?.[0] ?? {};
      const phone = (yo.customer?.phone ?? addr.phone ?? "").replace(/\D/g, "");
      const firstName = yo.customer?.first_name ?? addr.first_name ?? "";
      const lastName = yo.customer?.last_name ?? addr.last_name ?? "";
      const customerName = [firstName, lastName].filter(Boolean).join(" ") || "YouCan Customer";
      const items = (yo.variants ?? []).map((v) => ({
        name: v.title,
        qty: v.quantity,
        price: v.price,
      }));
      const totalAmount = yo.total ?? 0;

      const existing = await prisma.order.findFirst({
        where: { userId, externalOrderId: extId, platform: "YOUCAN" },
      });

      if (existing) {
        if (existing.status !== ourStatus) {
          await prisma.order.update({ where: { id: existing.id }, data: { status: ourStatus as never } });
          updated++;
        } else {
          skipped++;
        }
        continue;
      }

      const contact = await upsertContact(userId, phone, customerName);
      if (!contact) { skipped++; continue; }

      const newYouCanOrder = await prisma.order.create({
        data: {
          userId,
          contactId: contact.id,
          items,
          totalAmount,
          currency: yo.currency || "MAD",
          status: ourStatus as never,
          notes: `Imported from YouCan #${yo.ref}`,
          platform: "YOUCAN",
          externalOrderId: extId,
        },
      });
      runFlowsForOrder(userId, newYouCanOrder.id, "YOUCAN").catch(console.error);
      created++;
    }

    if (!hasMore) break;
    page++;
  }

  return { created, skipped, updated };
}

// ─── LightFunnels import ──────────────────────────────────────────────────────

async function importLightFunnels(
  userId: string,
  creds: { accessToken: string }
): Promise<{ created: number; skipped: number; updated: number }> {
  let created = 0, skipped = 0, updated = 0;
  let cursor: string | null = null;

  while (true) {
    const { orders, nextCursor } = await fetchLFOrders(creds, cursor ?? undefined);
    if (!orders.length) break;

    for (const lo of orders) {
      const extId = String(lo._id);
      const ourStatus = mapLFStatus(lo);
      const phone = (lo.customer?.phone ?? lo.phone ?? "").replace(/\D/g, "");
      const customerName = lo.customer?.full_name ?? lo.customer_full_name ?? "LightFunnels Customer";
      const items = (lo.items ?? []).map((item) => ({
        name: item.title,
        qty: item.quantity,
        price: item.price,
      }));
      const totalAmount = lo.total ?? 0;

      const existing = await prisma.order.findFirst({
        where: { userId, externalOrderId: extId, platform: "LIGHTFUNNELS" },
      });

      if (existing) {
        if (existing.status !== ourStatus) {
          await prisma.order.update({ where: { id: existing.id }, data: { status: ourStatus as never } });
          updated++;
        } else {
          skipped++;
        }
        continue;
      }

      const contact = await upsertContact(userId, phone, customerName);
      if (!contact) { skipped++; continue; }

      const newLFOrder = await prisma.order.create({
        data: {
          userId,
          contactId: contact.id,
          items,
          totalAmount,
          currency: lo.currency || "MAD",
          status: ourStatus as never,
          notes: lo.notes || `Imported from LightFunnels ${lo.name}`,
          platform: "LIGHTFUNNELS",
          externalOrderId: extId,
        },
      });
      runFlowsForOrder(userId, newLFOrder.id, "LIGHTFUNNELS").catch(console.error);
      created++;
    }

    if (!nextCursor) break;
    cursor = nextCursor;
  }

  return { created, skipped, updated };
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string } & typeof session.user).id;

  const { type } = await req.json().catch(() => ({ type: null }));

  // If no type specified, sync all connected integrations
  const where = type ? { userId, type, isActive: true } : { userId, isActive: true };
  const integrations = await prisma.integration.findMany({ where });

  if (!integrations.length)
    return NextResponse.json({ error: "No active integrations found" }, { status: 400 });

  const results: Record<string, { created: number; skipped: number; updated: number }> = {};

  try {
    await Promise.all(integrations.map(async (integration) => {
      if (integration.type === "WOOCOMMERCE") {
        if (!integration.siteUrl || !integration.consumerKey || !integration.consumerSecret) return;
        results.WOOCOMMERCE = await importWoo(
          userId,
          { siteUrl: integration.siteUrl, consumerKey: integration.consumerKey, consumerSecret: integration.consumerSecret },
          integration.siteUrl
        );
        await prisma.integration.update({ where: { id: integration.id }, data: { lastSyncAt: new Date() } });
      } else if (integration.type === "SHOPIFY") {
        if (!integration.shopDomain || !integration.accessToken) return;
        results.SHOPIFY = await importShopify(
          userId,
          { shopDomain: integration.shopDomain, accessToken: integration.accessToken }
        );
        await prisma.integration.update({ where: { id: integration.id }, data: { lastSyncAt: new Date() } });
      } else if (integration.type === "YOUCAN") {
        if (!integration.accessToken) return;
        results.YOUCAN = await importYouCan(userId, { accessToken: integration.accessToken });
        await prisma.integration.update({ where: { id: integration.id }, data: { lastSyncAt: new Date() } });
      } else if (integration.type === "LIGHTFUNNELS") {
        if (!integration.accessToken) return;
        results.LIGHTFUNNELS = await importLightFunnels(userId, { accessToken: integration.accessToken });
        await prisma.integration.update({ where: { id: integration.id }, data: { lastSyncAt: new Date() } });
      }
    }));

    const total = Object.values(results).reduce(
      (acc, r) => ({ created: acc.created + r.created, skipped: acc.skipped + r.skipped, updated: acc.updated + r.updated }),
      { created: 0, skipped: 0, updated: 0 }
    );

    return NextResponse.json({ data: { ...total, platforms: results } });
  } catch (err) {
    console.error("[/api/integrations/sync]", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
