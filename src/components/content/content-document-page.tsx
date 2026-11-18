import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import type { SitePage } from "@/lib/site-content.types";

export function ContentDocumentPage({ page }: { page: SitePage }) {
  return <div className="flex min-h-screen flex-col bg-[#EAF6F1]"><Header /><main className="enes-container flex-1 py-11 sm:py-16">
    <div className="max-w-3xl"><p className="enes-kicker">{page.eyebrow}</p><h1 className="mt-3 text-[32px] font-extrabold leading-[1.04] tracking-[-.05em] text-[#04180C] sm:text-[48px]">{page.title}</h1>{page.description && <p className="mt-5 whitespace-pre-line text-[12px] leading-7 text-[#647168] sm:text-[14px]">{page.description}</p>}</div>
    {page.sections.length > 0 && <div className="mt-8 grid gap-3 sm:grid-cols-2">{page.sections.map((section, index) => <article key={`${section.heading}-${index}`} className="rounded-[14px] border border-[#D5E5DC] bg-[#FFFFFF] p-5"><h2 className="text-[14px] font-extrabold text-[#04180C]">{section.heading}</h2><p className="mt-2 whitespace-pre-line text-[11px] leading-6 text-[#68736D]">{section.body}</p>{section.ctaLabel && section.href && <Link href={section.href} className="mt-4 inline-flex items-center gap-1 text-[10px] font-extrabold text-[#006B1D]">{section.ctaLabel}<ArrowUpRight className="h-3 w-3" /></Link>}</article>)}</div>}
  </main><Footer /></div>;
}
