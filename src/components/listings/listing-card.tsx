import Link from "next/link";
import { MapPin, Image as ImageIcon, ArrowUpRight, BedDouble, Bath, CarFront, BadgeCheck } from "lucide-react";
import { SaveListingButton } from "@/components/listings/save-listing-button";

export type ListingCardProps = {
  id: string;
  title: string;
  price: string;
  location: string;
  imageUrl?: string | null;
  imageAlt?: string | null;
  category?: string;
  subCategory?: string | null;
  intent?: string | null;
  condition?: string | null;
  propertyType?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  parkingSpaces?: number | null;
  make?: string | null;
  model?: string | null;
  vehicleYear?: number | null;
  isFeatured?: boolean;
  showSave?: boolean;
  initiallySaved?: boolean;
  reviewLabel?: string;
  featuredLabel?: string;
  photoMissingLabel?: string;
};

function intentLabel(intent?: string | null) {
  const labels: Record<string, string> = {
    FOR_RENT: "For rent", FOR_SALE: "For sale", LAND_FOR_SALE: "Land for sale",
    COMMERCIAL_FOR_RENT: "Commercial rent", COMMERCIAL_FOR_SALE: "Commercial sale", SHORT_LET: "Short let",
  };
  return intent ? labels[intent] || intent.replaceAll("_", " ").toLowerCase() : null;
}

export function ListingCard(props: ListingCardProps) {
  const { id, title, price, location, imageUrl, imageAlt, category, subCategory, intent, condition, propertyType, bedrooms, bathrooms, parkingSpaces, make, model, vehicleYear, isFeatured, showSave = true, initiallySaved = false, reviewLabel = "ENES reviewed", featuredLabel = "Featured", photoMissingLabel = "Photo not provided" } = props;
  const detail = category === "Property"
    ? [bedrooms ? `${bedrooms} bed${bedrooms === 1 ? "" : "s"}` : null, bathrooms ? `${bathrooms} bath${bathrooms === 1 ? "" : "s"}` : null, parkingSpaces ? `${parkingSpaces} parking` : null, !bedrooms && !bathrooms && !parkingSpaces ? propertyType : null].filter(Boolean).join(" · ")
    : category === "Cars"
      ? [make, model, vehicleYear].filter(Boolean).join(" · ")
      : [subCategory, condition].filter(Boolean).join(" · ");
  const tag = intentLabel(intent) || condition || subCategory || category;

  return (
    <article className="group flex min-w-0 flex-col overflow-hidden rounded-[13px] border border-[#E5E0D6] bg-[#FFFDF8] transition duration-200 hover:-translate-y-0.5 hover:border-[#B8CFC3] hover:shadow-[0_14px_32px_rgba(24,33,31,.08)] sm:rounded-[15px]">
      <Link href={`/listing/${encodeURIComponent(id)}`} aria-label={`View ${title}`} className="relative block aspect-[4/3] overflow-hidden bg-[#E8E3D9]">
        {imageUrl ? <img src={imageUrl} alt={imageAlt || title} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.035]" /> : <div className="flex h-full flex-col items-center justify-center gap-2 bg-[#EEE9DF] text-[#84918A]"><span className="flex h-11 w-11 items-center justify-center rounded-full border border-[#D8D1C4] bg-white/60"><ImageIcon className="h-5 w-5" /></span><span className="text-[9px] font-bold uppercase tracking-[.12em]">{photoMissingLabel}</span></div>}
        <span className="absolute left-2.5 top-2.5 max-w-[75%] truncate rounded-full bg-[#FFFDF8]/95 px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-[.06em] text-[#293632] sm:left-3 sm:top-3">{tag || "Listing"}</span>
        {isFeatured && <span className="absolute right-2.5 top-2.5 rounded-full bg-[#C96745] px-2.5 py-1 text-[8px] font-extrabold uppercase tracking-[.06em] text-white sm:right-3 sm:top-3">{featuredLabel}</span>}
        <span className="absolute bottom-2.5 left-2.5 inline-flex items-center gap-1 rounded-full bg-[#176B57]/95 px-2.5 py-1 text-[8px] font-extrabold text-white"><BadgeCheck className="h-3 w-3" /> {reviewLabel}</span>
      </Link>
      <div className="flex min-h-[154px] flex-1 flex-col p-3 sm:min-h-[166px] sm:p-4">
        <Link href={`/listing/${encodeURIComponent(id)}`} className="block min-w-0 rounded-sm focus-visible:outline-offset-4">
          <p className="text-[15px] font-extrabold leading-tight tracking-[-.035em] text-[#176B57] sm:text-[18px]">{price}</p>
          <h3 className="mt-2 line-clamp-2 min-h-[38px] text-[11px] font-bold leading-[1.5] text-[#18211F] sm:text-[13px]">{title}</h3>
          {detail && <p className="mt-1 flex min-h-4 items-center gap-1 truncate text-[9px] font-semibold text-[#6B766F] sm:text-[10px]">{category === "Property" && bedrooms ? <BedDouble className="h-3 w-3 shrink-0" /> : null}{category === "Property" && bathrooms ? <Bath className="h-3 w-3 shrink-0" /> : null}{category === "Cars" ? <CarFront className="h-3 w-3 shrink-0" /> : null}<span className="truncate">{detail}</span></p>}
        </Link>
        <div className="mt-auto flex min-w-0 items-center justify-between gap-1 pt-3">
          <span className="flex min-w-0 items-center gap-1 truncate text-[9px] font-semibold text-[#738078] sm:text-[10px]"><MapPin className="h-3 w-3 shrink-0 text-[#C96745]" />{location}</span>
          <div className="flex shrink-0 items-center gap-1.5">{showSave && <SaveListingButton listingId={id} compact initiallySaved={initiallySaved} />}<Link href={`/listing/${encodeURIComponent(id)}`} aria-label={`Open ${title}`} className="flex h-8 w-8 items-center justify-center rounded-full border border-[#E5E0D6] text-[#176B57] hover:bg-[#E3F0EA]"><ArrowUpRight className="h-3.5 w-3.5" /></Link></div>
        </div>
      </div>
    </article>
  );
}
