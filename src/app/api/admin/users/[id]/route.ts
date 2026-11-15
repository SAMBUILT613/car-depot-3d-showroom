import { NextRequest, NextResponse } from "next/server";
import { assertNotOwnerClerkId, isAuthFailure, requireAdminPermission, writeAuditLog } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => null);
    const action = body?.action;
    if (action !== "SUSPEND" && action !== "RESTORE") return NextResponse.json({ ok: false, error: "Unsupported user action." }, { status: 400 });
    const actor = await requireAdminPermission(action === "SUSPEND" ? "users:suspend" : "users:restore");
    const user = await prisma.user.findUnique({ where: { id }, select: { id: true, clerkId: true, status: true, displayName: true, adminUser: { select: { id: true, isOwner: true, status: true } } } });
    if (!user) return NextResponse.json({ ok: false, error: "User not found." }, { status: 404 });
    await assertNotOwnerClerkId(user.clerkId);
    if (user.adminUser) return NextResponse.json({ ok: false, error: "Administrator accounts must be managed through the protected Team controls." }, { status: 403 });
    if (action === "SUSPEND" && user.status === "SUSPENDED") return NextResponse.json({ ok: true, status: user.status });
    if (action === "RESTORE" && user.status === "ACTIVE") return NextResponse.json({ ok: true, status: user.status });

    const changed = await prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({ where: { id }, data: { status: action === "SUSPEND" ? "SUSPENDED" : "ACTIVE" } });
      if (action === "SUSPEND") {
        const listings = await tx.listing.findMany({ where: { sellerUserId: id, status: { in: ["PUBLISHED", "PENDING_REVIEW", "CHANGES_REQUESTED"] } }, select: { id: true, status: true } });
        for (const listing of listings) {
          await tx.listing.update({ where: { id: listing.id }, data: { status: "SELLER_SUSPENDED" } });
          await tx.listingStatusHistory.create({ data: { listingId: listing.id, fromStatus: listing.status, toStatus: "SELLER_SUSPENDED", actorClerkId: actor.clerkId, actorAdminId: actor.adminUserId, reason: "Seller account suspended by ENES administration." } });
        }
      } else {
        const listings = await tx.listing.findMany({ where: { sellerUserId: id, status: "SELLER_SUSPENDED" }, select: { id: true } });
        for (const listing of listings) {
          await tx.listing.update({ where: { id: listing.id }, data: { status: "PENDING_REVIEW", rejectionReason: null, reviewedAt: null, reviewedByAdminId: null } });
          await tx.listingStatusHistory.create({ data: { listingId: listing.id, fromStatus: "SELLER_SUSPENDED", toStatus: "PENDING_REVIEW", actorClerkId: actor.clerkId, actorAdminId: actor.adminUserId, reason: "Seller account restored; listing returned to review queue." } });
        }
      }
      return updated;
    });
    await writeAuditLog(actor, { action: `USER_${action}`, entityType: "User", entityId: id, before: { status: user.status }, after: { status: changed.status } });
    await prisma.securityEvent.create({ data: { userId: id, eventType: `USER_${action}`, severity: "WARNING", metadata: { actorClerkId: actor.clerkId } } });
    return NextResponse.json({ ok: true, status: changed.status });
  } catch (error) {
    if (isAuthFailure(error)) return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    console.error("Marketplace user management failed", error instanceof Error ? error.name : "UnknownError");
    return NextResponse.json({ ok: false, error: "The user account could not be updated." }, { status: 500 });
  }
}
