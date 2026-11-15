import Link from "next/link";
import { requireAdminPage } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { LayoutDashboard, ClipboardList, Users, Image, Flag, Building2, MessageSquare, ArrowUpRight, Eye } from "lucide-react";

export const dynamic = "force-dynamic";
export default async function AdminOverviewPage() {
  const actor = await requireAdminPage("listings:view");
  const permissions = actor.permissions;
  const can = (key: string) => actor.isOwner || permissions.has(key);
  const tasks = [
    { label: "Listings awaiting review", key: "listings:view", href: "/admin/listings", query: () => prisma.listing.count({ where: { status: { in: ["PENDING_REVIEW", "CHANGES_REQUESTED"] } } }), Icon: ClipboardList },
    { label: "Media awaiting review", key: "media:view", href: "/admin/media", query: () => prisma.listingMedia.count({ where: { status: "PENDING_REVIEW", deletedAt: null } }), Icon: Image },
    { label: "Open reports", key: "reports:view", href: "/admin/reports", query: () => prisma.report.count({ where: { status: { in: ["NEW", "IN_REVIEW"] } } }), Icon: Flag },
    { label: "Buyer property requests", key: "property_requests:view", href: "/admin/property-requests", query: () => prisma.propertyRequest.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } }), Icon: ClipboardList },
    { label: "Services awaiting review", key: "services:view", href: "/admin/services", query: () => prisma.propertyManagementService.count({ where: { status: "PENDING_REVIEW" } }), Icon: Building2 },
    { label: "New service enquiries", key: "service_enquiries:view", href: "/admin/service-enquiries", query: () => prisma.serviceEnquiry.count({ where: { status: "NEW" } }), Icon: MessageSquare },
    { label: "Active users", key: "users:view", href: "/admin/users", query: () => prisma.user.count({ where: { status: "ACTIVE" } }), Icon: Users },
  ];
  const visible = tasks.filter((task) => can(task.key));
  const counts = await Promise.all(visible.map((task) => task.query()));
  const views = can("analytics:view") ? await prisma.analyticsEvent.count({ where: { type: "VIEW" } }) : null;
  return <main className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6 lg:px-8"><div className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><p className="text-[10px] font-extrabold uppercase tracking-[.15em] text-[#176B57]">ENES operations</p><h1 className="mt-2 text-[30px] font-extrabold tracking-[-.05em] text-[#18211F]">Administration desk</h1><p className="mt-2 text-[12px] text-[#69756E]">A live view of work requiring attention. Counts come from the ENES database.</p></div><span className="rounded-full bg-[#E3F0EA] px-3 py-2 text-[10px] font-extrabold text-[#176B57]">{actor.isOwner ? "Owner access" : "Administrator access"}</span></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{visible.map((task,index)=>{const Icon=task.Icon;return <Link key={task.href} href={task.href} className="group rounded-[14px] border border-[#E5E0D6] bg-[#FFFDF8] p-5 transition hover:-translate-y-1 hover:border-[#B8CFC3] hover:shadow-[0_12px_28px_rgba(24,33,31,.07)]"><div className="flex items-start justify-between"><span className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[#E3F0EA] text-[#176B57]"><Icon className="h-5 w-5"/></span><ArrowUpRight className="h-4 w-4 text-[#8A948D] transition group-hover:text-[#176B57]"/></div><p className="mt-6 text-[30px] font-extrabold tracking-[-.05em] text-[#18211F]">{counts[index].toLocaleString("en-NG")}</p><p className="mt-1 text-[12px] font-bold text-[#69756E]">{task.label}</p></Link>})}{views!==null&&<div className="rounded-[14px] border border-[#E5E0D6] bg-[#18211F] p-5 text-white"><span className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-white/10 text-[#D8B39F]"><Eye className="h-5 w-5"/></span><p className="mt-6 text-[30px] font-extrabold tracking-[-.05em]">{views.toLocaleString("en-NG")}</p><p className="mt-1 text-[12px] font-bold text-white/65">Recorded listing views</p><Link href="/admin/analytics" className="mt-4 inline-flex text-[10px] font-extrabold text-[#D8B39F]">Open analytics <ArrowUpRight className="ml-1 h-3 w-3"/></Link></div>}</div><div className="mt-8 rounded-[14px] border border-[#E5E0D6] bg-[#FFFDF8] p-5"><div className="flex items-center gap-2"><LayoutDashboard className="h-4 w-4 text-[#176B57]"/><h2 className="text-[13px] font-extrabold text-[#18211F]">Administration principles</h2></div><p className="mt-2 max-w-3xl text-[11px] leading-6 text-[#68736D]">Access to each operational area is controlled by its own server-side permission. Listing and service publication remain separate review decisions. Use the audit history to trace administrator actions.</p></div></main>;
}
