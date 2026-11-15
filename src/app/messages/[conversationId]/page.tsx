import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MessageSquare } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { ChatWidget } from "@/components/chat/chat-widget";
import { ensureCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Conversation", robots: { index: false, follow: false } };

export default async function MessageThreadPage({ params }: { params: Promise<{ conversationId: string }> }) {
  const user = await ensureCurrentUser();
  const { conversationId } = await params;
  if (!conversationId || conversationId.length > 80) notFound();

  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, participants: { some: { userId: user.id } } },
    select: {
      id: true,
      listingId: true,
      subject: true,
      status: true,
      listing: { select: { title: true } },
      participants: { where: { userId: { not: user.id } }, select: { user: { select: { displayName: true } } } },
    },
  });
  if (!conversation) notFound();

  return (
    <div className="flex min-h-screen flex-col bg-[#F4F0E8]">
      <Header />
      <main className="enes-container w-full max-w-3xl flex-1 py-8 sm:py-11">
        <Link href="/messages" className="inline-flex min-h-10 items-center gap-2 text-[11px] font-extrabold text-[#176B57] hover:text-[#C96745]"><ArrowLeft className="h-4 w-4" /> All messages</Link>
        <section className="mt-4 overflow-hidden rounded-[15px] border border-[#E5E0D6] bg-[#FFFDF8] p-4 sm:p-6">
          <div className="flex items-start gap-3 border-b border-[#E5E0D6] pb-4"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-[#E3F0EA] text-[#176B57]"><MessageSquare className="h-4 w-4" /></span><div className="min-w-0"><p className="text-[9px] font-extrabold uppercase tracking-[.13em] text-[#176B57]">Conversation with {conversation.participants[0]?.user.displayName || "ENES member"}</p><h1 className="mt-1 break-words text-[17px] font-extrabold leading-tight text-[#18211F]">{conversation.subject || conversation.listing.title}</h1><p className="mt-1 text-[10px] text-[#78827B]">{conversation.status === "OPEN" ? "Open conversation" : "Closed conversation"}</p></div></div>
          <ChatWidget listingId={conversation.listingId} initialConversationId={conversation.id} readOnly={conversation.status !== "OPEN"} />
        </section>
      </main>
      <Footer />
    </div>
  );
}
