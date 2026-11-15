"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";

type RoleChoice = { key: string; name: string };
type AdminRow = { id: string; email: string | null; name: string; status: string; roles: string[]; isOwner: boolean };
type InviteRow = { id: string; email: string; status: string; expiresAt: string; roles: string[] };

export function TeamControls({ admins, invitations, roles }: { admins: AdminRow[]; invitations: InviteRow[]; roles: RoleChoice[] }) {
  const [email, setEmail] = useState("");
  const [inviteRoles, setInviteRoles] = useState<string[]>(["LISTING_MODERATOR"]);
  const [notice, setNotice] = useState("");
  const [busyId, setBusyId] = useState("");
  const [rowRoles, setRowRoles] = useState<Record<string, string[]>>(() => Object.fromEntries(admins.map((admin) => [admin.id, admin.roles])));

  const toggleRole = (key: string, selected: string[], setter: (next: string[]) => void) => {
    setter(selected.includes(key) ? selected.filter((item) => item !== key) : [...selected, key]);
  };

  async function invite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusyId("invite"); setNotice("");
    try {
      const response = await fetch("/api/admin/invitations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, roleKeys: inviteRoles }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Invitation failed.");
      setNotice("Invitation email sent. Refresh to see the pending invitation."); setEmail("");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Invitation failed."); }
    finally { setBusyId(""); }
  }

  async function updateAdmin(id: string, action: string, roleKeys?: string[]) {
    setBusyId(id); setNotice("");
    try {
      const response = await fetch(`/api/admin/team/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, roleKeys }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Administrator update failed.");
      setNotice("Administrator record updated. Refresh to see the latest status.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Administrator update failed."); }
    finally { setBusyId(""); }
  }

  async function revoke(id: string) {
    setBusyId(id); setNotice("");
    try {
      const response = await fetch(`/api/admin/invitations/${id}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Invitation could not be revoked.");
      setNotice("Invitation revoked. Refresh to update the list.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Invitation could not be revoked."); }
    finally { setBusyId(""); }
  }

  return <div className="space-y-8">
    <section className="rounded-card border border-line-200 bg-white p-5">
      <h2 className="text-[18px] font-semibold text-ink-900">Invite an administrator</h2>
      <p className="mt-1 text-[13px] text-muted-600">Only the configured ENES Owner can invite administrators. Owner access is never assignable.</p>
      <form onSubmit={invite} className="mt-4 space-y-4">
        <label className="block text-[13px] font-medium text-ink-900">Work email<input required type="email" maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1 block w-full rounded-control border border-line-200 px-3 py-2" /></label>
        <div><p className="mb-2 text-[13px] font-medium text-ink-900">Assign roles</p><div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">{roles.map((role) => <label key={role.key} className="flex items-center gap-2 text-[13px] text-ink-700"><input type="checkbox" checked={inviteRoles.includes(role.key)} onChange={() => toggleRole(role.key, inviteRoles, setInviteRoles)} />{role.name}</label>)}</div></div>
        <Button type="submit" disabled={busyId === "invite" || !email || inviteRoles.length === 0}>{busyId === "invite" ? "Sending…" : "Send invitation"}</Button>
      </form>
    </section>

    <section>
      <h2 className="mb-3 text-[18px] font-semibold text-ink-900">Administrator accounts</h2>
      <div className="overflow-hidden rounded-card border border-line-200 bg-white"><div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-[13px]">
        <thead className="border-b border-line-200 bg-paper-50 text-muted-600"><tr><th className="p-4">Administrator</th><th className="p-4">Status</th><th className="p-4">Roles</th><th className="p-4">Controls</th></tr></thead>
        <tbody>{admins.map((admin) => <tr key={admin.id} className="border-b border-line-200 align-top last:border-0"><td className="p-4"><p className="font-semibold text-ink-900">{admin.name}{admin.isOwner ? " · Owner" : ""}</p><p className="text-[12px] text-muted-600">{admin.email || "No email on record"}</p></td><td className="p-4">{admin.status}</td><td className="p-4">{admin.roles.join(", ") || "No assigned roles"}</td><td className="p-4">{admin.isOwner ? <span className="text-[12px] text-muted-600">Protected owner account</span> : <div className="space-y-2">
          <div className="grid grid-cols-2 gap-1">{roles.map((role) => <label key={role.key} className="flex items-center gap-1 text-[11px]"><input type="checkbox" checked={(rowRoles[admin.id] || []).includes(role.key)} onChange={() => setRowRoles((current) => ({ ...current, [admin.id]: (current[admin.id] || []).includes(role.key) ? current[admin.id].filter((key) => key !== role.key) : [...(current[admin.id] || []), role.key] }))} />{role.name}</label>)}</div>
          <Button size="sm" variant="secondary" disabled={busyId === admin.id} onClick={() => updateAdmin(admin.id, "ASSIGN_ROLES", rowRoles[admin.id] || [])}>Save roles</Button>
          <div className="flex flex-wrap gap-1">{admin.status === "ACTIVE" ? <Button size="sm" variant="danger" disabled={busyId === admin.id} onClick={() => updateAdmin(admin.id, "SUSPEND")}>Suspend</Button> : <Button size="sm" disabled={busyId === admin.id} onClick={() => updateAdmin(admin.id, "RESTORE")}>Restore</Button>}<Button size="sm" variant="secondary" disabled={busyId === admin.id || admin.status === "REMOVED"} onClick={() => updateAdmin(admin.id, "REMOVE")}>Remove</Button></div>
        </div>}</td></tr>)}
        {admins.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-muted-600">No administrators are recorded yet.</td></tr>}</tbody>
      </table></div></div>
    </section>

    <section><h2 className="mb-3 text-[18px] font-semibold text-ink-900">Invitations</h2><div className="overflow-hidden rounded-card border border-line-200 bg-white"><div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-[13px]"><thead className="border-b border-line-200 bg-paper-50 text-muted-600"><tr><th className="p-4">Email</th><th className="p-4">Roles</th><th className="p-4">Status</th><th className="p-4">Expires</th><th className="p-4">Action</th></tr></thead><tbody>{invitations.map((invitation) => <tr key={invitation.id} className="border-b border-line-200 last:border-0"><td className="p-4">{invitation.email}</td><td className="p-4">{invitation.roles.join(", ")}</td><td className="p-4">{invitation.status}</td><td className="p-4">{new Date(invitation.expiresAt).toLocaleString()}</td><td className="p-4">{invitation.status === "PENDING" ? <Button size="sm" variant="secondary" disabled={busyId === invitation.id} onClick={() => revoke(invitation.id)}>Revoke</Button> : "—"}</td></tr>)}{invitations.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-muted-600">No invitations have been created.</td></tr>}</tbody></table></div></div></section>
    {notice && <p role="status" className="text-[13px] text-muted-600">{notice}</p>}
  </div>;
}
