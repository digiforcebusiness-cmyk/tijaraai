import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyShopifyConnection } from "@/lib/integrations/shopify";
import { verifyWooConnection } from "@/lib/integrations/woocommerce";
import { verifyYouCanConnection } from "@/lib/integrations/youcan";
import { verifyLFConnection } from "@/lib/integrations/lightfunnels";
import { verifyGSheetsConnection } from "@/lib/integrations/googlesheets";

const ShopifySchema = z.object({
  type: z.literal("SHOPIFY"),
  shopDomain: z.string().min(3),
  accessToken: z.string().min(4),
});

const WooSchema = z.object({
  type: z.literal("WOOCOMMERCE"),
  siteUrl: z.string().url(),
  consumerKey: z.string().min(4),
  consumerSecret: z.string().min(4),
});

const YouCanSchema = z.object({
  type: z.literal("YOUCAN"),
  accessToken: z.string().min(4),
});

const LightFunnelsSchema = z.object({
  type: z.literal("LIGHTFUNNELS"),
  accessToken: z.string().min(4),
});

const GSheetsSchema = z.object({
  type: z.literal("GOOGLESHEETS"),
  accessToken: z.string().min(10), // service account JSON stringified
  shopDomain: z.string().optional(), // spreadsheet ID
});

const UpsertSchema = z.discriminatedUnion("type", [
  ShopifySchema, WooSchema, YouCanSchema, LightFunnelsSchema, GSheetsSchema,
]);

export async function GET(): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string } & typeof session.user).id;

  const integrations = await prisma.integration.findMany({
    where: { userId },
    select: {
      id: true, type: true, isActive: true, lastSyncAt: true, createdAt: true,
      shopDomain: true, siteUrl: true,
    },
  });

  return NextResponse.json({ data: integrations });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string } & typeof session.user).id;

  try {
    const body = await req.json();
    const parsed = UpsertSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 422 });

    const data = parsed.data;

    let storeName = "";
    try {
      if (data.type === "SHOPIFY") {
        storeName = await verifyShopifyConnection({ shopDomain: data.shopDomain, accessToken: data.accessToken });
      } else if (data.type === "WOOCOMMERCE") {
        storeName = await verifyWooConnection({ siteUrl: data.siteUrl, consumerKey: data.consumerKey, consumerSecret: data.consumerSecret });
      } else if (data.type === "YOUCAN") {
        const ok = await verifyYouCanConnection({ accessToken: data.accessToken });
        if (!ok) throw new Error("Invalid YouCan access token");
        storeName = "YouCan Store";
      } else if (data.type === "LIGHTFUNNELS") {
        const ok = await verifyLFConnection({ accessToken: data.accessToken });
        if (!ok) throw new Error("Invalid LightFunnels access token");
        storeName = "LightFunnels";
      } else if (data.type === "GOOGLESHEETS") {
        const spreadsheetId = data.shopDomain ?? "";
        const ok = await verifyGSheetsConnection(data.accessToken, spreadsheetId);
        if (!ok) throw new Error("Could not access Google Sheet — check credentials and spreadsheet ID");
        storeName = "Google Sheets";
      }
    } catch (err) {
      return NextResponse.json(
        { error: `Could not connect to ${data.type}: ${(err as Error).message}` },
        { status: 400 }
      );
    }

    const integration = await prisma.integration.upsert({
      where: { userId_type: { userId, type: data.type } },
      create: { userId, ...data, isActive: true },
      update: { ...data, isActive: true, lastSyncAt: new Date() },
      select: { id: true, type: true, isActive: true, shopDomain: true, siteUrl: true, createdAt: true },
    });

    return NextResponse.json({ data: integration, storeName }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string } & typeof session.user).id;

  const { searchParams } = req.nextUrl;
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await prisma.integration.deleteMany({ where: { id, userId } });
  return NextResponse.json({ data: { success: true } });
}
