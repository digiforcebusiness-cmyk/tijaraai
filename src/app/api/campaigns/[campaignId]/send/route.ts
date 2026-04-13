import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendMessage } from "@/lib/whatsapp";

export async function POST(
  _req: NextRequest,
  { params }: { params: { campaignId: string } }
): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string } & typeof session.user).id;

  try {
    const campaign = await prisma.campaign.findFirst({
      where: { id: params.campaignId, userId },
      include: {
        recipients: { include: { contact: true } },
      },
    });

    if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    if (campaign.status === "SENDING" || campaign.status === "SENT")
      return NextResponse.json({ error: "Campaign already sent" }, { status: 400 });

    // Mark as sending
    await prisma.campaign.update({
      where: { id: campaign.id },
      data: { status: "SENDING" },
    });

    let totalSent = 0;
    let totalFailed = 0;

    for (const recipient of campaign.recipients) {
      try {
        await sendMessage(campaign.sessionId, recipient.contact.jid, campaign.message);
        await prisma.campaignRecipient.update({
          where: { id: recipient.id },
          data: { status: "SENT", sentAt: new Date() },
        });
        totalSent++;
        // Small delay to avoid WhatsApp rate limits
        await new Promise((r) => setTimeout(r, 500));
      } catch (err) {
        await prisma.campaignRecipient.update({
          where: { id: recipient.id },
          data: { status: "FAILED", error: (err as Error).message },
        });
        totalFailed++;
      }
    }

    const updated = await prisma.campaign.update({
      where: { id: campaign.id },
      data: { status: "SENT", sentAt: new Date(), totalSent, totalFailed },
    });

    return NextResponse.json({ data: updated });
  } catch (err) {
    await prisma.campaign.update({
      where: { id: params.campaignId },
      data: { status: "FAILED" },
    }).catch(() => {});
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
