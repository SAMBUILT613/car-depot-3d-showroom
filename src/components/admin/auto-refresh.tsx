"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function AutoRefresh({ seconds }: { seconds: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = window.setInterval(() => { if (document.visibilityState === "visible") router.refresh(); }, seconds * 1000);
    return () => window.clearInterval(id);
  }, [router, seconds]);
  return <p className="text-[11px] text-muted-600">Updates automatically every {seconds} seconds.</p>;
}
