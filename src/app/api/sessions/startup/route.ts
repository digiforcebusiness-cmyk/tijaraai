import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/sessions/startup — internal-only, called by instrumentation.ts on boot
export async function POST(req: NextRequest): Promise<NextResponse> {
  const secret = req.headers.get("x-startup-secret");
  const expected = process.env.INTERNAL_STARTUP_SECRET ?? "wa-crm-startup";

  if (secret !== expected) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { createSession, getSessionStatus } = await import("@/lib/whatsapp");

    const sessions = await prisma.whatsAppSession.findMany({
      where: { status: { in: ["CONNECTED", "CONNECTING", "QR_PENDING"] } },
      select: { id: true, name: true, status: true },
    });

    if (sessions.length === 0) {
      return NextResponse.json({ data: { reconnected: 0, message: "No sessions to reconnect" } });
    }

    let reconnected = 0;
    for (const s of sessions) {
      if (getSessionStatus(s.id) === "active") continue;
      console.log(`[startup] Reconnecting "${s.name}" (${s.id})`);
      createSession(s.id).catch((err: Error) =>
        console.error(`[startup] Failed to reconnect "${s.name}":`, err.message)
      );
      reconnected++;
      await new Promise((r) => setTimeout(r, 2000));
    }

    return NextResponse.json({ data: { reconnected, total: sessions.length } });
  } catch (err) {
    console.error("[startup] Error:", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
