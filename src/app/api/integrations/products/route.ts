import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fetchWooProducts, type WooRemoteProduct } from "@/lib/integrations/woocommerce";
import { fetchShopifyProducts, type ShopifyRemoteProduct } from "@/lib/integrations/shopify";
import { fetchYouCanProducts } from "@/lib/integrations/youcan";
import { fetchLFProducts } from "@/lib/integrations/lightfunnels";

// ─── GET — product counts per platform ───────────────────────────────────────

export async function GET(): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string } & typeof session.user).id;

  const counts = await prisma.product.groupBy({
    by: ["platform"],
    where: { userId },
    _count: { id: true },
  });

  const data: Record<string, number> = {};
  for (const c of counts) data[c.platform] = c._count.id;

  return NextResponse.json({ data });
}

// ─── POST — sync products from connected platforms ────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string } & typeof session.user).id;

  const { type } = await req.json().catch(() => ({ type: null }));
  const where = type ? { userId, type, isActive: true } : { userId, isActive: true };
  const integrations = await prisma.integration.findMany({ where });

  if (!integrations.length)
    return NextResponse.json({ error: "No active integrations found" }, { status: 400 });

  const results: Record<string, { synced: number }> = {};

  try {
    for (const integration of integrations) {
      if (integration.type === "WOOCOMMERCE") {
        if (!integration.siteUrl || !integration.consumerKey || !integration.consumerSecret) continue;
        const creds = { siteUrl: integration.siteUrl, consumerKey: integration.consumerKey, consumerSecret: integration.consumerSecret };
        results.WOOCOMMERCE = { synced: await syncWooProducts(userId, creds) };
      }

      if (integration.type === "SHOPIFY") {
        if (!integration.shopDomain || !integration.accessToken) continue;
        const creds = { shopDomain: integration.shopDomain, accessToken: integration.accessToken };
        results.SHOPIFY = { synced: await syncShopifyProducts(userId, creds) };
      }

      if (integration.type === "YOUCAN") {
        if (!integration.accessToken) continue;
        results.YOUCAN = { synced: await syncYouCanProducts(userId, { accessToken: integration.accessToken }) };
      }

      if (integration.type === "LIGHTFUNNELS") {
        if (!integration.accessToken) continue;
        results.LIGHTFUNNELS = { synced: await syncLFProducts(userId, { accessToken: integration.accessToken }) };
      }
    }

    const totalSynced = Object.values(results).reduce((sum, r) => sum + r.synced, 0);
    return NextResponse.json({ data: { totalSynced, platforms: results } });
  } catch (err) {
    console.error("[/api/integrations/products]", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

// ─── WooCommerce product sync ─────────────────────────────────────────────────

async function syncWooProducts(
  userId: string,
  creds: { siteUrl: string; consumerKey: string; consumerSecret: string }
): Promise<number> {
  let total = 0;
  let page = 1;

  while (true) {
    const products: WooRemoteProduct[] = await fetchWooProducts(creds, page, 100);
    if (!products.length) break;

    for (const p of products) {
      const price = parseFloat(p.price || p.regular_price) || 0;
      // Strip HTML tags from description
      const description = (p.short_description || p.description || "")
        .replace(/<[^>]*>/g, "")
        .trim()
        .slice(0, 500) || null;

      await prisma.product.upsert({
        where: {
          userId_platform_externalProductId: {
            userId,
            platform: "WOOCOMMERCE",
            externalProductId: String(p.id),
          },
        },
        create: {
          userId,
          platform: "WOOCOMMERCE",
          externalProductId: String(p.id),
          name: p.name,
          description,
          price,
          sku: p.sku || null,
          stock: p.stock_quantity,
          imageUrl: p.images?.[0]?.src ?? null,
          isActive: p.status === "publish",
        },
        update: {
          name: p.name,
          description,
          price,
          sku: p.sku || null,
          stock: p.stock_quantity,
          imageUrl: p.images?.[0]?.src ?? null,
          isActive: p.status === "publish",
        },
      });
      total++;
    }

    if (products.length < 100) break;
    page++;
  }

  return total;
}

// ─── Shopify product sync ─────────────────────────────────────────────────────

async function syncShopifyProducts(
  userId: string,
  creds: { shopDomain: string; accessToken: string }
): Promise<number> {
  let total = 0;
  let pageInfo: string | null = null;
  let isFirst = true;

  while (true) {
    const { products, nextPageInfo } = await fetchShopifyProducts(
      creds,
      250,
      isFirst ? undefined : (pageInfo ?? undefined)
    );
    isFirst = false;
    if (!products.length) break;

    for (const p of ShopifyRemoteProductList(products)) {
      await prisma.product.upsert({
        where: {
          userId_platform_externalProductId: {
            userId,
            platform: "SHOPIFY",
            externalProductId: String(p.externalId),
          },
        },
        create: {
          userId,
          platform: "SHOPIFY",
          externalProductId: String(p.externalId),
          name: p.name,
          description: p.description,
          price: p.price,
          comparePrice: p.comparePrice,
          sku: p.sku,
          stock: p.stock,
          imageUrl: p.imageUrl,
          isActive: true,
        },
        update: {
          name: p.name,
          description: p.description,
          price: p.price,
          comparePrice: p.comparePrice,
          sku: p.sku,
          stock: p.stock,
          imageUrl: p.imageUrl,
        },
      });
      total++;
    }

    if (!nextPageInfo) break;
    pageInfo = nextPageInfo;
  }

  return total;
}

// ─── YouCan product sync ──────────────────────────────────────────────────────

async function syncYouCanProducts(
  userId: string,
  creds: { accessToken: string }
): Promise<number> {
  let total = 0;
  let page = 1;

  while (true) {
    const { products, hasMore } = await fetchYouCanProducts(creds, page, 100);
    if (!products.length) break;

    for (const p of products) {
      const price = p.price ?? 0;
      const variant = p.variants?.[0];

      await prisma.product.upsert({
        where: { userId_platform_externalProductId: { userId, platform: "YOUCAN", externalProductId: p.id } },
        create: {
          userId,
          platform: "YOUCAN",
          externalProductId: p.id,
          name: p.name,
          description: p.description?.replace(/<[^>]*>/g, "").trim().slice(0, 500) || null,
          price,
          comparePrice: p.compare_at_price ?? null,
          sku: variant?.sku || null,
          stock: p.inventory ?? null,
          imageUrl: p.thumbnail ?? null,
          isActive: p.visibility,
        },
        update: {
          name: p.name,
          price,
          comparePrice: p.compare_at_price ?? null,
          sku: variant?.sku || null,
          stock: p.inventory ?? null,
          imageUrl: p.thumbnail ?? null,
          isActive: p.visibility,
        },
      });
      total++;
    }

    if (!hasMore) break;
    page++;
  }

  return total;
}

// ─── LightFunnels product sync ────────────────────────────────────────────────

async function syncLFProducts(
  userId: string,
  creds: { accessToken: string }
): Promise<number> {
  let total = 0;
  let cursor: string | null = null;

  while (true) {
    const { products, nextCursor } = await fetchLFProducts(creds, cursor ?? undefined);
    if (!products.length) break;

    for (const p of products) {
      await prisma.product.upsert({
        where: { userId_platform_externalProductId: { userId, platform: "LIGHTFUNNELS", externalProductId: String(p._id) } },
        create: {
          userId,
          platform: "LIGHTFUNNELS",
          externalProductId: String(p._id),
          name: p.title,
          description: p.description?.replace(/<[^>]*>/g, "").trim().slice(0, 500) || null,
          price: p.price ?? 0,
          comparePrice: p.compare_at_price ?? null,
          sku: p.sku || null,
          stock: p.inventory_quantity ?? null,
          imageUrl: p.thumbnail?.url ?? null,
          isActive: true,
        },
        update: {
          name: p.title,
          price: p.price ?? 0,
          comparePrice: p.compare_at_price ?? null,
          sku: p.sku || null,
          stock: p.inventory_quantity ?? null,
          imageUrl: p.thumbnail?.url ?? null,
        },
      });
      total++;
    }

    if (!nextCursor) break;
    cursor = nextCursor;
  }

  return total;
}

function ShopifyRemoteProductList(products: ShopifyRemoteProduct[]) {
  return products.map((p) => {
    const variant = p.variants?.[0];
    const description = p.body_html
      ? p.body_html.replace(/<[^>]*>/g, "").trim().slice(0, 500)
      : null;

    return {
      externalId: p.id,
      name: p.title,
      description: description || null,
      price: parseFloat(variant?.price ?? "0") || 0,
      comparePrice: variant?.compare_at_price ? parseFloat(variant.compare_at_price) : null,
      sku: variant?.sku || null,
      stock: variant?.inventory_quantity ?? null,
      imageUrl: p.images?.[0]?.src ?? null,
    };
  });
}
