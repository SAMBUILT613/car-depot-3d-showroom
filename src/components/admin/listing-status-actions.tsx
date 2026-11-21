"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Can = { approve: boolean; reject: boolean; requestChanges: boolean; archive: boolean };

export function ListingStatusActions({ listingId, status, can }: { listingId: string; status: string; can: Can }) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const reviewable = status === "PENDING_REVIEW" || status === "CHANGES_REQUESTED";
  const live = status === "PUBLISHED";
  if (!reviewable && !live) return null;

  async function act(action: string, needsReason: boolean, done: string) {
    if (needsReason && reason.trim().length < 5) { setError("Write a short reason for the seller first."); return; }
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/admin/listings/" + encodeURIComponent(listingId) + "/moderate", {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, reason: reason.trim() || undefined }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) throw new Error(payload?.error || "That action could not be completed.");
      setNotice(done); setReason(""); router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "That action could not be completed.");
    } finally { setBusy(false); }
  }

  return (
    <section className="mb-5 rounded-[14px] border border-[#D5E5DC] bg-white p-4 sm:p-5">
      <p className="text-[13px] font-extrabold text-[#04180C]">{reviewable ? "Review this listing" : "This listing is live"}</p>
      <p className="mt-1 text-[12px] text-[#5B6761]">{reviewable ? "Edit anything below first and press Save changes. Then approve it to publish, or send it back to the seller." : "You can unpublish it at any time."}</p>
      {reviewable && (can.reject || can.requestChanges) && (
        <textarea rows={2} maxLength={1000} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Reason (required to reject or request changes)" className="enes-field mt-3 !h-auto" />
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        {reviewable && can.approve && <button type="button" disabled={busy} onClick={() => void act("APPROVE", false, "Approved. The listing is now live.")} className="enes-button disabled:opacity-60">Approve and publish</button>}
        {reviewable && can.requestChanges && <button type="button" disabled={busy} onClick={() => void act("REQUEST_CHANGES", true, "Sent back to the seller for changes.")} className="rounded-[9px] border border-[#D5E5DC] px-4 py-2 text-[12px] font-bold text-[#04180C] disabled:opacity-60">Request changes</button>}
        {reviewable && can.reject && <button type="button" disabled={busy} onClick={() => void act("REJECT", true, "Listing rejected.")} className="rounded-[9px] border border-[#A10D10] px-4 py-2 text-[12px] font-bold text-[#A10D10] disabled:opacity-60">Reject</button>}
        {live && can.archive && <button type="button" disabled={busy} onClick={() => void act("ARCHIVE", false, "Listing unpublished.")} className="rounded-[9px] border border-[#A10D10] px-4 py-2 text-[12px] font-bold text-[#A10D10] disabled:opacity-60">Unpublish (archive)</button>}
      </div>
      {error && <p role="alert" className="mt-3 rounded-[9px] bg-[#FBE9E9] p-3 text-[12px] font-semibold text-[#A10D10]">{error}</p>}
      {notice && <p role="status" className="mt-3 rounded-[9px] bg-[#DDF1E6] p-3 text-[12px] font-semibold text-[#004D15]">{notice}</p>}
    </section>
  );
}
