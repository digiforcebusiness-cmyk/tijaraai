// POST /api/oauth/woocommerce/callback
// WooCommerce posts consumer_key, consumer_secret, user_id (= our state), key_permissions

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyOAuthState, appUrl } from "@/lib/oauth-state";

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: Record<string, string>;
  const ct = req.headers.get("content-type") ?? "";

  if (ct.includes("application/json")) {
    body = await req.json();
  } else {
    const text = await req.text();
    body = Object.fromEntries(new URLSearchParams(text));
  }

  const { consumer_key, consumer_secret, user_id: state } = body;

  if (!consumer_key || !consumer_secret || !state) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const decoded = verifyOAuthState(state);
  if (!decoded || decoded.platform !== "WOOCOMMERCE") {
    return NextResponse.json({ error: "Invalid state" }, { status: 400 });
  }

  const storeUrl = decoded.extra;

  await prisma.integration.upsert({
    where: { userId_type: { userId: decoded.userId, type: "WOOCOMMERCE" } },
    create: {
      userId: decoded.userId,
      type: "WOOCOMMERCE",
      siteUrl: storeUrl,
      consumerKey: consumer_key,
      consumerSecret: consumer_secret,
      isActive: true,
    },
    update: {
      siteUrl: storeUrl,
      consumerKey: consumer_key,
      consumerSecret: consumer_secret,
      isActive: true,
      lastSyncAt: new Date(),
    },
  });

  // WooCommerce expects 200 OK
  return NextResponse.json({ success: true });
}
