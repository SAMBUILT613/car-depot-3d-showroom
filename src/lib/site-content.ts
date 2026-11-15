import "server-only";
import { cache } from "react";
import { connection } from "next/server";
import { prisma } from "@/lib/db";
import type { SiteContentData } from "@/lib/site-content.types";

export const DEFAULT_SITE_CONTENT: SiteContentData = {
  schemaVersion: 1,
  brand: {
    name: "ENES",
    descriptor: "PROPERTIES",
    tagline: "Find a place. Find more.",
    logoUrl: "",
    logoLightUrl: "",
    compactLogoUrl: "",
    faviconUrl: "",
    socialImageUrl: "",
  },
  seo: {
    defaultTitle: "ENES Properties — Find a place. Find more.",
    description: "Explore property, vehicles, home essentials and property-management services across Nigeria on ENES Properties.",
    socialImageUrl: "",
  },
  navigation: {
    links: [
      { label: "Property", href: "/property", enabled: true },
      { label: "Vehicles", href: "/cars", enabled: true },
      { label: "Home & Living", href: "/home-living", enabled: true },
      { label: "Marketplace", href: "/marketplace", enabled: true },
      { label: "Property services", href: "/property-management", enabled: true },
    ],
    listCtaLabel: "List with ENES",
    listCtaHref: "/post",
    signInLabel: "Sign in",
    accountLabel: "My ENES",
    menuHeading: "Explore ENES",
    menuRequestLabel: "Request a property",
    menuSafetyLabel: "Safety centre",
    menuSavedLabel: "Saved listings",
    menuMessagesLabel: "Messages",
    headerSearchPlaceholder: "Search property, cars, home essentials…",
  },
  mobileNav: {
    homeLabel: "Home",
    savedLabel: "Saved",
    listLabel: "List",
    messagesLabel: "Messages",
    profileLabel: "Profile",
  },
  homepage: {
    heroEyebrow: "A marketplace built around real places and useful things",
    heroTitle: "Find a place.",
    heroAccent: "Find more.",
    heroDescription: "From the next place you call home to the car, sofa or service that makes life easier. Explore what is listed across Nigeria.",
    heroImageUrl: "",
    primaryCtaLabel: "Explore property",
    primaryCtaHref: "/property",
    secondaryCtaLabel: "Post a listing",
    secondaryCtaHref: "/post",
    searchTitle: "What are you looking for?",
    searchKeywordLabel: "Search keyword",
    searchPlaceholder: "e.g. 3 bedroom flat, Toyota, refrigerator",
    searchCategoryLabel: "Category",
    searchLocationLabel: "Location",
    searchSubmitLabel: "Search the marketplace",
    searchEyebrow: "Start exploring",
    searchBrowseLabel: "Browse by category instead",
    searchAllListingsLabel: "All listings",
    searchAllCategoriesLabel: "All categories",
    searchLocationPlaceholder: "State in Nigeria",
    categoriesBrowseLabel: "Browse everything",
    featuredBrowseLabel: "See all listings",
    latestBrowseLabel: "View marketplace",
    reviewBadgeLabel: "Reviewed by ENES",
    featuredBadgeLabel: "Featured",
    photoMissingLabel: "Photo not provided",
    listingCountPrefix: "published",
    listingCountSingular: "listing",
    listingCountPlural: "listings",
    listingCountSuffix: "currently available across ENES.",
    quickActionsLabel: "Quick actions",
    reviewSafetyLinkLabel: "Read safety guidance",
    requestEyebrow: "Private property request",
    sellerEyebrow: "For owners, sellers & professionals",
    sellerServiceCtaLabel: "List a service",
    propertyIntents: [
      { label: "Buy", href: "/property?intent=FOR_SALE", enabled: true },
      { label: "Rent", href: "/property?intent=FOR_RENT", enabled: true },
      { label: "Shortlet", href: "/property?intent=SHORT_LET", enabled: true },
      { label: "Land", href: "/property?intent=LAND_FOR_SALE", enabled: true },
    ],
    categoriesEyebrow: "Choose your corner",
    categoriesTitle: "Explore the marketplace",
    featuredEyebrow: "Selected by ENES",
    featuredTitle: "Featured listings",
    latestEyebrow: "Recently published",
    latestTitle: "New on ENES",
    latestDescription: "Only listings approved and published by ENES appear here.",
    emptyTitle: "No public listings yet",
    emptyBody: "New submissions will appear here after ENES completes its listing and media review.",
    emptyPrimaryLabel: "Request a property",
    emptyPrimaryHref: "/property-request/new",
    emptySecondaryLabel: "Submit a listing",
    emptySecondaryHref: "/post",
    reviewEyebrow: "A clear review journey",
    reviewTitle: "How ENES reviews listings",
    reviewDescription: "Submissions are checked before they become publicly visible. Review is a platform process, not a guarantee of title, ownership, condition or transaction outcome.",
    reviewSteps: [
      { heading: "Submit", body: "The seller provides listing details and images.", ctaLabel: "", href: "" },
      { heading: "Review", body: "ENES checks the submission for completeness and policy fit.", ctaLabel: "", href: "" },
      { heading: "Correct", body: "The seller may be asked to clarify or correct information.", ctaLabel: "", href: "" },
      { heading: "Publish", body: "Approved listings become visible to marketplace visitors.", ctaLabel: "", href: "" },
    ],
    requestTitle: "Looking for something specific?",
    requestBody: "Send ENES your requirements privately so the team can understand what you are looking for.",
    requestCtaLabel: "Request a property",
    requestCtaHref: "/property-request/new",
    sellerTitle: "Have something useful to list?",
    sellerBody: "Create a listing or introduce a property-management service. ENES reviews submissions before they become public.",
    sellerCtaLabel: "Post a listing",
    sellerCtaHref: "/post",
    showCategories: true,
    showFeatured: true,
    showLatest: true,
    showReview: true,
    showRequest: true,
    showSeller: true,
  },
  categories: [
    { key: "property", label: "Property", description: "Homes, land & commercial", href: "/property", enabled: true },
    { key: "cars", label: "Cars & vehicles", description: "Find a vehicle", href: "/cars", enabled: true },
    { key: "homeLiving", label: "Home & Living", description: "Furniture & appliances", href: "/home-living", enabled: true },
    { key: "marketplace", label: "General marketplace", description: "Useful everyday goods", href: "/marketplace", enabled: true },
    { key: "services", label: "Property services", description: "Management & care", href: "/property-management", enabled: true },
  ],
  categoryPages: {
    property: { eyebrow: "Find your next address", title: "Property across Nigeria", description: "Explore homes, apartments, land and commercial spaces. Narrow the search by what you need and where you need it." },
    cars: { eyebrow: "Move on your terms", title: "Cars & vehicles", description: "Compare vehicles by make, condition, year and location before contacting a seller." },
    homeLiving: { eyebrow: "Make a place feel like yours", title: "Home & Living", description: "Discover furniture, appliances and useful things for the spaces you live in." },
    marketplace: { eyebrow: "Useful finds, closer to home", title: "General marketplace", description: "Browse useful goods across Nigeria, from everyday essentials to specialist items." },
    search: { eyebrow: "One marketplace, many possibilities", title: "Search the ENES marketplace", description: "Search across property, vehicles, home essentials and useful goods in one place." },
  },
  footer: {
    description: "A Nigeria-wide marketplace for property, vehicles, home essentials and property-management services.",
    copyrightText: "All rights reserved.",
    bottomNote: "Built for the Nigerian marketplace",
    columns: [
      { title: "Browse", links: [{ label: "Property", href: "/property", enabled: true }, { label: "Cars & vehicles", href: "/cars", enabled: true }, { label: "Home & Living", href: "/home-living", enabled: true }, { label: "General marketplace", href: "/marketplace", enabled: true }] },
      { title: "Property services", links: [{ label: "Find a service", href: "/property-management", enabled: true }, { label: "List a service", href: "/property-management/new", enabled: true }, { label: "Post a property", href: "/post?category=Property", enabled: true }] },
      { title: "ENES", links: [{ label: "My dashboard", href: "/dashboard", enabled: true }, { label: "About", href: "/about", enabled: true }, { label: "Contact", href: "/contact", enabled: true }, { label: "Safety centre", href: "/safety", enabled: true }] },
      { title: "Information", links: [{ label: "Privacy notice", href: "/privacy", enabled: true }, { label: "Terms of use", href: "/terms", enabled: true }] },
    ],
  },
  pages: {
    about: { eyebrow: "About ENES", title: "A place to find what matters, across Nigeria.", description: "ENES Properties is a Nigeria-wide marketplace built around property and the useful things and services connected to everyday life. People can discover published listings, compare details and contact sellers or service providers through the relevant listing pages.", sections: [
      { heading: "Property", body: "Houses, apartments, land and commercial spaces for sale or rent.", ctaLabel: "Explore property", href: "/property" },
      { heading: "Vehicles", body: "Cars and other vehicles with details that help buyers compare listings.", ctaLabel: "Browse vehicles", href: "/cars" },
      { heading: "Home & marketplace", body: "Furniture, appliances and useful goods across everyday categories.", ctaLabel: "Explore goods", href: "/marketplace" },
      { heading: "Property services", body: "A separate directory for property-management and related service providers.", ctaLabel: "Find a service", href: "/property-management" },
      { heading: "How publishing works", body: "A listing or service submission is not publicly visible until the appropriate ENES review is completed. Review is not a guarantee of property title, product condition, seller identity or service quality. Buyers should make their own checks before committing.", ctaLabel: "Read the safety centre", href: "/safety" },
    ] },
    contact: { eyebrow: "Contact routes", title: "Get to the right conversation.", description: "ENES routes marketplace questions through the listing, service and safety tools so the relevant seller or provider receives the context.\n\nNo general support phone number or email address has been published in this project configuration. ENES does not display an unverified contact channel.", sections: [
      { heading: "Ask about a listing", body: "Open a published listing to use its WhatsApp contact or private message option.", ctaLabel: "Browse listings", href: "/search" },
      { heading: "Enquire about a service", body: "Open a published property-management service and send an enquiry directly through its form.", ctaLabel: "Find a provider", href: "/property-management" },
      { heading: "Report a concern", body: "Use the report option on a listing or message to submit a concern for review.", ctaLabel: "Safety centre", href: "/safety" },
    ] },
    propertyManagement: { eyebrow: "A separate part of ENES", title: "Property services for the work ahead.", description: "Find property-management and related services by type and location. Enquiries go directly to the provider through ENES.", sections: [
      { heading: "Property management", body: "Ongoing property oversight", ctaLabel: "", href: "" },
      { heading: "Maintenance", body: "Repairs and upkeep", ctaLabel: "", href: "" },
      { heading: "Inspections", body: "Property checks and reports", ctaLabel: "", href: "" },
      { heading: "Letting & leasing", body: "Occupancy and tenancy support", ctaLabel: "", href: "" },
    ] },
    // Legal and safety copy is intentionally blank until the Owner supplies approved wording.
    safety: { eyebrow: "", title: "", description: "", sections: [] },
    terms: { eyebrow: "", title: "", description: "", sections: [] },
    privacy: { eyebrow: "", title: "", description: "", sections: [] },
  },
};

type JsonRecord = Record<string, unknown>;
function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function isSafeHref(value: string) {
  if (!value) return true;
  if (value.startsWith("/") && !value.startsWith("//") && !value.includes("\\")) return true;
  try {
    const parsed = new URL(value);
    return ["https:", "mailto:", "tel:"].includes(parsed.protocol) && !parsed.username && !parsed.password;
  } catch { return false; }
}
function isSafeAssetUrl(value: string) {
  if (!value) return true;
  if (value.startsWith("/") && !value.startsWith("//") && !value.includes("\\")) return true;
  try { const parsed = new URL(value); return parsed.protocol === "https:" && !parsed.username && !parsed.password; } catch { return false; }
}
function normalizeValue(template: unknown, value: unknown, path: string): unknown {
  if (typeof template === "string") {
    if (typeof value !== "string" || value.length > (path.toLowerCase().includes("description") || path.toLowerCase().includes("body") ? 5000 : 1000)) {
      throw new Error(`Invalid text value at ${path}`);
    }
    if (/href$/i.test(path) && !isSafeHref(value.trim())) throw new Error(`Unsafe link at ${path}`);
    if (/url$/i.test(path) && !isSafeAssetUrl(value.trim())) throw new Error(`Unsafe asset URL at ${path}`);
    return value.trim();
  }
  if (typeof template === "boolean") {
    if (typeof value !== "boolean") throw new Error(`Invalid boolean at ${path}`);
    return value;
  }
  if (typeof template === "number") {
    if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(`Invalid number at ${path}`);
    return value;
  }
  if (Array.isArray(template)) {
    if (!Array.isArray(value) || value.length > 40) throw new Error(`Invalid list at ${path}`);
    const itemTemplate = template[0] ?? (path.endsWith(".sections") ? { heading: "", body: "", ctaLabel: "", href: "" } : null);
    if (itemTemplate === null && value.length) throw new Error(`Unsupported list at ${path}`);
    return value.map((entry, index) => normalizeValue(itemTemplate, entry, `${path}[${index}]`));
  }
  if (isRecord(template)) {
    if (!isRecord(value)) throw new Error(`Invalid object at ${path}`);
    const allowed = new Set(Object.keys(template));
    for (const key of Object.keys(value)) if (!allowed.has(key)) throw new Error(`Unsupported field ${path}.${key}`);
    const result: JsonRecord = {};
    for (const [key, child] of Object.entries(template)) {
      result[key] = normalizeValue(child, value[key] === undefined ? child : value[key], path ? `${path}.${key}` : key);
    }
    return result;
  }
  throw new Error(`Unsupported site content value at ${path}`);
}

export function parseSiteContent(value: unknown): SiteContentData {
  if (!isRecord(value)) throw new Error("Site content must be a JSON object.");
  const encoded = JSON.stringify(value);
  if (!encoded || encoded.length > 180_000) throw new Error("Site content exceeds the 180 KB limit.");
  return normalizeValue(DEFAULT_SITE_CONTENT, value, "") as SiteContentData;
}

export function mergeSiteContent(value: unknown): SiteContentData {
  try { return parseSiteContent(value ?? DEFAULT_SITE_CONTENT); }
  catch { return DEFAULT_SITE_CONTENT; }
}

export async function getAdminSiteContentRecord() {
  return prisma.siteContent.upsert({
    where: { key: "global" },
    create: { key: "global", draft: DEFAULT_SITE_CONTENT, draftVersion: 0, publishedVersion: 0 },
    update: {},
    include: {
      revisions: { orderBy: { version: "desc" }, take: 8, select: { version: true, content: true, note: true, createdAt: true, createdByClerkId: true } },
    },
  });
}

export const getPublishedSiteContent = cache(async (): Promise<SiteContentData> => {
  await connection();
  const record = await prisma.siteContent.findUnique({ where: { key: "global" }, select: { published: true } });
  return mergeSiteContent(record?.published ?? DEFAULT_SITE_CONTENT);
});
