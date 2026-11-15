"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function MediaReviewActions({ mediaId, canApprove, canReject }: { mediaId: string; canApprove: boolean; canReject: boolean }) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function act(action: "approve" | "reject") {
    if (action === "reject" && reason.trim().length < 5) { setMessage("Enter a rejection reason (at least 5 characters)."); return; }
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/admin/media/${mediaId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "The media decision could not be saved.");
      setMessage(action === "approve" ? "Image approved. Refresh to update the queue." : "Image rejected. Refresh to update the queue.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "The action failed."); }
    finally { setBusy(false); }
  }
  return <div className="mt-3 space-y-2">
    {canReject && <input value={reason} onChange={(event) => setReason(event.target.value)} maxLength={1000} placeholder="Reason if rejecting" className="w-full rounded-control border border-line-200 px-3 py-2 text-[13px]" />}
    <div className="flex flex-wrap gap-2">
      {canApprove && <Button size="sm" disabled={busy} onClick={() => act("approve")}>Approve image</Button>}
      {canReject && <Button size="sm" variant="danger" disabled={busy} onClick={() => act("reject")}>Reject image</Button>}
    </div>
    {message && <p role="status" className="text-[12px] text-muted-600">{message}</p>}
  </div>;
}
