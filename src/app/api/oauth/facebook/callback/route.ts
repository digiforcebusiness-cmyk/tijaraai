// GET /api/oauth/facebook/callback?code=xxx&state=xxx
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyOAuthState, appUrl } from "@/lib/oauth-state";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = req.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  if (!code || !state) return NextResponse.redirect(new URL("/integrations?error=missing_params", appUrl()));

  const decoded = verifyOAuthState(state);
  if (!decoded || decoded.platform !== "FACEBOOK")
    return NextResponse.redirect(new URL("/integrations?error=invalid_state", appUrl()));

  const redirectUri = `${appUrl()}/api/oauth/facebook/callback`;

  const tokenRes = await fetch(
    `https://graph.facebook.com/v19.0/oauth/access_token?` +
    new URLSearchParams({
      client_id: process.env.META_CLIENT_ID!,
      client_secret: process.env.META_CLIENT_SECRET!,
      redirect_uri: redirectUri,
      code,
    })
  );

  if (!tokenRes.ok) {
    console.error("[Facebook OAuth]", await tokenRes.text());
    return NextResponse.redirect(new URL("/integrations?error=token_exchange_failed", appUrl()));
  }

  const { access_token } = await tokenRes.json() as { access_token: string };

  // Exchange short-lived for long-lived token
  const longRes = await fetch(
    `https://graph.facebook.com/v19.0/oauth/access_token?` +
    new URLSearchParams({
      grant_type: "fb_exchange_token",
      client_id: process.env.META_CLIENT_ID!,
      client_secret: process.env.META_CLIENT_SECRET!,
      fb_exchange_token: access_token,
    })
  );
  const longJson = await longRes.json() as { access_token?: string };
  const finalToken = longJson.access_token ?? access_token;

  await prisma.integration.upsert({
    where: { userId_type: { userId: decoded.userId, type: "FACEBOOK" } },
    create: { userId: decoded.userId, type: "FACEBOOK", accessToken: finalToken, isActive: true },
    update: { accessToken: finalToken, isActive: true, lastSyncAt: new Date() },
  });

  return NextResponse.redirect(new URL("/integrations?success=FACEBOOK", appUrl()));
}
