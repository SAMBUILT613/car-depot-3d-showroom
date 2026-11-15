import { NextRequest, NextResponse } from "next/server";
import { ensureCurrentUser, isAuthFailure } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { safeConsumeRateLimit } from "@/lib/security/rate-limit";
import { validNairaAmount, validOptionalText, validText } from "@/lib/security/http";

export const dynamic = "force-dynamic";
const CATEGORIES = new Set(["Property", "Cars", "Home & Living", "Marketplace", "General Merchandise"]);

export async function POST(request: NextRequest) {
  try {
    const user = await ensureCurrentUser();
    const limit = await safeConsumeRateLimit({ request, route: "saved-search-create", actorId: user.clerkId, limit: 20, windowMs: 60 * 60 * 1000 });
    if (!limit.allowed) return NextResponse.json({ ok: false, error: "Too many saved searches. Try again later." }, { status: 429 });

    const body = await request.json().catch(() => null);
    if (!body || typeof body.category !== "string" || !CATEGORIES.has(body.category)) {
      return NextResponse.json({ ok: false, error: "Choose a valid category." }, { status: 400 });
    }
    if (!validOptionalText(body.state, 80) || !validOptionalText(body.keyword, 120)) {
      return NextResponse.json({ ok: false, error: "Search filters contain invalid text." }, { status: 400 });
    }
    const maxPrice = body.maxPrice === undefined || body.maxPrice === null || body.maxPrice === "" ? null : Number(body.maxPrice);
    if (maxPrice !== null && !validNairaAmount(maxPrice)) return NextResponse.json({ ok: false, error: "Maximum price is invalid." }, { status: 400 });
    if (!user.email) return NextResponse.json({ ok: false, error: "Add an email address to your ENES account before saving searches." }, { status: 400 });

    const savedSearch = await prisma.savedSearch.create({
      data: {
        userId: user.id,
        email: user.email,
        category: body.category,
        state: typeof body.state === "string" ? body.state.trim() || null : null,
        keyword: typeof body.keyword === "string" ? body.keyword.trim() || null : null,
        maxPrice,
      },
      select: { id: true },
    });
    return NextResponse.json({ ok: true, id: savedSearch.id }, { status: 201 });
  } catch (error) {
    if (isAuthFailure(error)) return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    console.error("Saved search creation failed", error instanceof Error ? error.name : "UnknownError");
    return NextResponse.json({ ok: false, error: "The search could not be saved." }, { status: 500 });
  }
}
