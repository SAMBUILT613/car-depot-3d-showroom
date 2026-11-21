import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdminPage } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { InquiryReply } from "@/components/admin/inquiry-reply";

export const dynamic = "force-dynamic";

export default async function AdminInquiryPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireAdminPage("enquiries:view");
  const { id } = await params;
  const conversation = await prisma.conversation.findUnique({
    where: { id },
    include: {
      listing: { select: { id: true, title: true, price: true, city: true, state: true, status: true, sellerName: true, sellerPhone: true, sellerEmail: true } },
      createdBy: { select: { displayName: true, email: true, phone: true } },
      messages: {
        where: { status: "VISIBLE", deletedAt: null },
        orderBy: { createdAt: "asc" },
        take: 300,
        select: { id: true, content: true, senderUserId: true, senderName: true, createdAt: true, sender: { select: { displayName: true } } },
      },
    },
  });
  if (!conversation) notFound();

  const canSeeOwner = actor.permissions.has("sellers:view");
  const canManage = actor.permissions.has("enquiries:manage");
  const listing = conversation.listing;
  const ownerDigits = listing.sellerPhone.replace(/\D/g, "");
  const ownerNote = `Hello ${listing.sellerName}, this is ENES Properties. We have an inquiry about your listing "${listing.title}".`;
  const whatsapp = `https://wa.me/${ownerDigits}?text=${encodeURIComponent(ownerNote)}`;

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 md:px-6">
      <Link href="/admin/inquiries" className="text-[12px] font-bold text-forest-700">← All inquiries</Link>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[22px] font-extrabold text-ink-900">{listing.title}</h1>
        <Badge variant={conversation.status === "OPEN" ? "success" : "secondary"}>{conversation.status === "OPEN" ? "Open" : "Closed"}</Badge>
      </div>
      <p className="mt-1 text-[12px] text-muted-600">₦{listing.price.toLocaleString("en-NG")} · {listing.city}, {listing.state} · <Link href={`/listing/${listing.id}`} className="underline">View public page</Link> · <Link href={`/admin/listings/${listing.id}/edit`} className="underline">Edit listing</Link></p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <section className="rounded-card border border-line-200 bg-white p-4 text-[13px]">
          <p className="text-[11px] font-extrabold uppercase tracking-[.1em] text-forest-700">Buyer / tenant</p>
          <p className="mt-2 font-bold text-ink-900">{conversation.createdBy.displayName}</p>
          {conversation.createdBy.email && <p className="text-muted-600">{conversation.createdBy.email}</p>}
          {conversation.createdBy.phone ? <p className="text-muted-600">{conversation.createdBy.phone}</p> : <p className="text-muted-600">No phone number on file</p>}
        </section>
        <section className="rounded-card border border-line-200 bg-[#EAF6F1] p-4 text-[13px]">
          <p className="text-[11px] font-extrabold uppercase tracking-[.1em] text-forest-700">Property owner · private</p>
          {canSeeOwner ? (
            <>
              <p className="mt-2 font-bold text-ink-900">{listing.sellerName}</p>
              <p className="text-ink-700">+{ownerDigits}</p>
              {listing.sellerEmail && <p className="text-muted-600">{listing.sellerEmail}</p>}
              <div className="mt-3 flex flex-wrap gap-3 text-[12px] font-bold">
                <a href={`tel:+${ownerDigits}`} className="underline">Call</a>
                <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="underline">WhatsApp the owner</a>
              </div>
            </>
          ) : <p className="mt-2 text-muted-600">Your role cannot see owner contact details.</p>}
          <p className="mt-3 text-[11px] text-muted-600">Only administrators see this. The buyer never does.</p>
        </section>
      </div>

      <section className="mt-6 rounded-card border border-line-200 bg-white p-4">
        <h2 className="text-[14px] font-extrabold text-ink-900">Conversation</h2>
        <ol className="mt-3 space-y-3">
          {conversation.messages.map((message) => {
            const fromBuyer = message.senderUserId === conversation.createdByUserId;
            return (
              <li key={message.id} className={`max-w-[85%] rounded-[10px] p-3 text-[13px] ${fromBuyer ? "bg-[#EAF6F1] text-ink-900" : "ml-auto bg-forest-700 text-white"}`}>
                <p className="text-[11px] font-bold opacity-80">{fromBuyer ? conversation.createdBy.displayName : `ENES · ${message.sender?.displayName ?? "Team"}`}</p>
                <p className="mt-1 whitespace-pre-wrap break-words">{message.content}</p>
                <time className="mt-1 block text-[10px] opacity-70">{message.createdAt.toLocaleString("en-NG")}</time>
              </li>
            );
          })}
          {conversation.messages.length === 0 && <li className="text-[12px] text-muted-600">No messages yet.</li>}
        </ol>
        <InquiryReply conversationId={conversation.id} status={conversation.status} canManage={canManage} />
      </section>
    </main>
  );
}
