import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const CreateCampaignSchema = z.object({
  sessionId: z.string().cuid(),
  name: z.string().min(1).max(100),
  message: z.string().min(1).max(4096),
  mediaUrl: z.string().url().optional(),
  contactIds: z.array(z.string().cuid()).min(1),
  scheduledAt: z.string().datetime().optional(),
});

export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string } & typeof session.user).id;

  const campaigns = await prisma.campaign.findMany({
    where: { userId },
    include: { _count: { select: { recipients: true } }, session: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ data: campaigns });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string } & typeof session.user).id;

  try {
    const body = await req.json();
    const parsed = CreateCampaignSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 422 });

    const { sessionId, name, message, mediaUrl, contactIds, scheduledAt } = parsed.data;

    const waSession = await prisma.whatsAppSession.findFirst({ where: { id: sessionId, userId } });
    if (!waSession) return NextResponse.json({ error: "Session not found" }, { status: 404 });

    const campaign = await prisma.campaign.create({
      data: {
        userId, sessionId, name, message, mediaUrl,
        status: scheduledAt ? "SCHEDULED" : "DRAFT",
        scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
        recipients: { create: contactIds.map((contactId) => ({ contactId })) },
      },
      include: { _count: { select: { recipients: true } } },
    });

    return NextResponse.json({ data: campaign }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
