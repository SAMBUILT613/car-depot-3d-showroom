import { NextRequest, NextResponse } from "next/server";
import { assertNotOwnerClerkId, isAuthFailure, requireOwner, writeAuditLog } from "@/lib/auth";
import { ASSIGNABLE_ROLE_KEYS } from "@/lib/permissions";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireOwner();
    const { id } = await params;
    const body = await request.json().catch(() => null);
    const action = body?.action;
    const target = await prisma.adminUser.findUnique({ where: { id }, include: { user: { select: { clerkId: true, email: true } }, roles: { include: { role: true } } } });
    if (!target) return NextResponse.json({ ok: false, error: "Administrator not found." }, { status: 404 });
    await assertNotOwnerClerkId(target.user.clerkId);
    if (target.isOwner) return NextResponse.json({ ok: false, error: "The protected Owner record cannot be modified here." }, { status: 403 });

    if (action === "ASSIGN_ROLES") {
      const roleKeys = Array.isArray(body.roleKeys) ? [...new Set(body.roleKeys.filter((key: unknown) => typeof key === "string"))] as string[] : [];
      if (roleKeys.length > 6 || roleKeys.some((key) => !ASSIGNABLE_ROLE_KEYS.includes(key))) return NextResponse.json({ ok: false, error: "One or more roles are not assignable." }, { status: 400 });
      const roles = roleKeys.length ? await prisma.role.findMany({ where: { key: { in: roleKeys } }, select: { id: true, key: true } }) : [];
      if (roles.length !== roleKeys.length) return NextResponse.json({ ok: false, error: "One or more roles are unavailable." }, { status: 400 });
      await prisma.$transaction(async (tx) => {
        await tx.adminUserRole.deleteMany({ where: { adminUserId: id } });
        if (roles.length) await tx.adminUserRole.createMany({ data: roles.map((role) => ({ adminUserId: id, roleId: role.id, assignedById: actor.userId })) });
      });
      await writeAuditLog(actor, { action: "ADMIN_ROLES_CHANGED", entityType: "AdminUser", entityId: id, before: { roles: target.roles.map((entry) => entry.role.key) }, after: { roles: roleKeys } });
      return NextResponse.json({ ok: true, roles: roleKeys });
    }

    if (!new Set(["SUSPEND", "RESTORE", "REMOVE"]).has(action)) return NextResponse.json({ ok: false, error: "Unsupported administrator action." }, { status: 400 });
    const before = { status: target.status, suspendedAt: target.suspendedAt, removedAt: target.removedAt };
    const update = action === "SUSPEND"
      ? { status: "SUSPENDED", suspendedAt: new Date() }
      : action === "RESTORE"
        ? { status: "ACTIVE", suspendedAt: null, removedAt: null }
        : { status: "REMOVED", removedAt: new Date() };
    const updated = await prisma.adminUser.update({ where: { id }, data: update });
    await writeAuditLog(actor, { action: `ADMIN_${action}`, entityType: "AdminUser", entityId: id, before, after: { status: updated.status, suspendedAt: updated.suspendedAt, removedAt: updated.removedAt } });
    await prisma.securityEvent.create({ data: { userId: target.userId, eventType: `ADMIN_${action}`, severity: "WARNING", metadata: { actorClerkId: actor.clerkId, adminUserId: id } } });
    return NextResponse.json({ ok: true, status: updated.status });
  } catch (error) {
    if (isAuthFailure(error)) return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    console.error("Administrator management failed", error instanceof Error ? error.name : "UnknownError");
    return NextResponse.json({ ok: false, error: "The administrator could not be updated." }, { status: 500 });
  }
}
