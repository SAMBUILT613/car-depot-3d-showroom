import { ListingBrowser } from "@/components/listings/listing-browser";
import type { BrowseParams } from "@/lib/listings/browse";
export const dynamic = "force-dynamic";
export default async function MarketplaceSearchPage({ searchParams }: { searchParams: Promise<BrowseParams> }) {
  return <ListingBrowser category="Marketplace" params={await searchParams} />;
}
