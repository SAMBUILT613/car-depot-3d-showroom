"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SupportForm({ threadId }: { threadId?: string }) {
  const router = useRouter();
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    if (!content.trim()) { setError("Write your message first."); return; }
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/support", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ threadId, subject, content }) });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) throw new Error(payload?.error || "Your message could not be sent.");
      setContent(""); setSubject("");
      setNotice("Message sent. ENES will reply here.");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Your message could not be sent.");
    } finally { setBusy(false); }
  }

  return (
    <form noValidate onSubmit={onSubmit} className="mt-4">
      {!threadId && (
        <label className="mb-3 block"><span className="enes-label">Subject (optional)</span><input maxLength={120} value={subject} onChange={(event) => setSubject(event.target.value)} className="enes-field" placeholder="e.g. Problem with my account" /></label>
      )}
      <label className="block"><span className="enes-label">{threadId ? "Reply" : "Your message"}</span><textarea rows={threadId ? 3 : 5} maxLength={3000} value={content} onChange={(event) => setContent(event.target.value)} className="enes-field !h-auto" /></label>
      {error && <p role="alert" className="mt-3 rounded-[9px] bg-[#FBE9E9] p-3 text-[12px] font-semibold text-[#A10D10]">{error}</p>}
      {notice && <p role="status" className="mt-3 rounded-[9px] bg-[#DDF1E6] p-3 text-[12px] font-semibold text-[#004D15]">{notice}</p>}
      <button type="submit" disabled={busy} className="enes-button mt-3 disabled:opacity-60">{busy ? "Sending…" : "Send message"}</button>
    </form>
  );
}
