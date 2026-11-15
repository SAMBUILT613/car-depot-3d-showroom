import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ensureCurrentUser, isAuthFailure } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { safeConsumeRateLimit } from "@/lib/security/rate-limit";
import { validText } from "@/lib/security/http";
import { verifyTurnstile } from "@/lib/turnstile";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ ok: false, error: "Invalid enquiry." }, { status: 400 });
    const serviceId = typeof body.serviceId === "string" ? body.serviceId.trim() : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const phoneDigits = phone.replace(/[^0-9]/g, "");
    if (!serviceId || serviceId.length > 80 || !validText(name, 100) || !validText(email, 180) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !validText(phone, 24) || phoneDigits.length < 10 || phoneDigits.length > 15 || !validText(message, 4000) || message.length < 15) {
      return NextResponse.json({ ok: false, error: "Provide your name, valid email, phone number and a message of at least 15 characters." }, { status: 400 });
    }
    const session = await auth();
    const user = session.userId ? await ensureCurrentUser() : null;
    const limit = await safeConsumeRateLimit({ request, route: "property-service-enquiry", actorId: user?.clerkId, limit: 5, windowMs: 60 * 60 * 1000 });
    if (!limit.allowed) return NextResponse.json({ ok: false, error: "Too many enquiries from this account or connection. Try again later." }, { status: 429 });
    const ip = request.headers.get("cf-connecting-ip") || undefined;
    if (!(await verifyTurnstile(typeof body.turnstileToken === "string" ? body.turnstileToken : "", ip))) return NextResponse.json({ ok: false, error: "Please complete the security check and try again." }, { status: 403 });
    const service = await prisma.propertyManagementService.findFirst({ where: { id: serviceId, status: "PUBLISHED", provider: { status: "ACTIVE" } }, select: { id: true, providerUserId: true, title: true } });
    if (!service) return NextResponse.json({ ok: false, error: "This service is no longer available." }, { status: 404 });
    if (user?.id === service.providerUserId) return NextResponse.json({ ok: false, error: "You cannot enquire about your own service." }, { status: 400 });
    const enquiry = await prisma.$transaction(async (tx) => {
      const created = await tx.serviceEnquiry.create({ data: { serviceId: service.id, senderUserId: user?.id ?? null, providerUserId: service.providerUserId, name, email, phone, message } });
      await tx.notification.create({ data: { userId: service.providerUserId, type: "SERVICE_ENQUIRY_RECEIVED", title: "New property service enquiry", body: `A new enquiry was received for ${service.title}.`, data: { serviceId: service.id, enquiryId: created.id } } });
      return created;
    });
    return NextResponse.json({ ok: true, enquiryId: enquiry.id }, { status: 201 });
  } catch (error) {
    if (isAuthFailure(error)) return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    console.error("Property service enquiry failed", error instanceof Error ? error.name : "UnknownError");
    return NextResponse.json({ ok: false, error: "Your enquiry could not be sent. Please try again." }, { status: 500 });
  }
}
