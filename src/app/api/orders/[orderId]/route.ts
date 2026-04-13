import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { syncOrderStatusToPlatform } from "@/lib/integrations";
import { sendMessage } from "@/lib/whatsapp";

const PatchOrderSchema = z.object({
  status: z.enum(["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"]),
  notes: z.string().max(1000).optional(),
});

// Status → WhatsApp message template (Arabic)
const STATUS_MESSAGES: Partial<Record<string, string>> = {
  CONFIRMED:  "✅ تم *تأكيد* طلبك! نحن نجهزه الآن.",
  PROCESSING: "⚙️ طلبك قيد *المعالجة* الآن. سنبقيك على اطلاع!",
  SHIPPED:    "🚚 أخبار رائعة! تم *شحن* طلبك وهو في الطريق إليك.",
  DELIVERED:  "🎉 تم *تسليم* طلبك! شكراً لتسوقك معنا. نسعد بسماع رأيك.",
  CANCELLED:  "❌ تم *إلغاء* طلبك. إذا كان لديك أي استفسار، يمكنك الرد هنا.",
  REFUNDED:   "💸 تمت معالجة استرداد مبلغك. قد يستغرق ظهوره بضعة أيام.",
};

export async function PATCH(
  req: NextRequest,
  { params }: { params: { orderId: string } }
): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string } & typeof session.user).id;

  const order = await prisma.order.findFirst({
    where: { id: params.orderId, userId },
    include: { contact: true },
  });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  const body = await req.json();
  const parsed = PatchOrderSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 422 });

  const updated = await prisma.order.update({
    where: { id: params.orderId },
    data: parsed.data,
    include: { contact: true },
  });

  // ── 1. Sync status to Shopify / WooCommerce ─────────────────────────────────
  if (order.externalOrderId && order.platform) {
    syncOrderStatusToPlatform(
      userId,
      order.externalOrderId,
      order.platform,
      parsed.data.status
    ).catch(console.error);
  }

  // ── 2. Send WhatsApp confirmation message to customer ───────────────────────
  const waMsg = STATUS_MESSAGES[parsed.data.status];
  if (waMsg) {
    const contact = updated.contact;
    const items = order.items as Array<{ name: string; qty: number; price: number }>;
    const itemsList = items.map((i) => `• ${i.name} × ${i.qty}`).join("\n");
    const fullMsg = `${waMsg}\n\n*رقم الطلب:* #${order.orderNumber.slice(-8).toUpperCase()}\n${itemsList}\n*الإجمالي:* ${order.currency} ${Number(order.totalAmount).toFixed(2)}`;

    // Find the WhatsApp session for this contact (fall back to any connected session for this user)
    const waSession = contact.sessionId
      ? await prisma.whatsAppSession.findFirst({ where: { id: contact.sessionId, status: "CONNECTED" } })
      : await prisma.whatsAppSession.findFirst({ where: { userId, status: "CONNECTED" }, orderBy: { createdAt: "desc" } });

    if (waSession) {
      sendMessage(waSession.id, contact.jid, fullMsg).catch(console.error);

      // Save the outbound message to DB
      await prisma.message.create({
        data: {
          sessionId: waSession.id,
          contactId: contact.id,
          direction: "OUTBOUND",
          type: "TEXT",
          body: fullMsg,
          status: "SENT",
          isAiReply: false,
        },
      }).catch(console.error);
    }
  }

  return NextResponse.json({ data: updated });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { orderId: string } }
): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string } & typeof session.user).id;

  const order = await prisma.order.findFirst({ where: { id: params.orderId, userId } });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  await prisma.order.delete({ where: { id: params.orderId } });
  return NextResponse.json({ data: { success: true } });
}
