import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { ensureCurrentUser } from "@/lib/auth";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { SupportForm } from "@/components/support/support-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Support" };

export default async function SupportPage() {
  const { userId } = await auth();
  const user = userId ? await ensureCurrentUser() : null;
  const threads = user
    ? await prisma.supportThread.findMany({
        where: { userId: user.id },
        orderBy: { lastMessageAt: "desc" },
        take: 20,
        include: { messages: { orderBy: { createdAt: "asc" }, take: 100 } },
      })
    : [];

  return (
    <div className="flex min-h-screen flex-col bg-[#EAF6F1]">
      <Header />
      <main className="enes-container flex-1 py-8 sm:py-12">
        <div className="mx-auto max-w-2xl">
          <p className="enes-kicker">Support</p>
          <h1 className="mt-2 text-[28px] font-extrabold tracking-[-.05em] text-[#04180C] sm:text-[34px]">Message ENES support</h1>
          <p className="mt-2 text-[13px] leading-6 text-[#4B5750]">Questions about your account, a listing or the website? Send us a message and we will reply here. For a question about a specific property, open the listing and use the inquiry box there.</p>

          {!user ? (
            <div className="mt-6 rounded-[16px] border border-[#D5E5DC] bg-white p-6 text-center">
              <p className="text-[14px] font-bold text-[#04180C]">Sign in to message support</p>
              <p className="mt-1 text-[12px] text-[#5B6761]">It takes a minute, and you will be able to see our replies here.</p>
              <Link href="/sign-in?redirect_url=%2Fsupport" className="enes-button mt-4 inline-flex">Sign in</Link>
            </div>
          ) : (
            <>
              <section className="mt-6 rounded-[16px] border border-[#D5E5DC] bg-white p-5">
                <h2 className="text-[15px] font-extrabold text-[#04180C]">New message</h2>
                <SupportForm />
              </section>
              {threads.map((thread) => (
                <section key={thread.id} className="mt-5 rounded-[16px] border border-[#D5E5DC] bg-white p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-[15px] font-extrabold text-[#04180C]">{thread.subject}</h2>
                    <span className="text-[11px] font-bold text-[#5B6761]">{thread.status === "OPEN" ? "Open" : "Closed"}</span>
                  </div>
                  <ol className="mt-3 space-y-2.5">
                    {thread.messages.map((message) => (
                      <li key={message.id} className={`max-w-[88%] rounded-[10px] p-3 text-[13px] ${message.fromStaff ? "bg-[#DDF1E6] text-[#04180C]" : "ml-auto bg-[#006B1D] text-white"}`}>
                        <p className="text-[11px] font-bold opacity-80">{message.fromStaff ? "ENES Support" : "You"}</p>
                        <p className="mt-1 whitespace-pre-wrap break-words">{message.content}</p>
                        <time className="mt-1 block text-[10px] opacity-70">{message.createdAt.toLocaleString("en-NG")}</time>
                      </li>
                    ))}
                  </ol>
                  <SupportForm threadId={thread.id} />
                </section>
              ))}
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
