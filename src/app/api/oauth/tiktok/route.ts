// GET /api/oauth/tiktok — redirects to TikTok OAuth consent page
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createOAuthState, appUrl } from "@/lib/oauth-state";

export async function GET(req: NextRequest): Promise<NextResponse> {
  void req;
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.redirect(new URL("/login", appUrl()));
  const userId = (session.user as { id: string } & typeof session.user).id;

  const clientId = process.env.TIKTOK_CLIENT_ID;
  if (!clientId) return NextResponse.json({ error: "TIKTOK_CLIENT_ID not configured" }, { status: 500 });

  const state = createOAuthState(userId, "TIKTOK");
  const redirectUri = `${appUrl()}/api/oauth/tiktok/callback`;

  const authUrl = new URL("https://www.tiktok.com/v2/auth/authorize/");
  authUrl.searchParams.set("client_key", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("scope", "user.info.basic");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("response_type", "code");

  return NextResponse.redirect(authUrl);
}
