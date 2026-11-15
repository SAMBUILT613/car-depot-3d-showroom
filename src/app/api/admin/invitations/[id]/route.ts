import { NextResponse } from "next/server";
import { requireOwner, isAuthFailure, writeAuditLog } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireOwner();
    const { id } = await params;
    const invitation = await prisma.adminInvitation.findUnique({ where: { id }, select: { id: true, status: true, emailNormalized: true } });
    if (!invitation) return NextResponse.json({ ok: false, error: "Invitation not found." }, { status: 404 });
    if (invitation.status !== "PENDING") return NextResponse.json({ ok: false, error: "Only pending invitations can be revoked." }, { status: 409 });
    const changed = await prisma.adminInvitation.updateMany({
      where: { id, status: "PENDING" },
      data: { status: "REVOKED", revokedAt: new Date() },
    });
    if (changed.count !== 1) return NextResponse.json({ ok: false, error: "This invitation has already been accepted, revoked or expired." }, { status: 409 });
    await writeAuditLog(actor, { action: "ADMIN_INVITATION_REVOKED", entityType: "AdminInvitation", entityId: id, before: { status: invitation.status }, after: { status: "REVOKED" }, metadata: { emailNormalized: invitation.emailNormalized } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (isAuthFailure(error)) return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    console.error("Invitation revocation failed", error instanceof Error ? error.name : "UnknownError");
    return NextResponse.json({ ok: false, error: "The invitation could not be revoked." }, { status: 500 });
  }
}
