// GET /api/oauth/instagram — redirects to Meta OAuth with Instagram scopes
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createOAuthState, appUrl } from "@/lib/oauth-state";

export async function GET(req: NextRequest): Promise<NextResponse> {
  void req;
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.redirect(new URL("/login", appUrl()));
  const userId = (session.user as { id: string } & typeof session.user).id;

  const clientId = process.env.META_CLIENT_ID;
  if (!clientId) return NextResponse.json({ error: "META_CLIENT_ID not configured" }, { status: 500 });

  const state = createOAuthState(userId, "INSTAGRAM");
  const redirectUri = `${appUrl()}/api/oauth/instagram/callback`;

  const authUrl = new URL("https://www.facebook.com/v19.0/dialog/oauth");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("scope", "pages_show_list,instagram_basic,instagram_manage_messages,pages_read_engagement");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("response_type", "code");

  return NextResponse.redirect(authUrl);
}
