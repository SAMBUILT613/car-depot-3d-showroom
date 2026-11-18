import type { Metadata } from "next";
import Link from "next/link";
import { Bookmark, Search } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { ListingCard } from "@/components/listings/listing-card";
import { ensureCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatNaira } from "@/lib/listings/browse";
import { getPublishedSiteContent } from "@/lib/site-content";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Saved listings", robots: { index: false, follow: false } };

export default async function SavedListingsPage() {
  const user = await ensureCurrentUser();
  const publicBucket = process.env.R2_PUBLIC_BUCKET_NAME?.trim();
  const [savedRows, siteContent] = await Promise.all([prisma.savedListing.findMany({
    where: { userId: user.id, listing: { status: "PUBLISHED" } },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      listing: {
        include: {
          media: {
            where: { status: "APPROVED", deletedAt: null, publicUrl: { not: null }, ...(publicBucket ? { bucketName: publicBucket } : {}) },
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
            take: 1,
            select: { publicUrl: true, altText: true },
          },
        },
      },
    },
  }), getPublishedSiteContent()]);

  return (
    <div className="flex min-h-screen flex-col bg-[#EAF6F1]">
      <Header />
      <main className="enes-container flex-1 py-8 sm:py-11">
        <div className="mb-7 flex items-end justify-between gap-4"><div><p className="enes-kicker">Your ENES collection</p><h1 className="mt-2 text-[29px] font-extrabold tracking-[-.05em] text-[#04180C] sm:text-[36px]">Saved listings</h1><p className="mt-2 text-[12px] text-[#69756E]">Keep published listings you want to come back to.</p></div><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] bg-[#FBE9E9] text-[#A10D10]"><Bookmark className="h-5 w-5" /></span></div>
        {savedRows.length ? <div className="grid grid-cols-2 gap-2.5 sm:gap-4 xl:grid-cols-4">{savedRows.map(({ listing }) => <ListingCard key={listing.id} id={listing.id} title={listing.title} price={formatNaira(listing.price, listing.pricePeriod)} location={`${listing.city}, ${listing.state}`} category={listing.category} subCategory={listing.subCategory} intent={listing.intent} condition={listing.condition} propertyType={listing.propertyType} bedrooms={listing.bedrooms} bathrooms={listing.bathrooms} parkingSpaces={listing.parkingSpaces} make={listing.make} model={listing.model} vehicleYear={listing.vehicleYear} imageUrl={listing.media[0]?.publicUrl} imageAlt={listing.media[0]?.altText} isFeatured={listing.isFeatured} initiallySaved reviewLabel={siteContent.homepage.reviewBadgeLabel} featuredLabel={siteContent.homepage.featuredBadgeLabel} photoMissingLabel={siteContent.homepage.photoMissingLabel} />)}</div> : <section className="rounded-[16px] border border-dashed border-[#C5D8CC] bg-[#FFFFFF] px-5 py-14 text-center"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#DDF1E6] text-[#006B1D]"><Search className="h-5 w-5" /></span><h2 className="mt-4 text-[18px] font-extrabold text-[#04180C]">No saved listings yet</h2><p className="mx-auto mt-2 max-w-sm text-[12px] leading-6 text-[#69756E]">Browse published listings and use the bookmark icon to keep the ones you want to revisit.</p><Link href="/search" className="enes-button mt-5">Explore listings</Link></section>}
      </main>
      <Footer />
    </div>
  );
}
