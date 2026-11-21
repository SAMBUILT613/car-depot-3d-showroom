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
    compactLogoUrl: "/brand/enes-badge.png",
    faviconUrl: "/brand/favicon.png",
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
    heroEyebrow: "Property, vehicles and home essentials across Nigeria",
    heroTitle: "Find a place.",
    heroAccent: "Find more.",
    heroDescription: "Browse homes, land, cars, furniture and property services from sellers across Nigeria. Every listing is reviewed before it goes live.",
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
    photoMissingLabel: "No photo yet",
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
    categoriesEyebrow: "Categories",
    categoriesTitle: "Browse by category",
    featuredEyebrow: "Featured",
    featuredTitle: "Featured listings",
    latestEyebrow: "Just added",
    latestTitle: "New on ENES",
    latestDescription: "Every listing here has been reviewed by ENES.",
    emptyTitle: "No public listings yet",
    emptyBody: "Listings appear here once they have been reviewed. Post the first one, or tell us what you are looking for.",
    emptyPrimaryLabel: "Request a property",
    emptyPrimaryHref: "/property-request/new",
    emptySecondaryLabel: "Submit a listing",
    emptySecondaryHref: "/post",
    reviewEyebrow: "How it works",
    reviewTitle: "How ENES reviews listings",
    reviewDescription: "Every listing is checked before it goes live. The check covers completeness and our rules. It cannot guarantee ownership, condition or the outcome of a deal, so always inspect before you pay.",
    reviewSteps: [
      { heading: "Submit", body: "Sellers add details and photos.", ctaLabel: "", href: "" },
      { heading: "Review", body: "ENES checks the listing and its photos.", ctaLabel: "", href: "" },
      { heading: "Correct", body: "Sellers fix anything we flag.", ctaLabel: "", href: "" },
      { heading: "Publish", body: "Approved listings go live.", ctaLabel: "", href: "" },
    ],
    requestTitle: "Looking for something specific?",
    requestBody: "Tell us your location, budget and what you need. Your request stays private.",
    requestCtaLabel: "Request a property",
    requestCtaHref: "/property-request/new",
    sellerTitle: "Have something to sell or rent?",
    sellerBody: "List a property, vehicle or item, or add a property service. Listing is free, and ENES reviews it before it goes live.",
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
  categoryPages: {"property":{"eyebrow":"Property","title":"Property for sale and rent in Nigeria","description":"Homes, apartments, land and commercial spaces. Filter by location, price and type."},"cars":{"eyebrow":"Vehicles","title":"Cars & vehicles","description":"Compare cars by make, year, condition and location before you contact a seller."},"homeLiving":{"eyebrow":"Home & Living","title":"Furniture and home essentials","description":"Furniture, appliances and everyday items for your home."},"marketplace":{"eyebrow":"Marketplace","title":"General marketplace","description":"Everyday goods and specialist items from sellers across Nigeria."},"search":{"eyebrow":"Search","title":"Search ENES","description":"Search property, vehicles, home essentials and goods in one place."}},
  footer: {
    description: "A Nigeria-wide marketplace for property, vehicles, home essentials and property services. Office: 7 Nonso Eze Avenue, Beside Castelllo Company, Nkwelle Ezunaka, Oyi L.G.A, Anambra State. Call or chat: 0907 765 1953.",
    copyrightText: "All rights reserved.",
    bottomNote: "Listings reviewed by ENES",
    columns: [
      { title: "Browse", links: [{ label: "Property", href: "/property", enabled: true }, { label: "Cars & vehicles", href: "/cars", enabled: true }, { label: "Home & Living", href: "/home-living", enabled: true }, { label: "General marketplace", href: "/marketplace", enabled: true }] },
      { title: "Property services", links: [{ label: "Find a service", href: "/property-management", enabled: true }, { label: "List a service", href: "/property-management/new", enabled: true }, { label: "Post a property", href: "/post?category=Property", enabled: true }] },
      { title: "ENES", links: [{ label: "My dashboard", href: "/dashboard", enabled: true }, { label: "About", href: "/about", enabled: true }, { label: "Contact", href: "/contact", enabled: true }, { label: "Safety centre", href: "/safety", enabled: true }] },
      { title: "Information", links: [{ label: "Privacy notice", href: "/privacy", enabled: true }, { label: "Terms of use", href: "/terms", enabled: true }] },
    ],
  },
  pages: {
    about: {"eyebrow":"About ENES","title":"Property and everyday finds across Nigeria.","description":"ENES Properties is a Nigeria-wide marketplace for homes, land, vehicles, furniture and property services. Browse reviewed listings, compare details and send inquiries through ENES.","sections":[{"heading":"Property","body":"Houses, apartments, land and commercial spaces for sale or rent.","ctaLabel":"Explore property","href":"/property"},{"heading":"Vehicles","body":"Cars and other vehicles, with the details you need to compare.","ctaLabel":"Browse vehicles","href":"/cars"},{"heading":"Home & marketplace","body":"Furniture, appliances and everyday goods.","ctaLabel":"Explore goods","href":"/marketplace"},{"heading":"Property services","body":"Property managers, maintenance, inspections and letting support.","ctaLabel":"Find a service","href":"/property-management"},{"heading":"How publishing works","body":"Nothing goes live until ENES has reviewed it. The review checks that a listing is complete and follows our rules. It does not verify ownership, condition or the seller's identity, so always check for yourself before you pay.","ctaLabel":"Read the safety centre","href":"/safety"}]},
    contact: {"eyebrow":"Contact","title":"Get in touch.","description":"The fastest answers about an item come from the seller or service provider, so start from the listing or service page. For anything else, call or chat with the ENES office or email enespropertyrealtors@gmail.com.","sections":[{"heading":"Visit our office","body":"7 Nonso Eze Avenue, Beside Castelllo Company, Nkwelle Ezunaka, Oyi L.G.A, Anambra State.","ctaLabel":"","href":""},{"heading":"Call or chat","body":"0907 765 1953, 0815 750 1109, 0815 272 7191 or 0906 096 9185.","ctaLabel":"Chat on WhatsApp","href":"https://wa.me/2349077651953"},{"heading":"Message support","body":"Questions about your account or the website? Send ENES a message and we will reply in the app.","ctaLabel":"Open support","href":"/support"},{"heading":"Ask about a listing","body":"Open any listing and send an inquiry. ENES reads every inquiry and replies to you in the app.","ctaLabel":"Browse listings","href":"/search"},{"heading":"Enquire about a service","body":"Open a property service and send your enquiry through its form.","ctaLabel":"Find a provider","href":"/property-management"},{"heading":"Report a concern","body":"Use the Report button on a listing or message and ENES will review it.","ctaLabel":"Safety centre","href":"/safety"},{"heading":"Email ENES","body":"For account, listing or safety questions, write to enespropertyrealtors@gmail.com.","ctaLabel":"Send an email","href":"mailto:enespropertyrealtors@gmail.com"}]},
    propertyManagement: {"eyebrow":"Property services","title":"Find a property service.","description":"Search property managers, maintenance, inspection and letting providers by type and location, then send your enquiry from their page.","sections":[{"heading":"Property management","body":"Day-to-day care of your property","ctaLabel":"","href":""},{"heading":"Maintenance","body":"Repairs and upkeep","ctaLabel":"","href":""},{"heading":"Inspections","body":"Property checks and reports","ctaLabel":"","href":""},{"heading":"Letting & leasing","body":"Finding and managing tenants","ctaLabel":"","href":""}]},
    // UPDATE-CONTENT-APPLIED. Draft safety, terms and privacy copy: have it reviewed by a Nigerian lawyer, then edit in Admin > Site content.
    safety: {"eyebrow":"Safety centre","title":"Stay safe when you buy, rent or sell","description":"ENES connects buyers and sellers. We do not handle payments or deliver goods. These steps help you avoid scams.","sections":[{"heading":"Before you pay","body":"Never send money before you have seen the property, vehicle or item in person and confirmed the seller's details. Be careful with prices that look too good to be true, and with anyone who rushes you.","ctaLabel":"","href":""},{"heading":"View in person","body":"Go with someone you trust, preferably in daylight. For property, check the documents (such as title and tenancy papers) and the neighbourhood yourself or with a professional. For vehicles, inspect the car and its papers, and ask a mechanic to check it.","ctaLabel":"","href":""},{"heading":"Pay safely","body":"Prefer bank transfer to a named account that matches the seller's identity. Avoid paying cash to strangers, and get a receipt or written agreement for every payment. ENES does not hold funds or guarantee transactions.","ctaLabel":"","href":""},{"heading":"Keep chats on ENES","body":"Send inquiries through ENES, which handles every conversation about a listing. Never share your PIN, OTP, BVN or banking passwords with anyone. ENES will never ask for them.","ctaLabel":"","href":""},{"heading":"Report a problem","body":"Use the Report button on a listing or message if you see a wrong price, a suspected scam, misleading information or inappropriate content. ENES reviews reports.","ctaLabel":"Contact ENES","href":"/contact"}]},
    terms: {"eyebrow":"Terms","title":"Terms of use","description":"These terms explain how you may use ENES Properties. By creating an account or using the site, you agree to them. Last updated: November 2026.","sections":[{"heading":"What ENES is","body":"ENES is an online marketplace where users list and discover property, vehicles, home goods and property services in Nigeria. ENES is not a party to any sale, rental or service agreement between users. We do not process payments, hold funds, deliver goods or guarantee any transaction.","ctaLabel":"","href":""},{"heading":"Your account","body":"Give accurate information and keep your sign-in details secure. You are responsible for activity on your account. You must be 18 or older to list or to contact sellers.","ctaLabel":"","href":""},{"heading":"Listing rules","body":"List only what you are entitled to sell or rent, with accurate descriptions, prices, locations and photos you own or may use. Listings must not be misleading, illegal, fraudulent or offensive, or infringe anyone's rights. Listing on ENES is free.","ctaLabel":"","href":""},{"heading":"Review and removal","body":"Listings, photos and service entries are reviewed before they appear publicly. ENES may approve, ask for changes, reject, unpublish or remove content, or suspend accounts, where we believe these terms or the law have been broken. Review is not a guarantee of ownership, condition, seller identity or service quality.","ctaLabel":"","href":""},{"heading":"Buying and renting","body":"Buyers and renters are responsible for their own checks and decisions. Read the Safety centre and inspect before you pay.","ctaLabel":"Safety centre","href":"/safety"},{"heading":"Messages and contact details","body":"All inquiries about listings go to ENES first. ENES passes them on to the owner and replies to you. Phone numbers you give a seller are seen only by ENES administrators. Do not use ENES to spam, harass or collect other people's data.","ctaLabel":"","href":""},{"heading":"Liability","body":"To the extent the law allows, ENES is not liable for losses arising from dealings between users or from inaccurate listings. Nothing here limits liability that cannot be limited by law.","ctaLabel":"","href":""},{"heading":"Changes and contact","body":"We may update these terms. Using ENES after a change means you accept it. Questions: enespropertyrealtors@gmail.com.","ctaLabel":"","href":""}]},
    privacy: {"eyebrow":"Privacy","title":"Privacy notice","description":"This notice explains what personal data ENES Properties collects, why, and the choices you have. We handle personal data in line with the Nigeria Data Protection Act 2023. Last updated: November 2026.","sections":[{"heading":"What we collect","body":"Account details (name, email and sign-in information); listing details, photos and the phone number you add (kept private); messages, enquiries, saved listings and searches; reports you submit; and basic usage data such as pages and listings viewed. To count visits we store a random anonymous ID in your browser and your approximate country. We do not store your IP address in our visit log.","ctaLabel":"","href":""},{"heading":"Why we use it","body":"To run your account and show your listings, let buyers and providers contact each other, review content and keep the marketplace safe, prevent fraud and abuse, and improve ENES.","ctaLabel":"","href":""},{"heading":"Who can see it","body":"Phone numbers that sellers give us are never shown publicly, and only ENES administrators can see them. Inquiries and messages are visible to the person who sent them and to authorised ENES administrators. We use service providers to host our systems, store files and send emails.","ctaLabel":"","href":""},{"heading":"How long we keep it","body":"We keep data while your account is active or as needed to provide the service, resolve disputes and meet legal duties, then delete or anonymise it.","ctaLabel":"","href":""},{"heading":"Your rights","body":"You may ask to access, correct or delete your personal data, object to or restrict certain uses, or withdraw consent. Write to enespropertyrealtors@gmail.com or visit our office at 7 Nonso Eze Avenue, Beside Castelllo Company, Nkwelle Ezunaka, Oyi L.G.A, Anambra State. You may also complain to the Nigeria Data Protection Commission.","ctaLabel":"","href":""},{"heading":"Security","body":"We use access controls, private storage for photos that are not yet reviewed, and encrypted connections. No online service is completely secure, so please protect your account.","ctaLabel":"","href":""},{"heading":"Children","body":"ENES is not intended for people under 18, and we do not knowingly collect their data.","ctaLabel":"","href":""},{"heading":"Changes","body":"We may update this notice and will change the date above when we do.","ctaLabel":"","href":""}]},
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
