import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireAdminPage } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function AdminInquiriesPage() {
  await requireAdminPage("enquiries:view");
  const conversations = await prisma.conversation.findMany({
    orderBy: [{ lastMessageAt: "desc" }, { createdAt: "desc" }],
    take: 300,
    include: {
      listing: { select: { title: true, city: true, state: true } },
      createdBy: { select: { displayName: true } },
      messages: { where: { status: "VISIBLE", deletedAt: null }, orderBy: { createdAt: "desc" }, take: 1, select: { content: true, createdAt: true, senderUserId: true } },
    },
  });
  const rows = conversations.map((conversation) => {
    const latest = conversation.messages[0];
    const awaiting = conversation.status === "OPEN" && Boolean(latest) && latest.senderUserId === conversation.createdByUserId;
    return { conversation, latest, awaiting };
  });
  rows.sort((a, b) => Number(b.awaiting) - Number(a.awaiting));
  const waiting = rows.filter((row) => row.awaiting).length;

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 md:px-6">
      <h1 className="text-[24px] font-extrabold text-ink-900">Inquiries</h1>
      <p className="mt-1 text-[13px] text-muted-600">Every question about a listing arrives here first. {waiting ? `${waiting} waiting for a reply.` : "Nothing is waiting for a reply."}</p>
      <ul className="mt-6 space-y-3">
        {rows.map(({ conversation, latest, awaiting }) => (
          <li key={conversation.id}>
            <Link href={`/admin/inquiries/${conversation.id}`} className="block rounded-card border border-line-200 bg-white p-4 hover:border-forest-700">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[14px] font-extrabold text-ink-900">{conversation.listing.title}</p>
                <Badge variant={conversation.status !== "OPEN" ? "secondary" : awaiting ? "warning" : "success"}>{conversation.status !== "OPEN" ? "Closed" : awaiting ? "Awaiting reply" : "Replied"}</Badge>
              </div>
              <p className="mt-1 text-[12px] text-muted-600">From {conversation.createdBy.displayName} · {conversation.listing.city}, {conversation.listing.state}</p>
              {latest && <p className="mt-2 line-clamp-2 text-[13px] text-ink-700">{latest.content}</p>}
              <p className="mt-2 text-[11px] text-muted-600">{(latest?.createdAt ?? conversation.createdAt).toLocaleString("en-NG")}</p>
            </Link>
          </li>
        ))}
        {rows.length === 0 && <li className="rounded-card border border-line-200 bg-white p-10 text-center text-[14px] text-muted-600">No inquiries yet.</li>}
      </ul>
    </main>
  );
}
