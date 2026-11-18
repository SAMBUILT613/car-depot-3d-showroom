"use client";
import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Bell, CheckCircle2 } from "lucide-react";

export function SaveSearchWidget({ category, state, keyword, maxPrice }: { category: string; state?: string; keyword?: string; maxPrice?: string }) {
  const { isSignedIn } = useAuth();
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  if (!isSignedIn) return null;

  async function handleSave() {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/saved-searches", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ category, state, keyword, maxPrice }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "This search could not be saved.");
      setSaved(true);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "This search could not be saved."); }
    finally { setLoading(false); }
  }

  if (saved) return <p role="status" className="mt-4 flex items-center gap-2 text-[11px] font-extrabold text-[#006B1D]"><CheckCircle2 className="h-4 w-4"/> Search saved to your ENES account.</p>;
  return <div className="mt-4"><Button type="button" variant="secondary" onClick={handleSave} disabled={loading} size="sm" className="!w-full !rounded-[9px] !border-[#D6E1D9] !text-[#006B1D]"><Bell className="h-4 w-4"/>{loading ? "Saving…" : "Save this search"}</Button>{error&&<p role="alert" className="mt-2 text-[10px] text-[#A33333]">{error}</p>}</div>;
}
