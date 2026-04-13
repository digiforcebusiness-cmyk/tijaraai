import { NextRequest, NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

    // Kick off Baileys connection only when truly needed.
    // On Vercel, activeSessions is always empty (ephemeral lambda) so we rely
    // on DB status instead of in-memory socket state to avoid restarting the
    // session on every poll and resetting the QR code.
    const { createSession, getSessionStatus } = await import("@/lib/whatsapp");
    const socketAlive = getSessionStatus(waSession.id) === "active";
    const alreadyStarting =
      waSession.status === "QR_PENDING" || waSession.status === "CONNECTING";

    if (
      !socketAlive &&
      !alreadyStarting &&
      waSession.status !== "BANNED" &&
      waSession.status !== "LOGGED_OUT" &&
      waSession.status !== "CONNECTED"
    ) {
      // waitUntil keeps the Vercel lambda alive until Baileys finishes
      // generating the QR and saves it to the database.
      waitUntil(
        createSession(waSession.id).catch((e) =>
          console.error("[qr/route] createSession error:", e)
        )
      );
    }

    return NextResponse.json({
      data: {
        qrCode: waSession.qrCode,
        status: waSession.status,
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
