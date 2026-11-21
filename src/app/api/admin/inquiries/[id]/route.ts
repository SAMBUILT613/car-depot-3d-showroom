import { NextRequest, NextResponse } from "next/server";
import * as Ably from "ably";
import { isAuthFailure, requireAdminPermission, writeAuditLog } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createNotification } from "@/lib/notifications";
import { validText } from "@/lib/security/http";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireAdminPermission("enquiries:manage");
    const body = await request.json().catch(() => null);
    if (!body || !validText(body.content, 2000)) return NextResponse.json({ ok: false, error: "Enter a reply under 2,000 characters." }, { status: 400 });
    const { id } = await params;
    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: { listing: { select: { id: true, title: true } }, createdBy: { select: { id: true, email: true } } },
    });
    if (!conversation) return NextResponse.json({ ok: false, error: "Inquiry not found." }, { status: 404 });
    if (conversation.status !== "OPEN") return NextResponse.json({ ok: false, error: "This inquiry is closed. Reopen it first." }, { status: 409 });

    const message = await prisma.$transaction(async (tx) => {
      const created = await tx.message.create({
        data: {
          content: (body.content as string).trim(),
          senderId: actor.clerkId,
          senderName: "ENES Properties",
          senderUserId: actor.userId,
          listingId: conversation.listingId,
          conversationId: conversation.id,
        },
        select: { id: true, content: true, senderId: true, senderName: true, createdAt: true },
      });
      await tx.conversation.update({ where: { id: conversation.id }, data: { lastMessageAt: new Date() } });
      return created;
    });

    await createNotification({
      userId: conversation.createdByUserId,
      type: "INQUIRY_REPLY",
      title: "ENES replied to your inquiry",
      body: `ENES replied about “${conversation.listing.title}”.`,
      data: { conversationId: conversation.id },
      email: conversation.createdBy.email,
      href: `/messages/${conversation.id}`,
    }).catch((error) => console.error("Buyer notification failed", error instanceof Error ? error.name : "UnknownError"));
    await writeAuditLog(actor, { action: "INQUIRY_REPLIED", entityType: "Conversation", entityId: conversation.id, metadata: { listingId: conversation.listingId } })
      .catch((error) => console.error("Inquiry audit failed", error instanceof Error ? error.name : "UnknownError"));

    if (process.env.ABLY_API_KEY) {
      try {
        await new Ably.Rest({ key: process.env.ABLY_API_KEY }).channels.get(`conversation:${conversation.id}`).publish("new-message", message);
      } catch (error) {
        console.error("Ably publish failed; reply remains stored", error instanceof Error ? error.name : "UnknownError");
      }
    }
    return NextResponse.json({ ok: true, message });
  } catch (error) {
    if (isAuthFailure(error)) return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    console.error("Inquiry reply failed", error instanceof Error ? error.name : "UnknownError");
    return NextResponse.json({ ok: false, error: "The reply could not be sent. Please try again." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireAdminPermission("enquiries:manage");
    const body = await request.json().catch(() => null);
    if (!body || (body.status !== "OPEN" && body.status !== "CLOSED")) return NextResponse.json({ ok: false, error: "Choose open or closed." }, { status: 400 });
    const { id } = await params;
    const updated = await prisma.conversation.updateMany({ where: { id }, data: { status: body.status } });
    if (updated.count !== 1) return NextResponse.json({ ok: false, error: "Inquiry not found." }, { status: 404 });
    await writeAuditLog(actor, { action: body.status === "CLOSED" ? "INQUIRY_CLOSED" : "INQUIRY_REOPENED", entityType: "Conversation", entityId: id })
      .catch((error) => console.error("Inquiry audit failed", error instanceof Error ? error.name : "UnknownError"));
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (isAuthFailure(error)) return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    console.error("Inquiry update failed", error instanceof Error ? error.name : "UnknownError");
    return NextResponse.json({ ok: false, error: "The change could not be saved." }, { status: 500 });
  }
}
