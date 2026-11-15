import { prisma } from "@/lib/db";
import { requireAdminPermission } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { ReportActions } from "@/components/admin/report-actions";

export const dynamic = "force-dynamic";

export default async function AdminReportsPage() {
  const actor = await requireAdminPermission("reports:view");
  const [reports, adminRows] = await Promise.all([
    prisma.report.findMany({
      include: { listing: { select: { id: true, title: true, state: true, city: true } } },
      orderBy: { createdAt: "desc" }, take: 200,
    }),
    actor.isOwner || actor.permissions.has("reports:assign")
      ? prisma.adminUser.findMany({ where: { status: "ACTIVE", isOwner: false, removedAt: null, suspendedAt: null, user: { status: "ACTIVE" } }, select: { id: true, user: { select: { displayName: true } } } })
      : Promise.resolve([]),
  ]);
  const canAssign = actor.isOwner || actor.permissions.has("reports:assign");
  const canResolve = actor.isOwner || actor.permissions.has("reports:resolve");
  const admins = adminRows.map((row) => ({ id: row.id, name: row.user.displayName }));
  return <main className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6 lg:px-8">
    <h1 className="text-[24px] font-bold text-ink-900">Marketplace reports</h1>
    <p className="mt-1 text-[14px] text-muted-600">Review submitted reports and record decisions.</p>
    <div className="mt-6 overflow-hidden rounded-card border border-line-200 bg-white">
      <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-[13px]">
        <thead className="border-b border-line-200 bg-paper-50 text-muted-600"><tr><th className="p-4">Listing</th><th className="p-4">Reason</th><th className="p-4">Details</th><th className="p-4">Status</th><th className="p-4">Received</th><th className="p-4">Resolution</th><th className="p-4">Actions</th></tr></thead>
        <tbody>{reports.map((report) => <tr key={report.id} className="border-b border-line-200 align-top last:border-0">
          <td className="p-4"><p className="font-semibold text-ink-900">{report.listing.title}</p><p className="mt-1 text-[11px] text-muted-600">{report.listing.city}, {report.listing.state}</p></td>
          <td className="p-4"><Badge variant="warning">{report.reason}</Badge></td>
          <td className="max-w-[240px] whitespace-pre-wrap p-4 text-muted-600">{report.details || "—"}</td>
          <td className="p-4">{report.status}</td>
          <td className="p-4 text-muted-600">{report.createdAt.toLocaleDateString()}</td>
          <td className="max-w-[200px] whitespace-pre-wrap p-4 text-muted-600">{report.resolution || "—"}</td>
          <td className="p-4">{report.status === "RESOLVED" || report.status === "DISMISSED" ? <span className="text-[12px] text-muted-600">Closed</span> : <ReportActions reportId={report.id} admins={admins} canAssign={canAssign} canResolve={canResolve} />}</td>
        </tr>)}
        {reports.length === 0 && <tr><td colSpan={7} className="p-10 text-center text-muted-600">No reports have been submitted.</td></tr>}</tbody>
      </table></div>
    </div>
  </main>;
}
