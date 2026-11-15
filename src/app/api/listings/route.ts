import { NextRequest, NextResponse } from "next/server";
import { ensureCurrentUser, isAuthFailure } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { safeConsumeRateLimit } from "@/lib/security/rate-limit";
import { safeRouteError, validNairaAmount, validText } from "@/lib/security/http";
import { verifyTurnstile } from "@/lib/turnstile";
import { NIGERIAN_STATES } from "@/lib/nigeria";
import { attachPendingMediaToListing } from "@/lib/media/storage";
import { notifyActiveAdministrators } from "@/lib/notifications";

export const dynamic = "force-dynamic";
const ALLOWED_CATEGORIES = new Set(["Property", "Cars", "Home & Living", "Marketplace"]);
const PROPERTY_INTENTS = new Set(["FOR_RENT", "FOR_SALE", "LAND_FOR_SALE", "COMMERCIAL_FOR_RENT", "COMMERCIAL_FOR_SALE", "SHORT_LET"]);
function optionalText(value: unknown, maximum: number) { if (value === undefined || value === null || value === "") return null; return typeof value === "string" && value.trim().length <= maximum ? value.trim() : null; }
function safeInteger(value: unknown, min: number, max: number) { if (value === undefined || value === null || value === "") return null; const n = Number(value); return Number.isSafeInteger(n) && n >= min && n <= max ? n : null; }
function safeNumber(value: unknown, min: number, max: number) { if (value === undefined || value === null || value === "") return null; const n = Number(value); return Number.isFinite(n) && n >= min && n <= max ? n : null; }
function normalizePublicPhone(value: unknown, fallback: string | null) {
  const raw = typeof value === "string" && value.trim() ? value : fallback || "";
  const digits = raw.replace(/\D/g, "");
  if (/^0[789][01]\d{8}$/.test(digits)) return `234${digits.slice(1)}`;
  if (/^234[789][01]\d{8}$/.test(digits)) return digits;
  if (digits.length >= 10 && digits.length <= 15 && !digits.startsWith("0")) return digits;
  return null;
}

export async function GET() {
  try {
    const items = await prisma.listing.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { publishedAt: "desc" },
      take: 20,
      select: {
        id: true, slug: true, title: true, description: true, price: true, pricePeriod: true,
        category: true, subCategory: true, condition: true, intent: true, propertyType: true,
        bedrooms: true, bathrooms: true, landSize: true, furnishing: true, parkingSpaces: true,
        make: true, model: true, vehicleYear: true, mileage: true, transmission: true, fuelType: true,
        itemBrand: true, itemDimensions: true, quantity: true, deliveryAvailable: true,
        state: true, city: true, area: true, isFeatured: true, publishedAt: true, createdAt: true,
        media: {
          where: {
            status: "APPROVED", deletedAt: null, publicUrl: { not: null },
            ...(process.env.R2_PUBLIC_BUCKET_NAME ? { bucketName: process.env.R2_PUBLIC_BUCKET_NAME } : {}),
          },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          take: 10,
          select: { publicUrl: true, altText: true },
        },
      },
    });
    return NextResponse.json({ ok: true, items });
  } catch (error) { return safeRouteError(error); }
}

export async function POST(request: NextRequest) {
  try {
    const user = await ensureCurrentUser();
    const limit = await safeConsumeRateLimit({ request, route: "listing-submit", actorId: user.clerkId, limit: 8, windowMs: 60 * 60 * 1000 });
    if (!limit.allowed) return NextResponse.json({ ok: false, error: "You have reached the listing submission limit. Try again later." }, { status: 429 });
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ ok: false, error: "Invalid listing details." }, { status: 400 });
    const ip = request.headers.get("cf-connecting-ip") || undefined;
    if (!(await verifyTurnstile(typeof body.turnstileToken === "string" ? body.turnstileToken : "", ip))) return NextResponse.json({ ok: false, error: "Please complete the security check and try again." }, { status: 403 });
    if (!validText(body.title, 120) || !validText(body.description, 12000) || String(body.description).trim().length < 30) return NextResponse.json({ ok: false, error: "Provide a clear title and description of at least 30 characters." }, { status: 400 });
    const price = typeof body.price === "string" && body.price.trim() ? Number(body.price) : body.price;
    if (!validNairaAmount(price)) return NextResponse.json({ ok: false, error: "Enter a valid price in naira." }, { status: 400 });
    if (typeof body.category !== "string" || !ALLOWED_CATEGORIES.has(body.category)) return NextResponse.json({ ok: false, error: "Choose a supported listing category." }, { status: 400 });
    if (!validText(body.state, 80) || !NIGERIAN_STATES.includes(body.state.trim()) || !validText(body.city, 100)) return NextResponse.json({ ok: false, error: "Choose a valid Nigerian state and enter a city or town." }, { status: 400 });
    if (body.category === "Property" && (!PROPERTY_INTENTS.has(body.intent) || !validText(body.propertyType, 80))) return NextResponse.json({ ok: false, error: "Choose the property purpose and property type." }, { status: 400 });
    if (body.category === "Cars" && (!validText(body.make, 80) || !validText(body.model, 80) || !["New", "Foreign Used", "Nigerian Used"].includes(body.condition))) return NextResponse.json({ ok: false, error: "Vehicle make, model and condition are required." }, { status: 400 });
    if (["Home & Living", "Marketplace"].includes(body.category) && !["New", "Used", "Refurbished"].includes(body.condition)) return NextResponse.json({ ok: false, error: "Choose the item condition." }, { status: 400 });
    if (body.category === "Marketplace" && !validText(body.subCategory, 100)) return NextResponse.json({ ok: false, error: "Choose or describe the type of item." }, { status: 400 });

    const publicPhone = normalizePublicPhone(body.sellerPhone, user.phone);
    if (!publicPhone) return NextResponse.json({ ok: false, error: "Enter a valid public contact number, including a Nigerian mobile number or international country code." }, { status: 400 });
    const mediaIds = Array.isArray(body.mediaIds) ? body.mediaIds.filter((value: unknown): value is string => typeof value === "string" && value.length <= 80) : [];
    if (mediaIds.length > 10 || new Set(mediaIds).size !== mediaIds.length) return NextResponse.json({ ok: false, error: "Upload no more than 10 distinct listing images." }, { status: 400 });

    const listing = await prisma.$transaction(async (tx) => {
      const created = await tx.listing.create({ data: {
        title: body.title.trim(), description: body.description.trim(), price,
        pricePeriod: optionalText(body.pricePeriod, 40), category: body.category,
        subCategory: optionalText(body.subCategory, 100), condition: optionalText(body.condition, 60),
        intent: optionalText(body.intent, 40), propertyType: optionalText(body.propertyType, 80),
        bedrooms: safeInteger(body.bedrooms, 0, 100), bathrooms: safeNumber(body.bathrooms, 0, 100),
        landSize: optionalText(body.landSize, 80), furnishing: optionalText(body.furnishing, 40),
        parkingSpaces: safeInteger(body.parkingSpaces, 0, 1000), make: optionalText(body.make, 80), model: optionalText(body.model, 80),
        vehicleYear: safeInteger(body.vehicleYear, 1900, new Date().getFullYear()+1), mileage: safeInteger(body.mileage, 0, 2_000_000_000),
        transmission: optionalText(body.transmission, 40), fuelType: optionalText(body.fuelType, 40), itemBrand: optionalText(body.itemBrand, 80),
        itemDimensions: optionalText(body.itemDimensions, 80), quantity: safeInteger(body.quantity, 1, 100000), deliveryAvailable: body.deliveryAvailable === true || body.deliveryAvailable === "true",
        state: body.state.trim(), city: body.city.trim(), area: optionalText(body.area, 120), sellerName: user.displayName,
        sellerPhone: publicPhone, sellerEmail: user.email, sellerId: user.clerkId, sellerUserId: user.id, images: [], status: "PENDING_REVIEW",
      } });
      if (mediaIds.length) await attachPendingMediaToListing({ listingId: created.id, userId: user.id, mediaIds }, tx);
      await tx.listingVersion.create({ data: { listingId: created.id, version: 1, changedByClerkId: user.clerkId, changeReason: "Initial seller submission", snapshot: { title: created.title, description: created.description, price: created.price, category: created.category, state: created.state, city: created.city, status: created.status, mediaIds } } });
      await tx.listingStatusHistory.create({ data: { listingId: created.id, fromStatus: null, toStatus: "PENDING_REVIEW", actorClerkId: user.clerkId, reason: "Seller submitted listing for ENES review." } });
      return created;
    });
    await notifyActiveAdministrators({ type: "LISTING_SUBMITTED", title: "New listing awaiting review", body: `${user.displayName} submitted “${listing.title}” for ENES review.`, data: { listingId: listing.id }, href: "/admin/listings" }).catch((error) => console.error("Administrator notification failed", error instanceof Error ? error.name : "UnknownError"));
    return NextResponse.json({ ok: true, listingId: listing.id, status: listing.status }, { status: 201 });
  } catch (error) {
    if (isAuthFailure(error)) return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    console.error("Listing submission failed", error instanceof Error ? error.name : "UnknownError");
    return NextResponse.json({ ok: false, error: "The listing could not be submitted. Please review the details and try again." }, { status: 500 });
  }
}
