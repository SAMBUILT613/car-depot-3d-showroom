import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { ensureCurrentUser, isAuthFailure } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

class InvitationClaimError extends Error {
  constructor() {
    super("INVITATION_ALREADY_CLAIMED");
    this.name = "InvitationClaimError";
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await ensureCurrentUser();
    if (!user.email || !user.emailVerified) return NextResponse.json({ ok: false, error: "Verify the invited email address with Clerk before accepting this invitation." }, { status: 403 });
    const body = await request.json().catch(() => null);
    const token = typeof body?.token === "string" ? body.token : "";
    if (!/^[a-f0-9]{64}$/i.test(token)) return NextResponse.json({ ok: false, error: "The invitation link is invalid." }, { status: 400 });
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const invitation = await prisma.adminInvitation.findUnique({
      where: { tokenHash },
      include: { roles: { include: { role: true } }, inviter: { select: { userId: true } } },
    });
    if (!invitation || invitation.status !== "PENDING" || invitation.expiresAt <= new Date() || invitation.emailNormalized !== user.email.trim().toLowerCase()) {
      return NextResponse.json({ ok: false, error: "This invitation is invalid, expired, revoked or belongs to another email address." }, { status: 403 });
    }
    if (!invitation.roles.length || invitation.roles.some((entry) => entry.role.key === "OWNER")) {
      return NextResponse.json({ ok: false, error: "This invitation does not contain a valid administrator role." }, { status: 409 });
    }
    const existing = await prisma.adminUser.findUnique({ where: { userId: user.id }, select: { id: true, status: true, isOwner: true, removedAt: true, suspendedAt: true } });
    if (existing?.isOwner || (existing && (existing.status !== "ACTIVE" || existing.removedAt || existing.suspendedAt))) {
      return NextResponse.json({ ok: false, error: "This account already has an administrator status that requires Owner review." }, { status: 409 });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Claim the invitation atomically. A second concurrent accept/revoke
      // must not be able to reuse or overwrite this one-time token.
      const claimed = await tx.adminInvitation.updateMany({
        where: {
          id: invitation.id,
          status: "PENDING",
          expiresAt: { gt: new Date() },
          emailNormalized: user.email!.trim().toLowerCase(),
        },
        data: { status: "ACCEPTED", acceptedAt: new Date() },
      });
      if (claimed.count !== 1) throw new InvitationClaimError();

      const admin = await tx.adminUser.upsert({
        where: { userId: user.id },
        create: { userId: user.id, status: "ACTIVE", isOwner: false, invitedAt: invitation.createdAt, activatedAt: new Date() },
        update: { status: "ACTIVE", removedAt: null, suspendedAt: null, activatedAt: new Date() },
      });
      await tx.adminUserRole.createMany({
        data: invitation.roles.map((entry) => ({ adminUserId: admin.id, roleId: entry.roleId, assignedById: invitation.inviter.userId })),
        skipDuplicates: true,
      });
      await tx.auditLog.create({
        data: {
          actorAdminId: admin.id,
          actorClerkId: user.clerkId,
          action: "ADMIN_INVITATION_ACCEPTED",
          entityType: "AdminInvitation",
          entityId: invitation.id,
          after: { roleKeys: invitation.roles.map((entry) => entry.role.key) },
        },
      });
      return admin;
    });
    return NextResponse.json({ ok: true, adminUserId: result.id, message: "Administrator access is active. Open the ENES admin dashboard." });
  } catch (error) {
    if (error instanceof InvitationClaimError) return NextResponse.json({ ok: false, error: "This invitation has already been accepted, revoked or expired. Request a new invitation from the ENES Owner." }, { status: 409 });
    if (isAuthFailure(error)) return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    console.error("Administrator invitation acceptance failed", error instanceof Error ? error.name : "UnknownError");
    return NextResponse.json({ ok: false, error: "The invitation could not be accepted." }, { status: 500 });
  }
}
