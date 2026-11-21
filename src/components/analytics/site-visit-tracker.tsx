"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const SKIP = ["/admin", "/api", "/sign-in", "/sign-up"];

function visitorKey(): string | null {
  try {
    let key = window.localStorage.getItem("enes_vid");
    if (!key) {
      key = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Math.random()).slice(2) + Date.now().toString(36);
      window.localStorage.setItem("enes_vid", key);
    }
    return key;
  } catch {
    return null;
  }
}

export function SiteVisitTracker() {
  const pathname = usePathname();
  useEffect(() => {
    if (!pathname || SKIP.some((prefix) => pathname === prefix || pathname.startsWith(prefix + "/"))) return;
    const key = visitorKey();
    if (!key) return;
    try {
      const stamp = pathname + "@" + Math.floor(Date.now() / 300000);
      if (window.sessionStorage.getItem("enes_last_visit") === stamp) return;
      window.sessionStorage.setItem("enes_last_visit", stamp);
    } catch { /* storage blocked: record the visit anyway */ }
    let referrer: string | null = null;
    try { referrer = document.referrer ? new URL(document.referrer).host : null; } catch { referrer = null; }
    fetch("/api/visits", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key, path: pathname, referrer }), keepalive: true }).catch(() => undefined);
  }, [pathname]);
  return null;
}
