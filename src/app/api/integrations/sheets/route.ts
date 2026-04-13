import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { exportOrdersToSheetWithToken, exportContactsToSheetWithToken, refreshGoogleToken } from "@/lib/integrations/googlesheets";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string } & typeof session.user).id;

  const { exportType } = await req.json().catch(() => ({ exportType: "orders" }));

  const integration = await prisma.integration.findFirst({
    where: { userId, type: "GOOGLESHEETS", isActive: true },
  });
  if (!integration?.accessToken)
    return NextResponse.json({ error: "Google Sheets not connected" }, { status: 400 });
  if (!integration.shopDomain)
    return NextResponse.json({ error: "Spreadsheet ID not set. Please add it in Integrations." }, { status: 400 });

  // Refresh token if we have one
  let token = integration.accessToken;
  if (integration.consumerKey) {
    try {
      const refreshed = await refreshGoogleToken(integration.consumerKey);
      token = refreshed;
      await prisma.integration.update({ where: { id: integration.id }, data: { accessToken: refreshed } });
    } catch { /* use existing token */ }
  }

  const opts = { accessToken: token, spreadsheetId: integration.shopDomain };

  try {
    if (exportType === "contacts") {
      const contacts = await prisma.contact.findMany({
        where: { userId },
        select: { name: true, phoneNumber: true, tags: true, isLead: true, totalMessages: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      });
      await exportContactsToSheetWithToken(opts, contacts);
      return NextResponse.json({ data: { exported: contacts.length, type: "contacts" } });
    } else {
      const orders = await prisma.order.findMany({
        where: { userId },
        include: { contact: { select: { name: true, phoneNumber: true } } },
        orderBy: { createdAt: "desc" },
      });
      await exportOrdersToSheetWithToken(opts, orders.map((o) => ({ ...o, totalAmount: Number(o.totalAmount) })));
      return NextResponse.json({ data: { exported: orders.length, type: "orders" } });
    }
  } catch (err) {
    console.error("[/api/integrations/sheets]", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
