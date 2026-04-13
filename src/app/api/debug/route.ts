import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/debug — returns session state for diagnosing bot issues
// Only accessible to logged-in users
export async function GET(_req: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as typeof session.user & { id: string }).id;

  const { getSessionStatus } = await import("@/lib/whatsapp");

  const waSessions = await prisma.whatsAppSession.findMany({
    where: { userId },
    select: {
      id: true,
      name: true,
      status: true,
      aiEnabled: true,
      phoneNumber: true,
      updatedAt: true,
      sessionData: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  const result = waSessions.map((s) => ({
    id: s.id,
    name: s.name,
    status: s.status,
    aiEnabled: s.aiEnabled,
    phoneNumber: s.phoneNumber,
    socketAlive: getSessionStatus(s.id) === "active",
    hasCredentials: s.sessionData !== null,
    lastUpdated: s.updatedAt.toISOString(),
    secondsSinceUpdate: Math.floor((Date.now() - s.updatedAt.getTime()) / 1000),
  }));

  return NextResponse.json({
    data: {
      sessions: result,
      env: {
        hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY,
        hasNextAuthUrl: !!process.env.NEXTAUTH_URL,
        nextAuthUrl: process.env.NEXTAUTH_URL,
        nodeEnv: process.env.NODE_ENV,
      },
    },
  });
}
