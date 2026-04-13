import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Public endpoint — no auth required — used by embeddable widget script
export async function GET(
  _req: NextRequest,
  { params }: { params: { widgetId: string } }
): Promise<NextResponse> {
  const widget = await prisma.widget.findUnique({
    where: { id: params.widgetId },
    select: {
      id: true,
      welcomeMessage: true,
      buttonColor: true,
      position: true,
      phoneNumber: true,
      isActive: true,
    },
  });

  if (!widget || !widget.isActive) {
    return NextResponse.json({ error: "Widget not found" }, { status: 404 });
  }

  // Increment view count (fire-and-forget)
  prisma.widget.update({
    where: { id: params.widgetId },
    data: { embedViews: { increment: 1 } },
  }).catch(() => {});

  const res = NextResponse.json({ data: widget });
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Cache-Control", "public, max-age=300");
  return res;
}
