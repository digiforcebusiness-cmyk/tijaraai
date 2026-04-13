/**
 * Meta Webhook — receives Facebook & Instagram messages
 * GET  /api/webhooks/meta  — webhook verification (required by Meta)
 * POST /api/webhooks/meta  — incoming events
 *
 * Set this URL in your Facebook App → Webhooks:
 *   https://yourdomain.com/api/webhooks/meta
 * Verify token: value of META_WEBHOOK_VERIFY_TOKEN in .env.local
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateReply } from "@/lib/claude";
import {
  parseMetaWebhookEvents,
  sendMetaMessage,
  getMetaUserProfile,
  type MetaWebhookBody,
} from "@/lib/social/meta";

// ─── GET — webhook verification ───────────────────────────────────────────────

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = req.nextUrl;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const verifyToken = process.env.META_WEBHOOK_VERIFY_TOKEN ?? "wa-crm-meta-webhook";

  if (mode === "subscribe" && token === verifyToken && challenge) {
    console.log("[meta-webhook] Verified");
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

// ─── POST — incoming events ───────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: MetaWebhookBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Must return 200 immediately — Meta retries on timeout
  // Process asynchronously
  processMetaEvents(body).catch((err) =>
    console.error("[meta-webhook] Processing error:", err)
  );

  return NextResponse.json({ status: "ok" });
}

// ─── Process events ───────────────────────────────────────────────────────────

async function processMetaEvents(body: MetaWebhookBody): Promise<void> {
  const events = parseMetaWebhookEvents(body);

  for (const event of events) {
    try {
      await handleSocialMessage(event);
    } catch (err) {
      console.error("[meta-webhook] handleSocialMessage error:", (err as Error).message);
    }
  }
}

async function handleSocialMessage(event: {
  senderId: string;
  senderName?: string;
  text: string;
  messageId: string;
  timestamp: number;
  platform: "FACEBOOK" | "INSTAGRAM";
  pageId: string;
}): Promise<void> {
  // Find the connected social page
  const socialPage = await prisma.socialPage.findFirst({
    where: { pageId: event.pageId, platform: event.platform, isActive: true },
  });
  if (!socialPage) return;

  // Upsert contact by senderId (PSID/IGSID)
  let contact = await prisma.contact.findFirst({
    where: { socialPageId: socialPage.id, jid: event.senderId },
  });

  if (!contact) {
    // Fetch name from Meta if not known
    const profile = await getMetaUserProfile(socialPage.accessToken, event.senderId);
    contact = await prisma.contact.create({
      data: {
        userId: socialPage.userId,
        socialPageId: socialPage.id,
        jid: event.senderId,
        phoneNumber: event.senderId, // no phone available for social contacts
        name: profile?.name ?? event.senderName ?? null,
        profilePicUrl: profile?.profile_pic ?? null,
        channel: event.platform,
        lastMessageAt: new Date(),
        totalMessages: 1,
      },
    });
  } else {
    await prisma.contact.update({
      where: { id: contact.id },
      data: { lastMessageAt: new Date(), totalMessages: { increment: 1 } },
    });
  }

  // Save inbound message (sessionId is optional for social messages)
  await prisma.message.create({
    data: {
      sessionId: null as never,
      contactId: contact.id,
      waMessageId: event.messageId,
      direction: "INBOUND",
      type: "TEXT",
      body: event.text,
      status: "DELIVERED",
    },
  });

  // Auto-reply with AI if enabled (check via user settings — use a default session's aiEnabled)
  const session = await prisma.whatsAppSession.findFirst({
    where: { userId: socialPage.userId, aiEnabled: true, status: "CONNECTED" },
    select: { aiEnabled: true, aiPrompt: true },
  });

  if (!session?.aiEnabled) return;

  const recentMessages = await prisma.message.findMany({
    where: { contactId: contact.id },
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

  const reply = await generateReply({
    history,
    incomingMessage: event.text,
    customSystemPrompt: session.aiPrompt ?? undefined,
    contactName: contact.name ?? undefined,
  });

  // Send reply via Meta API
  await sendMetaMessage(socialPage.accessToken, event.senderId, reply.text, event.platform);

  // Save outbound message
  await prisma.message.create({
    data: {
      sessionId: null as never,
      contactId: contact.id,
      direction: "OUTBOUND",
      type: "TEXT",
      body: reply.text,
      status: "SENT",
      isAiReply: true,
    },
  });
}
