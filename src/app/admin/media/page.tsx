import { prisma } from "@/lib/db";
import { requireAdminPermission } from "@/lib/auth";
import { MediaReviewActions } from "@/components/admin/media-review-actions";

export const dynamic = "force-dynamic";

export default async function AdminMediaPage() {
  const actor = await requireAdminPermission("media:view");
  const media = await prisma.listingMedia.findMany({
    where: { status: "PENDING_REVIEW", listingId: { not: null }, deletedAt: null },
    orderBy: { createdAt: "asc" }, take: 100,
    select: { id: true, mimeType: true, byteSize: true, width: true, height: true, createdAt: true, listing: { select: { id: true, title: true, status: true, city: true, state: true } } },
  });
  return <main className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6 lg:px-8">
    <h1 className="text-[24px] font-bold text-ink-900">Media review</h1>
    <p className="mt-1 text-[14px] text-muted-600">Private uploads remain unpublished until approved.</p>
    <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {media.map((item) => <article key={item.id} className="overflow-hidden rounded-card border border-line-200 bg-white p-3">
        <div className="aspect-[4/3] overflow-hidden rounded-[8px] bg-paper-50">
          <img src={`/api/admin/media/${item.id}/preview`} alt="Private listing image pending review" className="h-full w-full object-contain" />
        </div>
        <h2 className="mt-3 font-semibold text-ink-900">{item.listing?.title || "Unassigned upload"}</h2>
        <p className="text-[12px] text-muted-600">{item.listing ? `${item.listing.city}, ${item.listing.state}` : "Not attached to a listing"}</p>
        <p className="mt-1 text-[11px] text-muted-600">{item.mimeType} · {(item.byteSize / 1024 / 1024).toFixed(2)} MB · {item.width || "?"} × {item.height || "?"}</p>
        {actor.isOwner || actor.permissions.has("media:approve") || actor.permissions.has("media:reject") ? <MediaReviewActions mediaId={item.id} canApprove={actor.isOwner || actor.permissions.has("media:approve")} canReject={actor.isOwner || actor.permissions.has("media:reject")} /> : <p className="mt-2 text-[12px] text-muted-600">View-only access.</p>}
      </article>)}
    </div>
    {media.length === 0 && <div className="mt-6 rounded-card border border-line-200 bg-white p-10 text-center text-[14px] text-muted-600">No pending image reviews.</div>}
  </main>;
}
