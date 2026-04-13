// GET /api/oauth/lightfunnels/callback?code=xxx&state=xxx

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyOAuthState, appUrl } from "@/lib/oauth-state";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = req.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  if (!code || !state) return NextResponse.redirect(new URL("/integrations?error=missing_params", appUrl()));

  const decoded = verifyOAuthState(state);
  if (!decoded || decoded.platform !== "LIGHTFUNNELS") {
    return NextResponse.redirect(new URL("/integrations?error=invalid_state", appUrl()));
  }

  const tokenRes = await fetch("https://services.lightfunnels.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      grant_type: "authorization_code",
      client_id: process.env.LIGHTFUNNELS_CLIENT_ID,
      client_secret: process.env.LIGHTFUNNELS_CLIENT_SECRET,
      redirect_uri: `${appUrl()}/api/oauth/lightfunnels/callback`,
      code,
    }),
  });

  if (!tokenRes.ok) {
    console.error("[LightFunnels OAuth]", await tokenRes.text());
    return NextResponse.redirect(new URL("/integrations?error=token_exchange_failed", appUrl()));
  }

  const { access_token, refresh_token } = await tokenRes.json() as { access_token: string; refresh_token?: string };

  await prisma.integration.upsert({
    where: { userId_type: { userId: decoded.userId, type: "LIGHTFUNNELS" } },
    create: {
      userId: decoded.userId,
      type: "LIGHTFUNNELS",
      accessToken: access_token,
      consumerKey: refresh_token ?? null,
      isActive: true,
    },
    update: {
      accessToken: access_token,
      consumerKey: refresh_token ?? undefined,
      isActive: true,
      lastSyncAt: new Date(),
    },
  });

  return NextResponse.redirect(new URL("/integrations?success=LIGHTFUNNELS", appUrl()));
}
