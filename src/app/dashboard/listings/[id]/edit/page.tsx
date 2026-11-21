import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { ensureCurrentUser } from "@/lib/auth";
import { SELLER_EDITABLE_STATUSES } from "@/lib/listings/edit";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { EditListingForm, type EditableListing } from "@/components/forms/edit-listing-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Edit your listing" };

export default async function EditMyListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await ensureCurrentUser();
  const listing = await prisma.listing.findFirst({
    where: { id, OR: [{ sellerUserId: user.id }, { sellerId: user.clerkId }] },
    include: { media: { where: { deletedAt: null, status: { in: ["APPROVED", "PENDING_REVIEW"] } }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] } },
  });
  if (!listing || !SELLER_EDITABLE_STATUSES.includes(listing.status)) notFound();
  const photos = listing.media.map((media) => ({ id: media.id, url: media.status === "APPROVED" ? media.publicUrl : null, pending: media.status !== "APPROVED" }));

  return (
    <div className="flex min-h-screen flex-col bg-[#EAF6F1]">
      <Header />
      <main className="enes-container flex-1 py-8 sm:py-12">
        <div className="mx-auto max-w-3xl">
          <p className="enes-kicker">Your listing</p>
          <h1 className="mb-6 mt-2 text-[28px] font-extrabold tracking-[-.05em] text-[#04180C] sm:text-[34px]">Edit listing</h1>
          <EditListingForm listing={listing as unknown as EditableListing} photos={photos} mode="seller" endpoint={`/api/listings/${listing.id}`} backHref="/dashboard" viewHref={`/listing/${listing.id}`} />
        </div>
      </main>
      <Footer />
    </div>
  );
}
