import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";


const CreateSessionSchema = z.object({
  name: z.string().min(1).max(100),
  aiEnabled: z.boolean().optional().default(false),
  aiPrompt: z.string().max(2000).optional(),
});

// GET /api/sessions — list all sessions for the authenticated user
export async function GET(): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as typeof session.user & { id: string }).id;

  const sessions = await prisma.whatsAppSession.findMany({
    where: { userId },
    include: {
      _count: { select: { contacts: true, messages: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ data: sessions });
}

// POST /api/sessions — create and start a new WhatsApp session
export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as typeof session.user & { id: string }).id;

  const body = await req.json();
  const parsed = CreateSessionSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 422 }
    );

  const { name, aiEnabled, aiPrompt } = parsed.data;

  const whatsAppSession = await prisma.whatsAppSession.create({
    data: {
      userId,
      name,
      aiEnabled,
      aiPrompt,
      status: "DISCONNECTED",
    },
  });

  // Kick off the Baileys session (dynamic import — Baileys is ESM-only)
  import("@/lib/whatsapp").then(({ createSession }) =>
    createSession(whatsAppSession.id).catch(console.error)
  );

  return NextResponse.json({ data: whatsAppSession }, { status: 201 });
}
