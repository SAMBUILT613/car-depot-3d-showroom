import { prisma } from "@/lib/db";
import { requireAdminPage } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminAuditPage() {
  await requireAdminPage("audit:view");
  const entries = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" }, take: 200,
    select: { id: true, action: true, entityType: true, entityId: true, actorClerkId: true, createdAt: true },
  });
  return <main className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6 lg:px-8"><h1 className="text-[24px] font-bold text-ink-900">Administrative audit history</h1><p className="mt-1 text-[14px] text-muted-600">Recorded administrative actions. Sensitive before/after payloads are not exposed in this overview.</p>
    <div className="mt-6 overflow-hidden rounded-card border border-line-200 bg-white"><div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-[13px]"><thead className="border-b border-line-200 bg-paper-50 text-muted-600"><tr><th className="p-4">Action</th><th className="p-4">Entity</th><th className="p-4">Reference</th><th className="p-4">Actor</th><th className="p-4">Time</th></tr></thead><tbody>{entries.map((entry) => <tr key={entry.id} className="border-b border-line-200 last:border-0"><td className="p-4 font-medium text-ink-900">{entry.action}</td><td className="p-4">{entry.entityType}</td><td className="p-4 text-muted-600">{entry.entityId || "—"}</td><td className="p-4 text-muted-600">{entry.actorClerkId || "System"}</td><td className="p-4 text-muted-600">{entry.createdAt.toLocaleString()}</td></tr>)}{entries.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-muted-600">No audit events have been recorded.</td></tr>}</tbody></table></div></div>
  </main>;
}
