"use client";
import { useEffect } from "react";
import { MessageCircle } from "lucide-react";

export function ViewTracker({ listingId }: { listingId: string }) {
  useEffect(() => {
    fetch("/api/analytics", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ listingId, type: "VIEW" }), keepalive: true }).catch(() => {});
  }, [listingId]);
  return null;
}

export function WhatsAppButton({ listingId, href }: { listingId: string; href: string }) {
  const handleClick = () => {
    fetch("/api/analytics", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ listingId, type: "WHATSAPP_CLICK" }), keepalive: true }).catch(() => {});
  };
  return <a href={href} onClick={handleClick} target="_blank" rel="noopener noreferrer" className="flex min-h-12 w-full items-center justify-center gap-2 rounded-[9px] bg-[#006B1D] px-5 text-[13px] font-extrabold text-white transition hover:bg-[#004D15]"><MessageCircle className="h-4 w-4"/> Chat on WhatsApp</a>;
}
