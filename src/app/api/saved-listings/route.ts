import { NextRequest, NextResponse } from "next/server";
import { ensureCurrentUser, isAuthFailure } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { safeConsumeRateLimit } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await ensureCurrentUser();
    const listingId = request.nextUrl.searchParams.get("listingId");
    if (!listingId || listingId.length > 80) return NextResponse.json({ ok: false, error: "A listing reference is required." }, { status: 400 });
    const saved = await prisma.savedListing.findUnique({ where: { userId_listingId: { userId: user.id, listingId } }, select: { id: true } });
    return NextResponse.json({ ok: true, saved: Boolean(saved) });
  } catch (error) {
    if (isAuthFailure(error)) return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    return NextResponse.json({ ok: false, error: "Saved listings could not be checked." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await ensureCurrentUser();
    const limit = await safeConsumeRateLimit({ request, route: "saved-listing-add", actorId: user.clerkId, limit: 60, windowMs: 60 * 60 * 1000 });
    if (!limit.allowed) return NextResponse.json({ ok: false, error: "Please try again later." }, { status: 429 });
    const body = await request.json().catch(() => null);
    if (typeof body?.listingId !== "string" || body.listingId.length > 80) return NextResponse.json({ ok: false, error: "A valid listing is required." }, { status: 400 });
    const listing = await prisma.listing.findFirst({ where: { id: body.listingId, status: "PUBLISHED" }, select: { id: true } });
    if (!listing) return NextResponse.json({ ok: false, error: "This listing is not available." }, { status: 404 });
    await prisma.savedListing.upsert({
      where: { userId_listingId: { userId: user.id, listingId: listing.id } },
      create: { userId: user.id, listingId: listing.id }, update: {},
    });
    return NextResponse.json({ ok: true, saved: true });
  } catch (error) {
    if (isAuthFailure(error)) return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    console.error("Save listing failed", error instanceof Error ? error.name : "UnknownError");
    return NextResponse.json({ ok: false, error: "The listing could not be saved." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await ensureCurrentUser();
    const body = await request.json().catch(() => null);
    if (typeof body?.listingId !== "string" || body.listingId.length > 80) return NextResponse.json({ ok: false, error: "A valid listing is required." }, { status: 400 });
    await prisma.savedListing.deleteMany({ where: { userId: user.id, listingId: body.listingId } });
    return NextResponse.json({ ok: true, saved: false });
  } catch (error) {
    if (isAuthFailure(error)) return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    return NextResponse.json({ ok: false, error: "The saved listing could not be removed." }, { status: 500 });
  }
}
