/**
 * POST /api/social/send — send a message to a social contact (FB/IG)
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendMetaMessage } from "@/lib/social/meta";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string } & typeof session.user).id;

  const { contactId, text } = await req.json().catch(() => ({})) as { contactId?: string; text?: string };
  if (!contactId || !text?.trim()) {
    return NextResponse.json({ error: "contactId and text required" }, { status: 400 });
  }

  const contact = await prisma.contact.findFirst({
    where: { id: contactId, userId },
    include: { socialPage: true },
  });

  if (!contact?.socialPage) {
    return NextResponse.json({ error: "Contact or social page not found" }, { status: 404 });
  }

  await sendMetaMessage(contact.socialPage.accessToken, contact.jid, text, contact.socialPage.platform);

  const message = await prisma.message.create({
    data: {
      sessionId: null as never,
      contactId: contact.id,
      direction: "OUTBOUND",
      type: "TEXT",
      body: text,
      status: "SENT",
      isAiReply: false,
    },
  });

  return NextResponse.json({ data: message }, { status: 201 });
}
