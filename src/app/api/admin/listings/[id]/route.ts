import { NextRequest, NextResponse } from "next/server";
import { isAuthFailure, requireAdminPermission } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { applyListingEdit } from "@/lib/listings/edit";

export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireAdminPermission("listings:edit");
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ ok: false, error: "Invalid listing details." }, { status: 400 });
    const { id } = await params;
    const editor = await prisma.user.findUnique({ where: { id: actor.userId }, select: { displayName: true } });
    const result = await applyListingEdit({ listingId: id, kind: "admin", actor, editorName: editor?.displayName || "ENES admin", body });
    if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
    return NextResponse.json({ ok: true, changed: result.changed, version: result.version });
  } catch (error) {
    if (isAuthFailure(error)) return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    console.error("Admin listing edit failed", error instanceof Error ? error.name : "UnknownError");
    return NextResponse.json({ ok: false, error: "The changes could not be saved. Please try again." }, { status: 500 });
  }
}
