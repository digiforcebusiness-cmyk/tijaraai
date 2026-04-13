import { NextRequest, NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { prisma } from "@/lib/prisma";

// Sessions updated within the last 50s are probably still alive in another lambda.
// Skip them to avoid opening a duplicate socket (WhatsApp only allows one connection
// per number — a second socket would immediately kill the first).
const RECENTLY_CONNECTED_MS = 50_000;

async function reconnectSessions() {
  const { createSession, getSessionStatus } = await import("@/lib/whatsapp");

  const sessions = await prisma.whatsAppSession.findMany({
    where: { status: { in: ["CONNECTED", "CONNECTING", "QR_PENDING"] } },
    select: { id: true, name: true, status: true, updatedAt: true },
  });

  if (sessions.length === 0) {
    return { reconnected: 0, message: "No sessions to reconnect" };
  }

  let reconnected = 0;
  for (const s of sessions) {
    // In-process check (works when the same lambda instance handles multiple requests)
    if (getSessionStatus(s.id) === "active") {
      console.log(`[startup] Session "${s.name}" active in this instance — skipping`);
      continue;
    }
    // DB-based check: if updated very recently, another lambda likely has the socket
    const msSinceUpdate = Date.now() - s.updatedAt.getTime();
    if (s.status === "CONNECTED" && msSinceUpdate < RECENTLY_CONNECTED_MS) {
      console.log(`[startup] Session "${s.name}" connected ${Math.round(msSinceUpdate / 1000)}s ago — skipping`);
      continue;
    }
    console.log(`[startup] Reconnecting "${s.name}" (${s.id}) — last update ${Math.round(msSinceUpdate / 1000)}s ago`);
    // waitUntil keeps the lambda alive while the socket is connected,
    // allowing incoming WhatsApp messages to be received and processed.
    waitUntil(
      createSession(s.id).catch(async (err: Error) => {
        console.error(`[startup] Failed to reconnect "${s.name}":`, err.message);
        await prisma.whatsAppSession
          .update({ where: { id: s.id }, data: { status: "DISCONNECTED" } })
          .catch(() => {});
      })
    );
    reconnected++;
    // Stagger starts to avoid hammering Baileys/Supabase simultaneously
    await new Promise((r) => setTimeout(r, 2_000));
  }

  return { reconnected, total: sessions.length };
}

// GET /api/sessions/startup — called by Vercel Cron every minute
export async function GET(req: NextRequest): Promise<NextResponse> {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  // If CRON_SECRET is set, require it (Vercel injects it automatically for cron calls)
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const data = await reconnectSessions();
    return NextResponse.json({ data });
  } catch (err) {
    console.error("[startup] Error:", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

// POST /api/sessions/startup — called by instrumentation.ts on server boot
export async function POST(req: NextRequest): Promise<NextResponse> {
  const secret = req.headers.get("x-startup-secret");
  const expected = process.env.INTERNAL_STARTUP_SECRET ?? "wa-crm-startup";

  if (secret !== expected) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const data = await reconnectSessions();
    return NextResponse.json({ data });
  } catch (err) {
    console.error("[startup] Error:", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
