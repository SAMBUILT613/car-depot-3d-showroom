"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function MessageModerationActions({ messageId }: { messageId: string }) {
  const [reason, setReason] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  async function act(action: "HIDE" | "RESTORE") {
    if (reason.trim().length < 5) { setNotice("A reason of at least 5 characters is required."); return; }
    setBusy(true); setNotice("");
    try {
      const response = await fetch(`/api/admin/messages/${messageId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, reason }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Moderation action failed.");
      setNotice("Saved. Refresh the page to update the queue.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Moderation action failed."); }
    finally { setBusy(false); }
  }
  return <div className="space-y-2"><input value={reason} onChange={(event) => setReason(event.target.value)} maxLength={1000} placeholder="Moderation reason" className="w-full rounded-control border border-line-200 px-2 py-1 text-[12px]" /><div className="flex gap-2"><Button size="sm" variant="danger" disabled={busy} onClick={() => act("HIDE")}>Hide message</Button><Button size="sm" variant="secondary" disabled={busy} onClick={() => act("RESTORE")}>Restore</Button></div>{notice && <p role="status" className="text-[11px] text-muted-600">{notice}</p>}</div>;
}
