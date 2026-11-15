import { ListingBrowser } from "@/components/listings/listing-browser";
import type { BrowseParams } from "@/lib/listings/browse";
export const dynamic = "force-dynamic";
export default async function CarsSearchPage({ searchParams }: { searchParams: Promise<BrowseParams> }) {
  return <ListingBrowser category="Cars" params={await searchParams} />;
}
