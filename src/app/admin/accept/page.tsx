import { SignIn } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { AcceptInvitation } from "@/components/admin/accept-invitation";

export default async function AcceptAdminInvitationPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  if (!/^[a-f0-9]{64}$/i.test(token)) return <main className="mx-auto max-w-xl px-4 py-16"><div className="rounded-card border border-line-200 bg-white p-6"><h1 className="text-[22px] font-bold text-ink-900">Invalid invitation</h1><p className="mt-2 text-[14px] text-muted-600">This administrator invitation link is invalid or incomplete.</p></div></main>;
  const session = await auth();
  if (session.userId) return <main className="mx-auto max-w-xl px-4 py-16"><div className="rounded-card border border-line-200 bg-white p-6"><h1 className="text-[22px] font-bold text-ink-900">Accept ENES invitation</h1><p className="mt-2 mb-5 text-[14px] text-muted-600">The invitation will only work for the verified email address it was sent to.</p><AcceptInvitation token={token} /></div></main>;
  return <main className="mx-auto max-w-xl px-4 py-12"><div className="rounded-card border border-line-200 bg-white p-6"><h1 className="mb-4 text-center text-[22px] font-bold text-ink-900">Sign in to accept your ENES invitation</h1><SignIn forceRedirectUrl={`/admin/accept?token=${encodeURIComponent(token)}`} signUpForceRedirectUrl={`/admin/accept?token=${encodeURIComponent(token)}`} /></div></main>;
}
