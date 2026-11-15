import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { ListingCard } from "@/components/listings/listing-card";
import { prisma } from "@/lib/db";
import { formatNaira } from "@/lib/listings/browse";
import { getPublishedSiteContent } from "@/lib/site-content";
import { NIGERIAN_STATES } from "@/lib/nigeria";
import { Home, CarFront, Armchair, Store, Building2, ArrowUpRight, Search, MapPin, KeyRound, Compass, ClipboardList } from "lucide-react";

export const dynamic = "force-dynamic";

const categoryIcons = { property: Home, cars: CarFront, homeLiving: Armchair, marketplace: Store, services: Building2 } as const;

export default async function HomePage() {
  const content = await getPublishedSiteContent();
  const home = content.homepage;
  const publicMediaFilter = {
    status: "APPROVED",
    deletedAt: null,
    publicUrl: { not: null },
    ...(process.env.R2_PUBLIC_BUCKET_NAME ? { bucketName: process.env.R2_PUBLIC_BUCKET_NAME } : {}),
  };
  const [latestListings, featuredListings, publicCount] = await Promise.all([
    home.showLatest ? prisma.listing.findMany({ where: { status: "PUBLISHED" }, orderBy: { publishedAt: "desc" }, take: 8, include: { media: { where: publicMediaFilter, orderBy: { sortOrder: "asc" }, take: 1, select: { publicUrl: true, altText: true } } } }) : Promise.resolve([]),
    home.showFeatured ? prisma.listing.findMany({ where: { status: "PUBLISHED", isFeatured: true }, orderBy: { publishedAt: "desc" }, take: 4, include: { media: { where: publicMediaFilter, orderBy: { sortOrder: "asc" }, take: 1, select: { publicUrl: true, altText: true } } } }) : Promise.resolve([]),
    prisma.listing.count({ where: { status: "PUBLISHED" } }),
  ]);
  const categories = content.categories.filter((item) => item.enabled);
  const searchCategories = categories
    .filter((item) => ["property", "cars", "homeLiving", "marketplace"].includes(item.key))
    .map((item) => ({
      label: item.label,
      value: ({ property: "Property", cars: "Cars", homeLiving: "Home & Living", marketplace: "Marketplace" } as Record<string, string>)[item.key],
    }));

  return (
    <div className="flex min-h-screen flex-col bg-[#F4F0E8]">
      <Header />
      <main className="flex-1">
        <section className="relative overflow-hidden bg-[#18211F] text-[#FFFDF8]">
          {home.heroImageUrl && <img src={home.heroImageUrl} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover opacity-20" />}
          <div className="enes-soft-grid absolute inset-0 opacity-50" />
          <div className="absolute -right-32 -top-44 h-[520px] w-[520px] rounded-full border border-white/10" />
          <div className="absolute -right-12 -top-24 h-[340px] w-[340px] rounded-full border border-white/10" />
          <div className="enes-container relative grid gap-7 pb-12 pt-8 sm:gap-9 sm:pb-18 sm:pt-14 lg:grid-cols-[1.1fr_.9fr] lg:items-center lg:gap-16">
            <div className="order-2 max-w-2xl lg:order-1">
              <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[.06] px-3 py-2 text-[9px] font-extrabold uppercase tracking-[.15em] text-[#D7C9B8] sm:text-[10px]"><span className="h-1.5 w-1.5 rounded-full bg-[#C96745]" />{home.heroEyebrow}</p>
              <h1 className="enes-display mt-5 max-w-[680px] text-[#FFFDF8] sm:mt-6">{home.heroTitle}<br /><span className="text-[#D8B39F]">{home.heroAccent}</span></h1>
              <p className="mt-4 max-w-lg text-[13px] leading-6 text-white/65 sm:mt-6 sm:text-[15px] sm:leading-7">{home.heroDescription}</p>
              <div className="mt-6 flex flex-wrap gap-2 sm:mt-8 sm:gap-3"><Link href={home.primaryCtaHref} className="enes-button enes-button-clay">{home.primaryCtaLabel} <ArrowUpRight className="h-4 w-4" /></Link><Link href={home.secondaryCtaHref} className="inline-flex min-h-11 items-center justify-center rounded-[9px] border border-white/20 px-4 text-[11px] font-extrabold text-white transition hover:bg-white/10 sm:min-h-12 sm:px-5 sm:text-[13px]">{home.secondaryCtaLabel}</Link></div>
            </div>
            <div className="relative order-1 mx-auto w-full max-w-[540px] lg:order-2 lg:ml-auto">
              <div className="absolute -left-5 -top-5 hidden h-24 w-24 rounded-[22px] border border-[#C96745]/35 sm:block" />
              <div className="relative rounded-[17px] border border-white/15 bg-[#FFFDF8] p-4 text-[#18211F] shadow-[0_28px_70px_rgba(0,0,0,.24)] sm:rounded-[22px] sm:p-6">
                <div className="mb-4 flex items-center justify-between sm:mb-5"><div><p className="text-[9px] font-extrabold uppercase tracking-[.14em] text-[#176B57]">{home.searchEyebrow}</p><h2 className="mt-1 text-[18px] font-extrabold tracking-[-.045em] sm:text-[21px]">{home.searchTitle}</h2></div><span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#E3F0EA] text-[#176B57] sm:h-10 sm:w-10"><Compass className="h-5 w-5" /></span></div>
                <div className="mb-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{home.propertyIntents.filter((item) => item.enabled).map((item) => <Link key={`${item.label}-${item.href}`} href={item.href} className="min-h-9 shrink-0 rounded-full border border-[#DCE7E0] bg-[#F2F7F3] px-3.5 py-2 text-[10px] font-extrabold text-[#176B57] transition hover:border-[#176B57]">{item.label}</Link>)}</div>
                <form action="/search" method="GET" className="space-y-3">
                  <label className="block"><span className="enes-label">{home.searchKeywordLabel}</span><span className="relative block"><Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#849088]" /><input name="q" placeholder={home.searchPlaceholder} className="enes-field h-11 pl-10 sm:h-12" /></span></label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label><span className="enes-label">{home.searchCategoryLabel}</span><select name="category" className="enes-field"><option value="">{home.searchAllCategoriesLabel}</option>{searchCategories.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
                    <label><span className="enes-label">{home.searchLocationLabel}</span><span className="relative block"><MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#849088]" /><input name="state" placeholder={home.searchLocationPlaceholder} className="enes-field pl-9" list="enes-states" /></span></label>
                  </div>
                  <datalist id="enes-states">{NIGERIAN_STATES.map((state) => <option key={state} value={state} />)}</datalist>
                  <button type="submit" className="enes-button min-h-11 w-full sm:min-h-12">{home.searchSubmitLabel} <ArrowUpRight className="h-4 w-4" /></button>
                </form>
                <div className="mt-4 flex items-center justify-between border-t border-[#E5E0D6] pt-3 sm:mt-5 sm:pt-4"><span className="text-[9px] font-semibold text-[#78827B]">{home.searchBrowseLabel}</span><Link href="/search" className="text-[9px] font-extrabold text-[#176B57] hover:text-[#C96745]">{home.searchAllListingsLabel} →</Link></div>
              </div>
              <div className="absolute -bottom-5 -right-4 hidden items-center gap-2 rounded-xl border border-white/10 bg-[#293632] px-4 py-3 text-[11px] font-bold text-white shadow-lg sm:flex"><KeyRound className="h-4 w-4 text-[#D8B39F]" /> {home.reviewBadgeLabel}</div>
            </div>
          </div>
        </section>

        <section aria-label={home.quickActionsLabel} className="enes-container -mt-1 grid grid-cols-2 gap-2.5 pt-4 sm:grid-cols-4 sm:gap-3 sm:pt-6">
          {home.showReview && <Link href="#review-process" className="flex min-h-[58px] items-center gap-2 rounded-[11px] border border-[#E5E0D6] bg-[#FFFDF8] px-3 py-2.5 text-[10px] font-extrabold leading-4 text-[#293632] transition hover:border-[#176B57] sm:min-h-[68px] sm:px-4 sm:text-[11px]"><Compass className="h-4 w-4 shrink-0 text-[#176B57]" />{home.reviewTitle}</Link>}
          {home.showRequest && <Link href={home.requestCtaHref} className="flex min-h-[58px] items-center gap-2 rounded-[11px] border border-[#E5E0D6] bg-[#FFFDF8] px-3 py-2.5 text-[10px] font-extrabold leading-4 text-[#293632] transition hover:border-[#176B57] sm:min-h-[68px] sm:px-4 sm:text-[11px]"><ClipboardList className="h-4 w-4 shrink-0 text-[#176B57]" />{home.requestCtaLabel}</Link>}
          {home.showSeller && <Link href={home.sellerCtaHref} className="flex min-h-[58px] items-center gap-2 rounded-[11px] border border-[#E5E0D6] bg-[#FFFDF8] px-3 py-2.5 text-[10px] font-extrabold leading-4 text-[#293632] transition hover:border-[#176B57] sm:min-h-[68px] sm:px-4 sm:text-[11px]"><ArrowUpRight className="h-4 w-4 shrink-0 text-[#C96745]" />{home.sellerCtaLabel}</Link>}
          <Link href="/safety" className="flex min-h-[58px] items-center gap-2 rounded-[11px] border border-[#E5E0D6] bg-[#FFFDF8] px-3 py-2.5 text-[10px] font-extrabold leading-4 text-[#293632] transition hover:border-[#176B57] sm:min-h-[68px] sm:px-4 sm:text-[11px]"><KeyRound className="h-4 w-4 shrink-0 text-[#176B57]" />{home.reviewSafetyLinkLabel}</Link>
        </section>

        {home.showCategories && <section className="enes-container py-9 sm:py-14">
          <div className="mb-5 flex items-end justify-between gap-4"><div><p className="enes-kicker">{home.categoriesEyebrow}</p><h2 className="enes-section-title mt-2">{home.categoriesTitle}</h2></div><Link href="/search" className="hidden items-center gap-1 text-[11px] font-extrabold text-[#176B57] sm:flex">{home.categoriesBrowseLabel} <ArrowUpRight className="h-3.5 w-3.5" /></Link></div>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5">{categories.map((category) => { const Icon = categoryIcons[category.key as keyof typeof categoryIcons] || Store; return <Link key={category.key} href={category.href} className="group flex min-h-[128px] flex-col justify-between rounded-[13px] border border-[#E5E0D6] bg-[#FFFDF8] p-3.5 transition hover:-translate-y-1 hover:border-[#B7CFC2] hover:shadow-[0_12px_28px_rgba(24,33,31,.07)] sm:min-h-[160px] sm:rounded-[15px] sm:p-5"><span className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[#E3F0EA] text-[#176B57]"><Icon className="h-5 w-5" /></span><span><span className="block text-[11px] font-extrabold leading-5 text-[#18211F] sm:text-[13px]">{category.label}</span><span className="mt-1 block text-[9px] font-medium leading-4 text-[#758079] sm:text-[10px]">{category.description}</span></span></Link>; })}</div>
        </section>}

        {home.showFeatured && featuredListings.length > 0 && <section className="border-y border-[#E5E0D6] bg-[#EAE5DA] py-10 sm:py-14"><div className="enes-container"><div className="mb-5 flex items-end justify-between"><div><p className="enes-kicker">{home.featuredEyebrow}</p><h2 className="enes-section-title mt-2">{home.featuredTitle}</h2></div><Link href="/search" className="text-[10px] font-extrabold text-[#176B57] sm:text-[11px]">{home.featuredBrowseLabel} →</Link></div><div className="grid grid-cols-2 gap-2.5 sm:gap-4 xl:grid-cols-4">{featuredListings.map((item) => <ListingCard key={item.id} id={item.id} title={item.title} price={formatNaira(item.price, item.pricePeriod)} location={`${item.city}, ${item.state}`} category={item.category} subCategory={item.subCategory} intent={item.intent} condition={item.condition} propertyType={item.propertyType} bedrooms={item.bedrooms} bathrooms={item.bathrooms} parkingSpaces={item.parkingSpaces} make={item.make} model={item.model} vehicleYear={item.vehicleYear} imageUrl={item.media[0]?.publicUrl} imageAlt={item.media[0]?.altText} isFeatured={item.isFeatured} reviewLabel={home.reviewBadgeLabel} featuredLabel={home.featuredBadgeLabel} photoMissingLabel={home.photoMissingLabel} />)}</div></div></section>}

        {home.showLatest && <section className="enes-container py-10 sm:py-16">
          <div className="mb-5 flex items-end justify-between gap-4"><div><p className="enes-kicker">{home.latestEyebrow}</p><h2 className="enes-section-title mt-2">{home.latestTitle}</h2><p className="mt-2 text-[11px] text-[#68736D]">{home.latestDescription}</p></div><Link href="/search" className="hidden text-[11px] font-extrabold text-[#176B57] sm:inline">{home.latestBrowseLabel} →</Link></div>
          {latestListings.length ? <div className="grid grid-cols-2 gap-2.5 sm:gap-4 xl:grid-cols-4">{latestListings.map((item) => <ListingCard key={item.id} id={item.id} title={item.title} price={formatNaira(item.price, item.pricePeriod)} location={`${item.city}, ${item.state}`} category={item.category} subCategory={item.subCategory} intent={item.intent} condition={item.condition} propertyType={item.propertyType} bedrooms={item.bedrooms} bathrooms={item.bathrooms} parkingSpaces={item.parkingSpaces} make={item.make} model={item.model} vehicleYear={item.vehicleYear} imageUrl={item.media[0]?.publicUrl} imageAlt={item.media[0]?.altText} isFeatured={item.isFeatured} reviewLabel={home.reviewBadgeLabel} featuredLabel={home.featuredBadgeLabel} photoMissingLabel={home.photoMissingLabel} />)}</div> : <div className="rounded-[16px] border border-dashed border-[#D5CFC2] bg-[#FFFDF8] px-5 py-10 text-center sm:rounded-[18px] sm:px-6 sm:py-14"><span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-[#E3F0EA] text-[#176B57]"><Store className="h-5 w-5" /></span><h3 className="mt-4 text-[17px] font-extrabold tracking-[-.03em] text-[#18211F]">{home.emptyTitle}</h3><p className="mx-auto mt-2 max-w-md text-[11px] leading-6 text-[#68736D]">{home.emptyBody}</p><div className="mt-5 flex flex-wrap justify-center gap-2"><Link href={home.emptyPrimaryHref} className="enes-button">{home.emptyPrimaryLabel}</Link><Link href={home.emptySecondaryHref} className="enes-button enes-button-outline">{home.emptySecondaryLabel}</Link></div></div>}
          <p className="mt-4 text-[9px] text-[#7C867F]">{publicCount.toLocaleString("en-NG")} {home.listingCountPrefix} {publicCount === 1 ? home.listingCountSingular : home.listingCountPlural} {home.listingCountSuffix}</p>
        </section>}

        {home.showReview && <section id="review-process" className="scroll-mt-24 border-y border-[#E5E0D6] bg-[#FFFDF8] py-10 sm:py-14"><div className="enes-container"><div className="max-w-2xl"><p className="enes-kicker">{home.reviewEyebrow}</p><h2 className="enes-section-title mt-2">{home.reviewTitle}</h2><p className="mt-3 text-[11px] leading-6 text-[#68736D] sm:text-[12px]">{home.reviewDescription}</p></div><div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{home.reviewSteps.map((step, index) => <article key={`${step.heading}-${index}`} className="rounded-[12px] border border-[#E5E0D6] bg-[#F8F6F0] p-4"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#E3F0EA] text-[11px] font-extrabold text-[#176B57]">{index + 1}</span><h3 className="mt-4 text-[12px] font-extrabold text-[#18211F]">{step.heading}</h3><p className="mt-2 text-[10px] leading-5 text-[#68736D]">{step.body}</p></article>)}</div><Link href="/safety" className="mt-5 inline-flex items-center gap-1 text-[10px] font-extrabold text-[#176B57]">{home.reviewSafetyLinkLabel} <ArrowUpRight className="h-3 w-3" /></Link></div></section>}

        {home.showRequest && <section className="enes-container py-9 sm:py-12"><div className="grid gap-5 rounded-[15px] bg-[#DCE9E1] p-5 sm:grid-cols-[1fr_auto] sm:items-center sm:p-8"><div><p className="enes-kicker">{home.requestEyebrow}</p><h2 className="mt-2 max-w-xl text-[22px] font-extrabold leading-[1.08] tracking-[-.045em] text-[#18211F] sm:text-[30px]">{home.requestTitle}</h2><p className="mt-3 max-w-lg text-[11px] leading-6 text-[#59675F]">{home.requestBody}</p></div><Link href={home.requestCtaHref} className="enes-button w-full sm:w-auto">{home.requestCtaLabel} <ClipboardList className="h-4 w-4" /></Link></div></section>}

        {home.showSeller && <section className="bg-[#18211F] py-10 text-[#FFFDF8] sm:py-14"><div className="enes-container grid gap-5 sm:grid-cols-[1fr_auto] sm:items-center"><div><p className="text-[9px] font-extrabold uppercase tracking-[.15em] text-[#D8B39F]">{home.sellerEyebrow}</p><h2 className="mt-2 max-w-xl text-[24px] font-extrabold leading-[1.08] tracking-[-.045em] sm:text-[32px]">{home.sellerTitle}</h2><p className="mt-3 max-w-lg text-[11px] leading-6 text-white/65">{home.sellerBody}</p></div><div className="flex flex-wrap gap-2"><Link href={home.sellerCtaHref} className="enes-button enes-button-clay">{home.sellerCtaLabel} <ArrowUpRight className="h-4 w-4" /></Link><Link href="/property-management/new" className="inline-flex min-h-11 items-center justify-center rounded-[9px] border border-white/20 px-4 text-[11px] font-extrabold text-white">{home.sellerServiceCtaLabel}</Link></div></div></section>}
      </main>
      <Footer />
    </div>
  );
}
