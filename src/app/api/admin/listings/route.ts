import { NextRequest, NextResponse } from "next/server";
import { isAuthFailure, requireAdminPermission, writeAuditLog } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { safeConsumeRateLimit } from "@/lib/security/rate-limit";
import { safeRouteError, validNairaAmount, validText } from "@/lib/security/http";
import { NIGERIAN_STATES } from "@/lib/nigeria";
import { attachPendingMediaToListing } from "@/lib/media/storage";

export const dynamic = "force-dynamic";

const ALLOWED_CATEGORIES = new Set(["Property", "Cars", "Home & Living", "Marketplace", "General Merchandise"]);

function optionalText(value: unknown, maximum: number) {
  if (value === undefined || value === null || value === "") return null;
  return typeof value === "string" && value.trim().length <= maximum ? value.trim() : null;
}

function normalizePublicPhone(value: string | null | undefined) {
  const digits = (value || "").replace(/\D/g, "");
  if (/^0[789][01]\d{8}$/.test(digits)) return `234${digits.slice(1)}`;
  if (/^234[789][01]\d{8}$/.test(digits)) return digits;
  if (digits.length >= 10 && digits.length <= 15 && !digits.startsWith("0")) return digits;
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireAdminPermission("listings:create_for_seller");
    await requireAdminPermission("sellers:view");
    const limit = await safeConsumeRateLimit({ request, route: "admin-listing-create", actorId: actor.clerkId, limit: 30, windowMs: 60 * 60 * 1000 });
    if (!limit.allowed) return NextResponse.json({ ok: false, error: "The administrator listing creation limit has been reached. Try again later." }, { status: 429 });

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ ok: false, error: "Invalid listing details." }, { status: 400 });
    }
    const sellerUserId = typeof body.sellerUserId === "string" && body.sellerUserId.length <= 80 ? body.sellerUserId : "";
    if (!sellerUserId) return NextResponse.json({ ok: false, error: "Select an existing seller account." }, { status: 400 });

    const seller = await prisma.user.findFirst({
      where: { id: sellerUserId, status: "ACTIVE", adminUser: null },
      select: { id: true, clerkId: true, email: true, displayName: true, phone: true, sellerProfile: { select: { displayName: true, businessName: true, phone: true, whatsappNumber: true } } },
    });
    if (!seller) return NextResponse.json({ ok: false, error: "The selected seller is unavailable or inactive." }, { status: 404 });

    if (!validText(body.title, 120) || !validText(body.description, 12_000)) {
      return NextResponse.json({ ok: false, error: "Provide a title and description within the allowed length." }, { status: 400 });
    }
    const price = typeof body.price === "string" && body.price.trim() ? Number(body.price) : body.price;
    if (!validNairaAmount(price)) return NextResponse.json({ ok: false, error: "Enter a valid price in naira." }, { status: 400 });
    if (typeof body.category !== "string" || !ALLOWED_CATEGORIES.has(body.category)) {
      return NextResponse.json({ ok: false, error: "Choose a supported listing category." }, { status: 400 });
    }
    if (!validText(body.state, 80) || !NIGERIAN_STATES.includes(body.state.trim())) {
      return NextResponse.json({ ok: false, error: "Choose a valid Nigerian state or the Federal Capital Territory." }, { status: 400 });
    }
    if (!validText(body.city, 100)) return NextResponse.json({ ok: false, error: "Enter a city or town." }, { status: 400 });

    const publicPhone = normalizePublicPhone(seller.sellerProfile?.whatsappNumber || seller.sellerProfile?.phone || seller.phone);
    if (!publicPhone) return NextResponse.json({ ok: false, error: "The selected seller needs a valid public contact number before a listing can be created." }, { status: 400 });

    const mediaIds = Array.isArray(body.mediaIds)
      ? body.mediaIds.filter((value: unknown): value is string => typeof value === "string" && value.length <= 80)
      : [];
    if (mediaIds.length < 1 || mediaIds.length > 10 || new Set(mediaIds).size !== mediaIds.length) {
      return NextResponse.json({ ok: false, error: "Upload between one and ten distinct listing images." }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const listing = await tx.listing.create({
        data: {
          title: body.title.trim(),
          description: body.description.trim(),
          price,
          pricePeriod: optionalText(body.pricePeriod, 40),
          category: body.category,
          subCategory: optionalText(body.subCategory, 100),
          condition: optionalText(body.condition, 60),
          intent: optionalText(body.intent, 40),
          propertyType: optionalText(body.propertyType, 80),
          bedrooms: body.bedrooms === "" || body.bedrooms == null ? null : Number.isInteger(Number(body.bedrooms)) && Number(body.bedrooms) >= 0 && Number(body.bedrooms) <= 100 ? Number(body.bedrooms) : null,
          bathrooms: body.bathrooms === "" || body.bathrooms == null ? null : Number.isFinite(Number(body.bathrooms)) && Number(body.bathrooms) >= 0 && Number(body.bathrooms) <= 100 ? Number(body.bathrooms) : null,
          landSize: optionalText(body.landSize, 80),
          furnishing: optionalText(body.furnishing, 40),
          parkingSpaces: body.parkingSpaces === "" || body.parkingSpaces == null ? null : Number.isInteger(Number(body.parkingSpaces)) && Number(body.parkingSpaces) >= 0 && Number(body.parkingSpaces) <= 1000 ? Number(body.parkingSpaces) : null,
          make: optionalText(body.make, 80),
          model: optionalText(body.model, 80),
          vehicleYear: body.vehicleYear === "" || body.vehicleYear == null ? null : Number.isInteger(Number(body.vehicleYear)) && Number(body.vehicleYear) >= 1900 && Number(body.vehicleYear) <= new Date().getFullYear() + 1 ? Number(body.vehicleYear) : null,
          mileage: body.mileage === "" || body.mileage == null ? null : Number.isSafeInteger(Number(body.mileage)) && Number(body.mileage) >= 0 ? Number(body.mileage) : null,
          transmission: optionalText(body.transmission, 40),
          fuelType: optionalText(body.fuelType, 40),
          itemBrand: optionalText(body.itemBrand, 80),
          itemDimensions: optionalText(body.itemDimensions, 80),
          quantity: body.quantity === "" || body.quantity == null ? null : Number.isSafeInteger(Number(body.quantity)) && Number(body.quantity) > 0 ? Number(body.quantity) : null,
          deliveryAvailable: body.deliveryAvailable === true || body.deliveryAvailable === "true",
          state: body.state.trim(),
          city: body.city.trim(),
          area: optionalText(body.area, 120),
          sellerName: seller.sellerProfile?.businessName || seller.sellerProfile?.displayName || seller.displayName,
          sellerPhone: publicPhone,
          sellerEmail: seller.email,
          sellerId: seller.clerkId,
          sellerUserId: seller.id,
          images: [],
          status: "PENDING_REVIEW",
        },
      });

      await attachPendingMediaToListing({ listingId: listing.id, userId: actor.userId, mediaIds }, tx);
      await tx.listingVersion.create({
        data: {
          listingId: listing.id,
          version: 1,
          changedByClerkId: actor.clerkId,
          changeReason: "Administrator created listing on behalf of seller",
          snapshot: { title: listing.title, description: listing.description, price: listing.price, category: listing.category, state: listing.state, city: listing.city, status: listing.status, mediaIds },
        },
      });
      await tx.listingStatusHistory.create({
        data: { listingId: listing.id, fromStatus: null, toStatus: "PENDING_REVIEW", actorClerkId: actor.clerkId, actorAdminId: actor.adminUserId, reason: "Administrator submitted this listing on behalf of the selected seller." },
      });
      await tx.notification.create({
        data: { userId: seller.id, type: "LISTING_SUBMITTED_BY_ADMIN", title: "A listing was submitted for your account", body: `“${listing.title}” was submitted to ENES for review. It is not public until approved.`, data: { listingId: listing.id } },
      });
      await tx.auditLog.create({
        data: { actorAdminId: actor.adminUserId, actorClerkId: actor.clerkId, action: "LISTING_CREATED_FOR_SELLER", entityType: "Listing", entityId: listing.id, after: { sellerUserId: seller.id, category: listing.category, status: listing.status } },
      });
      return listing;
    });

    return NextResponse.json({ ok: true, item: { id: result.id, title: result.title, status: result.status } }, { status: 201 });
  } catch (error) {
    if (isAuthFailure(error)) return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    if (error instanceof Error && /uploaded images/.test(error.message)) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    return safeRouteError(error);
  }
}
