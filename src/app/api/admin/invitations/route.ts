import { randomBytes, createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { requireOwner, isAuthFailure, writeAuditLog } from "@/lib/auth";
import { ASSIGNABLE_ROLE_KEYS } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { sendAdminInvitationEmail } from "@/lib/email";

export const dynamic = "force-dynamic";
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  try {
    const actor = await requireOwner();
    const body = await request.json().catch(() => null);
    const email = typeof body?.email === "string" ? body.email.trim() : "";
    const emailNormalized = email.toLowerCase();
    const roleKeys = Array.isArray(body?.roleKeys) ? [...new Set(body.roleKeys.filter((key: unknown) => typeof key === "string"))] as string[] : [];
    if (email.length > 254 || !EMAIL.test(email) || roleKeys.length < 1 || roleKeys.length > 4 || roleKeys.some((key) => !ASSIGNABLE_ROLE_KEYS.includes(key))) {
      return NextResponse.json({ ok: false, error: "Enter a valid email and select one to four assignable roles. Owner cannot be invited." }, { status: 400 });
    }
    const existingUser = await prisma.user.findUnique({ where: { emailNormalized }, select: { id: true, clerkId: true, adminUser: { select: { id: true, status: true } } } });
    if (existingUser?.clerkId === process.env.ENES_OWNER_CLERK_ID) return NextResponse.json({ ok: false, error: "The configured Owner account cannot receive an invitation." }, { status: 409 });
    if (existingUser?.adminUser?.status === "ACTIVE") return NextResponse.json({ ok: false, error: "This account is already an administrator." }, { status: 409 });

    const roles = await prisma.role.findMany({ where: { key: { in: roleKeys } }, select: { id: true, key: true, name: true } });
    if (roles.length !== roleKeys.length || roles.some((role) => role.key === "OWNER")) return NextResponse.json({ ok: false, error: "One or more selected roles are unavailable." }, { status: 400 });
    await prisma.adminInvitation.updateMany({ where: { emailNormalized, status: "PENDING" }, data: { status: "REVOKED", revokedAt: new Date() } });

    const token = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const invitation = await prisma.adminInvitation.create({
      data: {
        email,
        emailNormalized,
        tokenHash,
        invitedByAdminId: actor.adminUserId!,
        expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
        roles: { create: roles.map((role) => ({ roleId: role.id })) },
      },
    });
    const delivery = await sendAdminInvitationEmail({ email, token, roleNames: roles.map((role) => role.name) });
    if (!delivery.sent) {
      await prisma.adminInvitation.update({ where: { id: invitation.id }, data: { status: "DELIVERY_FAILED" } });
      await writeAuditLog(actor, { action: "ADMIN_INVITATION_DELIVERY_FAILED", entityType: "AdminInvitation", entityId: invitation.id, metadata: { emailNormalized, reason: delivery.reason } });
      return NextResponse.json({ ok: false, error: "The invitation could not be emailed. Configure the verified Resend sender and application URL, then create a new invitation." }, { status: 503 });
    }
    await writeAuditLog(actor, { action: "ADMIN_INVITATION_CREATED", entityType: "AdminInvitation", entityId: invitation.id, after: { emailNormalized, roles: roles.map((role) => role.key), expiresAt: invitation.expiresAt } });
    return NextResponse.json({ ok: true, invitationId: invitation.id, expiresAt: invitation.expiresAt });
  } catch (error) {
    if (isAuthFailure(error)) return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    console.error("Administrator invitation failed", error instanceof Error ? error.name : "UnknownError");
    return NextResponse.json({ ok: false, error: "The invitation could not be created." }, { status: 500 });
  }
}
