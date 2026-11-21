import { prisma } from "@/lib/db";
import { requireAdminPage } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { AutoRefresh } from "@/components/admin/auto-refresh";

export const dynamic = "force-dynamic";

function ago(date: Date) {
  const seconds = Math.max(1, Math.round((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)} h ago`;
  return `${Math.round(seconds / 86400)} d ago`;
}

export default async function AdminVisitorsPage() {
  await requireAdminPage("analytics:view");
  const lagos = new Date(Date.now() + 3_600_000);
  lagos.setUTCHours(0, 0, 0, 0);
  const start = new Date(lagos.getTime() - 3_600_000);
  const [visits, unique, fresh, topPages, recent] = await Promise.all([
    prisma.siteVisit.count({ where: { createdAt: { gte: start } } }),
    prisma.siteVisit.groupBy({ by: ["visitorKey"], where: { createdAt: { gte: start } } }),
    prisma.siteVisit.count({ where: { createdAt: { gte: start }, isNewVisitor: true } }),
    prisma.siteVisit.groupBy({ by: ["path"], where: { createdAt: { gte: start } }, _count: { path: true }, orderBy: { _count: { path: "desc" } }, take: 8 }),
    prisma.siteVisit.findMany({ orderBy: { createdAt: "desc" }, take: 80 }),
  ]);

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 md:px-6">
      <h1 className="text-[24px] font-extrabold text-ink-900">Visitors</h1>
      <p className="mt-1 text-[13px] text-muted-600">Live feed of people browsing the website. Visitors are anonymous: no names, no IP addresses.</p>
      <div className="mt-2"><AutoRefresh seconds={20} /></div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {[["Page views today", visits], ["People today", unique.length], ["First-time visitors today", fresh]].map(([label, value]) => (
          <div key={String(label)} className="rounded-card border border-line-200 bg-white p-4">
            <p className="text-[11px] font-extrabold uppercase tracking-[.1em] text-forest-700">{label}</p>
            <p className="mt-1 text-[28px] font-extrabold text-ink-900">{value}</p>
          </div>
        ))}
      </div>

      {topPages.length > 0 && (
        <section className="mt-5 rounded-card border border-line-200 bg-white p-4">
          <h2 className="text-[14px] font-extrabold text-ink-900">Most visited today</h2>
          <ul className="mt-2 space-y-1 text-[13px]">
            {topPages.map((page) => <li key={page.path} className="flex justify-between gap-3"><span className="truncate text-ink-700">{page.path}</span><span className="font-bold text-ink-900">{page._count.path}</span></li>)}
          </ul>
        </section>
      )}

      <section className="mt-5 rounded-card border border-line-200 bg-white p-4">
        <h2 className="text-[14px] font-extrabold text-ink-900">Latest visits</h2>
        <ul className="mt-3 divide-y divide-line-200">
          {recent.map((visit) => (
            <li key={visit.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-[13px]">
              <div className="min-w-0">
                <p className="truncate font-bold text-ink-900">{visit.path}</p>
                <p className="text-[11px] text-muted-600">Visitor #{visit.visitorKey.slice(0, 6)} · {visit.country ?? "Unknown country"} · {visit.device ?? "device unknown"}{visit.referrer ? ` · from ${visit.referrer}` : ""}</p>
              </div>
              <div className="flex items-center gap-2">
                {visit.isNewVisitor && <Badge variant="success">New visitor</Badge>}
                <span className="text-[11px] text-muted-600">{ago(visit.createdAt)}</span>
              </div>
            </li>
          ))}
          {recent.length === 0 && <li className="py-6 text-center text-[13px] text-muted-600">No visits recorded yet.</li>}
        </ul>
      </section>
    </main>
  );
}
