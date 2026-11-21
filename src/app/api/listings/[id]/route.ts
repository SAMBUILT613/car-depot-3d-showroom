import { NextRequest, NextResponse } from "next/server";
import { ensureCurrentUser, isAuthFailure, type Actor } from "@/lib/auth";
import { safeConsumeRateLimit } from "@/lib/security/rate-limit";
import { applyListingEdit } from "@/lib/listings/edit";

export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await ensureCurrentUser();
    const limit = await safeConsumeRateLimit({ request, route: "listing-edit", actorId: user.clerkId, limit: 60, windowMs: 60 * 60 * 1000 });
    if (!limit.allowed) return NextResponse.json({ ok: false, error: "You have made too many edits. Please try again later." }, { status: 429 });
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ ok: false, error: "Invalid listing details." }, { status: 400 });
    const { id } = await params;
    const actor: Actor = { clerkId: user.clerkId, userId: user.id, adminUserId: null, isOwner: false, permissions: new Set<string>() };
    const result = await applyListingEdit({ listingId: id, kind: "seller", actor, editorName: user.displayName, body });
    if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
    return NextResponse.json({ ok: true, changed: result.changed, version: result.version });
  } catch (error) {
    if (isAuthFailure(error)) return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    console.error("Listing edit failed", error instanceof Error ? error.name : "UnknownError");
    return NextResponse.json({ ok: false, error: "Your changes could not be saved. Please try again." }, { status: 500 });
  }
}
