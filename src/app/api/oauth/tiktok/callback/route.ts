// GET /api/oauth/tiktok/callback?code=xxx&state=xxx
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyOAuthState, appUrl } from "@/lib/oauth-state";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = req.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  if (!code || !state) return NextResponse.redirect(new URL("/integrations?error=missing_params", appUrl()));

  const decoded = verifyOAuthState(state);
  if (!decoded || decoded.platform !== "TIKTOK")
    return NextResponse.redirect(new URL("/integrations?error=invalid_state", appUrl()));

  const redirectUri = `${appUrl()}/api/oauth/tiktok/callback`;

  const tokenRes = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_key: process.env.TIKTOK_CLIENT_ID!,
      client_secret: process.env.TIKTOK_CLIENT_SECRET!,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    }),
  });

  if (!tokenRes.ok) {
    console.error("[TikTok OAuth]", await tokenRes.text());
    return NextResponse.redirect(new URL("/integrations?error=token_exchange_failed", appUrl()));
  }

  const json = await tokenRes.json() as { data?: { access_token?: string; refresh_token?: string }; error?: string };
  const accessToken = json.data?.access_token;
  const refreshToken = json.data?.refresh_token;

  if (!accessToken) {
    console.error("[TikTok OAuth] no access_token", json);
    return NextResponse.redirect(new URL("/integrations?error=token_exchange_failed", appUrl()));
  }

  await prisma.integration.upsert({
    where: { userId_type: { userId: decoded.userId, type: "TIKTOK" } },
    create: {
      userId: decoded.userId,
      type: "TIKTOK",
      accessToken,
      consumerKey: refreshToken ?? null,
      isActive: true,
    },
    update: {
      accessToken,
      consumerKey: refreshToken ?? undefined,
      isActive: true,
      lastSyncAt: new Date(),
    },
  });

  return NextResponse.redirect(new URL("/integrations?success=TIKTOK", appUrl()));
}
