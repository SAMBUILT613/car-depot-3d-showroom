"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";

type AdminOption = { id: string; name: string };
export function ReportActions({ reportId, admins, canAssign, canResolve }: { reportId: string; admins: AdminOption[]; canAssign: boolean; canResolve: boolean }) {
  const [adminUserId, setAdminUserId] = useState("");
  const [resolution, setResolution] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function send(action: "ASSIGN" | "RESOLVE" | "DISMISS") {
    if (action === "ASSIGN" && !adminUserId) { setMessage("Select an administrator."); return; }
    if (action !== "ASSIGN" && resolution.trim().length < 5) { setMessage("Write a resolution note of at least 5 characters."); return; }
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/admin/reports/${reportId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, adminUserId, resolution }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "The report could not be updated.");
      setMessage("Saved. Refresh the page to update the queue.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Action failed."); }
    finally { setBusy(false); }
  }
  return <div className="min-w-[220px] space-y-2">
    {canAssign && <div className="flex gap-1"><select value={adminUserId} onChange={(event) => setAdminUserId(event.target.value)} className="min-w-0 flex-1 rounded-control border border-line-200 px-2 py-1 text-[12px]"><option value="">Assign to…</option>{admins.map((admin) => <option key={admin.id} value={admin.id}>{admin.name}</option>)}</select><Button size="sm" variant="secondary" disabled={busy} onClick={() => send("ASSIGN")}>Assign</Button></div>}
    {canResolve && <><textarea value={resolution} onChange={(event) => setResolution(event.target.value)} rows={2} maxLength={1500} placeholder="Resolution / dismissal note" className="w-full rounded-control border border-line-200 px-2 py-1 text-[12px]" /><div className="flex gap-1"><Button size="sm" disabled={busy} onClick={() => send("RESOLVE")}>Resolve</Button><Button size="sm" variant="secondary" disabled={busy} onClick={() => send("DISMISS")}>Dismiss</Button></div></>}
    {message && <p role="status" className="text-[11px] text-muted-600">{message}</p>}
  </div>;
}
