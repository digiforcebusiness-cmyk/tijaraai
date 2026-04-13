import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { randomBytes } from "crypto";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const InviteSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).optional(),
  role: z.enum(["ADMIN", "AGENT"]).default("AGENT"),
});

export async function GET(): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string } & typeof session.user).id;

  const members = await prisma.teamMember.findMany({
    where: { ownerId: userId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ data: members });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string } & typeof session.user).id;

  try {
    const body = await req.json();
    const parsed = InviteSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 422 });

    const { email, name, role } = parsed.data;

    const existing = await prisma.teamMember.findUnique({
      where: { ownerId_email: { ownerId: userId, email } },
    });
    if (existing) return NextResponse.json({ error: "Member already invited" }, { status: 409 });

    const inviteToken = randomBytes(32).toString("hex");

    const member = await prisma.teamMember.create({
      data: { ownerId: userId, email, name, role, inviteToken, status: "PENDING" },
    });

    return NextResponse.json({ data: member, inviteLink: `/invite/${inviteToken}` }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string } & typeof session.user).id;

  const { searchParams } = req.nextUrl;
  const memberId = searchParams.get("id");
  if (!memberId) return NextResponse.json({ error: "id required" }, { status: 400 });

  await prisma.teamMember.deleteMany({ where: { id: memberId, ownerId: userId } });
  return NextResponse.json({ data: { success: true } });
}
