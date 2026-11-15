import { prisma } from "@/lib/db";
import { requireAdminPage, requireAdminPermission } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";
async function updateEnquiry(formData: FormData) {
  "use server";
  const id = String(formData.get("id") || "");
  const status = String(formData.get("status") || "");
  if (!id || !["IN_PROGRESS", "CLOSED"].includes(status)) throw new Error("Invalid enquiry update.");
  const actor = await requireAdminPermission("service_enquiries:manage");
  await prisma.$transaction(async (tx) => {
    const current = await tx.serviceEnquiry.findUnique({ where: { id }, select: { id: true, status: true } });
    if (!current) throw new Error("Service enquiry not found.");
    if (current.status === "CLOSED") throw new Error("Closed enquiries cannot be reopened from this queue.");
    if (current.status === status) return;
    const changed = await tx.serviceEnquiry.updateMany({
      where: { id, status: current.status },
      data: { status },
    });
    if (changed.count !== 1) throw new Error("The enquiry changed while you were updating it. Refresh and try again.");
    await tx.auditLog.create({
      data: {
        actorAdminId: actor.adminUserId,
        actorClerkId: actor.clerkId,
        action: "SERVICE_ENQUIRY_STATUS_CHANGED",
        entityType: "ServiceEnquiry",
        entityId: id,
        before: { status: current.status },
        after: { status },
      },
    });
  });
  revalidatePath("/admin/service-enquiries");
}

export default async function AdminServiceEnquiriesPage() {
  await requireAdminPage("service_enquiries:view");
  const enquiries = await prisma.serviceEnquiry.findMany({ orderBy: { createdAt: "desc" }, take: 200, include: { service: { select: { title: true, serviceType: true } }, provider: { select: { displayName: true } } } });
  return <main className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6 lg:px-8"><div className="mb-6"><p className="text-[10px] font-extrabold uppercase tracking-[.14em] text-[#176B57]">Provider communications</p><h1 className="mt-2 text-[26px] font-extrabold tracking-[-.04em] text-[#18211F]">Service enquiries</h1><p className="mt-1 text-[12px] text-[#657169]">Enquiries sent through published property-management services.</p></div><div className="grid gap-3">{enquiries.map((item)=><article key={item.id} className="rounded-[14px] border border-[#E5E0D6] bg-[#FFFDF8] p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] font-extrabold uppercase tracking-[.1em] text-[#176B57]">{item.service.serviceType}</p><h2 className="mt-1 text-[15px] font-extrabold text-[#18211F]">{item.service.title}</h2><p className="mt-1 text-[10px] text-[#79837D]">For {item.provider.displayName} · {item.createdAt.toLocaleString()}</p></div><Badge variant={item.status === "CLOSED" ? "secondary" : item.status === "IN_PROGRESS" ? "success" : "warning"}>{item.status}</Badge></div><div className="mt-4 grid gap-3 border-t border-[#EAE5DB] pt-4 sm:grid-cols-3"><div><p className="text-[9px] font-extrabold uppercase text-[#879189]">Enquirer</p><p className="mt-1 text-[12px] font-bold text-[#293632]">{item.name || "Not provided"}</p><p className="text-[10px] text-[#66726A]">{item.email || "No email"}</p><p className="text-[10px] text-[#66726A]">{item.phone || "No phone"}</p></div><div className="sm:col-span-2"><p className="text-[9px] font-extrabold uppercase text-[#879189]">Message</p><p className="mt-1 whitespace-pre-wrap text-[12px] leading-6 text-[#59665E]">{item.message}</p></div></div>{item.status !== "CLOSED"&&<div className="mt-4 flex flex-wrap gap-2"><form action={updateEnquiry}><input type="hidden" name="id" value={item.id}/><input type="hidden" name="status" value="IN_PROGRESS"/><Button size="sm" variant="secondary" type="submit">Mark in progress</Button></form><form action={updateEnquiry}><input type="hidden" name="id" value={item.id}/><input type="hidden" name="status" value="CLOSED"/><Button size="sm" type="submit">Close enquiry</Button></form></div>}</article>)}{enquiries.length===0&&<div className="rounded-[14px] border border-dashed border-[#D5CFC2] bg-[#FFFDF8] p-12 text-center text-[12px] text-[#758079]">No property-service enquiries have been received.</div>}</div></main>;
}
