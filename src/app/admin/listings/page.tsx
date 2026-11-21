import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { requireAdminPage, requireAdminPermission } from "@/lib/auth";
import { moderateListing, type ListingModerationAction } from "@/lib/listings/moderate";

async function moderate(formData: FormData) {
  "use server";
  const id = String(formData.get("id") || "");
  const action = String(formData.get("action") || "") as ListingModerationAction;
  const reason = String(formData.get("reason") || "");
  const permissionByAction: Record<ListingModerationAction, string> = {
    APPROVE: "listings:approve",
    REJECT: "listings:reject",
    REQUEST_CHANGES: "listings:request_changes",
    ARCHIVE: "listings:archive",
    SUSPEND: "listings:archive",
  };
  if (!id || !Object.prototype.hasOwnProperty.call(permissionByAction, action)) throw new Error("Invalid moderation request.");
  const actor = await requireAdminPermission(permissionByAction[action]);
  await moderateListing(actor, id, action, reason || undefined);
  revalidatePath("/admin/listings");
  revalidatePath("/");
}

export default async function AdminListingsPage() {
  await requireAdminPage("listings:view");
  const listings = await prisma.listing.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 200,
    select: {
      id: true, title: true, status: true, category: true, city: true, state: true,
      sellerName: true, createdAt: true, rejectionReason: true,
      media: { select: { id: true, status: true } },
    },
  });

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-bold text-ink-900">Listing review</h1>
          <p className="mt-1 text-[14px] text-muted-600">Review seller submissions and record every decision.</p>
        </div>
        <Link href="/admin/media"><Button variant="secondary">Review media</Button></Link>
      </div>

      <div className="overflow-hidden rounded-card border border-line-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-[14px]">
            <thead className="border-b border-line-200 bg-paper-50 text-muted-600">
              <tr><th className="p-4 font-semibold">Listing</th><th className="p-4 font-semibold">Seller</th><th className="p-4 font-semibold">Status</th><th className="p-4 font-semibold">Photos</th><th className="p-4 font-semibold">Submitted</th><th className="p-4 font-semibold">Actions</th></tr>
            </thead>
            <tbody>
              {listings.map((item) => (
                <tr key={item.id} className="border-b border-line-200 last:border-0 align-top">
                  <td className="p-4"><p className="font-semibold text-ink-900">{item.title}</p><p className="mt-1 text-[12px] text-muted-600">{item.category} · {item.city}, {item.state}</p></td>
                  <td className="p-4 text-ink-700">{item.sellerName}</td>
                  <td className="p-4"><Badge variant={item.status === "PUBLISHED" ? "success" : item.status === "PENDING_REVIEW" || item.status === "CHANGES_REQUESTED" ? "warning" : "secondary"}>{item.status}</Badge></td>
                  <td className="p-4 text-muted-600">{item.media.filter((media) => media.status === "APPROVED").length} approved / {item.media.length} uploaded</td>
                  <td className="p-4 text-muted-600">{item.createdAt.toLocaleDateString()}</td>
                  <td className="p-4">
                    <Link href={`/admin/listings/${item.id}/edit`} className="mb-2 block text-[12px] font-bold text-forest-700 underline">Edit listing</Link>
                    {(["PENDING_REVIEW", "CHANGES_REQUESTED"].includes(item.status)) ? (
                      <div className="flex flex-col gap-2">
                        <form action={moderate}><input type="hidden" name="id" value={item.id} /><input type="hidden" name="action" value="APPROVE" /><Button type="submit" size="sm">Approve</Button></form>
                        <form action={moderate} className="flex min-w-[220px] flex-col gap-2">
                          <input type="hidden" name="id" value={item.id} />
                          <input type="hidden" name="action" value="REQUEST_CHANGES" />
                          <input name="reason" required minLength={5} maxLength={2000} placeholder="Correction instructions" className="rounded-control border border-line-200 px-2 py-2 text-[12px]" />
                          <Button type="submit" size="sm" variant="secondary">Request changes</Button>
                        </form>
                        <form action={moderate} className="flex min-w-[220px] flex-col gap-2">
                          <input type="hidden" name="id" value={item.id} />
                          <input type="hidden" name="action" value="REJECT" />
                          <input name="reason" required minLength={5} maxLength={2000} placeholder="Rejection reason" className="rounded-control border border-line-200 px-2 py-2 text-[12px]" />
                          <Button type="submit" size="sm" variant="danger">Reject</Button>
                        </form>
                      </div>
                    ) : <span className="text-[12px] text-muted-600">No review action available</span>}
                  </td>
                </tr>
              ))}
              {listings.length === 0 && <tr><td colSpan={6} className="p-10 text-center text-muted-600">No listing submissions yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
