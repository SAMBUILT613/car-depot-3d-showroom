import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { safeConsumeRateLimit, requestFingerprint } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";
const EVENT_TYPES = new Set(["VIEW", "WHATSAPP_CLICK"]);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body.listingId !== "string" || body.listingId.length > 80 || typeof body.type !== "string" || !EVENT_TYPES.has(body.type)) {
      return NextResponse.json({ ok: false, error: "Unsupported analytics event." }, { status: 400 });
    }
    const limit = await safeConsumeRateLimit({ request, route: "listing-analytics", limit: 120, windowMs: 10 * 60 * 1000 });
    if (!limit.allowed) return NextResponse.json({ ok: false }, { status: 429 });

    const listing = await prisma.listing.findFirst({ where: { id: body.listingId, status: "PUBLISHED" }, select: { id: true } });
    if (!listing) return NextResponse.json({ ok: false }, { status: 404 });

    const fingerprint = requestFingerprint(request);
    const timeSlot = Math.floor(Date.now() / 10_000);
    const eventKey = createHash("sha256").update(`${fingerprint}:${listing.id}:${body.type}:${timeSlot}`).digest("hex");
    const { userId: clerkId } = await auth();
    const user = clerkId ? await prisma.user.findUnique({ where: { clerkId }, select: { id: true } }) : null;

    try {
      await prisma.analyticsEvent.create({
        data: {
          type: body.type,
          listingId: listing.id,
          userId: user?.id ?? null,
          sessionHash: fingerprint,
          eventKey,
        },
      });
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === "P2002") return NextResponse.json({ ok: true, duplicate: true });
      throw error;
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Listing analytics event failed", error instanceof Error ? error.name : "UnknownError");
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
