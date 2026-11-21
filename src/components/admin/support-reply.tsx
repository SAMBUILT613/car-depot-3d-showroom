"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SupportReply({ threadId, status, canManage }: { threadId: string; status: string; canManage: boolean }) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const endpoint = "/api/admin/support/" + encodeURIComponent(threadId);
  const closed = status !== "OPEN";

  async function call(method: "POST" | "PATCH", body: Record<string, unknown>, done: string) {
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch(endpoint, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) throw new Error(payload?.error || "That did not work. Please try again.");
      setNotice(done);
      if (method === "POST") setContent("");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "That did not work. Please try again.");
    } finally { setBusy(false); }
  }

  if (!canManage) return <p className="mt-5 rounded-[9px] bg-[#EAF6F1] p-3 text-[12px] text-[#4B5750]">You can read this conversation but not reply. Ask the owner to give your role the “enquiries:manage” permission.</p>;
  return (
    <div className="mt-5">
      <form onSubmit={(event) => { event.preventDefault(); if (content.trim() && !busy) void call("POST", { content }, "Reply sent. The user has been notified."); }}>
        <label className="block text-[12px] font-bold text-[#04180C]" htmlFor="support-reply">Reply</label>
        <textarea id="support-reply" rows={4} maxLength={3000} value={content} onChange={(event) => setContent(event.target.value)} className="enes-field mt-2 !h-auto" />
        <button type="submit" disabled={busy || !content.trim()} className="enes-button mt-3 disabled:opacity-60">{busy ? "Sending…" : "Send reply"}</button>
      </form>
      <div className="mt-3">
        <button type="button" disabled={busy} onClick={() => void call("PATCH", { status: closed ? "OPEN" : "CLOSED" }, closed ? "Conversation reopened." : "Conversation closed.")} className="text-[12px] font-bold text-[#5B6761] underline disabled:opacity-60">{closed ? "Reopen conversation" : "Close conversation"}</button>
      </div>
      {error && <p role="alert" className="mt-3 rounded-[9px] bg-[#FBE9E9] p-3 text-[12px] font-semibold text-[#A10D10]">{error}</p>}
      {notice && <p role="status" className="mt-3 rounded-[9px] bg-[#DDF1E6] p-3 text-[12px] font-semibold text-[#004D15]">{notice}</p>}
    </div>
  );
}
