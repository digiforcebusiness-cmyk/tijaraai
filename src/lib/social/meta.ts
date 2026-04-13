/**
 * Meta Graph API — Facebook Pages & Instagram Business messaging
 * Docs: https://developers.facebook.com/docs/messenger-platform
 *       https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/messages
 */

const GRAPH_API = "https://graph.facebook.com/v19.0";

export type MetaPlatform = "FACEBOOK" | "INSTAGRAM";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MetaPage {
  id: string;
  name: string;
  access_token: string;
  picture?: { data: { url: string } };
}

export interface MetaIncomingMessage {
  senderId: string;       // PSID (Facebook) or IGSID (Instagram)
  senderName?: string;
  text: string;
  messageId: string;
  timestamp: number;
  platform: MetaPlatform;
  pageId: string;
}

// ─── Send message ─────────────────────────────────────────────────────────────

export async function sendMetaMessage(
  pageAccessToken: string,
  recipientId: string,
  text: string,
  platform: MetaPlatform
): Promise<void> {
  // Facebook uses /me/messages, Instagram uses the same endpoint via page token
  const endpoint = `${GRAPH_API}/me/messages`;

  const res = await fetch(`${endpoint}?access_token=${pageAccessToken}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recipient: { id: recipientId },
      message: { text },
      messaging_type: "RESPONSE",
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Meta API ${res.status}: ${JSON.stringify(err)}`);
  }
}

// ─── Get user profile ─────────────────────────────────────────────────────────

export async function getMetaUserProfile(
  pageAccessToken: string,
  userId: string
): Promise<{ name: string; profile_pic?: string } | null> {
  try {
    const res = await fetch(
      `${GRAPH_API}/${userId}?fields=name,profile_pic&access_token=${pageAccessToken}`
    );
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

// ─── Exchange short-lived token for long-lived ────────────────────────────────

export async function exchangeForLongLivedToken(
  appId: string,
  appSecret: string,
  shortLivedToken: string
): Promise<string> {
  const res = await fetch(
    `${GRAPH_API}/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortLivedToken}`
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Token exchange failed: ${JSON.stringify(err)}`);
  }
  const data = await res.json() as { access_token: string };
  return data.access_token;
}

// ─── Get pages list from user token ──────────────────────────────────────────

export async function getPagesFromUserToken(
  userAccessToken: string
): Promise<MetaPage[]> {
  const res = await fetch(
    `${GRAPH_API}/me/accounts?fields=id,name,access_token,picture&access_token=${userAccessToken}`
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Failed to fetch pages: ${JSON.stringify(err)}`);
  }
  const data = await res.json() as { data: MetaPage[] };
  return data.data ?? [];
}

// ─── Get Instagram business account linked to a Facebook page ────────────────

export async function getInstagramAccountForPage(
  pageId: string,
  pageAccessToken: string
): Promise<{ id: string; name: string; profile_picture_url?: string } | null> {
  try {
    const res = await fetch(
      `${GRAPH_API}/${pageId}?fields=instagram_business_account{id,name,profile_picture_url}&access_token=${pageAccessToken}`
    );
    if (!res.ok) return null;
    const data = await res.json() as { instagram_business_account?: { id: string; name: string; profile_picture_url?: string } };
    return data.instagram_business_account ?? null;
  } catch {
    return null;
  }
}

// ─── Parse incoming webhook events ───────────────────────────────────────────

export function parseMetaWebhookEvents(body: MetaWebhookBody): MetaIncomingMessage[] {
  const messages: MetaIncomingMessage[] = [];

  for (const entry of body.entry ?? []) {
    const pageId = entry.id;

    // Facebook Messenger events
    for (const event of entry.messaging ?? []) {
      if (!event.message?.text) continue;
      if (event.message.is_echo) continue; // skip our own sent messages
      messages.push({
        senderId: event.sender.id,
        text: event.message.text,
        messageId: event.message.mid,
        timestamp: event.timestamp,
        platform: "FACEBOOK",
        pageId,
      });
    }

    // Instagram messaging events (same structure, different object)
    for (const change of entry.changes ?? []) {
      if (change.field !== "messages") continue;
      const val = change.value;
      if (!val?.messages?.length) continue;
      for (const msg of val.messages) {
        if (msg.type !== "text") continue;
        messages.push({
          senderId: val.sender?.id ?? msg.from?.id ?? "",
          text: msg.text?.body ?? "",
          messageId: msg.id,
          timestamp: Number(msg.timestamp) * 1000,
          platform: "INSTAGRAM",
          pageId,
        });
      }
    }
  }

  return messages.filter((m) => m.text.trim());
}

// ─── Webhook body types ───────────────────────────────────────────────────────

export interface MetaWebhookBody {
  object: string;
  entry: Array<{
    id: string;
    time?: number;
    messaging?: Array<{
      sender: { id: string };
      recipient: { id: string };
      timestamp: number;
      message?: {
        mid: string;
        text?: string;
        is_echo?: boolean;
      };
    }>;
    changes?: Array<{
      field: string;
      value: {
        sender?: { id: string };
        messages?: Array<{
          id: string;
          type: string;
          timestamp: string;
          from?: { id: string };
          text?: { body: string };
        }>;
      };
    }>;
  }>;
}
