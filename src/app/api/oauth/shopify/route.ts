// GET /api/oauth/shopify?shop=my-store.myshopify.com
// Redirects user to Shopify OAuth consent page

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createOAuthState, appUrl } from "@/lib/oauth-state";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.redirect(new URL("/login", appUrl()));
  const userId = (session.user as { id: string } & typeof session.user).id;

  const shop = req.nextUrl.searchParams.get("shop")?.replace(/^https?:\/\//, "").replace(/\/$/, "");
  if (!shop) return NextResponse.json({ error: "shop parameter required" }, { status: 400 });

  const clientId = process.env.SHOPIFY_CLIENT_ID;
  if (!clientId) return NextResponse.json({ error: "SHOPIFY_CLIENT_ID not configured" }, { status: 500 });

  const state = createOAuthState(userId, "SHOPIFY", shop);
  const redirectUri = `${appUrl()}/api/oauth/shopify/callback`;

  const authUrl = new URL(`https://${shop}/admin/oauth/authorize`);
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("scope", "read_orders,write_orders,read_products,write_products");
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("state", state);

  return NextResponse.redirect(authUrl);
}
