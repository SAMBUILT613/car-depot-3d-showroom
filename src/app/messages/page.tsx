import type { Metadata } from "next";
import Link from "next/link";
import { MessageSquare, ArrowUpRight } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { ensureCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Messages", robots: { index: false, follow: false } };

export default async function MessagesPage() {
  const user = await ensureCurrentUser();
  const conversations = await prisma.conversation.findMany({
    where: { participants: { some: { userId: user.id } } },
    orderBy: [{ lastMessageAt: "desc" }, { updatedAt: "desc" }],
    take: 60,
    include: {
      listing: { select: { id: true, title: true, status: true } },
      participants: { include: { user: { select: { id: true, displayName: true } } } },
      messages: {
        where: { status: "VISIBLE", deletedAt: null },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { content: true, senderId: true, createdAt: true },
      },
    },
  });

  const entries = conversations.map((conversation) => {
    const ownMembership = conversation.participants.find((participant) => participant.userId === user.id);
    const other = conversation.participants.find((participant) => participant.userId !== user.id)?.user;
    const latest = conversation.messages[0];
    const unread = Boolean(latest && latest.senderId !== user.clerkId && (!ownMembership?.lastReadAt || latest.createdAt > ownMembership.lastReadAt));
    return { conversation, otherName: "ENES Properties", latest, unread };
  });

  return (
    <div className="flex min-h-screen flex-col bg-[#EAF6F1]">
      <Header />
      <main className="enes-container flex-1 py-8 sm:py-11">
        <div className="mb-7 flex items-end justify-between gap-4"><div><p className="enes-kicker">Private conversations</p><h1 className="mt-2 text-[29px] font-extrabold tracking-[-.05em] text-[#04180C] sm:text-[36px]">Messages</h1><p className="mt-2 text-[12px] text-[#69756E]">Your conversations about ENES listings.</p></div><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] bg-[#DDF1E6] text-[#006B1D]"><MessageSquare className="h-5 w-5" /></span></div>
        {entries.length ? <div className="grid gap-2.5">{entries.map(({ conversation, otherName, latest, unread }) => <Link key={conversation.id} href={`/messages/${encodeURIComponent(conversation.id)}`} className="flex min-w-0 items-center gap-3 rounded-[13px] border border-[#D5E5DC] bg-[#FFFFFF] p-4 transition hover:border-[#B8CFC3] hover:shadow-sm"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#DDF1E6] text-[#006B1D]"><MessageSquare className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-2"><span className="truncate text-[12px] font-extrabold text-[#04180C]">{otherName}</span>{unread && <span className="rounded-full bg-[#FBE9E9] px-2 py-0.5 text-[8px] font-extrabold uppercase tracking-[.08em] text-[#A94D31]">New</span>}{conversation.status !== "OPEN" && <span className="rounded-full bg-[#EEEAE2] px-2 py-0.5 text-[8px] font-extrabold uppercase tracking-[.08em] text-[#69756E]">Closed</span>}</span><span className="mt-1 block truncate text-[10px] font-semibold text-[#53615A]">{conversation.subject || conversation.listing.title}</span><span className="mt-1 block truncate text-[10px] text-[#87918B]">{latest?.content || "No visible messages"}</span></span><span className="hidden shrink-0 text-right text-[9px] text-[#87918B] sm:block">{latest?.createdAt.toLocaleDateString("en-NG") || ""}</span><ArrowUpRight className="h-4 w-4 shrink-0 text-[#006B1D]" /></Link>)}</div> : <section className="rounded-[16px] border border-dashed border-[#C5D8CC] bg-[#FFFFFF] px-5 py-14 text-center"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#DDF1E6] text-[#006B1D]"><MessageSquare className="h-5 w-5" /></span><h2 className="mt-4 text-[18px] font-extrabold text-[#04180C]">No conversations yet</h2><p className="mx-auto mt-2 max-w-sm text-[12px] leading-6 text-[#69756E]">Open a published listing and send the seller a private message. Your conversations will appear here.</p><Link href="/search" className="enes-button mt-5">Browse listings</Link></section>}
      </main>
      <Footer />
    </div>
  );
}
