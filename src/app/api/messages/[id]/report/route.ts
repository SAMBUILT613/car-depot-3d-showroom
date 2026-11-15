import { NextRequest, NextResponse } from "next/server";
import { ensureCurrentUser, isAuthFailure } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { safeConsumeRateLimit } from "@/lib/security/rate-limit";
import { notifyActiveAdministrators } from "@/lib/notifications";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await ensureCurrentUser();
    const limit = await safeConsumeRateLimit({ request, route: "message-report", actorId: user.clerkId, limit: 5, windowMs: 60 * 60 * 1000 });
    if (!limit.allowed) return NextResponse.json({ ok: false, error: "You have reached the message report limit." }, { status: 429 });
    const body = await request.json().catch(() => null);
    const reason = typeof body?.reason === "string" ? body.reason.trim() : "";
    if (reason.length < 5 || reason.length > 1000) return NextResponse.json({ ok: false, error: "Provide a reason between 5 and 1,000 characters." }, { status: 400 });
    const { id } = await params;
    const message = await prisma.message.findFirst({
      where: { id, conversation: { participants: { some: { userId: user.id } } }, deletedAt: null },
      select: { id: true, senderUserId: true, listingId: true, conversationId: true },
    });
    if (!message || message.senderUserId === user.id) return NextResponse.json({ ok: false, error: "Message not found or cannot be reported." }, { status: 404 });
    const alreadyReported = await prisma.messageModeration.findFirst({ where: { messageId: id, reporterUserId: user.id, action: "REPORTED_BY_USER" }, select: { id: true } });
    if (alreadyReported) return NextResponse.json({ ok: true, alreadyReported: true });
    await prisma.messageModeration.create({ data: { messageId: id, action: "REPORTED_BY_USER", reason, reporterUserId: user.id } });
    await notifyActiveAdministrators({
      type: "MESSAGE_REPORTED",
      title: "A message was reported",
      body: "A marketplace user reported a message for moderator review.",
      data: { messageId: id, listingId: message.listingId, conversationId: message.conversationId },
      href: "/admin/messages",
    }).catch(() => undefined);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    if (isAuthFailure(error)) return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    console.error("Message report failed", error instanceof Error ? error.name : "UnknownError");
    return NextResponse.json({ ok: false, error: "The message could not be reported." }, { status: 500 });
  }
}
