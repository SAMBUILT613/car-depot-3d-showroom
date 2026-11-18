import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { prisma } from "@/lib/db";
import { NIGERIAN_STATES } from "@/lib/nigeria";
import { getPublishedSiteContent } from "@/lib/site-content";
import { Building2, ArrowUpRight, Search, MapPin, Wrench, ClipboardCheck, KeyRound } from "lucide-react";

export const dynamic = "force-dynamic";
type Params = { q?: string | string[]; state?: string | string[]; serviceType?: string | string[] };
function value(raw: string | string[] | undefined, max = 100) { const item = Array.isArray(raw) ? raw[0] : raw; return typeof item === "string" ? item.trim().slice(0, max) : ""; }
const serviceTypes = ["Property Management", "Facility Management", "Property Maintenance", "Letting & Leasing", "Real Estate Agency", "Inspection & Valuation", "Cleaning & Care", "Other"];

export default async function PropertyManagementPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const siteContent = await getPublishedSiteContent();
  const pageContent = siteContent.pages.propertyManagement;
  const q = value(params.q);
  const state = value(params.state, 80);
  const serviceType = value(params.serviceType, 80);
  const where = {
    status: "PUBLISHED",
    provider: { status: "ACTIVE" },
    ...(state && NIGERIAN_STATES.includes(state) ? { state } : {}),
    ...(serviceType && serviceTypes.includes(serviceType) ? { serviceType } : {}),
    ...(q ? { OR: [{ title: { contains: q, mode: "insensitive" as const } }, { description: { contains: q, mode: "insensitive" as const } }, { city: { contains: q, mode: "insensitive" as const } }, { serviceType: { contains: q, mode: "insensitive" as const } }] } : {}),
  };
  const services = await prisma.propertyManagementService.findMany({
    where,
    orderBy: { publishedAt: "desc" },
    take: 60,
    select: { id: true, title: true, slug: true, serviceType: true, description: true, state: true, city: true, serviceAreas: true, pricingType: true, startingPrice: true, provider: { select: { displayName: true, sellerProfile: { select: { businessName: true } } } } },
  });

  return <div className="flex min-h-screen flex-col bg-[#EAF6F1]"><Header /><main className="flex-1">
    <section className="bg-[#04180C] text-[#FFFFFF]"><div className="enes-container grid gap-8 py-12 sm:py-16 lg:grid-cols-[1fr_.78fr] lg:items-center">
      <div><p className="text-[10px] font-extrabold uppercase tracking-[.17em] text-[#3FBF63]">{pageContent.eyebrow}</p><h1 className="mt-3 max-w-2xl text-[36px] font-extrabold leading-[1.02] tracking-[-.05em] sm:text-[50px]">{pageContent.title}</h1><p className="mt-5 max-w-xl text-[13px] leading-7 text-white/65">{pageContent.description}</p><Link href="/property-management/new" className="enes-button enes-button-clay mt-7">List a property service <ArrowUpRight className="h-4 w-4" /></Link></div>
      <div className="grid grid-cols-2 gap-3">{pageContent.sections.map((section, index) => { const Icon = [Building2, Wrench, ClipboardCheck, KeyRound][index] || Building2; return <div key={`${section.heading}-${index}`} className="rounded-[14px] border border-white/12 bg-white/[.055] p-4"><Icon className="h-5 w-5 text-[#3FBF63]"/><p className="mt-5 text-[12px] font-extrabold">{section.heading}</p><p className="mt-1 text-[10px] text-white/50">{section.body}</p></div>; })}</div>
    </div></section>
    <section className="enes-container py-9 sm:py-12">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3"><div><p className="enes-kicker">Provider directory</p><h2 className="enes-section-title mt-2">Find a property service</h2><p className="mt-2 text-[12px] text-[#69756E]">Only services reviewed and published by ENES appear here.</p></div><span className="text-[11px] font-bold text-[#6B766F]">{services.length} {services.length === 1 ? "service" : "services"} shown</span></div>
      <form action="/property-management" method="GET" className="mb-6 grid gap-3 rounded-[15px] border border-[#D5E5DC] bg-[#FFFFFF] p-4 md:grid-cols-[1fr_220px_220px_auto] md:items-end">
        <label><span className="enes-label">Search services</span><span className="relative block"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#879189]"/><input name="q" defaultValue={q} placeholder="Service, provider or location" className="enes-field pl-9" /></span></label>
        <label><span className="enes-label">Service type</span><select name="serviceType" defaultValue={serviceType} className="enes-field"><option value="">All services</option>{serviceTypes.map((type)=><option key={type}>{type}</option>)}</select></label>
        <label><span className="enes-label">State</span><select name="state" defaultValue={state} className="enes-field"><option value="">All Nigeria</option>{NIGERIAN_STATES.map((item)=><option key={item}>{item}</option>)}</select></label>
        <button type="submit" className="enes-button">Filter <ArrowUpRight className="h-4 w-4"/></button>
      </form>
      {services.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{services.map((service)=> <article key={service.id} className="group flex flex-col rounded-[15px] border border-[#D5E5DC] bg-[#FFFFFF] p-5 transition hover:-translate-y-1 hover:border-[#B8CFC3] hover:shadow-[0_14px_32px_rgba(4,24,12,.07)]"><div className="flex items-start justify-between gap-3"><span className="rounded-full bg-[#DDF1E6] px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-[.09em] text-[#006B1D]">{service.serviceType}</span><span className="text-[10px] font-bold text-[#8A938D]">ENES service</span></div><h3 className="mt-5 text-[18px] font-extrabold leading-tight tracking-[-.035em] text-[#04180C]">{service.title}</h3><p className="mt-2 line-clamp-3 text-[12px] leading-6 text-[#68736D]">{service.description}</p><div className="mt-4 flex items-center gap-1.5 text-[11px] font-bold text-[#58645D]"><MapPin className="h-3.5 w-3.5 text-[#A10D10]"/>{service.city}, {service.state}</div>{service.serviceAreas.length>0&&<p className="mt-2 line-clamp-2 text-[10px] text-[#79837D]">Also serves: {service.serviceAreas.join(", ")}</p>}<div className="mt-auto flex items-end justify-between gap-3 border-t border-[#E0EEE6] pt-5 mt-5"><div><p className="text-[9px] font-extrabold uppercase tracking-[.1em] text-[#89928C]">Provider</p><p className="mt-1 text-[11px] font-extrabold text-[#0F2A18]">{service.provider.sellerProfile?.businessName || service.provider.displayName}</p>{service.startingPrice !== null && <p className="mt-1 text-[12px] font-extrabold text-[#006B1D]">From ₦{service.startingPrice.toLocaleString("en-NG")}</p>}</div><Link href={`/property-management/${service.id}`} className="inline-flex min-h-10 shrink-0 items-center gap-1 rounded-full bg-[#006B1D] px-4 text-[10px] font-extrabold text-white transition hover:bg-[#004D15]">View service <ArrowUpRight className="h-3 w-3"/></Link></div></article>)}</div> : <div className="rounded-[15px] border border-dashed border-[#C5D8CC] bg-[#FFFFFF] px-5 py-14 text-center"><Building2 className="mx-auto h-8 w-8 text-[#006B1D]"/><h3 className="mt-3 text-[17px] font-extrabold text-[#04180C]">No published services match</h3><p className="mx-auto mt-2 max-w-sm text-[12px] leading-6 text-[#6B766F]">Try another service type or state. Providers' submissions appear after ENES review.</p><Link href="/property-management/new" className="enes-button mt-5">Submit a service</Link></div>}
    </section>
  </main><Footer/></div>;
}
