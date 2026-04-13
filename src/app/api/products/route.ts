import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ProductSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional().nullable(),
  price: z.number().min(0),
  comparePrice: z.number().min(0).optional().nullable(),
  sku: z.string().max(100).optional().nullable(),
  stock: z.number().int().optional().nullable(),
  imageUrl: z.string().url().optional().nullable(),
  isActive: z.boolean().optional(),
});

export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string } & typeof session.user).id;

  const { searchParams } = req.nextUrl;
  const search = searchParams.get("search") ?? "";
  const platform = searchParams.get("platform") ?? "";
  const status = searchParams.get("status") ?? "";

  const where: Record<string, unknown> = { userId };
  if (search) where.name = { contains: search, mode: "insensitive" };
  if (platform) where.platform = platform;
  if (status === "active") where.isActive = true;
  if (status === "inactive") where.isActive = false;
  if (status === "outofstock") { where.stock = { lte: 0 }; where.isActive = true; }

  const products = await prisma.product.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    take: 200,
  });

  // Stats
  const [total, active, outOfStock] = await Promise.all([
    prisma.product.count({ where: { userId } }),
    prisma.product.count({ where: { userId, isActive: true } }),
    prisma.product.count({ where: { userId, isActive: true, stock: { lte: 0, not: null } } }),
  ]);

  return NextResponse.json({ data: products, stats: { total, active, outOfStock, drafts: total - active } });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string } & typeof session.user).id;

  const body = await req.json();
  const parsed = ProductSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 422 });

  const product = await prisma.product.create({
    data: {
      userId,
      platform: "MANUAL",
      externalProductId: `manual_${Date.now()}`,
      ...parsed.data,
      isActive: parsed.data.isActive ?? true,
    },
  });

  return NextResponse.json({ data: product }, { status: 201 });
}
