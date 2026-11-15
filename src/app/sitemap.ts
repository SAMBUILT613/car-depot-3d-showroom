import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!configuredUrl) return [];

  let base: URL;
  try {
    base = new URL(configuredUrl);
  } catch {
    return [];
  }

  const staticPaths = [
    "/", "/search", "/property", "/cars", "/home-living",
    "/marketplace", "/property-management", "/about", "/contact",
    "/terms", "/privacy", "/safety",
  ];
  const staticEntries: MetadataRoute.Sitemap = staticPaths.map((path) => ({
    url: new URL(path, base).toString(),
  }));

  const [listings, services] = await Promise.all([
    prisma.listing.findMany({
      where: { status: "PUBLISHED" },
      select: { id: true, updatedAt: true },
      orderBy: { createdAt: "desc" },
      take: 20_000,
    }),
    prisma.propertyManagementService.findMany({
      where: { status: "PUBLISHED", provider: { status: "ACTIVE" } },
      select: { id: true, updatedAt: true },
      orderBy: { createdAt: "desc" },
      take: 5_000,
    }),
  ]);

  return [
    ...staticEntries,
    ...listings.map((listing) => ({
      url: new URL(`/listing/${encodeURIComponent(listing.id)}`, base).toString(),
      lastModified: listing.updatedAt,
    })),
    ...services.map((service) => ({
      url: new URL(`/property-management/${encodeURIComponent(service.id)}`, base).toString(),
      lastModified: service.updatedAt,
    })),
  ];
}
