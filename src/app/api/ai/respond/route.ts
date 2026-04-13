import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateReply } from "@/lib/claude";

const AiRespondSchema = z.object({
  sessionId: z.string().cuid(),
  contactId: z.string().cuid(),
  message: z.string().min(1).max(4096),
});

// POST /api/ai/respond — manually trigger an AI reply suggestion
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = (session.user as typeof session.user & { id: string }).id;

    const body = await req.json();
    const parsed = AiRespondSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 422 }
      );

    const { sessionId, contactId, message } = parsed.data;

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY is not set in .env.local" },
        { status: 500 }
      );
    }

    const waSession = await prisma.whatsAppSession.findFirst({
      where: { id: sessionId, userId },
    });
    if (!waSession)
      return NextResponse.json({ error: "Session not found" }, { status: 404 });

    const recentMessages = await prisma.message.findMany({
      where: { sessionId, contactId },
      orderBy: { timestamp: "desc" },
      take: 20,
    });

    const history = recentMessages.reverse().map((m) => ({
      role: m.direction === "INBOUND" ? ("user" as const) : ("assistant" as const),
      content: m.body,
    }));

    const reply = await generateReply({
      history,
      incomingMessage: message,
      customSystemPrompt: waSession.aiPrompt ?? undefined,
    });

    return NextResponse.json({ data: reply });
  } catch (err) {
    console.error("[/api/ai/respond]", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
