import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendMessage } from "@/lib/whatsapp";

const SendMessageSchema = z.object({
  sessionId: z.string().cuid(),
  contactId: z.string().cuid(),
  jid: z.string().min(1),
  text: z.string().min(1).max(4096),
});

// GET /api/messages?sessionId=&contactId=&cursor=&limit=
export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const sessionId = searchParams.get("sessionId");
  const contactId = searchParams.get("contactId");
  const cursor = searchParams.get("cursor");
  const limit = Math.min(Number(searchParams.get("limit") ?? 50), 100);

  if (!sessionId || !contactId)
    return NextResponse.json(
      { error: "sessionId and contactId are required" },
      { status: 400 }
    );

  try {
    const messages = await prisma.message.findMany({
      where: { sessionId, contactId },
      orderBy: { timestamp: "desc" },
      take: limit,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    return NextResponse.json({
      data: messages.reverse(),
      nextCursor: messages.length === limit ? messages[0]?.id : null,
    });
  } catch (err) {
    console.error("[/api/messages GET]", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

// POST /api/messages — send a message
export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as typeof session.user & { id: string }).id;

  const body = await req.json();
  const parsed = SendMessageSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 422 }
    );

  const { sessionId, contactId, jid, text } = parsed.data;

  // Verify the session belongs to the user
  const waSession = await prisma.whatsAppSession.findFirst({
    where: { id: sessionId, userId },
  });
  if (!waSession)
    return NextResponse.json({ error: "Session not found" }, { status: 404 });

  await sendMessage(sessionId, jid, text);

  const message = await prisma.message.create({
    data: {
      sessionId,
      contactId,
      direction: "OUTBOUND",
      type: "TEXT",
      body: text,
      status: "SENT",
      isAiReply: false,
    },
  });

  return NextResponse.json({ data: message }, { status: 201 });
}
