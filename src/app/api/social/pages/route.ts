/**
 * Social Pages API
 * GET    /api/social/pages          — list connected pages
 * POST   /api/social/pages          — connect a page (from user token)
 * DELETE /api/social/pages?id=...   — disconnect a page
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getPagesFromUserToken,
  getInstagramAccountForPage,
  exchangeForLongLivedToken,
} from "@/lib/social/meta";

// ─── GET — list connected pages ───────────────────────────────────────────────

export async function GET(): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string } & typeof session.user).id;

  const pages = await prisma.socialPage.findMany({
    where: { userId, isActive: true },
    orderBy: { createdAt: "desc" },
    select: { id: true, platform: true, pageId: true, pageName: true, pictureUrl: true, createdAt: true },
  });

  return NextResponse.json({ data: pages });
}

// ─── POST — connect Facebook page(s) or Instagram from a user access token ───

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string } & typeof session.user).id;

  const body = await req.json().catch(() => ({})) as {
    userAccessToken?: string;
    platform?: string;
    // Direct page token (advanced users)
    pageId?: string;
    pageName?: string;
    pageAccessToken?: string;
  };

  // ── Option A: user access token → auto-discover pages ───────────────────────
  if (body.userAccessToken) {
    const appId = process.env.META_APP_ID ?? "";
    const appSecret = process.env.META_APP_SECRET ?? "";

    // Exchange for long-lived token
    let longLivedToken = body.userAccessToken;
    if (appId && appSecret) {
      longLivedToken = await exchangeForLongLivedToken(appId, appSecret, body.userAccessToken).catch(() => body.userAccessToken!);
    }

    const pages = await getPagesFromUserToken(longLivedToken);
    if (!pages.length) {
      return NextResponse.json({ error: "No Facebook Pages found for this token. Make sure your app has pages_messaging permission." }, { status: 400 });
    }

    const connected: string[] = [];

    for (const page of pages) {
      // Connect Facebook Page
      await prisma.socialPage.upsert({
        where: { userId_platform_pageId: { userId, platform: "FACEBOOK", pageId: page.id } },
        create: {
          userId,
          platform: "FACEBOOK",
          pageId: page.id,
          pageName: page.name,
          accessToken: page.access_token,
          pictureUrl: page.picture?.data?.url ?? null,
        },
        update: {
          pageName: page.name,
          accessToken: page.access_token,
          pictureUrl: page.picture?.data?.url ?? null,
          isActive: true,
        },
      });
      connected.push(`Facebook: ${page.name}`);

      // Auto-connect linked Instagram Business Account
      const igAccount = await getInstagramAccountForPage(page.id, page.access_token);
      if (igAccount) {
        await prisma.socialPage.upsert({
          where: { userId_platform_pageId: { userId, platform: "INSTAGRAM", pageId: igAccount.id } },
          create: {
            userId,
            platform: "INSTAGRAM",
            pageId: igAccount.id,
            pageName: igAccount.name,
            accessToken: page.access_token, // IG uses the page token
            pictureUrl: igAccount.profile_picture_url ?? null,
          },
          update: {
            pageName: igAccount.name,
            accessToken: page.access_token,
            pictureUrl: igAccount.profile_picture_url ?? null,
            isActive: true,
          },
        });
        connected.push(`Instagram: ${igAccount.name}`);
      }
    }

    return NextResponse.json({ data: { connected } });
  }

  // ── Option B: manual page token entry ────────────────────────────────────────
  if (body.pageId && body.pageName && body.pageAccessToken && body.platform) {
    const platform = body.platform as "FACEBOOK" | "INSTAGRAM";
    if (!["FACEBOOK", "INSTAGRAM"].includes(platform)) {
      return NextResponse.json({ error: "Invalid platform" }, { status: 400 });
    }

    await prisma.socialPage.upsert({
      where: { userId_platform_pageId: { userId, platform, pageId: body.pageId } },
      create: { userId, platform, pageId: body.pageId, pageName: body.pageName, accessToken: body.pageAccessToken },
      update: { pageName: body.pageName, accessToken: body.pageAccessToken, isActive: true },
    });

    return NextResponse.json({ data: { connected: [`${platform}: ${body.pageName}`] } });
  }

  return NextResponse.json({ error: "Provide userAccessToken or pageId+pageName+pageAccessToken+platform" }, { status: 400 });
}

// ─── DELETE — disconnect a page ───────────────────────────────────────────────

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string } & typeof session.user).id;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await prisma.socialPage.updateMany({
    where: { id, userId },
    data: { isActive: false },
  });

  return NextResponse.json({ data: { success: true } });
}
