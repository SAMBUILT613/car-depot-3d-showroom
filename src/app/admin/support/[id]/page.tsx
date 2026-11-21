import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdminPage } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { SupportReply } from "@/components/admin/support-reply";

export const dynamic = "force-dynamic";

export default async function AdminSupportThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireAdminPage("enquiries:view");
  const { id } = await params;
  const thread = await prisma.supportThread.findUnique({ where: { id }, include: { messages: { orderBy: { createdAt: "asc" }, take: 300 } } });
  if (!thread) notFound();
  const user = await prisma.user.findUnique({ where: { id: thread.userId }, select: { displayName: true, email: true, phone: true } });

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 md:px-6">
      <Link href="/admin/support" className="text-[12px] font-bold text-forest-700">← All support messages</Link>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[22px] font-extrabold text-ink-900">{thread.subject}</h1>
        <Badge variant={thread.status === "OPEN" ? "success" : "secondary"}>{thread.status === "OPEN" ? "Open" : "Closed"}</Badge>
      </div>
      <p className="mt-1 text-[12px] text-muted-600">{user?.displayName ?? "User"}{user?.email ? ` · ${user.email}` : ""}{user?.phone ? ` · ${user.phone}` : ""}</p>
      <section className="mt-5 rounded-card border border-line-200 bg-white p-4">
        <ol className="space-y-3">
          {thread.messages.map((message) => (
            <li key={message.id} className={`max-w-[85%] rounded-[10px] p-3 text-[13px] ${message.fromStaff ? "ml-auto bg-forest-700 text-white" : "bg-[#EAF6F1] text-ink-900"}`}>
              <p className="text-[11px] font-bold opacity-80">{message.fromStaff ? `ENES · ${message.senderName}` : message.senderName}</p>
              <p className="mt-1 whitespace-pre-wrap break-words">{message.content}</p>
              <time className="mt-1 block text-[10px] opacity-70">{message.createdAt.toLocaleString("en-NG")}</time>
            </li>
          ))}
        </ol>
        <SupportReply threadId={thread.id} status={thread.status} canManage={actor.permissions.has("enquiries:manage")} />
      </section>
    </main>
  );
}
