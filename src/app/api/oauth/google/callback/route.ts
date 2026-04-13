// GET /api/oauth/google/callback?code=xxx&state=xxx

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyOAuthState, appUrl } from "@/lib/oauth-state";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = req.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  if (!code || !state) return NextResponse.redirect(new URL("/integrations?error=missing_params", appUrl()));

  const decoded = verifyOAuthState(state);
  if (!decoded || decoded.platform !== "GOOGLESHEETS") {
    return NextResponse.redirect(new URL("/integrations?error=invalid_state", appUrl()));
  }

  const redirectUri = `${appUrl()}/api/oauth/google/callback`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    console.error("[Google OAuth]", await tokenRes.text());
    return NextResponse.redirect(new URL("/integrations?error=token_exchange_failed", appUrl()));
  }

  const { access_token, refresh_token } = await tokenRes.json() as {
    access_token: string;
    refresh_token?: string;
  };

  // Store access_token + refresh_token. shopDomain will be set when user adds spreadsheet ID.
  await prisma.integration.upsert({
    where: { userId_type: { userId: decoded.userId, type: "GOOGLESHEETS" } },
    create: {
      userId: decoded.userId,
      type: "GOOGLESHEETS",
      accessToken: access_token,
      consumerKey: refresh_token ?? null, // refresh_token for long-lived access
      isActive: true,
    },
    update: {
      accessToken: access_token,
      consumerKey: refresh_token ?? undefined,
      isActive: true,
      lastSyncAt: new Date(),
    },
  });

  // Redirect to integrations page — user still needs to enter spreadsheet ID
  return NextResponse.redirect(new URL("/integrations?success=GOOGLESHEETS&needsSheet=1", appUrl()));
}
