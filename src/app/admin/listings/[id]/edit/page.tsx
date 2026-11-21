import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireAdminPage } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { EditListingForm, type EditableListing } from "@/components/forms/edit-listing-form";

export const dynamic = "force-dynamic";

type Snapshot = {
  editor?: { kind?: string; name?: string };
  changes?: Record<string, { from: unknown; to: unknown }>;
  media?: { added?: number; removed?: number; reordered?: boolean };
} | null;
const show = (value: unknown) => {
  if (value === null || value === undefined || value === "") return "—";
  const text = String(value);
  return text.length > 140 ? text.slice(0, 140) + "…" : text;
};

export default async function AdminEditListingPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage("listings:edit");
  const { id } = await params;
  const listing = await prisma.listing.findUnique({
    where: { id },
    include: { media: { where: { deletedAt: null, status: { in: ["APPROVED", "PENDING_REVIEW"] } }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] } },
  });
  if (!listing) notFound();
  const versions = await prisma.listingVersion.findMany({ where: { listingId: id }, orderBy: { version: "desc" }, take: 50 });
  const photos = listing.media.map((media) => ({ id: media.id, url: media.status === "APPROVED" ? media.publicUrl : null, pending: media.status !== "APPROVED" }));

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/admin/listings" className="text-[12px] font-bold text-forest-700">← All listings</Link>
          <h1 className="mt-1 text-[24px] font-extrabold text-ink-900">Edit listing</h1>
          <p className="mt-1 text-[12px] text-muted-600">Seller: {listing.sellerName} · Posted {listing.createdAt.toLocaleDateString("en-NG")}</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={listing.status === "PUBLISHED" ? "success" : listing.status === "PENDING_REVIEW" || listing.status === "CHANGES_REQUESTED" ? "warning" : "secondary"}>{listing.status}</Badge>
          <Link href={`/listing/${listing.id}`} className="text-[12px] font-bold text-forest-700 underline">View public page</Link>
        </div>
      </div>

      <EditListingForm listing={listing as unknown as EditableListing} photos={photos} mode="admin" endpoint={`/api/admin/listings/${listing.id}`} backHref="/admin/listings" viewHref={`/listing/${listing.id}`} />

      <section className="mt-8">
        <h2 className="text-[16px] font-extrabold text-ink-900">Change history</h2>
        <p className="mt-1 text-[12px] text-muted-600">Every edit by the seller or an administrator, newest first.</p>
        <ol className="mt-4 space-y-3">
          {versions.map((version) => {
            const snapshot = version.snapshot as unknown as Snapshot;
            const changes = Object.entries(snapshot?.changes ?? {});
            return (
              <li key={version.id} className="rounded-[12px] border border-line-200 bg-white p-4 text-[12px]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-bold text-ink-900">Version {version.version}{snapshot?.editor?.kind ? ` · ${snapshot.editor.kind === "admin" ? "Admin" : "Seller"} edit` : ""}</p>
                  <p className="text-muted-600">{version.createdAt.toLocaleString("en-NG")}</p>
                </div>
                {version.changeReason && <p className="mt-1 text-ink-700">{version.changeReason}</p>}
                {changes.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {changes.map(([field, change]) => (
                      <li key={field} className="text-muted-600"><span className="font-semibold text-ink-700">{field}:</span> {show(change.from)} → {show(change.to)}</li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
          {versions.length === 0 && <li className="text-[12px] text-muted-600">No changes recorded yet.</li>}
        </ol>
      </section>
    </div>
  );
}
