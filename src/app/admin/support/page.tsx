import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireAdminPage } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function AdminSupportPage() {
  await requireAdminPage("enquiries:view");
  const threads = await prisma.supportThread.findMany({
    orderBy: { lastMessageAt: "desc" },
    take: 300,
    include: { messages: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  const users = await prisma.user.findMany({ where: { id: { in: [...new Set(threads.map((thread) => thread.userId))] } }, select: { id: true, displayName: true } });
  const names = new Map(users.map((user) => [user.id, user.displayName]));
  const rows = threads.map((thread) => ({ thread, latest: thread.messages[0], awaiting: thread.status === "OPEN" && Boolean(thread.messages[0]) && !thread.messages[0].fromStaff }));
  rows.sort((a, b) => Number(b.awaiting) - Number(a.awaiting));
  const waiting = rows.filter((row) => row.awaiting).length;

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 md:px-6">
      <h1 className="text-[24px] font-extrabold text-ink-900">Support messages</h1>
      <p className="mt-1 text-[13px] text-muted-600">Messages from people using the Support page. {waiting ? `${waiting} waiting for a reply.` : "Nothing is waiting for a reply."}</p>
      <ul className="mt-6 space-y-3">
        {rows.map(({ thread, latest, awaiting }) => (
          <li key={thread.id}>
            <Link href={`/admin/support/${thread.id}`} className="block rounded-card border border-line-200 bg-white p-4 hover:border-forest-700">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[14px] font-extrabold text-ink-900">{thread.subject}</p>
                <Badge variant={thread.status !== "OPEN" ? "secondary" : awaiting ? "warning" : "success"}>{thread.status !== "OPEN" ? "Closed" : awaiting ? "Awaiting reply" : "Replied"}</Badge>
              </div>
              <p className="mt-1 text-[12px] text-muted-600">From {names.get(thread.userId) ?? "a user"}</p>
              {latest && <p className="mt-2 line-clamp-2 text-[13px] text-ink-700">{latest.content}</p>}
              <p className="mt-2 text-[11px] text-muted-600">{thread.lastMessageAt.toLocaleString("en-NG")}</p>
            </Link>
          </li>
        ))}
        {rows.length === 0 && <li className="rounded-card border border-line-200 bg-white p-10 text-center text-[14px] text-muted-600">No support messages yet.</li>}
      </ul>
    </main>
  );
}
