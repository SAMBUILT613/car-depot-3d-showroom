import { NextRequest, NextResponse } from "next/server";
import { ensureCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { safeConsumeRateLimit } from "@/lib/security/rate-limit";
import { safeRouteError, validText } from "@/lib/security/http";
import * as Ably from "ably";

export const dynamic = "force-dynamic";

async function findOrCreateConversation(listingId: string, buyer: { id: string; clerkId: string }) {
  const listing = await prisma.listing.findFirst({
    where: { id: listingId, status: "PUBLISHED" },
    select: { id: true, title: true, sellerUserId: true },
  });
  if (!listing || !listing.sellerUserId) throw new Error("CHAT_UNAVAILABLE");
  if (listing.sellerUserId === buyer.id) throw new Error("CANNOT_MESSAGE_SELF");

  const blocked = await prisma.userBlock.findFirst({
    where: { OR: [
      { blockerId: buyer.id, blockedId: listing.sellerUserId },
      { blockerId: listing.sellerUserId, blockedId: buyer.id },
    ] },
    select: { id: true },
  });
  if (blocked) throw new Error("MESSAGING_BLOCKED");

  const unique = { listingId_createdByUserId: { listingId: listing.id, createdByUserId: buyer.id } };
  let conversation = await prisma.conversation.findUnique({ where: unique, include: { participants: true } });
  if (conversation?.status === "CLOSED") throw new Error("CONVERSATION_CLOSED");
  if (!conversation) {
    try {
      conversation = await prisma.conversation.create({
        data: {
          listingId: listing.id,
          subject: listing.title,
          createdByUserId: buyer.id,
          participants: { create: [
            { userId: buyer.id, participantRole: "BUYER" },
            { userId: listing.sellerUserId, participantRole: "SELLER" },
          ] },
        },
        include: { participants: true },
      });
    } catch (error) {
      // A concurrent first message may have created the unique conversation.
      if (!(error && typeof error === "object" && "code" in error && error.code === "P2002")) throw error;
      conversation = await prisma.conversation.findUnique({ where: unique, include: { participants: true } });
    }
  }
  if (!conversation || conversation.status !== "OPEN") throw new Error("CONVERSATION_CLOSED");
  return { conversation, listing };
}

export async function GET(request: NextRequest) {
  try {
    const user = await ensureCurrentUser();
    const conversationId = request.nextUrl.searchParams.get("conversationId");
    const listingId = request.nextUrl.searchParams.get("listingId");
    if (!conversationId && !listingId) return NextResponse.json({ ok: false, error: "A listing or conversation is required." }, { status: 400 });
    if (conversationId && listingId) return NextResponse.json({ ok: false, error: "Use either a listing or conversation reference." }, { status: 400 });
    const limit = await safeConsumeRateLimit({ request, route: "message-read", actorId: user.clerkId, limit: 120, windowMs: 10 * 60 * 1000 });
    if (!limit.allowed) return NextResponse.json({ ok: false, error: "Please slow down and try again." }, { status: 429 });

    const conversation = await prisma.conversation.findFirst({
      where: {
        ...(conversationId ? { id: conversationId } : { listingId: listingId! }),
        participants: { some: { userId: user.id } },
      },
      include: {
        messages: {
          where: { status: "VISIBLE", deletedAt: null },
          orderBy: { createdAt: "asc" },
          take: 100,
          select: { id: true, content: true, senderId: true, senderName: true, createdAt: true },
        },
      },
    });
    if (conversation) {
      await prisma.conversationParticipant.updateMany({
        where: { conversationId: conversation.id, userId: user.id },
        data: { lastReadAt: new Date() },
      });
    }
    return NextResponse.json({ ok: true, conversationId: conversation?.id || null, conversationStatus: conversation?.status || null, messages: conversation?.messages || [] });
  } catch (error) {
    return safeRouteError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await ensureCurrentUser();
    const limit = await safeConsumeRateLimit({ request, route: "message-send", actorId: user.clerkId, limit: 30, windowMs: 10 * 60 * 1000 });
    if (!limit.allowed) return NextResponse.json({ ok: false, error: "You are sending messages too quickly." }, { status: 429 });

    const body = await request.json().catch(() => null);
    if (!body || !validText(body.content, 2000)) return NextResponse.json({ ok: false, error: "Enter a message under 2,000 characters." }, { status: 400 });

    let conversationId = typeof body.conversationId === "string" && body.conversationId.length <= 80 ? body.conversationId : null;
    if (!conversationId && typeof body.listingId === "string" && body.listingId.length <= 80) {
      const created = await findOrCreateConversation(body.listingId, user);
      conversationId = created.conversation.id;
    }
    if (!conversationId) return NextResponse.json({ ok: false, error: "A listing or conversation is required." }, { status: 400 });

    const membership = await prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId: user.id } },
      select: { id: true },
    });
    if (!membership) return NextResponse.json({ ok: false, error: "You are not a participant in this conversation." }, { status: 403 });

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { listing: { select: { id: true, title: true } }, participants: { select: { userId: true } } },
    });
    if (!conversation || conversation.status !== "OPEN") return NextResponse.json({ ok: false, error: "This conversation is closed." }, { status: 409 });
    const otherParticipantIds = conversation.participants.map((participant) => participant.userId).filter((id) => id !== user.id);
    if (otherParticipantIds.length !== 1) return NextResponse.json({ ok: false, error: "This conversation is not available." }, { status: 409 });
    const blocked = await prisma.userBlock.findFirst({
      where: { OR: otherParticipantIds.flatMap((id) => [
        { blockerId: user.id, blockedId: id },
        { blockerId: id, blockedId: user.id },
      ]) },
      select: { id: true },
    });
    if (blocked) return NextResponse.json({ ok: false, error: "Messaging is unavailable for this conversation." }, { status: 403 });

    const message = await prisma.$transaction(async (tx) => {
      const created = await tx.message.create({
        data: {
          content: body.content.trim(),
          senderId: user.clerkId,
          senderName: user.displayName,
          senderUserId: user.id,
          listingId: conversation.listingId,
          conversationId,
        },
        select: { id: true, content: true, senderId: true, senderName: true, createdAt: true },
      });
      await tx.conversation.update({ where: { id: conversationId }, data: { lastMessageAt: new Date() } });
      await tx.notification.create({
        data: {
          userId: otherParticipantIds[0],
          type: "NEW_MESSAGE",
          title: "New ENES message",
          body: conversation.listing?.title ? `New enquiry about ${conversation.listing.title}` : "You have a new message",
          data: { conversationId },
        },
      });
      return created;
    });

    if (process.env.ABLY_API_KEY) {
      try {
        const realtime = new Ably.Rest({ key: process.env.ABLY_API_KEY });
        await realtime.channels.get(`conversation:${conversationId}`).publish("new-message", message);
      } catch (error) {
        console.error("Ably publish failed; message remains stored", error instanceof Error ? error.name : "UnknownError");
      }
    }
    return NextResponse.json({ ok: true, conversationId, message }, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      const responses: Record<string, { status: number; message: string }> = {
        CHAT_UNAVAILABLE: { status: 409, message: "In-app messaging is not available for this listing yet. Use the seller's WhatsApp contact." },
        CANNOT_MESSAGE_SELF: { status: 403, message: "You cannot message yourself." },
        MESSAGING_BLOCKED: { status: 403, message: "Messaging is unavailable for this user." },
        CONVERSATION_CLOSED: { status: 409, message: "This conversation is closed." },
      };
      const mapped = responses[error.message];
      if (mapped) return NextResponse.json({ ok: false, error: mapped.message }, { status: mapped.status });
    }
    return safeRouteError(error);
  }
}
