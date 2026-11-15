import { ListingBrowser } from "@/components/listings/listing-browser";
import type { BrowseParams, ListingCategory } from "@/lib/listings/browse";
export const dynamic = "force-dynamic";
const allowed = new Set(["Property", "Cars", "Home & Living", "Marketplace"]);
export default async function SearchPage({ searchParams }: { searchParams: Promise<BrowseParams> }) {
  const params = await searchParams;
  const raw = Array.isArray(params.category) ? params.category[0] : params.category;
  const category = typeof raw === "string" && allowed.has(raw) ? raw as ListingCategory : undefined;
  return <ListingBrowser category={category} params={params} />;
}
