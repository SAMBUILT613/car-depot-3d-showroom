"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { TurnstileWidget } from "@/components/shared/turnstile";
import { CheckCircle2, Send } from "lucide-react";

export function ServiceEnquiryForm({ serviceId }: { serviceId: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [token, setToken] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/property-management/enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId,
          name: form.get("name"),
          email: form.get("email"),
          phone: form.get("phone"),
          message: form.get("message"),
          turnstileToken: token,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Your enquiry could not be sent.");
      setDone(true);
      formElement.reset();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Your enquiry could not be sent.");
    } finally {
      setBusy(false);
    }
  }

  if (done) return <div role="status" className="rounded-[13px] border border-[#B8D4C5] bg-[#E3F0EA] p-5 text-[#176B57]"><CheckCircle2 className="h-5 w-5" /><p className="mt-2 text-[14px] font-extrabold">Enquiry sent</p><p className="mt-1 text-[12px] leading-5">Your message has been sent to the service provider through ENES.</p></div>;

  return <form onSubmit={submit} className="space-y-3">
    <div className="grid gap-3 sm:grid-cols-2">
      <label><span className="enes-label">Your name</span><input name="name" required maxLength={100} className="enes-field" autoComplete="name" /></label>
      <label><span className="enes-label">Phone number</span><input name="phone" required maxLength={24} className="enes-field" autoComplete="tel" /></label>
    </div>
    <label className="block"><span className="enes-label">Email address</span><input name="email" type="email" required maxLength={180} className="enes-field" autoComplete="email" /></label>
    <label className="block"><span className="enes-label">How can this provider help?</span><textarea name="message" required minLength={15} maxLength={4000} rows={5} className="enes-field !h-auto" placeholder="Share the property or service details the provider needs to understand your request." /></label>
    <TurnstileWidget onVerify={setToken} />
    {error && <p role="alert" className="rounded-[9px] bg-[#FBE9E4] p-3 text-[12px] font-semibold text-[#A33333]">{error}</p>}
    <Button type="submit" disabled={busy} className="w-full !bg-[#176B57]">{busy ? "Sending enquiry…" : "Send enquiry"} <Send className="ml-1 h-4 w-4" /></Button>
    <p className="text-[10px] leading-5 text-[#7B857F]">Your contact details are shared with this provider to respond to this enquiry.</p>
  </form>;
}
