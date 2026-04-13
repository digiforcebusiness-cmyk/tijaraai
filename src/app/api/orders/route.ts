import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const OrderItemSchema = z.object({
  name: z.string().min(1),
  qty: z.number().int().positive(),
  price: z.number().positive(),
});

const CreateOrderSchema = z.object({
  contactId: z.string().cuid(),
  items: z.array(OrderItemSchema).min(1),
  totalAmount: z.number().positive(),
  currency: z.string().length(3).optional().default("MAD"),
  notes: z.string().max(1000).optional(),
});

// GET /api/orders
export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as typeof session.user & { id: string }).id;
  const { searchParams } = req.nextUrl;
  const status = searchParams.get("status");
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const limit = Math.min(Number(searchParams.get("limit") ?? 20), 100);

  const where = {
    userId,
    ...(status ? { status: status as never } : {}),
  };

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: { contact: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.order.count({ where }),
  ]);

  return NextResponse.json({
    data: orders,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  });
}

// POST /api/orders
export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as typeof session.user & { id: string }).id;

  const body = await req.json();
  const parsed = CreateOrderSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 422 }
    );

  const { contactId, items, totalAmount, currency, notes } = parsed.data;

  const contact = await prisma.contact.findFirst({
    where: { id: contactId, userId },
  });
  if (!contact)
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });

  const order = await prisma.order.create({
    data: {
      userId,
      contactId,
      items,
      totalAmount,
      currency,
      notes,
      status: "PENDING",
    },
    include: { contact: true },
  });

  return NextResponse.json({ data: order }, { status: 201 });
}
