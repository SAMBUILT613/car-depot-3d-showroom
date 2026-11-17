"use client";
import { useEffect, useRef, useState } from "react";

export function TurnstileWidget({ onVerify }: { onVerify: (token: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const callbackRef = useRef(onVerify);
  const widgetIdRef = useRef<string | null>(null);
  const [failed, setFailed] = useState(false);
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
        callback: (token) => { setFailed(false); callbackRef.current(token); },
        "error-callback": () => { setFailed(true); callbackRef.current(""); },
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

  if (!siteKey) return null;
  return <div className="mt-4"><div ref={ref} />{failed && <p role="alert" className="mt-2 text-[12px] font-semibold text-[#A33333]">The security check could not connect. Check your internet, turn off ad blockers or private DNS, then refresh and try again.</p>}</div>;
}
