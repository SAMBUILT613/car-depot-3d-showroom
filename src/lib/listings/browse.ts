import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { NIGERIAN_STATES } from "@/lib/nigeria";

export type ListingCategory = "Property" | "Cars" | "Home & Living" | "Marketplace";
export type BrowseParams = Record<string, string | string[] | undefined>;

export const LISTING_CATEGORIES: { value: ListingCategory; label: string; href: string }[] = [
  { value: "Property", label: "Property", href: "/property" },
  { value: "Cars", label: "Cars & vehicles", href: "/cars" },
  { value: "Home & Living", label: "Home & Living", href: "/home-living" },
  { value: "Marketplace", label: "General merchandise", href: "/marketplace" },
];

export function param(params: BrowseParams, key: string, max = 120) {
  const raw = params[key];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function safePrice(value: string) {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 && parsed <= 2_000_000_000 ? parsed : undefined;
}

export function createListingWhere(params: BrowseParams, category?: ListingCategory): Prisma.ListingWhereInput {
  const where: Prisma.ListingWhereInput = { status: "PUBLISHED" };
  if (category) where.category = category;
  const q = param(params, "q", 100);
  const state = param(params, "state", 80);
  const minPrice = safePrice(param(params, "minPrice", 16));
  const maxPrice = safePrice(param(params, "maxPrice", 16));
  const subCategory = param(params, "subCategory", 100);

  if (q) where.OR = [
    { title: { contains: q, mode: "insensitive" } },
    { description: { contains: q, mode: "insensitive" } },
    { subCategory: { contains: q, mode: "insensitive" } },
    { city: { contains: q, mode: "insensitive" } },
    { state: { contains: q, mode: "insensitive" } },
    { area: { contains: q, mode: "insensitive" } },
  ];
  if (state && NIGERIAN_STATES.includes(state)) where.state = state;
  if (subCategory) where.subCategory = { contains: subCategory, mode: "insensitive" };
  if (minPrice !== undefined || maxPrice !== undefined) {
    where.price = {
      ...(minPrice !== undefined ? { gte: minPrice } : {}),
      ...(maxPrice !== undefined ? { lte: maxPrice } : {}),
    };
  }

  if (category === "Property") {
    const intent = param(params, "intent", 40);
    const propertyType = param(params, "propertyType", 80);
    const bedrooms = safePrice(param(params, "bedrooms", 4));
    if (["FOR_RENT", "FOR_SALE", "LAND_FOR_SALE", "COMMERCIAL_FOR_RENT", "COMMERCIAL_FOR_SALE", "SHORT_LET"].includes(intent)) where.intent = intent;
    if (propertyType) where.propertyType = { contains: propertyType, mode: "insensitive" };
    if (bedrooms !== undefined && bedrooms <= 100) where.bedrooms = { gte: bedrooms };
  }

  if (category === "Cars") {
    const condition = param(params, "condition", 60);
    const make = param(params, "make", 80);
    const model = param(params, "model", 80);
    const minYear = safePrice(param(params, "minYear", 4));
    const transmission = param(params, "transmission", 40);
    if (["New", "Foreign Used", "Nigerian Used"].includes(condition)) where.condition = condition;
    if (make) where.make = { contains: make, mode: "insensitive" };
    if (model) where.model = { contains: model, mode: "insensitive" };
    if (["Automatic", "Manual", "CVT"].includes(transmission)) where.transmission = transmission;
    if (minYear && minYear >= 1900 && minYear <= new Date().getFullYear() + 1) where.vehicleYear = { gte: minYear };
  }

  if (category === "Home & Living" || category === "Marketplace") {
    const condition = param(params, "condition", 60);
    const brand = param(params, "brand", 80);
    if (["New", "Used", "Refurbished", "Foreign Used", "Nigerian Used"].includes(condition)) where.condition = condition;
    if (brand) where.itemBrand = { contains: brand, mode: "insensitive" };
  }

  return where;
}

export async function browseListings(params: BrowseParams, category?: ListingCategory) {
  const where = createListingWhere(params, category);
  const sort = param(params, "sort", 20);
  const orderBy: Prisma.ListingOrderByWithRelationInput = sort === "price_low"
    ? { price: "asc" }
    : sort === "price_high"
      ? { price: "desc" }
      : { publishedAt: "desc" };

  const publicBucket = process.env.R2_PUBLIC_BUCKET_NAME?.trim();
  const mediaWhere: Prisma.ListingMediaWhereInput = {
    status: "APPROVED",
    deletedAt: null,
    publicUrl: { not: null },
    ...(publicBucket ? { bucketName: publicBucket } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.listing.findMany({
      where,
      orderBy,
      take: 48,
      include: {
        media: {
          where: mediaWhere,
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          take: 1,
          select: { publicUrl: true, altText: true },
        },
      },
    }),
    prisma.listing.count({ where }),
  ]);

  return { items, total, shown: items.length };
}

export function formatNaira(amount: number, period?: string | null) {
  const value = new Intl.NumberFormat("en-NG", { maximumFractionDigits: 0 }).format(amount);
  return `₦${value}${period ? ` / ${period}` : ""}`;
}
