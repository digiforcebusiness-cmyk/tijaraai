import { NextRequest, NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// A CONNECTING session with no update for >90 s is stuck — allow retry.
const CONNECTING_TIMEOUT_MS = 90_000;

// GET /api/sessions/[sessionId]/qr
export async function GET(
  _req: NextRequest,
  { params }: { params: { sessionId: string } }
): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = (session.user as typeof session.user & { id: string }).id;

    const waSession = await prisma.whatsAppSession.findFirst({
      where: { id: params.sessionId, userId },
    });

    if (!waSession)
      return NextResponse.json({ error: "Session not found" }, { status: 404 });

    // ── Terminal / already-done states ──────────────────────────────────────
    if (
      waSession.status === "CONNECTED" ||
      waSession.status === "BANNED" ||
      waSession.status === "LOGGED_OUT"
    ) {
      return NextResponse.json({
        data: { qrCode: waSession.qrCode, status: waSession.status },
      });
    }

    // ── Return existing QR while it is fresh ────────────────────────────────
    if (waSession.status === "QR_PENDING" && waSession.qrCode) {
      return NextResponse.json({
        data: { qrCode: waSession.qrCode, status: waSession.status },
      });
    }

    // ── Decide whether to (re)start the session ─────────────────────────────
    const { createSession, getSessionStatus } = await import("@/lib/whatsapp");
    const socketAlive = getSessionStatus(waSession.id) === "active";

    // CONNECTING is "stuck" when updatedAt hasn't changed for >90 s
    const stuckConnecting =
      waSession.status === "CONNECTING" &&
      Date.now() - waSession.updatedAt.getTime() > CONNECTING_TIMEOUT_MS;

    const alreadyStarting =
      waSession.status === "CONNECTING" && !stuckConnecting;

    if (!socketAlive && !alreadyStarting) {
      console.log("[qr/route] Launching createSession for", params.sessionId,
        stuckConnecting ? "(stuck — retry)" : "(fresh start)");

      // waitUntil keeps the Vercel lambda alive AFTER this response is sent
      // so Baileys has time to connect and write the QR code to the DB.
      waitUntil(
        createSession(waSession.id).catch((e: Error) => {
          console.error("[qr/route] createSession failed:", e.message);
          // Reset to DISCONNECTED so the next frontend poll can try again.
          return prisma.whatsAppSession
            .update({
              where: { id: params.sessionId },
              data: { status: "DISCONNECTED" },
            })
            .catch(() => {});
        })
      );
    }

    // Return immediately — the frontend polls every 5 s and will pick up
    // the QR once createSession saves it to the database.
    return NextResponse.json({
      data: {
        qrCode: waSession.qrCode,
        // Report CONNECTING so the UI shows the spinner, not "No QR code yet"
        status:
          waSession.status === "DISCONNECTED" ? "CONNECTING" : waSession.status,
      },
    });
  } catch (err) {
    console.error("[qr/route]", err);
    return NextResponse.json(
      { error: (err as Error).message ?? "Internal error" },
      { status: 500 }
    );
  }
}

// DELETE /api/sessions/[sessionId]/qr — disconnect
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { sessionId: string } }
): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = (session.user as typeof session.user & { id: string }).id;

    const waSession = await prisma.whatsAppSession.findFirst({
      where: { id: params.sessionId, userId },
    });
    if (!waSession)
      return NextResponse.json({ error: "Session not found" }, { status: 404 });

    const { disconnectSession } = await import("@/lib/whatsapp");
    await disconnectSession(params.sessionId);

    await prisma.whatsAppSession.update({
      where: { id: params.sessionId },
      data: { status: "DISCONNECTED" },
    });

    return NextResponse.json({ data: { success: true } });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message ?? "Internal error" },
      { status: 500 }
    );
  }
}
