import { NextRequest, NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/sessions/[sessionId]/qr
// Long-polls up to 30 s waiting for the QR to appear in the DB,
// so the frontend gets the QR code on the very first request.
export async function GET(
  _req: NextRequest,
  { params }: { params: { sessionId: string } }
): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = (session.user as typeof session.user & { id: string }).id;

    let waSession = await prisma.whatsAppSession.findFirst({
      where: { id: params.sessionId, userId },
    });

    if (!waSession)
      return NextResponse.json({ error: "Session not found" }, { status: 404 });

    // Already connected or terminal state — return immediately
    if (
      waSession.status === "CONNECTED" ||
      waSession.status === "BANNED" ||
      waSession.status === "LOGGED_OUT"
    ) {
      return NextResponse.json({
        data: { qrCode: waSession.qrCode, status: waSession.status },
      });
    }

    // Return existing QR if still fresh (QR_PENDING)
    if (waSession.status === "QR_PENDING" && waSession.qrCode) {
      return NextResponse.json({
        data: { qrCode: waSession.qrCode, status: waSession.status },
      });
    }

    // Only start a new session if not already in-flight (DISCONNECTED only)
    const { createSession, getSessionStatus } = await import("@/lib/whatsapp");
    const socketAlive = getSessionStatus(waSession.id) === "active";
    const alreadyStarting = waSession.status === "CONNECTING";

    if (!socketAlive && !alreadyStarting) {
      // waitUntil keeps the Vercel lambda alive while Baileys connects
      waitUntil(
        createSession(waSession.id).catch((e) =>
          console.error("[qr/route] createSession error:", e)
        )
      );
    }

    // Long-poll: wait up to 30 s for QR to appear in DB
    // (polls DB every 2 s — 15 attempts)
    for (let i = 0; i < 15; i++) {
      await new Promise((r) => setTimeout(r, 2000));

      const updated = await prisma.whatsAppSession.findUnique({
        where: { id: waSession.id },
        select: { qrCode: true, status: true },
      });

      if (!updated) break;

      if (updated.qrCode || updated.status === "CONNECTED") {
        return NextResponse.json({
          data: { qrCode: updated.qrCode, status: updated.status },
        });
      }

      if (updated.status === "BANNED" || updated.status === "LOGGED_OUT") {
        return NextResponse.json({
          data: { qrCode: null, status: updated.status },
        });
      }
    }

    // Timed out — return current state so frontend can retry
    const final = await prisma.whatsAppSession.findUnique({
      where: { id: waSession.id },
      select: { qrCode: true, status: true },
    });

    return NextResponse.json({
      data: { qrCode: final?.qrCode ?? null, status: final?.status ?? waSession.status },
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
