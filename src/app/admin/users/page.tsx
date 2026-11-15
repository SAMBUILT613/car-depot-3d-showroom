import { prisma } from "@/lib/db";
import { requireAdminPermission } from "@/lib/auth";
import { UserControls } from "@/components/admin/user-controls";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const actor = await requireAdminPermission("users:view");
  const users = await prisma.user.findMany({
    where: { adminUser: null },
    orderBy: { createdAt: "desc" }, take: 200,
    select: { id: true, displayName: true, email: true, status: true, createdAt: true, _count: { select: { listings: true } } },
  });
  return <main className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6 lg:px-8"><h1 className="text-[24px] font-bold text-ink-900">Marketplace users</h1><p className="mt-1 text-[14px] text-muted-600">Account status and listing activity.</p>
    <div className="mt-6 overflow-hidden rounded-card border border-line-200 bg-white"><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-[13px]"><thead className="border-b border-line-200 bg-paper-50 text-muted-600"><tr><th className="p-4">User</th><th className="p-4">Status</th><th className="p-4">Listings</th><th className="p-4">Joined</th><th className="p-4">Controls</th></tr></thead><tbody>{users.map((user) => <tr key={user.id} className="border-b border-line-200 last:border-0"><td className="p-4"><p className="font-semibold text-ink-900">{user.displayName}</p><p className="text-[12px] text-muted-600">{user.email || "No email on record"}</p></td><td className="p-4">{user.status}</td><td className="p-4">{user._count.listings}</td><td className="p-4 text-muted-600">{user.createdAt.toLocaleDateString()}</td><td className="p-4"><UserControls userId={user.id} status={user.status} canSuspend={actor.isOwner || actor.permissions.has("users:suspend")} canRestore={actor.isOwner || actor.permissions.has("users:restore")} /></td></tr>)}{users.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-muted-600">No user accounts are registered yet.</td></tr>}</tbody></table></div></div>
  </main>;
}
