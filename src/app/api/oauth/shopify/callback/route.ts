// GET /api/oauth/shopify/callback?code=xxx&state=xxx&shop=xxx
// Exchanges code for access token, saves integration

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyOAuthState, appUrl } from "@/lib/oauth-state";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = req.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const shop = searchParams.get("shop");

  if (!code || !state || !shop) {
    return NextResponse.redirect(new URL("/integrations?error=missing_params", appUrl()));
  }

  const decoded = verifyOAuthState(state);
  if (!decoded || decoded.platform !== "SHOPIFY") {
    return NextResponse.redirect(new URL("/integrations?error=invalid_state", appUrl()));
  }

  const clientId = process.env.SHOPIFY_CLIENT_ID!;
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET!;

  // Exchange code for token
  const tokenRes = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(new URL("/integrations?error=token_exchange_failed", appUrl()));
  }

  const { access_token } = await tokenRes.json() as { access_token: string };

  await prisma.integration.upsert({
    where: { userId_type: { userId: decoded.userId, type: "SHOPIFY" } },
    create: { userId: decoded.userId, type: "SHOPIFY", shopDomain: shop, accessToken: access_token, isActive: true },
    update: { shopDomain: shop, accessToken: access_token, isActive: true, lastSyncAt: new Date() },
  });

  return NextResponse.redirect(new URL("/integrations?success=SHOPIFY", appUrl()));
}
