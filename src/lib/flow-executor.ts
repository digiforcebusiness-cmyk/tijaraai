/**
 * Flow Executor — runs active flows when orders/leads are created
 * Called from the sync route after new orders are saved to DB
 */

import { prisma } from "@/lib/prisma";
import { sendMessage } from "@/lib/whatsapp";

interface FlowAction {
  type: "SEND_WA_MESSAGE" | "UPDATE_STATUS" | "ADD_TAG";
  template?: string;
  status?: string;
  tag?: string;
}

// Map platform names to flow trigger types
const PLATFORM_TO_TRIGGER: Record<string, string> = {
  SHOPIFY:      "SHOPIFY_ORDER",
  WOOCOMMERCE:  "WOOCOMMERCE_ORDER",
  YOUCAN:       "YOUCAN_ORDER",
  LIGHTFUNNELS: "LIGHTFUNNEL_STORE",
};

function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? "");
}

export async function runFlowsForOrder(
  userId: string,
  orderId: string,
  platform: string
): Promise<void> {
  const trigger = PLATFORM_TO_TRIGGER[platform];
  if (!trigger) return;

  const flows = await prisma.flow.findMany({
    where: { userId, trigger, isActive: true },
  });
  if (!flows.length) return;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      contact: {
        include: {
          session: { select: { id: true, status: true } },
        },
      },
    },
  });
  if (!order) return;

  const contact = order.contact;
  const waSession = contact.session?.status === "CONNECTED" ? contact.session
    : await prisma.whatsAppSession.findFirst({
        where: { userId, status: "CONNECTED" },
        orderBy: { createdAt: "desc" },
        select: { id: true },
      });

  const vars: Record<string, string> = {
    customer_name: contact.name ?? "Customer",
    name:          contact.name ?? "Customer",
    order_number:  order.orderNumber.slice(-8).toUpperCase(),
    order_ref:     order.orderNumber.slice(-8).toUpperCase(),
    total:         Number(order.totalAmount).toFixed(2),
    currency:      order.currency,
    platform,
  };

  for (const flow of flows) {
    const actions = flow.actions as unknown as FlowAction[];

    for (const action of actions) {
      try {
        if (action.type === "SEND_WA_MESSAGE" && action.template && waSession) {
          const msg = interpolate(action.template, vars);
          await sendMessage(waSession.id, contact.jid, msg);

          await prisma.message.create({
            data: {
              sessionId: waSession.id,
              contactId: contact.id,
              direction: "OUTBOUND",
              type: "TEXT",
              body: msg,
              status: "SENT",
              isAiReply: false,
            },
          });

        } else if (action.type === "UPDATE_STATUS" && action.status) {
          await prisma.order.update({
            where: { id: orderId },
            data: { status: action.status as never },
          });

        } else if (action.type === "ADD_TAG" && action.tag) {
          await prisma.contact.update({
            where: { id: contact.id },
            data: { tags: { push: action.tag } },
          });
        }
      } catch (err) {
        console.error(`[flow-executor] flow=${flow.id} action=${action.type}:`, err);
      }
    }

    // Update run stats
    await prisma.flow.update({
      where: { id: flow.id },
      data: { lastRunAt: new Date(), runCount: { increment: 1 } },
    }).catch(() => {});
  }
}
