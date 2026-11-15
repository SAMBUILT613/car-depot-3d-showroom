import { NextRequest, NextResponse } from "next/server";
import { isAuthFailure, requireAdminPermission, writeAuditLog } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireAdminPermission("messages:moderate");
    const { id } = await params;
    const body = await request.json().catch(() => null);
    const action = body?.action;
    const reason = typeof body?.reason === "string" ? body.reason.trim() : "";
    if (!new Set(["HIDE", "RESTORE"]).has(action) || reason.length < 5 || reason.length > 1000) {
      return NextResponse.json({ ok: false, error: "Choose a valid action and provide a reason between 5 and 1,000 characters." }, { status: 400 });
    }
    const message = await prisma.message.findUnique({ where: { id }, select: { id: true, status: true, deletedAt: true, conversationId: true } });
    if (!message || !message.conversationId) return NextResponse.json({ ok: false, error: "Message not found." }, { status: 404 });
    const nextStatus = action === "HIDE" ? "HIDDEN_BY_MODERATOR" : "VISIBLE";
    const updated = await prisma.$transaction(async (tx) => {
      const row = await tx.message.update({ where: { id }, data: { status: nextStatus, deletedAt: action === "HIDE" ? new Date() : null } });
      await tx.messageModeration.create({ data: { messageId: id, action: `ADMIN_${action}`, reason, moderatorId: actor.adminUserId } });
      return row;
    });
    await writeAuditLog(actor, { action: `MESSAGE_${action}`, entityType: "Message", entityId: id, before: { status: message.status }, after: { status: updated.status }, metadata: { reason } });
    return NextResponse.json({ ok: true, status: updated.status });
  } catch (error) {
    if (isAuthFailure(error)) return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    console.error("Message moderation failed", error instanceof Error ? error.name : "UnknownError");
    return NextResponse.json({ ok: false, error: "The message could not be moderated." }, { status: 500 });
  }
}
