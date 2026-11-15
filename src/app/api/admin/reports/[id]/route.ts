import { NextRequest, NextResponse } from "next/server";
import { isAuthFailure, requireAdminPermission, writeAuditLog } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => null);
    const action = body?.action;
    if (action !== "ASSIGN" && action !== "RESOLVE" && action !== "DISMISS") {
      return NextResponse.json({ ok: false, error: "Unsupported report action." }, { status: 400 });
    }
    const actor = await requireAdminPermission(action === "ASSIGN" ? "reports:assign" : "reports:resolve");
    const report = await prisma.report.findUnique({ where: { id }, select: { id: true, status: true, assignedToAdminId: true, resolution: true } });
    if (!report) return NextResponse.json({ ok: false, error: "Report not found." }, { status: 404 });
    if (report.status === "RESOLVED" || report.status === "DISMISSED") return NextResponse.json({ ok: false, error: "This report has already been closed." }, { status: 409 });

    let updated;
    if (action === "ASSIGN") {
      if (typeof body.adminUserId !== "string" || body.adminUserId.length > 80) return NextResponse.json({ ok: false, error: "Choose an active administrator." }, { status: 400 });
      const target = await prisma.adminUser.findFirst({ where: { id: body.adminUserId, status: "ACTIVE", isOwner: false, removedAt: null, suspendedAt: null }, select: { id: true } });
      if (!target) return NextResponse.json({ ok: false, error: "The selected administrator is not active." }, { status: 400 });
      updated = await prisma.report.update({ where: { id }, data: { assignedToAdminId: target.id, status: "IN_REVIEW" } });
    } else {
      const resolution = typeof body.resolution === "string" ? body.resolution.trim() : "";
      if (resolution.length < 5 || resolution.length > 1500) return NextResponse.json({ ok: false, error: "A resolution note between 5 and 1,500 characters is required." }, { status: 400 });
      updated = await prisma.report.update({ where: { id }, data: { status: action === "RESOLVE" ? "RESOLVED" : "DISMISSED", resolution, resolvedByClerkId: actor.clerkId, resolvedAt: new Date() } });
    }
    await writeAuditLog(actor, {
      action: `REPORT_${action}`, entityType: "Report", entityId: id,
      before: { status: report.status, assignedToAdminId: report.assignedToAdminId },
      after: { status: updated.status, assignedToAdminId: updated.assignedToAdminId, resolution: updated.resolution },
    });
    return NextResponse.json({ ok: true, status: updated.status });
  } catch (error) {
    if (isAuthFailure(error)) return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    console.error("Report moderation failed", error instanceof Error ? error.name : "UnknownError");
    return NextResponse.json({ ok: false, error: "The report could not be updated." }, { status: 500 });
  }
}
