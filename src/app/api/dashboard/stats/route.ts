import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/dashboard/stats
export async function GET(): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as typeof session.user & { id: string }).id;

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  const [
    totalMessages,
    messagesPrev,
    totalContacts,
    contactsPrev,
    activeSessions,
    totalOrders,
    ordersPrev,
    aiReplies,
  ] = await Promise.all([
    prisma.message.count({ where: { session: { userId }, timestamp: { gte: thirtyDaysAgo } } }),
    prisma.message.count({ where: { session: { userId }, timestamp: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } } }),
    prisma.contact.count({ where: { userId, createdAt: { gte: thirtyDaysAgo } } }),
    prisma.contact.count({ where: { userId, createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } } }),
    prisma.whatsAppSession.count({ where: { userId, status: "CONNECTED" } }),
    prisma.order.count({ where: { userId, createdAt: { gte: thirtyDaysAgo } } }),
    prisma.order.count({ where: { userId, createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } } }),
    prisma.message.count({ where: { session: { userId }, isAiReply: true, timestamp: { gte: thirtyDaysAgo } } }),
  ]);

  const pctChange = (curr: number, prev: number): number =>
    prev === 0 ? 100 : Math.round(((curr - prev) / prev) * 100);

  return NextResponse.json({
    data: {
      totalMessages,
      messagesChange: pctChange(totalMessages, messagesPrev),
      totalContacts,
      contactsChange: pctChange(totalContacts, contactsPrev),
      activeSessions,
      totalOrders,
      ordersChange: pctChange(totalOrders, ordersPrev),
      aiReplies,
    },
  });
}
