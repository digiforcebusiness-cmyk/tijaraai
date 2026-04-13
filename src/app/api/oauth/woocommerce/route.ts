// GET /api/oauth/woocommerce?url=https://mystore.com
// Redirects to WooCommerce built-in auth endpoint — no app registration needed

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createOAuthState, appUrl } from "@/lib/oauth-state";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.redirect(new URL("/login", appUrl()));
  const userId = (session.user as { id: string } & typeof session.user).id;

  const storeUrl = req.nextUrl.searchParams.get("url")?.replace(/\/$/, "");
  if (!storeUrl) return NextResponse.json({ error: "url parameter required" }, { status: 400 });

  const state = createOAuthState(userId, "WOOCOMMERCE", storeUrl);
  const callbackUrl = `${appUrl()}/api/oauth/woocommerce/callback`;
  const returnUrl = `${appUrl()}/integrations?success=WOOCOMMERCE`;

  // WooCommerce built-in OAuth — works on every WC store, no app registration
  const authUrl = new URL(`${storeUrl}/wc-auth/v1/authorize`);
  authUrl.searchParams.set("app_name", "Tijara AI");
  authUrl.searchParams.set("scope", "read_write");
  authUrl.searchParams.set("user_id", state); // we abuse user_id to pass state
  authUrl.searchParams.set("return_url", returnUrl);
  authUrl.searchParams.set("callback_url", callbackUrl);

  return NextResponse.redirect(authUrl);
}
