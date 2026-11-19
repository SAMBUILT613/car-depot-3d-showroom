import Link from "next/link";
import { Search, SlidersHorizontal, X, ClipboardList, ArrowUpRight } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { ListingCard } from "@/components/listings/listing-card";
import { MobileFilterDrawer } from "@/components/listings/mobile-filter-drawer";
import { SaveSearchWidget } from "@/components/search/save-search-widget";
import { NIGERIAN_STATES } from "@/lib/nigeria";
import { browseListings, formatNaira, type BrowseParams, type ListingCategory, param, LISTING_CATEGORIES } from "@/lib/listings/browse";
import { getPublishedSiteContent } from "@/lib/site-content";

function FilterForm({
  category,
  params,
  prefix,
  action,
}: {
  category?: ListingCategory;
  params: BrowseParams;
  prefix: string;
  action: string;
}) {
  const q = param(params, "q");
  const state = param(params, "state");
  const selectedSort = param(params, "sort", 20) || "newest";
  const fieldId = (name: string) => `${prefix}-${name}`;

  return (
    <form action={action} method="GET" className="space-y-4">
      {category && <input type="hidden" name="category" value={category} />}
      <div><label className="enes-label" htmlFor={fieldId("q")}>Keyword</label><input id={fieldId("q")} name="q" defaultValue={q} placeholder="Title, brand or area" className="enes-field" /></div>
      <div><label className="enes-label" htmlFor={fieldId("state")}>State</label><select id={fieldId("state")} name="state" defaultValue={state} className="enes-field"><option value="">All Nigeria</option>{NIGERIAN_STATES.map((item) => <option key={item}>{item}</option>)}</select></div>
      <div className="grid grid-cols-2 gap-2"><div><label className="enes-label" htmlFor={fieldId("min")}>Min price (₦)</label><input id={fieldId("min")} name="minPrice" type="number" min="0" defaultValue={param(params, "minPrice", 16)} placeholder="Any" className="enes-field !px-2" /></div><div><label className="enes-label" htmlFor={fieldId("max")}>Max price (₦)</label><input id={fieldId("max")} name="maxPrice" type="number" min="0" defaultValue={param(params, "maxPrice", 16)} placeholder="Any" className="enes-field !px-2" /></div></div>
      {category === "Property" && <>
        <div><label className="enes-label" htmlFor={fieldId("intent")}>I'm looking for</label><select id={fieldId("intent")} name="intent" defaultValue={param(params, "intent")} className="enes-field"><option value="">Sale or rent</option><option value="FOR_SALE">Property for sale</option><option value="FOR_RENT">Property for rent</option><option value="LAND_FOR_SALE">Land for sale</option><option value="COMMERCIAL_FOR_RENT">Commercial rent</option><option value="COMMERCIAL_FOR_SALE">Commercial sale</option><option value="SHORT_LET">Short let</option></select></div>
        <div><label className="enes-label" htmlFor={fieldId("type")}>Property type</label><select id={fieldId("type")} name="propertyType" defaultValue={param(params, "propertyType")} className="enes-field"><option value="">Any type</option>{["House", "Apartment", "Flat", "Duplex", "Bungalow", "Land", "Commercial", "Warehouse", "Office", "Shop"].map((item) => <option key={item}>{item}</option>)}</select></div>
        <div><label className="enes-label" htmlFor={fieldId("beds")}>Minimum bedrooms</label><select id={fieldId("beds")} name="bedrooms" defaultValue={param(params, "bedrooms")} className="enes-field"><option value="">Any</option>{[1, 2, 3, 4, 5, 6].map((item) => <option key={item} value={item}>{item}+</option>)}</select></div>
      </>}
      {category === "Cars" && <>
        <div><label className="enes-label" htmlFor={fieldId("make")}>Vehicle make</label><input id={fieldId("make")} name="make" defaultValue={param(params, "make")} placeholder="e.g. Toyota" className="enes-field" /></div>
        <div><label className="enes-label" htmlFor={fieldId("model")}>Model</label><input id={fieldId("model")} name="model" defaultValue={param(params, "model")} placeholder="e.g. Corolla" className="enes-field" /></div>
        <div><label className="enes-label" htmlFor={fieldId("year")}>Year from</label><input id={fieldId("year")} name="minYear" type="number" min="1900" max={new Date().getFullYear() + 1} defaultValue={param(params, "minYear")} placeholder="Any year" className="enes-field" /></div>
        <div><label className="enes-label" htmlFor={fieldId("condition")}>Condition</label><select id={fieldId("condition")} name="condition" defaultValue={param(params, "condition")} className="enes-field"><option value="">Any condition</option><option>New</option><option>Foreign Used</option><option>Nigerian Used</option></select></div>
        <div><label className="enes-label" htmlFor={fieldId("transmission")}>Transmission</label><select id={fieldId("transmission")} name="transmission" defaultValue={param(params, "transmission")} className="enes-field"><option value="">Any transmission</option><option>Automatic</option><option>Manual</option><option>CVT</option></select></div>
      </>}
      {(category === "Home & Living" || category === "Marketplace") && <>
        <div><label className="enes-label" htmlFor={fieldId("subcategory")}>Item type</label><input id={fieldId("subcategory")} name="subCategory" defaultValue={param(params, "subCategory")} placeholder="e.g. Sofa, refrigerator" className="enes-field" /></div>
        <div><label className="enes-label" htmlFor={fieldId("brand")}>Brand</label><input id={fieldId("brand")} name="brand" defaultValue={param(params, "brand")} placeholder="Brand name" className="enes-field" /></div>
        <div><label className="enes-label" htmlFor={fieldId("condition")}>Condition</label><select id={fieldId("condition")} name="condition" defaultValue={param(params, "condition")} className="enes-field"><option value="">Any condition</option><option>New</option><option>Used</option><option>Refurbished</option></select></div>
      </>}
      <div><label className="enes-label" htmlFor={fieldId("sort")}>Sort by</label><select id={fieldId("sort")} name="sort" defaultValue={selectedSort} className="enes-field"><option value="newest">Recently published</option><option value="price_low">Price: low to high</option><option value="price_high">Price: high to low</option></select></div>
      <button type="submit" className="enes-button w-full">Apply filters</button>
      <Link href={category ? category === "Property" ? "/property" : category === "Cars" ? "/cars" : category === "Home & Living" ? "/home-living" : "/marketplace" : "/search"} className="flex min-h-10 items-center justify-center gap-1 text-[11px] font-extrabold text-[#68736D] hover:text-[#006B1D]"><X className="h-3.5 w-3.5" /> Clear all filters</Link>
      {category && (q || state || param(params, "maxPrice") || param(params, "intent") || param(params, "make")) && <SaveSearchWidget category={category} state={state} keyword={q} maxPrice={param(params, "maxPrice", 16)} />}
    </form>
  );
}

export async function ListingBrowser({ category, params }: { category?: ListingCategory; params: BrowseParams }) {
  const [result, siteContent] = await Promise.all([browseListings(params, category), getPublishedSiteContent()]);
  const { items, total, shown } = result;
  const q = param(params, "q");
  const state = param(params, "state");
  const heading = category ? siteContent.categoryPages[category === "Property" ? "property" : category === "Cars" ? "cars" : category === "Home & Living" ? "homeLiving" : "marketplace"] : siteContent.categoryPages.search;
  const filterAction = category ? category === "Property" ? "/property" : category === "Cars" ? "/cars" : category === "Home & Living" ? "/home-living" : "/marketplace" : "/search";

  return (
    <div className="flex min-h-screen flex-col bg-[#EAF6F1]">
      <Header />
      <main className="flex-1">
        <section className="border-b border-[#D5E5DC] bg-[#FFFFFF]">
          <div className="enes-container py-7 sm:py-11">
            <p className="enes-kicker">{heading.eyebrow}</p>
            <div className="mt-2 flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div className="max-w-2xl"><h1 className="text-[29px] font-extrabold leading-[1.06] tracking-[-.05em] text-[#04180C] sm:text-[40px]">{heading.title}</h1><p className="mt-3 max-w-xl text-[13px] leading-6 text-[#637069]">{heading.description}</p></div>
              <form action="/search" method="GET" className="flex w-full max-w-md gap-2 md:w-auto">
                <input type="hidden" name="category" value={category || ""} />
                <label className="relative min-w-0 flex-1"><span className="sr-only">Search listings</span><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7A857E]" /><input name="q" defaultValue={q} placeholder="What are you looking for?" className="enes-field h-11 pl-9" /></label>
                <button className="enes-button !min-h-11 !px-4" type="submit">Search</button>
              </form>
            </div>
            <div className="mt-6 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <Link href="/search" className={`shrink-0 rounded-full border px-4 py-2 text-[11px] font-extrabold ${!category ? "border-[#04180C] bg-[#04180C] text-white" : "border-[#D5E5DC] bg-white text-[#58645D]"}`}>All categories</Link>
              {LISTING_CATEGORIES.map((item) => <Link key={item.value} href={item.href} className={`shrink-0 rounded-full border px-4 py-2 text-[11px] font-extrabold ${category === item.value ? "border-[#006B1D] bg-[#006B1D] text-white" : "border-[#D5E5DC] bg-white text-[#58645D] hover:border-[#006B1D]"}`}>{item.label}</Link>)}
            </div>
          </div>
        </section>

        {category === "Property" && <section className="enes-container pt-5 sm:pt-6"><div className="flex flex-col gap-3 rounded-[14px] border border-[#D5E2D9] bg-[#DDF1E6] p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"><div className="flex items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#FFFFFF] text-[#006B1D]"><ClipboardList className="h-4 w-4" /></span><div><p className="text-[12px] font-extrabold text-[#04180C]">Not seeing the property you need?</p><p className="mt-1 text-[10px] leading-5 text-[#53645A]">Submit a private buyer request with your location, budget and requirements.</p></div></div><Link href="/property-request/new" className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-[8px] bg-[#006B1D] px-4 text-[10px] font-extrabold text-white">Describe your requirements <ArrowUpRight className="h-3.5 w-3.5" /></Link></div></section>}

        <section className="enes-container grid gap-5 py-6 sm:py-7 lg:grid-cols-[250px_minmax(0,1fr)] lg:gap-6 lg:py-9">
          <aside className="hidden h-fit rounded-[15px] border border-[#D5E5DC] bg-[#FFFFFF] p-4 sm:p-5 lg:sticky lg:top-[124px] lg:block">
            <div className="mb-4 flex items-center gap-2"><SlidersHorizontal className="h-4 w-4 text-[#006B1D]" /><h2 className="text-[13px] font-extrabold text-[#04180C]">Refine your search</h2></div>
            <FilterForm category={category} params={params} prefix="desktop-filter" action={filterAction} />
          </aside>

          <div className="min-w-0">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div><p className="text-[12px] font-extrabold text-[#04180C]">{total.toLocaleString("en-NG")} {total === 1 ? "listing" : "listings"}</p><p className="mt-1 text-[10px] text-[#78827B]">{total > shown ? `Showing ${shown} most relevant results` : "Published listings matching your search"}</p></div>
              <div className="flex items-center gap-2"><span className="hidden text-[10px] font-semibold text-[#78827B] sm:inline">Sort and refine</span><div className="lg:hidden"><MobileFilterDrawer><FilterForm category={category} params={params} prefix="mobile-filter" action={filterAction} /></MobileFilterDrawer></div></div>
            </div>
            {q && <p className="mb-3 inline-flex rounded-full bg-[#DDF1E6] px-3 py-1.5 text-[10px] font-bold text-[#006B1D]">Search: “{q}”</p>}
            {items.length ? <div className="grid grid-cols-2 gap-2.5 sm:gap-4 xl:grid-cols-3">{items.map((item) => <ListingCard key={item.id} id={item.id} title={item.title} price={formatNaira(item.price, item.pricePeriod)} location={`${item.city}, ${item.state}`} category={item.category} subCategory={item.subCategory} intent={item.intent} condition={item.condition} propertyType={item.propertyType} bedrooms={item.bedrooms} bathrooms={item.bathrooms} parkingSpaces={item.parkingSpaces} make={item.make} model={item.model} vehicleYear={item.vehicleYear} imageUrl={item.media[0]?.publicUrl} imageAlt={item.media[0]?.altText} photoCount={item._count.media} isFeatured={item.isFeatured} reviewLabel={siteContent.homepage.reviewBadgeLabel} featuredLabel={siteContent.homepage.featuredBadgeLabel} photoMissingLabel={siteContent.homepage.photoMissingLabel} />)}</div> : <div className="rounded-[16px] border border-dashed border-[#C5D8CC] bg-[#FFFFFF] px-5 py-12 text-center sm:py-16"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#DDF1E6] text-[#006B1D]"><Search className="h-5 w-5" /></span><h2 className="mt-4 text-[19px] font-extrabold tracking-[-.03em] text-[#04180C]">Nothing matches these filters yet</h2><p className="mx-auto mt-2 max-w-sm text-[12px] leading-6 text-[#69756E]">Try a wider location or price range. ENES only displays listings that have completed review and been published.</p><Link href={filterAction} className="enes-button mt-5">Reset search</Link></div>}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
