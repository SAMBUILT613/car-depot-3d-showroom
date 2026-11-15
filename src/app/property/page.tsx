import { ListingBrowser } from "@/components/listings/listing-browser";
import type { BrowseParams } from "@/lib/listings/browse";
export const dynamic = "force-dynamic";
export default async function PropertySearchPage({ searchParams }: { searchParams: Promise<BrowseParams> }) {
  return <ListingBrowser category="Property" params={await searchParams} />;
}
