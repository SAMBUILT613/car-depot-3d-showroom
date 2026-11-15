import { prisma } from "@/lib/db";
import { requireAdminPermission } from "@/lib/auth";
import { MessageModerationActions } from "@/components/admin/message-moderation-actions";

export const dynamic = "force-dynamic";

export default async function AdminMessagesPage() {
  const actor = await requireAdminPermission("messages:view");
  const flags = await prisma.messageModeration.findMany({
    where: { action: "REPORTED_BY_USER" }, orderBy: { createdAt: "desc" }, take: 200,
    include: {
      message: { select: { id: true, content: true, status: true, createdAt: true, sender: { select: { displayName: true } }, listing: { select: { id: true, title: true } } } },
      reporter: { select: { displayName: true } },
    },
  });
  const canModerate = actor.isOwner || actor.permissions.has("messages:moderate");
  return <main className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6 lg:px-8"><h1 className="text-[24px] font-bold text-ink-900">Message moderation</h1><p className="mt-1 text-[14px] text-muted-600">Messages reported by participants for administrator review.</p>
    <div className="mt-6 space-y-4">{flags.map((flag) => <article key={flag.id} className="rounded-card border border-line-200 bg-white p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-semibold text-ink-900">{flag.message.sender?.displayName || "ENES user"} · {flag.message.status}</p><p className="mt-1 text-[12px] text-muted-600">Listing: {flag.message.listing.title} · Reported by {flag.reporter?.displayName || "Participant"} · {flag.createdAt.toLocaleString()}</p></div><a className="text-[12px] text-coral-600 underline" href={`/listing/${flag.message.listing.id}`}>Open listing</a></div><div className="my-3 rounded-[8px] bg-paper-50 p-3"><p className="whitespace-pre-wrap break-words text-[14px] text-ink-900">{flag.message.content}</p><p className="mt-2 text-[12px] text-muted-600">Report reason: {flag.reason || "Not supplied"}</p></div>{canModerate && <MessageModerationActions messageId={flag.message.id} />}</article>)}
      {flags.length === 0 && <div className="rounded-card border border-line-200 bg-white p-10 text-center text-[14px] text-muted-600">No messages have been reported.</div>}
    </div>
  </main>;
}
