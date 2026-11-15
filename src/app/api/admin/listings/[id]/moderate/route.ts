import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission, isAuthFailure } from "@/lib/auth";
import { moderateListing, type ListingModerationAction } from "@/lib/listings/moderate";

export const dynamic = "force-dynamic";
const PERMISSION: Record<ListingModerationAction, string> = {
  APPROVE: "listings:approve",
  REJECT: "listings:reject",
  REQUEST_CHANGES: "listings:request_changes",
  ARCHIVE: "listings:archive",
  SUSPEND: "listings:archive",
};
const ACTIONS = new Set(Object.keys(PERMISSION));

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const body = await request.json().catch(() => null);
    const action = typeof body?.action === "string" ? body.action as ListingModerationAction : null;
    if (!action || !ACTIONS.has(action)) return NextResponse.json({ ok: false, error: "Unsupported moderation action." }, { status: 400 });
    const actor = await requireAdminPermission(PERMISSION[action]);
    const { id } = await params;
    const listing = await moderateListing(actor, id, action, typeof body.reason === "string" ? body.reason : undefined);
    return NextResponse.json({ ok: true, listing: { id: listing.id, status: listing.status } });
  } catch (error) {
    if (isAuthFailure(error)) return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    if (error instanceof Error && error.message === "LISTING_NOT_FOUND") return NextResponse.json({ ok: false, error: "Listing not found." }, { status: 404 });
    if (error instanceof Error && (error.message.includes("photo") || error.message.includes("reason") || error.message.includes("seller account"))) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    console.error("Listing moderation failed", error);
    return NextResponse.json({ ok: false, error: "The moderation action could not be completed." }, { status: 500 });
  }
}
