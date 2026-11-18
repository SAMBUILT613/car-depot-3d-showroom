"use client";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { usePathname, useRouter } from "next/navigation";
import { Bookmark } from "lucide-react";

export function SaveListingButton({ listingId, compact = false, initiallySaved = false }: { listingId: string; compact?: boolean; initiallySaved?: boolean }) {
  const { isLoaded, isSignedIn } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [saved, setSaved] = useState(initiallySaved);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const buttonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!isLoaded || !isSignedIn || initiallySaved || !buttonRef.current) return;
    const element = buttonRef.current;
    let checked = false;
    const check = () => {
      if (checked) return;
      checked = true;
      fetch(`/api/saved-listings?listingId=${encodeURIComponent(listingId)}`, { cache: "no-store" })
        .then((response) => response.ok ? response.json() : null)
        .then((data) => { if (data && typeof data.saved === "boolean") setSaved(data.saved); })
        .catch(() => undefined);
    };
    if (typeof IntersectionObserver === "undefined") { check(); return; }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        check();
        observer.disconnect();
      }
    }, { rootMargin: "120px" });
    observer.observe(element);
    return () => observer.disconnect();
  }, [isLoaded, isSignedIn, listingId, initiallySaved]);
  async function toggle() {
    if (!isSignedIn) {
      router.push(`/sign-in?redirect_url=${encodeURIComponent(pathname || "/")}`);
      return;
    }
    if (busy) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/saved-listings", {
        method: saved ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not update saved listings.");
      setSaved(result.saved === true);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not update saved listings."); }
    finally { setBusy(false); }
  }
  if (!isLoaded) return null;
  return <div className={compact ? "relative" : "mt-2"}>
    <button ref={buttonRef} type="button" onClick={toggle} disabled={busy} aria-pressed={saved} aria-label={saved ? "Remove from saved listings" : "Save listing"} title={saved ? "Saved" : "Save listing"} className={compact ? "flex h-8 w-8 items-center justify-center rounded-full border border-[#D5E5DC] bg-[#FFFFFF] text-[#53615A] transition hover:border-[#A10D10] hover:text-[#A10D10] disabled:opacity-50" : "inline-flex min-h-10 items-center gap-2 rounded-control border border-line-200 px-3 text-[13px] font-medium text-ink-900 hover:border-coral-600"}>
      <Bookmark className={`h-4 w-4 ${saved ? "fill-current text-[#A10D10]" : ""}`} />{!compact && (saved ? "Saved" : "Save listing")}
    </button>
    {message && <p role="status" className={compact ? "absolute bottom-full right-0 z-10 mb-1 w-40 rounded-md bg-[#04180C] p-2 text-right text-[10px] text-white shadow-lg" : "mt-1 text-[11px] text-muted-600"}>{message}</p>}
  </div>;
}
