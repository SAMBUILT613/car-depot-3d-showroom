import { NextRequest, NextResponse } from "next/server";
import { ensureCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { notifyActiveAdministrators } from "@/lib/notifications";
import { safeConsumeRateLimit } from "@/lib/security/rate-limit";
import { safeRouteError, validText } from "@/lib/security/http";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const user = await ensureCurrentUser();
    const limit = await safeConsumeRateLimit({ request, route: "support-send", actorId: user.clerkId, limit: 20, windowMs: 60 * 60 * 1000 });
    if (!limit.allowed) return NextResponse.json({ ok: false, error: "You are sending messages too quickly. Please try again later." }, { status: 429 });
    const body = await request.json().catch(() => null);
    if (!body || !validText(body.content, 3000)) return NextResponse.json({ ok: false, error: "Enter a message under 3,000 characters." }, { status: 400 });
    const content = (body.content as string).trim();

    let threadId: string;
    let subject: string;
    if (typeof body.threadId === "string" && body.threadId.length <= 80) {
      const thread = await prisma.supportThread.findFirst({ where: { id: body.threadId, userId: user.id }, select: { id: true, subject: true } });
      if (!thread) return NextResponse.json({ ok: false, error: "Conversation not found." }, { status: 404 });
      await prisma.$transaction([
        prisma.supportMessage.create({ data: { threadId: thread.id, fromStaff: false, senderUserId: user.id, senderName: user.displayName, content } }),
        prisma.supportThread.update({ where: { id: thread.id }, data: { status: "OPEN", lastMessageAt: new Date() } }),
      ]);
      threadId = thread.id; subject = thread.subject;
    } else {
      subject = validText(body.subject, 120) ? (body.subject as string).trim() : "Support request";
      const created = await prisma.supportThread.create({
        data: { userId: user.id, subject, messages: { create: [{ fromStaff: false, senderUserId: user.id, senderName: user.displayName, content }] } },
        select: { id: true },
      });
      threadId = created.id;
    }

    await notifyActiveAdministrators({
      type: "SUPPORT_MESSAGE",
      title: "New support message",
      body: `${user.displayName} wrote: ${content.slice(0, 140)}`,
      data: { threadId },
      href: `/admin/support/${threadId}`,
    }).catch((error) => console.error("Support notification failed", error instanceof Error ? error.name : "UnknownError"));
    return NextResponse.json({ ok: true, threadId }, { status: 201 });
  } catch (error) {
    return safeRouteError(error);
  }
}
