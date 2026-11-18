import { prisma } from "@/lib/db";
import { requireAdminPage, requireAdminPermission } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { revalidatePath } from "next/cache";
import { ClipboardList, MapPin } from "lucide-react";

export const dynamic = "force-dynamic";

async function updateRequest(formData: FormData): Promise<void> {
  "use server";
  const id = String(formData.get("id") || "");
  const status = String(formData.get("status") || "");
  if (!id || !["IN_PROGRESS", "FULFILLED", "CLOSED", "OPEN"].includes(status)) throw new Error("Invalid property-request update.");
  const actor = await requireAdminPermission("property_requests:manage");
  const current = await prisma.propertyRequest.findUnique({ where: { id }, select: { id: true, status: true, userId: true } });
  if (!current) throw new Error("Property request not found.");
  if (current.status === "CLOSED" && status !== "OPEN") throw new Error("Reopen a closed request before changing its status.");
  if (current.status === "FULFILLED" && status !== "OPEN") throw new Error("Reopen a fulfilled request before changing its status.");
  await prisma.$transaction(async (tx) => {
    const row = await tx.propertyRequest.update({ where: { id }, data: { status, ...(status === "IN_PROGRESS" && actor.adminUserId ? { assignedToId: actor.adminUserId } : {}), ...(status === "OPEN" ? { assignedToId: null } : {}) } });
    await tx.auditLog.create({ data: { actorAdminId: actor.adminUserId, actorClerkId: actor.clerkId, action: "PROPERTY_REQUEST_STATUS_CHANGED", entityType: "PropertyRequest", entityId: id, before: { status: current.status }, after: { status: row.status } } });
    await tx.notification.create({ data: { userId: current.userId, type: "PROPERTY_REQUEST_UPDATED", title: "Your property request was updated", body: `Your private property request status is now ${status.toLowerCase().replaceAll("_", " ")}.`, data: { propertyRequestId: id, status } } });
    return row;
  });
  revalidatePath("/admin/property-requests");
  revalidatePath("/dashboard");
}

export default async function AdminPropertyRequestsPage() {
  await requireAdminPage("property_requests:view");
  const requests = await prisma.propertyRequest.findMany({ orderBy: [{ status: "asc" }, { createdAt: "desc" }], take: 200, include: { user: { select: { displayName: true, email: true } }, assignedTo: { select: { user: { select: { displayName: true } } } } } });
  return <main className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6 lg:px-8">
    <div className="mb-6"><p className="text-[10px] font-extrabold uppercase tracking-[.14em] text-[#006B1D]">Buyer requirements</p><h1 className="mt-2 text-[26px] font-extrabold tracking-[-.04em] text-[#04180C]">Private property requests</h1><p className="mt-1 text-[12px] text-[#657169]">Requests are visible only to authorised ENES administrators and the buyer who submitted them.</p></div>
    <div className="grid gap-3">{requests.map((item) => <article key={item.id} className="rounded-[14px] border border-[#D5E5DC] bg-[#FFFFFF] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] font-extrabold uppercase tracking-[.1em] text-[#006B1D]">{item.intent?.replaceAll("_", " ")}</p><h2 className="mt-1 text-[16px] font-extrabold text-[#04180C]">{item.propertyType}</h2><p className="mt-1 flex items-center gap-1 text-[11px] text-[#68736D]"><MapPin className="h-3.5 w-3.5" />{[item.area, item.city, item.state].filter(Boolean).join(", ")}</p></div><Badge variant={item.status === "FULFILLED" ? "success" : item.status === "OPEN" ? "warning" : "secondary"}>{item.status.replaceAll("_", " ")}</Badge></div>
      <div className="mt-4 grid gap-3 border-t border-[#E0EEE6] pt-4 sm:grid-cols-3"><div><p className="text-[9px] font-extrabold uppercase text-[#879189]">Buyer</p><p className="mt-1 text-[12px] font-bold text-[#0F2A18]">{item.user.displayName}</p><p className="text-[10px] text-[#66726A]">{item.user.email || "No email"}</p></div><div><p className="text-[9px] font-extrabold uppercase text-[#879189]">Budget</p><p className="mt-1 text-[12px] font-bold text-[#0F2A18]">{item.minBudget !== null ? `₦${item.minBudget.toLocaleString("en-NG")}` : "No minimum"} – {item.maxBudget !== null ? `₦${item.maxBudget.toLocaleString("en-NG")}` : "No maximum"}</p><p className="text-[10px] text-[#66726A]">{item.bedrooms !== null ? `${item.bedrooms}+ bedrooms` : "Bedrooms not specified"}</p></div><div><p className="text-[9px] font-extrabold uppercase text-[#879189]">Assigned administrator</p><p className="mt-1 text-[12px] font-bold text-[#0F2A18]">{item.assignedTo?.user.displayName || "Not assigned"}</p><p className="text-[10px] text-[#66726A]">Submitted {item.createdAt.toLocaleDateString("en-NG")}</p></div></div>
      <p className="mt-4 whitespace-pre-wrap rounded-[10px] bg-[#EAF6F1] p-4 text-[12px] leading-6 text-[#59665E]">{item.notes || "No additional notes."}</p>
      <div className="mt-4 flex flex-wrap gap-2">{item.status !== "IN_PROGRESS" && item.status !== "FULFILLED" && <form action={updateRequest}><input type="hidden" name="id" value={item.id}/><input type="hidden" name="status" value="IN_PROGRESS"/><Button size="sm" type="submit">Assign to me</Button></form>}{item.status !== "FULFILLED" && <form action={updateRequest}><input type="hidden" name="id" value={item.id}/><input type="hidden" name="status" value="FULFILLED"/><Button size="sm" type="submit" variant="secondary">Mark fulfilled</Button></form>}{item.status !== "CLOSED" && <form action={updateRequest}><input type="hidden" name="id" value={item.id}/><input type="hidden" name="status" value="CLOSED"/><Button size="sm" type="submit" variant="danger">Close request</Button></form>}{(item.status === "CLOSED" || item.status === "FULFILLED") && <form action={updateRequest}><input type="hidden" name="id" value={item.id}/><input type="hidden" name="status" value="OPEN"/><Button size="sm" type="submit" variant="secondary">Reopen</Button></form>}</div>
    </article>)}{requests.length === 0 && <div className="rounded-[14px] border border-dashed border-[#C5D8CC] bg-[#FFFFFF] p-12 text-center"><ClipboardList className="mx-auto h-7 w-7 text-[#006B1D]"/><p className="mt-3 text-[12px] text-[#758079]">No buyer property requests have been submitted.</p></div>}</div>
  </main>;
}
