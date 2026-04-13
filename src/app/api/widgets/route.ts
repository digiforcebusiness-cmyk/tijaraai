import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const WidgetSchema = z.object({
  name: z.string().min(1).max(100),
  welcomeMessage: z.string().max(200).optional(),
  buttonColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  position: z.enum(["bottom-right", "bottom-left"]).optional(),
  phoneNumber: z.string().min(7),
});

export async function GET(): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string } & typeof session.user).id;

  const widgets = await prisma.widget.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
  return NextResponse.json({ data: widgets });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string } & typeof session.user).id;

  try {
    const body = await req.json();
    const parsed = WidgetSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 422 });

    const widget = await prisma.widget.create({ data: { userId, ...parsed.data } });
    return NextResponse.json({ data: widget }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
