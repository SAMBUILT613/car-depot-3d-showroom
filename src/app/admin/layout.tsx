import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard, ClipboardList, Users, Image, Flag, Building2,
  MessageSquare, BarChart3, ShieldCheck, ScrollText, SearchCheck, PanelsTopLeft,
} from "lucide-react";
import { getAdminActor, type Actor } from "@/lib/auth";

const navigation: { href: string; label: string; permission: string; Icon: LucideIcon }[] = [
  { href: "/admin", label: "Overview", permission: "listings:view", Icon: LayoutDashboard },
  { href: "/admin/listings", label: "Listing review", permission: "listings:view", Icon: ClipboardList },
  { href: "/admin/site-content", label: "Website content", permission: "content:manage", Icon: PanelsTopLeft },
  { href: "/admin/listings/new", label: "Create for seller", permission: "listings:create_for_seller", Icon: SearchCheck },
  { href: "/admin/property-requests", label: "Buyer requests", permission: "property_requests:view", Icon: Building2 },
  { href: "/admin/services", label: "Service review", permission: "services:view", Icon: Building2 },
  { href: "/admin/service-enquiries", label: "Service enquiries", permission: "service_enquiries:view", Icon: MessageSquare },
  { href: "/admin/media", label: "Media review", permission: "media:view", Icon: Image },
  { href: "/admin/users", label: "Users", permission: "users:view", Icon: Users },
  { href: "/admin/messages", label: "Messages", permission: "messages:view", Icon: MessageSquare },
  { href: "/admin/inquiries", label: "Inquiries", permission: "enquiries:view", Icon: MessageSquare },
  { href: "/admin/reports", label: "Reports", permission: "reports:view", Icon: Flag },
  { href: "/admin/support", label: "Support", permission: "enquiries:view", Icon: MessageSquare },
  { href: "/admin/visitors", label: "Visitors", permission: "analytics:view", Icon: BarChart3 },
  { href: "/admin/analytics", label: "Analytics", permission: "analytics:view", Icon: BarChart3 },
  { href: "/admin/team", label: "Administrator team", permission: "admins:view", Icon: ShieldCheck },
  { href: "/admin/audit", label: "Audit history", permission: "audit:view", Icon: ScrollText },
];

function canSee(item: (typeof navigation)[number], actor: Actor) {
  if (actor.isOwner) return true;
  if (item.href === "/admin/listings/new") {
    return actor.permissions.has("listings:create_for_seller") && actor.permissions.has("sellers:view");
  }
  return actor.permissions.has(item.permission);
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  let actor: Actor | null = null;
  try { actor = await getAdminActor(); } catch { /* Every protected page checks its own permission. */ }
  const links = actor ? navigation.filter((item) => canSee(item, actor!)) : [];

  return (
    <div className="min-h-screen bg-[#EAF6F1] text-[#04180C]">
      {actor && <aside className="fixed inset-y-0 left-0 z-40 hidden w-[248px] flex-col border-r border-white/10 bg-[#04180C] text-[#FFFFFF] lg:flex">
        <div className="border-b border-white/10 px-6 py-6">
          <Link href="/admin" className="inline-flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[#EAF6F1] text-[16px] font-extrabold tracking-[-.08em] text-[#04180C]">E.</span>
            <span><span className="block text-[16px] font-extrabold tracking-[-.045em]">ENES</span><span className="mt-1 block text-[9px] font-bold uppercase tracking-[.17em] text-[#3FBF63]">Operations desk</span></span>
          </Link>
        </div>
        <div className="px-5 pb-2 pt-6 text-[9px] font-extrabold uppercase tracking-[.16em] text-white/40">Marketplace operations</div>
        <nav aria-label="Administration" className="flex-1 space-y-1 overflow-y-auto px-3 pb-5">
          {links.map(({ href, label, Icon }) => <Link key={href} href={href} className="group flex min-h-11 items-center gap-3 rounded-[9px] px-3 text-[11px] font-bold text-white/65 transition hover:bg-white/[.08] hover:text-white"><Icon className="h-4 w-4 shrink-0 text-[#3FBF63] transition group-hover:text-white" />{label}</Link>)}
        </nav>
        <div className="border-t border-white/10 p-4">
          <div className="mb-3 text-[9px] font-extrabold uppercase tracking-[.12em] text-white/45">Current access</div>
          <p className="text-[11px] font-extrabold text-[#FFFFFF]">{actor.isOwner ? "Designated Owner" : "ENES Administrator"}</p>
          <p className="mt-1 text-[9px] leading-4 text-white/45">Permissions are checked on every protected operation.</p>
          <Link href="/" className="mt-4 inline-flex text-[10px] font-bold text-[#3FBF63] hover:text-white">← Return to marketplace</Link>
        </div>
      </aside>}

      <div className={actor ? "lg:pl-[248px]" : ""}>
        {actor ? <>
          <header className="sticky top-0 z-30 border-b border-[#D5E5DC] bg-[#FFFFFF]/95 backdrop-blur-xl">
            <div className="mx-auto flex min-h-[62px] max-w-[1500px] items-center justify-between gap-4 px-4 md:px-6">
              <div><p className="text-[9px] font-extrabold uppercase tracking-[.15em] text-[#006B1D]">ENES control room</p><p className="mt-0.5 text-[12px] font-extrabold text-[#04180C]">Marketplace administration</p></div>
              <div className="flex items-center gap-3"><span className="hidden rounded-full border border-[#D7E3DB] bg-[#DDF1E6] px-3 py-1.5 text-[9px] font-extrabold text-[#006B1D] sm:inline-flex">{actor.isOwner ? "Owner authority" : "Scoped administrator"}</span><UserButton /></div>
            </div>
            <nav aria-label="Administration sections" className="border-t border-[#E0EEE6] lg:hidden"><div className="flex gap-2 overflow-x-auto px-4 py-2.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{links.map((item) => <Link key={item.href} href={item.href} className="shrink-0 rounded-full border border-[#D5E5DC] bg-white px-3 py-1.5 text-[10px] font-extrabold text-[#53615A]">{item.label}</Link>)}</div></nav>
          </header>
          <main className="min-h-[calc(100vh-63px)]">{children}</main>
        </> : <main className="min-h-screen">{children}</main>}
      </div>
    </div>
  );
}
