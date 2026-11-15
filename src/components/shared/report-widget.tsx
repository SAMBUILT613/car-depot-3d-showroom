"use client";
import { useState, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Flag } from "lucide-react";
import { TurnstileWidget } from "@/components/shared/turnstile";

export function ReportWidget({ listingId }: { listingId: string }) {
  const { isLoaded, isSignedIn } = useAuth();
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const verify = useCallback((value: string) => setToken(value), []);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId, reason, details, turnstileToken: token }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Your report could not be submitted.");
      setSubmitted(true);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Your report could not be submitted."); }
    finally { setBusy(false); }
  };

  if (!isLoaded) return null;
  if (submitted) return <p className="mt-4 flex items-center gap-1 text-[12px] font-semibold text-success-700"><Flag className="h-3 w-3" /> Report submitted for review.</p>;

  return <div className="mt-4">
    {!open ? <button onClick={() => setOpen(true)} className="flex items-center gap-1 text-[12px] text-muted-600 underline hover:text-danger-700"><Flag className="h-3 w-3" /> Report this listing</button> :
      <form onSubmit={submit} className="rounded-control border border-line-200 bg-paper-50 p-3">
        <p className="mb-2 text-[12px] font-semibold text-ink-900">Why are you reporting this listing?</p>
        <select required value={reason} onChange={(event) => setReason(event.target.value)} className="mb-2 w-full rounded border border-line-200 p-2 text-[12px]">
          <option value="">Select reason…</option><option value="Fake Listing">Fake listing</option><option value="Wrong Price / Scam">Wrong price or suspected scam</option><option value="Already Sold/Rented">Already sold or rented</option><option value="Misleading Information">Misleading information</option><option value="Inappropriate Content">Inappropriate content</option><option value="Other">Other</option>
        </select>
        <textarea value={details} onChange={(event) => setDetails(event.target.value)} maxLength={1500} rows={3} placeholder="Additional details (optional)" className="mb-2 w-full rounded border border-line-200 p-2 text-[12px]" />
        {!isSignedIn && <TurnstileWidget onVerify={verify} />}
        {error && <p role="alert" className="mb-2 text-[12px] text-danger-700">{error}</p>}
        <div className="flex gap-2"><Button type="submit" size="sm" className="h-9 text-[12px]" disabled={busy}>{busy ? "Submitting…" : "Submit report"}</Button><Button type="button" variant="secondary" size="sm" className="h-9 text-[12px]" onClick={() => { setOpen(false); setError(""); }}>Cancel</Button></div>
      </form>}
  </div>;
}
