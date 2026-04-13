// POST /api/oauth/google/sheet — save spreadsheet ID after OAuth
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const Schema = z.object({ spreadsheetId: z.string().min(10) });

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string } & typeof session.user).id;

  const body = await req.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 422 });

  const integration = await prisma.integration.findFirst({
    where: { userId, type: "GOOGLESHEETS" },
  });
  if (!integration) return NextResponse.json({ error: "Google Sheets not connected" }, { status: 404 });

  await prisma.integration.update({
    where: { id: integration.id },
    data: { shopDomain: parsed.data.spreadsheetId },
  });

  return NextResponse.json({ data: { success: true } });
}
