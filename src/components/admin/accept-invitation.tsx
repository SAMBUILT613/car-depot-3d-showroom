"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function AcceptInvitation({ token }: { token: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function accept() {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/admin/invitations/accept", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Invitation acceptance failed.");
      setMessage("Administrator access activated. Opening the dashboard…");
      router.replace("/admin/listings");
      router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Invitation acceptance failed."); }
    finally { setBusy(false); }
  }
  return <div className="space-y-3"><p className="text-[14px] text-muted-600">Use the Clerk account associated with the invited, verified email address.</p><Button onClick={accept} disabled={busy}>{busy ? "Checking invitation…" : "Accept administrator invitation"}</Button>{message && <p role="status" className="text-[13px] text-muted-600">{message}</p>}</div>;
}
