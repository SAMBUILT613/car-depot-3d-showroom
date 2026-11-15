import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { ensureCurrentUser, isAuthFailure } from "@/lib/auth";
import { safeConsumeRateLimit } from "@/lib/security/rate-limit";
import { validOptionalText } from "@/lib/security/http";
import { verifyTurnstile } from "@/lib/turnstile";
import { notifyActiveAdministrators } from "@/lib/notifications";

export const dynamic = "force-dynamic";
const REPORT_REASONS = new Set(["Fake Listing", "Wrong Price / Scam", "Already Sold/Rented", "Misleading Information", "Inappropriate Content", "Other"]);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body.listingId !== "string" || body.listingId.length > 80 || typeof body.reason !== "string" || !REPORT_REASONS.has(body.reason)) {
      return NextResponse.json({ ok: false, error: "Choose a valid report reason." }, { status: 400 });
    }
    if (!validOptionalText(body.details, 1500)) return NextResponse.json({ ok: false, error: "Report details must be 1,500 characters or fewer." }, { status: 400 });

    const { userId: clerkId } = await auth();
    const user = clerkId ? await ensureCurrentUser() : null;
    const limit = await safeConsumeRateLimit({ request, route: "listing-report", actorId: user?.clerkId, limit: 5, windowMs: 60 * 60 * 1000 });
    if (!limit.allowed) return NextResponse.json({ ok: false, error: "You have reached the report limit. Try again later." }, { status: 429 });
    if (!user && !(await verifyTurnstile(typeof body.turnstileToken === "string" ? body.turnstileToken : "", request.headers.get("cf-connecting-ip") || undefined))) {
      return NextResponse.json({ ok: false, error: "Please complete the security check before submitting a report." }, { status: 403 });
    }

    const listing = await prisma.listing.findFirst({ where: { id: body.listingId, status: "PUBLISHED" }, select: { id: true, title: true } });
    if (!listing) return NextResponse.json({ ok: false, error: "The listing could not be found." }, { status: 404 });

    const report = await prisma.report.create({
      data: {
        listingId: listing.id,
        reason: body.reason,
        details: typeof body.details === "string" ? body.details.trim() || null : null,
        reporterUserId: user?.id ?? null,
      },
      select: { id: true, createdAt: true },
    });
    await notifyActiveAdministrators({
      type: "REPORT_RECEIVED",
      title: "New listing report",
      body: `A report was submitted for “${listing.title}”.`,
      data: { reportId: report.id, listingId: listing.id },
      href: "/admin/reports",
    }).catch((error) => console.error("Report notification failed", error instanceof Error ? error.name : "UnknownError"));

    return NextResponse.json({ ok: true, reportId: report.id }, { status: 201 });
  } catch (error) {
    if (isAuthFailure(error)) return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    console.error("Listing report failed", error instanceof Error ? error.name : "UnknownError");
    return NextResponse.json({ ok: false, error: "The report could not be submitted." }, { status: 500 });
  }
}
