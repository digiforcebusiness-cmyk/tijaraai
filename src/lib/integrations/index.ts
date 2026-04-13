/**
 * Unified integration helpers — called from API routes.
 * Handles both Shopify and WooCommerce transparently.
 */

import { prisma } from "@/lib/prisma";
import {
  createShopifyOrder,
  updateShopifyOrderStatus,
  type ShopifyOrderItem,
} from "./shopify";
import {
  createWooOrder,
  updateWooOrderStatus,
  type WooOrderItem,
} from "./woocommerce";

export interface PlatformOrderItem {
  name: string;
  qty: number;
  price: number;
}

/**
 * Push a new order to whichever platform the user has connected.
 * Returns { platform, externalOrderId, externalOrderUrl } or null.
 */
export async function pushOrderToPlatform(
  userId: string,
  params: {
    items: PlatformOrderItem[];
    customerName?: string;
    customerPhone?: string;
    note?: string;
  }
): Promise<{ platform: string; externalOrderId: string; externalOrderUrl: string | null } | null> {
  const integration = await prisma.integration.findFirst({
    where: { userId, isActive: true },
    orderBy: { createdAt: "desc" },
  });

  if (!integration) return null;

  try {
    if (integration.type === "SHOPIFY" && integration.shopDomain && integration.accessToken) {
      const creds = { shopDomain: integration.shopDomain, accessToken: integration.accessToken };
      const shopifyItems: ShopifyOrderItem[] = params.items.map((i) => ({
        title: i.name,
        quantity: i.qty,
        price: i.price.toFixed(2),
      }));
      const order = await createShopifyOrder(creds, {
        items: shopifyItems,
        customer: { first_name: params.customerName?.split(" ")[0], phone: params.customerPhone },
        note: params.note,
      });
      const url = `https://${integration.shopDomain}/admin/orders/${order.id}`;
      return { platform: "SHOPIFY", externalOrderId: String(order.id), externalOrderUrl: url };
    }

    if (integration.type === "WOOCOMMERCE" && integration.siteUrl && integration.consumerKey && integration.consumerSecret) {
      const creds = { siteUrl: integration.siteUrl, consumerKey: integration.consumerKey, consumerSecret: integration.consumerSecret };
      const wooItems: WooOrderItem[] = params.items.map((i) => ({ name: i.name, quantity: i.qty, price: i.price }));
      const order = await createWooOrder(creds, {
        items: wooItems,
        customerName: params.customerName,
        customerPhone: params.customerPhone,
        note: params.note,
      });
      const url = `${integration.siteUrl}/wp-admin/post.php?post=${order.id}&action=edit`;
      return { platform: "WOOCOMMERCE", externalOrderId: String(order.id), externalOrderUrl: url };
    }
  } catch (err) {
    console.error("[integrations] pushOrderToPlatform error:", err);
  }

  return null;
}

/**
 * Sync an order status change to the connected platform.
 */
export async function syncOrderStatusToPlatform(
  userId: string,
  externalOrderId: string,
  platform: string,
  newStatus: string
): Promise<void> {
  const integration = await prisma.integration.findFirst({
    where: { userId, type: platform as "SHOPIFY" | "WOOCOMMERCE", isActive: true },
  });

  if (!integration) return;

  try {
    if (platform === "SHOPIFY" && integration.shopDomain && integration.accessToken) {
      await updateShopifyOrderStatus(
        { shopDomain: integration.shopDomain, accessToken: integration.accessToken },
        externalOrderId,
        newStatus
      );
    }

    if (platform === "WOOCOMMERCE" && integration.siteUrl && integration.consumerKey && integration.consumerSecret) {
      await updateWooOrderStatus(
        { siteUrl: integration.siteUrl, consumerKey: integration.consumerKey, consumerSecret: integration.consumerSecret },
        externalOrderId,
        newStatus
      );
    }
  } catch (err) {
    console.error("[integrations] syncOrderStatusToPlatform error:", err);
  }
}
