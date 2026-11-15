import { NextRequest, NextResponse } from "next/server";
import { ensureCurrentUser, isAuthFailure } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { safeConsumeRateLimit } from "@/lib/security/rate-limit";
import { validText } from "@/lib/security/http";
import { verifyTurnstile } from "@/lib/turnstile";
import { NIGERIAN_STATES } from "@/lib/nigeria";
import { notifyActiveAdministrators } from "@/lib/notifications";

export const dynamic = "force-dynamic";

const intents = new Set([
  "FOR_RENT",
  "FOR_SALE",
  "LAND_FOR_SALE",
  "COMMERCIAL_FOR_RENT",
  "COMMERCIAL_FOR_SALE",
  "SHORT_LET",
]);

function optionalInteger(value: unknown, min: number, max: number) {
  if (value === undefined || value === null || value === "") return null;
  const number = Number(value);
  return Number.isSafeInteger(number) && number >= min && number <= max ? number : null;
}

export async function POST(request: NextRequest) {
  try {
    const user = await ensureCurrentUser();
    const limit = await safeConsumeRateLimit({ request, route: "property-request-create", actorId: user.clerkId, limit: 5, windowMs: 60 * 60 * 1000 });
    if (!limit.allowed) return NextResponse.json({ ok: false, error: "You have reached the property-request limit. Try again later." }, { status: 429 });

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ ok: false, error: "Invalid property request." }, { status: 400 });
    }

    if (typeof body.intent !== "string" || !intents.has(body.intent)) {
      return NextResponse.json({ ok: false, error: "Choose whether you need a property for sale, rent or short let." }, { status: 400 });
    }
    if (!validText(body.propertyType, 80)) {
      return NextResponse.json({ ok: false, error: "Choose the type of property you need." }, { status: 400 });
    }
    const state = typeof body.state === "string" ? body.state.trim() : "";
    if (state && !NIGERIAN_STATES.includes(state)) {
      return NextResponse.json({ ok: false, error: "Choose a valid Nigerian state." }, { status: 400 });
    }
    if (!validText(body.city, 100) || !validText(body.notes, 3000) || String(body.notes).trim().length < 20) {
      return NextResponse.json({ ok: false, error: "Enter a city or area and describe what you need in at least 20 characters." }, { status: 400 });
    }

    const minBudget = optionalInteger(body.minBudget, 0, 2_000_000_000);
    const maxBudget = optionalInteger(body.maxBudget, 0, 2_000_000_000);
    if (body.minBudget !== undefined && body.minBudget !== "" && minBudget === null) {
      return NextResponse.json({ ok: false, error: "Minimum budget is invalid." }, { status: 400 });
    }
    if (body.maxBudget !== undefined && body.maxBudget !== "" && maxBudget === null) {
      return NextResponse.json({ ok: false, error: "Maximum budget is invalid." }, { status: 400 });
    }
    if (minBudget !== null && maxBudget !== null && minBudget > maxBudget) {
      return NextResponse.json({ ok: false, error: "Minimum budget cannot exceed maximum budget." }, { status: 400 });
    }

    const bedrooms = optionalInteger(body.bedrooms, 0, 100);
    if (body.bedrooms !== undefined && body.bedrooms !== "" && bedrooms === null) {
      return NextResponse.json({ ok: false, error: "Bedroom count is invalid." }, { status: 400 });
    }

    const ip = request.headers.get("cf-connecting-ip") || undefined;
    if (!(await verifyTurnstile(typeof body.turnstileToken === "string" ? body.turnstileToken : "", ip))) {
      return NextResponse.json({ ok: false, error: "Please complete the security check and try again." }, { status: 403 });
    }

    const propertyRequest = await prisma.propertyRequest.create({
      data: {
        userId: user.id,
        intent: body.intent,
        propertyType: body.propertyType.trim(),
        state: state || null,
        city: body.city.trim(),
        area: typeof body.area === "string" ? body.area.trim().slice(0, 120) || null : null,
        minBudget,
        maxBudget,
        bedrooms,
        notes: body.notes.trim(),
        status: "OPEN",
      },
      select: { id: true },
    });

    await notifyActiveAdministrators({
      type: "PROPERTY_REQUEST_SUBMITTED",
      title: "New property request",
      body: `${user.displayName} submitted a private property request for ${body.propertyType.trim()} in ${body.city.trim()}.`,
      data: { propertyRequestId: propertyRequest.id },
      href: "/admin/property-requests",
    }).catch((error) => console.error("Property-request notification failed", error instanceof Error ? error.name : "UnknownError"));

    return NextResponse.json({ ok: true, propertyRequestId: propertyRequest.id, status: "OPEN" }, { status: 201 });
  } catch (error) {
    if (isAuthFailure(error)) return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    console.error("Property request submission failed", error instanceof Error ? error.name : "UnknownError");
    return NextResponse.json({ ok: false, error: "Your property request could not be submitted." }, { status: 500 });
  }
}
