"use client";
import { useEffect, useRef } from "react";

export function TurnstileWidget({ onVerify }: { onVerify: (token: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const callbackRef = useRef(onVerify);
  const widgetIdRef = useRef<string | null>(null);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  callbackRef.current = onVerify;

  useEffect(() => {
    if (!siteKey || !ref.current) return;
    let cancelled = false;
    const render = () => {
      if (cancelled || !ref.current || !window.turnstile || widgetIdRef.current) return;
      widgetIdRef.current = window.turnstile.render(ref.current, {
        sitekey: siteKey,
        theme: "light",
        callback: (token) => callbackRef.current(token),
        "error-callback": () => callbackRef.current(""),
        "expired-callback": () => callbackRef.current(""),
      });
    };

    if (window.turnstile) render();
    else {
      let script = document.querySelector<HTMLScriptElement>('script[data-enes-turnstile="true"]');
      if (!script) {
        script = document.createElement("script");
        script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
        script.async = true;
        script.defer = true;
        script.dataset.enesTurnstile = "true";
        document.head.appendChild(script);
      }
      script.addEventListener("load", render);
    }
    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) window.turnstile.remove(widgetIdRef.current);
      widgetIdRef.current = null;
    };
  }, [siteKey]);

  if (!siteKey) return <p className="mt-3 text-[12px] text-muted-600">Security verification will be requested when required.</p>;
  return <div ref={ref} className="mt-4" />;
}
