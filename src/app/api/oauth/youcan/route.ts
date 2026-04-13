// GET /api/oauth/youcan
// Redirects to YouCan OAuth consent page

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createOAuthState, appUrl } from "@/lib/oauth-state";

export async function GET(_req: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.redirect(new URL("/login", appUrl()));
  const userId = (session.user as { id: string } & typeof session.user).id;

  const clientId = process.env.YOUCAN_CLIENT_ID;
  if (!clientId) return NextResponse.json({ error: "YOUCAN_CLIENT_ID not configured" }, { status: 500 });

  const state = createOAuthState(userId, "YOUCAN");
  const redirectUri = `${appUrl()}/api/oauth/youcan/callback`;

  const authUrl = new URL("https://app.youcan.shop/oauth/authorize");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "orders products");
  authUrl.searchParams.set("state", state);

  return NextResponse.redirect(authUrl);
}
