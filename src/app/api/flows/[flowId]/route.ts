import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const PatchSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  isActive: z.boolean().optional(),
  actions: z.array(z.object({
    type: z.enum(["SEND_WA_MESSAGE", "UPDATE_STATUS", "ADD_TAG"]),
    template: z.string().optional(),
    status: z.string().optional(),
    tag: z.string().optional(),
  })).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { flowId: string } }
): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string } & typeof session.user).id;

  const flow = await prisma.flow.findFirst({ where: { id: params.flowId, userId } });
  if (!flow) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid input" }, { status: 422 });

  const updated = await prisma.flow.update({
    where: { id: params.flowId },
    data: parsed.data,
  });

  return NextResponse.json({ data: updated });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { flowId: string } }
): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string } & typeof session.user).id;

  const flow = await prisma.flow.findFirst({ where: { id: params.flowId, userId } });
  if (!flow) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.flow.delete({ where: { id: params.flowId } });
  return NextResponse.json({ data: { success: true } });
}
