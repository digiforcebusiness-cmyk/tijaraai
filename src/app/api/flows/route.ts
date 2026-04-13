import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ActionSchema = z.object({
  type: z.enum(["SEND_WA_MESSAGE", "UPDATE_STATUS", "ADD_TAG"]),
  template: z.string().optional(),
  status: z.string().optional(),
  tag: z.string().optional(),
});

const FlowSchema = z.object({
  name: z.string().min(1).max(200),
  trigger: z.enum([
    "SHOPIFY_ORDER",
    "YOUCAN_ORDER",
    "LIGHTFUNNEL_STORE",
    "LIGHTFUNNEL_LEAD",
    "WOOCOMMERCE_ORDER",
  ]),
  triggerConfig: z.record(z.unknown()).optional(),
  actions: z.array(ActionSchema).min(1),
  isActive: z.boolean().optional(),
});

export async function GET(): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string } & typeof session.user).id;

  const flows = await prisma.flow.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ data: flows });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string } & typeof session.user).id;

  const body = await req.json();
  const parsed = FlowSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 422 });

  const flow = await prisma.flow.create({
    data: {
      userId,
      name: parsed.data.name,
      trigger: parsed.data.trigger,
      triggerConfig: (parsed.data.triggerConfig ?? {}) as never,
      actions: parsed.data.actions,
      isActive: parsed.data.isActive ?? true,
    },
  });

  return NextResponse.json({ data: flow }, { status: 201 });
}
