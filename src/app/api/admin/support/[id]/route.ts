import { NextRequest, NextResponse } from "next/server";
import { isAuthFailure, requireAdminPermission, writeAuditLog } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createNotification } from "@/lib/notifications";
import { validText } from "@/lib/security/http";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireAdminPermission("enquiries:manage");
    const body = await request.json().catch(() => null);
    if (!body || !validText(body.content, 3000)) return NextResponse.json({ ok: false, error: "Enter a reply under 3,000 characters." }, { status: 400 });
    const { id } = await params;
    const thread = await prisma.supportThread.findUnique({ where: { id }, select: { id: true, userId: true, subject: true } });
    if (!thread) return NextResponse.json({ ok: false, error: "Conversation not found." }, { status: 404 });
    const staff = await prisma.user.findUnique({ where: { id: actor.userId }, select: { displayName: true } });
    await prisma.$transaction([
      prisma.supportMessage.create({ data: { threadId: thread.id, fromStaff: true, senderUserId: actor.userId, senderName: staff?.displayName || "ENES Support", content: (body.content as string).trim() } }),
      prisma.supportThread.update({ where: { id: thread.id }, data: { status: "OPEN", lastMessageAt: new Date() } }),
    ]);
    const owner = await prisma.user.findUnique({ where: { id: thread.userId }, select: { email: true } });
    await createNotification({
      userId: thread.userId,
      type: "SUPPORT_REPLY",
      title: "ENES replied to your message",
      body: `ENES support replied: “${thread.subject}”.`,
      data: { threadId: thread.id },
      email: owner?.email,
      href: "/support",
    }).catch((error) => console.error("Support notification failed", error instanceof Error ? error.name : "UnknownError"));
    await writeAuditLog(actor, { action: "SUPPORT_REPLIED", entityType: "SupportThread", entityId: thread.id })
      .catch((error) => console.error("Support audit failed", error instanceof Error ? error.name : "UnknownError"));
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (isAuthFailure(error)) return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    console.error("Support reply failed", error instanceof Error ? error.name : "UnknownError");
    return NextResponse.json({ ok: false, error: "The reply could not be sent. Please try again." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireAdminPermission("enquiries:manage");
    const body = await request.json().catch(() => null);
    if (!body || (body.status !== "OPEN" && body.status !== "CLOSED")) return NextResponse.json({ ok: false, error: "Choose open or closed." }, { status: 400 });
    const { id } = await params;
    const updated = await prisma.supportThread.updateMany({ where: { id }, data: { status: body.status } });
    if (updated.count !== 1) return NextResponse.json({ ok: false, error: "Conversation not found." }, { status: 404 });
    await writeAuditLog(actor, { action: body.status === "CLOSED" ? "SUPPORT_CLOSED" : "SUPPORT_REOPENED", entityType: "SupportThread", entityId: id })
      .catch((error) => console.error("Support audit failed", error instanceof Error ? error.name : "UnknownError"));
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (isAuthFailure(error)) return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    console.error("Support update failed", error instanceof Error ? error.name : "UnknownError");
    return NextResponse.json({ ok: false, error: "The change could not be saved." }, { status: 500 });
  }
}
