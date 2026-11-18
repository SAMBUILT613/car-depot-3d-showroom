import Link from "next/link";
import { Search, ArrowUpRight, Menu, X } from "lucide-react";
import { UserButton, Show } from "@clerk/nextjs";
import { getPublishedSiteContent } from "@/lib/site-content";

export async function Header() {
  const content = await getPublishedSiteContent();
  const links = content.navigation.links.filter((item) => item.enabled);
  const brand = content.brand;
  return (
    <header className="sticky top-0 z-50 border-b border-[#D5E5DC] bg-[#FFFFFF]/95 backdrop-blur-xl">
      <div className="enes-container flex min-h-[64px] items-center gap-3 sm:min-h-[72px] sm:gap-5">
        <Link href="/" aria-label={`${brand.name} home`} className="group flex min-w-0 shrink-0 items-center gap-2.5">
          {brand.logoUrl ? <img src={brand.logoUrl} alt={`${brand.name} logo`} className="max-h-10 max-w-[150px] object-contain object-left sm:max-h-11 sm:max-w-[190px]" /> : <>
            <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-[11px] bg-[#04180C] text-[15px] font-extrabold tracking-[-.08em] text-[#EAF6F1] sm:h-10 sm:w-10">{brand.compactLogoUrl ? <img src={brand.compactLogoUrl} alt="" className="h-full w-full object-contain" /> : "E."}</span>
            <span className="flex flex-col leading-none"><span className="text-[16px] font-extrabold tracking-[-.055em] text-[#04180C]">{brand.name}</span><span className="mt-1 text-[8px] font-bold tracking-[.17em] text-[#006B1D]">{brand.descriptor}</span></span>
          </>}
        </Link>

        <form action="/search" method="GET" className="hidden min-w-0 flex-1 items-center md:flex">
          <div className="relative w-full max-w-[480px]">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-[17px] w-[17px] -translate-y-1/2 text-[#68736D]" />
            <input name="q" aria-label="Search the ENES marketplace" placeholder={content.navigation.headerSearchPlaceholder} className="h-11 w-full rounded-full border border-[#D5E5DC] bg-[#EAF6F1] pl-11 pr-4 text-[13px] outline-none transition focus:border-[#006B1D] focus:bg-white" />
          </div>
        </form>

        <nav aria-label="Main navigation" className="ml-auto hidden items-center gap-4 xl:flex">
          {links.map((item) => <Link key={`${item.href}-${item.label}`} href={item.href} className="whitespace-nowrap text-[11px] font-bold text-[#25402F] transition hover:text-[#006B1D]">{item.label}</Link>)}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2 xl:ml-0 sm:gap-3">
          <Link href="/search" aria-label="Search marketplace" className="flex h-10 w-10 items-center justify-center rounded-full border border-[#D5E5DC] text-[#04180C] md:hidden"><Search className="h-4 w-4" /></Link>
          <Show when="signed-in">
            <Link href="/dashboard" className="hidden text-[11px] font-extrabold text-[#04180C] hover:text-[#006B1D] sm:inline">{content.navigation.accountLabel}</Link>
            <UserButton />
          </Show>
          <Show when="signed-out">
            <Link href="/sign-in" className="hidden text-[11px] font-extrabold text-[#04180C] hover:text-[#006B1D] sm:inline">{content.navigation.signInLabel}</Link>
          </Show>
          <Link href={content.navigation.listCtaHref} aria-label={content.navigation.listCtaLabel} className="inline-flex min-h-9 items-center justify-center rounded-full bg-[#A10D10] px-3 text-[10px] font-extrabold text-white transition hover:bg-[#7E0A0C] sm:min-h-10 sm:px-4 sm:text-[11px]">
            <span className="sm:hidden">List</span><span className="hidden sm:inline">{content.navigation.listCtaLabel}</span><ArrowUpRight className="ml-1 h-3.5 w-3.5" />
          </Link>
          <details className="relative xl:hidden">
            <summary aria-label="Open marketplace menu" className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-full border border-[#D5E5DC] text-[#04180C] [&::-webkit-details-marker]:hidden"><Menu className="h-4 w-4" /></summary>
            <div className="absolute right-0 top-[calc(100%+12px)] z-[60] w-[min(88vw,340px)] rounded-[14px] border border-[#D5E5DC] bg-[#FFFFFF] p-3 shadow-[0_18px_45px_rgba(4,24,12,.16)]">
              <div className="mb-2 flex items-center justify-between px-2 py-1"><span className="text-[10px] font-extrabold uppercase tracking-[.12em] text-[#006B1D]">{content.navigation.menuHeading}</span><X className="h-3.5 w-3.5 text-[#879189]" /></div>
              <nav aria-label="Mobile marketplace menu" className="grid gap-1">{links.map((item) => <Link key={`${item.href}-${item.label}`} href={item.href} className="flex min-h-11 items-center rounded-[8px] px-3 text-[12px] font-bold text-[#34443B] hover:bg-[#EAF6F1]">{item.label}</Link>)}</nav>
              <div className="my-2 border-t border-[#E0EEE6]" />
              <Link href="/saved" className="flex min-h-10 items-center rounded-[8px] px-3 text-[11px] font-bold text-[#34443B] hover:bg-[#EAF6F1]">{content.navigation.menuSavedLabel}</Link>
              <Link href="/messages" className="flex min-h-10 items-center rounded-[8px] px-3 text-[11px] font-bold text-[#34443B] hover:bg-[#EAF6F1]">{content.navigation.menuMessagesLabel}</Link>
              <Link href="/property-request/new" className="flex min-h-10 items-center rounded-[8px] px-3 text-[11px] font-bold text-[#006B1D] hover:bg-[#EAF6F1]">{content.navigation.menuRequestLabel}</Link>
              <Link href="/safety" className="flex min-h-10 items-center rounded-[8px] px-3 text-[11px] font-bold text-[#006B1D] hover:bg-[#EAF6F1]">{content.navigation.menuSafetyLabel}</Link>
              <Link href={content.navigation.listCtaHref} className="mt-2 flex min-h-11 items-center justify-center rounded-[8px] bg-[#006B1D] px-3 text-[11px] font-extrabold text-white">{content.navigation.listCtaLabel}</Link>
            </div>
          </details>
        </div>
      </div>
      <nav aria-label="Marketplace categories" className="border-t border-[#D5E5DC] xl:hidden">
        <div className="enes-container flex items-center gap-5 overflow-x-auto py-2.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {links.map((item) => <Link key={`${item.href}-${item.label}`} href={item.href} className="flex shrink-0 items-center text-[10px] font-bold text-[#53615A] hover:text-[#006B1D]">{item.label}</Link>)}
        </div>
      </nav>
    </header>
  );
}
