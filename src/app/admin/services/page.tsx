import { prisma } from "@/lib/db";
import { requireAdminPage, requireAdminPermission } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { revalidatePath } from "next/cache";
import { Building2, MapPin } from "lucide-react";

export const dynamic = "force-dynamic";

async function moderateService(formData: FormData) {
  "use server";
  const id = String(formData.get("id") || "");
  const action = String(formData.get("action") || "");
  const reason = String(formData.get("reason") || "").trim();
  const permission = action === "APPROVE" ? "services:approve" : action === "REJECT" ? "services:approve" : action === "SUSPEND" ? "services:suspend" : "";
  if (!id || !permission || !["APPROVE", "REJECT", "SUSPEND"].includes(action)) throw new Error("Invalid service moderation request.");
  if (action !== "APPROVE" && (reason.length < 5 || reason.length > 1000)) throw new Error("Provide a reason between 5 and 1,000 characters.");
  const actor = await requireAdminPermission(permission);
  const current = await prisma.propertyManagementService.findUnique({ where: { id }, select: { id: true, title: true, status: true, providerUserId: true, provider: { select: { status: true } } } });
  if (!current) throw new Error("Service not found.");
  if (action === "APPROVE" && current.status !== "PENDING_REVIEW") throw new Error("Only a pending service can be approved.");
  if (action === "REJECT" && current.status !== "PENDING_REVIEW") throw new Error("Only a pending service can be rejected.");
  if (action === "SUSPEND" && current.status !== "PUBLISHED") throw new Error("Only a published service can be suspended.");
  if (action === "APPROVE" && current.provider.status !== "ACTIVE") throw new Error("The provider account must be active before this service can be published.");
  const nextStatus = action === "APPROVE" ? "PUBLISHED" : action === "REJECT" ? "REJECTED" : "SUSPENDED";
  await prisma.$transaction(async (tx) => {
    await tx.propertyManagementService.update({ where: { id }, data: { status: nextStatus, reviewedByAdminId: actor.adminUserId, reviewedAt: new Date(), ...(action === "APPROVE" ? { publishedAt: new Date() } : {}) } });
    await tx.notification.create({ data: { userId: current.providerUserId, type: `SERVICE_${nextStatus}`, title: action === "APPROVE" ? "Your service is published" : action === "REJECT" ? "Your service was not approved" : "Your service has been suspended", body: reason || `Your service “${current.title}” has been published.`, data: { serviceId: id } } });
    await tx.auditLog.create({ data: { actorAdminId: actor.adminUserId, actorClerkId: actor.clerkId, action: `PROPERTY_SERVICE_${action}`, entityType: "PropertyManagementService", entityId: id, before: { status: current.status }, after: { status: nextStatus }, metadata: reason ? { reason } : undefined } });
  });
  revalidatePath("/admin/services");
  revalidatePath("/property-management");
  revalidatePath(`/property-management/${id}`);
}

export default async function AdminServicesPage() {
  await requireAdminPage("services:view");
  const services = await prisma.propertyManagementService.findMany({ orderBy: [{ status: "asc" }, { createdAt: "desc" }], take: 200, select: { id: true, title: true, serviceType: true, description: true, state: true, city: true, status: true, createdAt: true, provider: { select: { displayName: true, email: true } } } });
  return <main className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6 lg:px-8"><div className="mb-6"><p className="text-[10px] font-extrabold uppercase tracking-[.14em] text-[#006B1D]">Service operations</p><h1 className="mt-2 text-[26px] font-extrabold tracking-[-.04em] text-[#04180C]">Property service review</h1><p className="mt-1 text-[12px] text-[#657169]">Review provider submissions before they become visible in the public directory.</p></div>
    <div className="overflow-hidden rounded-[14px] border border-[#D5E5DC] bg-[#FFFFFF]"><div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-[12px]"><thead className="border-b border-[#D5E5DC] bg-[#EAF6F1] text-[#68736D]"><tr><th className="p-4">Service</th><th className="p-4">Provider</th><th className="p-4">Location</th><th className="p-4">Status</th><th className="p-4">Submitted</th><th className="p-4">Decision</th></tr></thead><tbody>{services.map((service)=><tr key={service.id} className="border-b border-[#E0EEE6] align-top last:border-0"><td className="p-4"><p className="font-extrabold text-[#04180C]">{service.title}</p><p className="mt-1 text-[10px] text-[#748078]">{service.serviceType}</p><p className="mt-2 max-w-[260px] line-clamp-2 text-[10px] leading-5 text-[#68736D]">{service.description}</p></td><td className="p-4"><p className="font-bold text-[#0F2A18]">{service.provider.displayName}</p><p className="mt-1 text-[10px] text-[#79837D]">{service.provider.email || "No email"}</p></td><td className="p-4 text-[#5D6962]"><span className="flex items-center gap-1"><MapPin className="h-3 w-3"/>{service.city}, {service.state}</span></td><td className="p-4"><Badge variant={service.status === "PUBLISHED" ? "success" : service.status === "PENDING_REVIEW" ? "warning" : "secondary"}>{service.status}</Badge></td><td className="p-4 text-[#748078]">{service.createdAt.toLocaleDateString()}</td><td className="p-4">{service.status === "PENDING_REVIEW" ? <div className="flex min-w-[210px] flex-col gap-2"><form action={moderateService}><input type="hidden" name="id" value={service.id}/><input type="hidden" name="action" value="APPROVE"/><Button size="sm" type="submit">Publish service</Button></form><form action={moderateService} className="space-y-2"><input type="hidden" name="id" value={service.id}/><input type="hidden" name="action" value="REJECT"/><input name="reason" required minLength={5} maxLength={1000} placeholder="Reason for rejection" className="w-full rounded-[8px] border border-[#D5E5DC] px-2 py-2 text-[10px]"/><Button size="sm" type="submit" variant="danger">Reject</Button></form></div> : service.status === "PUBLISHED" ? <form action={moderateService} className="flex min-w-[210px] flex-col gap-2"><input type="hidden" name="id" value={service.id}/><input type="hidden" name="action" value="SUSPEND"/><input name="reason" required minLength={5} maxLength={1000} placeholder="Reason for suspension" className="rounded-[8px] border border-[#D5E5DC] px-2 py-2 text-[10px]"/><Button size="sm" type="submit" variant="danger">Suspend</Button></form> : <span className="text-[10px] text-[#8A938D]">No action available</span>}</td></tr>)}{services.length===0&&<tr><td colSpan={6} className="p-10 text-center text-[#718078]">No property-service submissions have been received.</td></tr>}</tbody></table></div></div>
    <div className="mt-4 flex items-start gap-2 rounded-[10px] bg-[#DDF1E6] p-4 text-[10px] leading-5 text-[#315F4D]"><Building2 className="mt-0.5 h-4 w-4 shrink-0"/>Publishing places a service in the public directory. It does not certify the provider, property ownership, professional licence or service quality.</div>
  </main>;
}
