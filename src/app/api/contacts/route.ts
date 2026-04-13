import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/contacts?sessionId=&search=&page=&limit=
export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as typeof session.user & { id: string }).id;
  const { searchParams } = req.nextUrl;
  const sessionId = searchParams.get("sessionId");
  const search = searchParams.get("search") ?? "";
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const limit = Math.min(Number(searchParams.get("limit") ?? 20), 100);

  const where = {
    userId,
    lastMessageAt: { not: null }, // only contacts with at least one message
    ...(sessionId ? { sessionId } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { phoneNumber: { contains: search } },
          ],
        }
      : {}),
  };

  const [contacts, total] = await Promise.all([
    prisma.contact.findMany({
      where,
      orderBy: { lastMessageAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        messages: {
          orderBy: { timestamp: "desc" },
          take: 1,
        },
      },
    }),
    prisma.contact.count({ where }),
  ]);

  const data = contacts.map(({ messages, ...contact }) => ({
    ...contact,
    lastMessage: messages[0] ?? null,
  }));

  return NextResponse.json({
    data,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  });
}
