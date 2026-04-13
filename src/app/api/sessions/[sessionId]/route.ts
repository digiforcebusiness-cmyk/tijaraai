import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const PatchSessionSchema = z.object({
  aiEnabled: z.boolean().optional(),
  aiPrompt: z.string().max(2000).optional(),
  name: z.string().min(1).max(100).optional(),
});

// PATCH /api/sessions/[sessionId] — update session settings
export async function PATCH(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as typeof session.user & { id: string }).id;

  const waSession = await prisma.whatsAppSession.findFirst({
    where: { id: params.sessionId, userId },
  });
  if (!waSession)
    return NextResponse.json({ error: "Session not found" }, { status: 404 });

  const body = await req.json();
  const parsed = PatchSessionSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 422 }
    );

  const updated = await prisma.whatsAppSession.update({
    where: { id: params.sessionId },
    data: parsed.data,
  });

  return NextResponse.json({ data: updated });
}

// DELETE /api/sessions/[sessionId] — delete a session
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { sessionId: string } }
): Promise<NextResponse> {
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
  await disconnectSession(params.sessionId).catch(() => {});

  await prisma.whatsAppSession.delete({ where: { id: params.sessionId } });

  return NextResponse.json({ data: { success: true } });
}
