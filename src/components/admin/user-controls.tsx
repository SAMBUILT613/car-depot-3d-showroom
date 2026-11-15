"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function UserControls({ userId, status, canSuspend, canRestore }: { userId: string; status: string; canSuspend: boolean; canRestore: boolean }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function act(action: "SUSPEND" | "RESTORE") {
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/admin/users/${userId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "User action failed.");
      setMessage("Saved. Refresh to update the list.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "User action failed."); }
    finally { setBusy(false); }
  }
  return <div className="space-y-1">{status === "ACTIVE" && canSuspend && <Button size="sm" variant="danger" disabled={busy} onClick={() => act("SUSPEND")}>Suspend</Button>}{status === "SUSPENDED" && canRestore && <Button size="sm" disabled={busy} onClick={() => act("RESTORE")}>Restore</Button>}{message && <p role="status" className="text-[11px] text-muted-600">{message}</p>}</div>;
}
