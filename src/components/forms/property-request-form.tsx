"use client";
import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { TurnstileWidget } from "@/components/shared/turnstile";
import { NIGERIAN_STATES } from "@/lib/nigeria";
import { ArrowLeft, ClipboardList } from "lucide-react";

const intents: ReadonlyArray<readonly [string, string]> = [
  ["FOR_RENT", "For rent"], ["FOR_SALE", "For sale"], ["LAND_FOR_SALE", "Land for sale"],
  ["COMMERCIAL_FOR_RENT", "Commercial rent"], ["COMMERCIAL_FOR_SALE", "Commercial sale"], ["SHORT_LET", "Short let"],
];
const propertyTypes = ["House", "Apartment", "Flat", "Duplex", "Bungalow", "Land", "Commercial space", "Warehouse", "Office", "Shop", "Other"];

export function PropertyRequestForm() {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [token, setToken] = useState("");

  if (!isLoaded) return null;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/property-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intent: form.get("intent"), propertyType: form.get("propertyType"), state: form.get("state"),
          city: form.get("city"), area: form.get("area"), minBudget: form.get("minBudget"),
          maxBudget: form.get("maxBudget"), bedrooms: form.get("bedrooms"), notes: form.get("notes"),
          turnstileToken: token,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Your property request could not be submitted.");
      router.push("/dashboard?propertyRequestSubmitted=1");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Your property request could not be submitted.");
    } finally {
      setBusy(false);
    }
  }

  return <div className="flex min-h-full flex-col bg-[#F4F0E8]"><main className="enes-container flex-1 py-8 sm:py-12">
    <Link href="/property" className="mb-6 inline-flex items-center gap-2 text-[11px] font-extrabold text-[#176B57]"><ArrowLeft className="h-3.5 w-3.5" /> Property listings</Link>
    <div className="mx-auto max-w-3xl rounded-[18px] border border-[#E5E0D6] bg-[#FFFDF8] p-5 sm:p-8">
      <div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-[13px] bg-[#E3F0EA] text-[#176B57]"><ClipboardList className="h-5 w-5" /></span><div><p className="enes-kicker">Buyer request</p><h1 className="text-[24px] font-extrabold tracking-[-.045em] text-[#18211F]">Tell us what property you need.</h1></div></div>
      <p className="mt-3 max-w-2xl text-[12px] leading-6 text-[#68736D]">Describe your requirements and budget. Your request stays private to your account and authorised ENES administrators; it is not published as a public listing.</p>
      {!isSignedIn ? <div className="mt-6 rounded-[12px] bg-[#F4F0E8] p-5"><p className="text-[13px] font-extrabold text-[#18211F]">Sign in to submit a property request</p><Link href="/sign-in" className="enes-button mt-4">Sign in to continue</Link></div> : <form onSubmit={submit} className="mt-7 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label><span className="enes-label">Looking for</span><select name="intent" required className="enes-field"><option value="">Choose a purpose</option>{intents.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label><span className="enes-label">Property type</span><select name="propertyType" required className="enes-field"><option value="">Choose a type</option>{propertyTypes.map((value) => <option key={value}>{value}</option>)}</select></label>
          <label><span className="enes-label">State</span><select name="state" className="enes-field"><option value="">Any state</option>{NIGERIAN_STATES.map((value) => <option key={value}>{value}</option>)}</select></label>
          <label><span className="enes-label">City or town</span><input name="city" required maxLength={100} className="enes-field" placeholder="e.g. Enugu, Ikeja, Awka" /></label>
          <label><span className="enes-label">Preferred area (optional)</span><input name="area" maxLength={120} className="enes-field" /></label>
          <label><span className="enes-label">Bedrooms (if relevant)</span><select name="bedrooms" className="enes-field"><option value="">Any</option>{[1,2,3,4,5,6].map((value) => <option key={value} value={value}>{value}+</option>)}</select></label>
          <label><span className="enes-label">Minimum budget (₦)</span><input name="minBudget" type="number" min="0" max="2000000000" className="enes-field" placeholder="Optional" /></label>
          <label><span className="enes-label">Maximum budget (₦)</span><input name="maxBudget" type="number" min="0" max="2000000000" className="enes-field" placeholder="Optional" /></label>
        </div>
        <label className="block"><span className="enes-label">What else should we know?</span><textarea name="notes" required minLength={20} maxLength={3000} rows={5} className="enes-field !h-auto" placeholder="Share your preferred timing, key requirements and any important details." /></label>
        <TurnstileWidget onVerify={setToken} />
        {error && <p role="alert" className="rounded-[9px] bg-[#F7E8E0] p-3 text-[12px] font-semibold text-[#A33333]">{error}</p>}
        <Button type="submit" disabled={busy}>{busy ? "Submitting request…" : "Submit private request"}</Button>
      </form>}
    </div>
  </main></div>;
}
