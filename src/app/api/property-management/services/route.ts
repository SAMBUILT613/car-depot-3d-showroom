import { NextRequest, NextResponse } from "next/server";
import { ensureCurrentUser, isAuthFailure } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { safeConsumeRateLimit } from "@/lib/security/rate-limit";
import { validText } from "@/lib/security/http";
import { verifyTurnstile } from "@/lib/turnstile";
import { NIGERIAN_STATES } from "@/lib/nigeria";

export const dynamic = "force-dynamic";
const serviceTypes = new Set(["Property Management", "Facility Management", "Property Maintenance", "Letting & Leasing", "Real Estate Agency", "Inspection & Valuation", "Cleaning & Care", "Other"]);
export async function POST(request: NextRequest) {
  try {
    const user = await ensureCurrentUser();
    const limit = await safeConsumeRateLimit({ request, route: "property-service-submit", actorId: user.clerkId, limit: 5, windowMs: 60 * 60 * 1000 });
    if (!limit.allowed) return NextResponse.json({ ok: false, error: "You have reached the service submission limit. Try again later." }, { status: 429 });
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ ok: false, error: "Invalid service details." }, { status: 400 });
    if (!validText(body.title, 140) || !validText(body.description, 10000) || String(body.description).trim().length < 40 || !serviceTypes.has(body.serviceType) || !NIGERIAN_STATES.includes(String(body.state).trim()) || !validText(body.city, 100)) return NextResponse.json({ ok: false, error: "Complete the required service details using a supported service type and Nigerian state." }, { status: 400 });
    const ip = request.headers.get("cf-connecting-ip") || undefined;
    if (!(await verifyTurnstile(typeof body.turnstileToken === "string" ? body.turnstileToken : "", ip))) return NextResponse.json({ ok: false, error: "Please complete the security check and try again." }, { status: 403 });
    const serviceAreas = Array.isArray(body.serviceAreas) ? body.serviceAreas : [];
    if (serviceAreas.length > 30 || serviceAreas.some((area: unknown) => typeof area !== "string" || area.trim().length > 80)) return NextResponse.json({ ok: false, error: "Check the additional service areas." }, { status: 400 });
    const priceText = body.startingPrice === undefined || body.startingPrice === null || body.startingPrice === "" ? null : Number(body.startingPrice);
    if (priceText !== null && (!Number.isSafeInteger(priceText) || priceText < 0 || priceText > 2_000_000_000)) return NextResponse.json({ ok: false, error: "Enter a valid starting price in naira." }, { status: 400 });
    const service = await prisma.propertyManagementService.create({ data: { providerUserId: user.id, title: body.title.trim(), serviceType: body.serviceType, description: body.description.trim(), state: body.state.trim(), city: body.city.trim(), serviceAreas: serviceAreas.map((area: string) => area.trim()).filter(Boolean), pricingType: typeof body.pricingType === "string" && ["FIXED", "FROM", "QUOTE", "CONTRACT"].includes(body.pricingType) ? body.pricingType : null, startingPrice: priceText, status: "PENDING_REVIEW" }, select: { id: true } });
    await prisma.notification.createMany({ data: [{ userId: user.id, type: "SERVICE_SUBMITTED", title: "Service submitted for review", body: "Your property service is awaiting ENES review.", data: { serviceId: service.id } }] });
    return NextResponse.json({ ok: true, serviceId: service.id, status: "PENDING_REVIEW" }, { status: 201 });
  } catch (error) {
    if (isAuthFailure(error)) return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    console.error("Property service submission failed", error instanceof Error ? error.name : "UnknownError");
    return NextResponse.json({ ok: false, error: "The service could not be submitted. Please try again." }, { status: 500 });
  }
}
