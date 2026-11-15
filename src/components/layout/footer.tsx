import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { getPublishedSiteContent } from "@/lib/site-content";

export async function Footer() {
  const content = await getPublishedSiteContent();
  const brand = content.brand;
  return (
    <footer className="mt-auto bg-[#18211F] text-[#FFFDF8]">
      <div className="enes-container grid gap-10 py-12 md:grid-cols-[1.25fr_2.75fr] md:py-14">
        <div className="max-w-sm">
          <Link href="/" className="inline-flex min-h-10 items-center gap-2.5">
            {(brand.logoLightUrl || brand.logoUrl) ? <img src={brand.logoLightUrl || brand.logoUrl} alt={`${brand.name} logo`} className={`max-h-10 max-w-[160px] object-contain object-left ${brand.logoLightUrl ? "" : "brightness-0 invert"}`} /> : <><span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-[11px] bg-[#F4F0E8] text-[15px] font-extrabold tracking-[-.08em] text-[#18211F]">{brand.compactLogoUrl ? <img src={brand.compactLogoUrl} alt="" className="h-full w-full object-contain" /> : "E."}</span><span className="text-[18px] font-extrabold tracking-[-.055em]">{brand.name}</span></>}
          </Link>
          <p className="mt-4 text-[21px] font-extrabold leading-[1.12] tracking-[-.04em]">{brand.tagline}</p>
          <p className="mt-3 max-w-xs text-[12px] leading-6 text-white/60">{content.footer.description}</p>
        </div>
        <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-4">
          {content.footer.columns.map((column, index) => <div key={`${column.title}-${index}`}><h2 className="mb-3 text-[10px] font-extrabold uppercase tracking-[.14em] text-[#D5B29F]">{column.title}</h2><ul className="space-y-2.5">{column.links.filter((item) => item.enabled).map((item, linkIndex) => <li key={`${item.href}-${linkIndex}`}><Link href={item.href} className="text-[11px] font-semibold text-white/70 transition hover:text-white">{item.label}</Link></li>)}</ul></div>)}
        </div>
      </div>
      <div className="border-t border-white/10"><div className="enes-container flex flex-col gap-2 py-4 text-[10px] text-white/45 sm:flex-row sm:items-center sm:justify-between"><span>© {new Date().getFullYear()} {brand.name} {content.footer.copyrightText}</span><span className="flex items-center gap-2">{content.footer.bottomNote} <ArrowUpRight className="h-3 w-3" /></span></div></div>
    </footer>
  );
}
