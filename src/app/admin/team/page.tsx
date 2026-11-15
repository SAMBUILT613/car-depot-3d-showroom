import { prisma } from "@/lib/db";
import { requireAdminPermission } from "@/lib/auth";
import { ASSIGNABLE_ROLE_KEYS } from "@/lib/permissions";
import { TeamControls } from "@/components/admin/team-controls";

export const dynamic = "force-dynamic";

export default async function AdminTeamPage() {
  const actor = await requireAdminPermission("admins:view");
  const [admins, invitations, roles] = await Promise.all([
    prisma.adminUser.findMany({ orderBy: { createdAt: "asc" }, include: { user: { select: { email: true, displayName: true } }, roles: { include: { role: { select: { key: true } } } } } }),
    prisma.adminInvitation.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        roles: {
          include: {
            role: {
              select: { key: true },
            },
          },
        },
      },
    }),
    prisma.role.findMany({ where: { key: { in: ASSIGNABLE_ROLE_KEYS } }, orderBy: { name: "asc" }, select: { key: true, name: true } }),
  ]);
  const rows = admins.map((admin) => ({ id: admin.id, email: admin.user.email, name: admin.user.displayName, status: admin.status, isOwner: admin.isOwner, roles: admin.roles.map((entry) => entry.role.key) }));
  const inviteRows = invitations.map((invitation) => ({ id: invitation.id, email: invitation.email, status: invitation.status, expiresAt: invitation.expiresAt.toISOString(), roles: invitation.roles.map((entry) => entry.role.key) }));
  return <main className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6 lg:px-8"><h1 className="text-[24px] font-bold text-ink-900">Administrator team</h1><p className="mt-1 mb-6 text-[14px] text-muted-600">Manage administrator access, responsibilities and invitations.</p>
    {actor.isOwner ? <TeamControls admins={rows} invitations={inviteRows} roles={roles} /> : <div className="rounded-card border border-line-200 bg-white p-5"><p className="text-[13px] text-muted-600">You can view the administrator team. Only the designated Owner can invite administrators or change access.</p><div className="mt-4 space-y-3">{rows.map((admin) => <div key={admin.id} className="border-b border-line-200 pb-3 last:border-0"><p className="font-semibold text-ink-900">{admin.name}</p><p className="text-[12px] text-muted-600">{admin.roles.join(", ")} · {admin.status}</p></div>)}</div></div>}
  </main>;
}
