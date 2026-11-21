"use client";

import { useMemo, useState } from "react";
import type { SiteContentData } from "@/lib/site-content.types";
import { ImagePlus, Save, Send, RotateCcw, Eye, History, AlertCircle, CheckCircle2, UploadCloud } from "lucide-react";

type Revision = { version: number; content: unknown; note: string | null; createdAt: string | Date; createdByClerkId: string };
type Props = { initialDraft: SiteContentData; initialDraftVersion: number; publishedVersion: number; publishedAt: string | Date | null; revisions: Revision[]; canPublish: boolean };
type Field = { path: string; label: string; help?: string; multiline?: boolean; rows?: number };

const fieldGroups: { title: string; description: string; fields: Field[] }[] = [
  { title: "Brand identity", description: "Use ENES-approved brand assets. Image uploads go to the public site-assets area in Cloudflare R2.", fields: [
    { path: "brand.name", label: "Brand name" }, { path: "brand.descriptor", label: "Descriptor" }, { path: "brand.tagline", label: "Tagline" },
    { path: "brand.logoUrl", label: "Primary header logo URL", help: "Upload below or paste an approved HTTPS image URL." },
    { path: "brand.logoLightUrl", label: "Light logo URL for the dark footer" }, { path: "brand.compactLogoUrl", label: "Compact logo URL" }, { path: "brand.faviconUrl", label: "Favicon URL" }, { path: "brand.socialImageUrl", label: "Brand social image URL" },
  ] },
  { title: "Mobile navigation", description: "Edit the labels shown in the persistent mobile navigation bar. The destinations stay connected to ENES member features.", fields: [
    { path: "mobileNav.homeLabel", label: "Home tab" }, { path: "mobileNav.savedLabel", label: "Saved listings tab" },
    { path: "mobileNav.listLabel", label: "Create listing tab" }, { path: "mobileNav.messagesLabel", label: "Messages tab" },
    { path: "mobileNav.profileLabel", label: "Profile tab" },
    { path: "navigation.menuSavedLabel", label: "Menu saved-listings label" },
    { path: "navigation.menuMessagesLabel", label: "Menu messages label" },
  ] },
  { title: "Homepage hero and search", description: "Edit the first screen and the search experience visitors see on the homepage.", fields: [
    { path: "homepage.heroEyebrow", label: "Hero eyebrow" }, { path: "homepage.heroTitle", label: "Hero heading" }, { path: "homepage.heroAccent", label: "Hero accent line" },
    { path: "homepage.heroDescription", label: "Hero supporting text", multiline: true }, { path: "homepage.heroImageUrl", label: "Hero image URL" },
    { path: "homepage.primaryCtaLabel", label: "Primary button label" }, { path: "homepage.primaryCtaHref", label: "Primary button link" },
    { path: "homepage.secondaryCtaLabel", label: "Secondary button label" }, { path: "homepage.secondaryCtaHref", label: "Secondary button link" },
    { path: "homepage.searchTitle", label: "Search panel title" }, { path: "homepage.searchKeywordLabel", label: "Keyword label" },
    { path: "homepage.searchPlaceholder", label: "Search placeholder" }, { path: "homepage.searchCategoryLabel", label: "Category label" },
    { path: "homepage.searchLocationLabel", label: "Location label" }, { path: "homepage.searchSubmitLabel", label: "Search button label" },
    { path: "homepage.searchEyebrow", label: "Search panel eyebrow" },
    { path: "homepage.searchBrowseLabel", label: "Browse-category hint" },
    { path: "homepage.searchAllListingsLabel", label: "All listings link label" },
    { path: "homepage.searchAllCategoriesLabel", label: "All categories option" },
    { path: "homepage.searchLocationPlaceholder", label: "Location input placeholder" },
    { path: "homepage.categoriesBrowseLabel", label: "Categories browse link" },
    { path: "homepage.featuredBrowseLabel", label: "Featured section link" },
    { path: "homepage.latestBrowseLabel", label: "Latest section link" },
    { path: "homepage.reviewBadgeLabel", label: "Review badge text" },
    { path: "homepage.featuredBadgeLabel", label: "Featured listing badge" },
    { path: "homepage.photoMissingLabel", label: "Listing image fallback label" },
    { path: "homepage.listingCountPrefix", label: "Published listing count prefix" },
    { path: "homepage.listingCountSingular", label: "Singular listing count word" },
    { path: "homepage.listingCountPlural", label: "Plural listing count word" },
    { path: "homepage.listingCountSuffix", label: "Listing count closing text" },
    { path: "homepage.quickActionsLabel", label: "Quick actions accessible label" },
    { path: "homepage.reviewSafetyLinkLabel", label: "Safety guidance link" },
    { path: "homepage.requestEyebrow", label: "Property request eyebrow" },
    { path: "homepage.sellerEyebrow", label: "Seller section eyebrow" },
    { path: "homepage.sellerServiceCtaLabel", label: "List a service button" },
  ] },
  { title: "Homepage sections", description: "Control section headings, empty states, calls to action and section visibility.", fields: [
    { path: "homepage.categoriesEyebrow", label: "Categories eyebrow" }, { path: "homepage.categoriesTitle", label: "Categories heading" },
    { path: "homepage.featuredEyebrow", label: "Featured eyebrow" }, { path: "homepage.featuredTitle", label: "Featured heading" },
    { path: "homepage.latestEyebrow", label: "Latest listings eyebrow" }, { path: "homepage.latestTitle", label: "Latest listings heading" },
    { path: "homepage.latestDescription", label: "Latest listings description", multiline: true }, { path: "homepage.emptyTitle", label: "No-listings heading" },
    { path: "homepage.emptyBody", label: "No-listings explanation", multiline: true }, { path: "homepage.emptyPrimaryLabel", label: "No-listings primary action" },
    { path: "homepage.emptyPrimaryHref", label: "No-listings primary link" }, { path: "homepage.emptySecondaryLabel", label: "No-listings secondary action" },
    { path: "homepage.emptySecondaryHref", label: "No-listings secondary link" }, { path: "homepage.reviewEyebrow", label: "Review section eyebrow" },
    { path: "homepage.reviewTitle", label: "Review section heading" }, { path: "homepage.reviewDescription", label: "Review section description", multiline: true },
    { path: "homepage.requestTitle", label: "Property request heading" }, { path: "homepage.requestBody", label: "Property request text", multiline: true },
    { path: "homepage.requestCtaLabel", label: "Property request button" }, { path: "homepage.requestCtaHref", label: "Property request link" },
    { path: "homepage.sellerTitle", label: "Seller CTA heading" }, { path: "homepage.sellerBody", label: "Seller CTA text", multiline: true },
    { path: "homepage.sellerCtaLabel", label: "Seller CTA button" }, { path: "homepage.sellerCtaHref", label: "Seller CTA link" },
  ] },
  { title: "SEO and page metadata", description: "The default title and description used by the site. Individual pages retain their own content headings.", fields: [
    { path: "seo.defaultTitle", label: "Default page title" }, { path: "seo.description", label: "Default description", multiline: true }, { path: "seo.socialImageUrl", label: "Default social image URL" },
  ] },
  { title: "Category and search pages", description: "Owner-editable page headings and introductions for each category and the combined search page.", fields: [
    { path: "categoryPages.property.eyebrow", label: "Property eyebrow" }, { path: "categoryPages.property.title", label: "Property title" }, { path: "categoryPages.property.description", label: "Property introduction", multiline: true },
    { path: "categoryPages.cars.eyebrow", label: "Cars eyebrow" }, { path: "categoryPages.cars.title", label: "Cars title" }, { path: "categoryPages.cars.description", label: "Cars introduction", multiline: true },
    { path: "categoryPages.homeLiving.eyebrow", label: "Home & Living eyebrow" }, { path: "categoryPages.homeLiving.title", label: "Home & Living title" }, { path: "categoryPages.homeLiving.description", label: "Home & Living introduction", multiline: true },
    { path: "categoryPages.marketplace.eyebrow", label: "Marketplace eyebrow" }, { path: "categoryPages.marketplace.title", label: "Marketplace title" }, { path: "categoryPages.marketplace.description", label: "Marketplace introduction", multiline: true },
    { path: "categoryPages.search.eyebrow", label: "Search eyebrow" }, { path: "categoryPages.search.title", label: "Search title" }, { path: "categoryPages.search.description", label: "Search introduction", multiline: true },
  ] },
  { title: "Footer", description: "Edit the footer description, copyright line and link groups.", fields: [
    { path: "footer.description", label: "Footer description", multiline: true }, { path: "footer.copyrightText", label: "Copyright suffix" },
    { path: "footer.bottomNote", label: "Footer closing note" },
  ] },
  { title: "About page", description: "The public About page content.", fields: [
    { path: "pages.about.eyebrow", label: "Eyebrow" }, { path: "pages.about.title", label: "Heading" }, { path: "pages.about.description", label: "Introduction", multiline: true },
  ] },
  { title: "Blog page", description: "The public Blog page: the company story and aims.", fields: [
    { path: "pages.blog.eyebrow", label: "Eyebrow" }, { path: "pages.blog.title", label: "Heading" }, { path: "pages.blog.description", label: "Introduction", multiline: true },
  ] },
  { title: "Contact page", description: "The public contact page content. Do not add unverified contact details.", fields: [
    { path: "pages.contact.eyebrow", label: "Eyebrow" }, { path: "pages.contact.title", label: "Heading" }, { path: "pages.contact.description", label: "Introduction", multiline: true },
  ] },
  { title: "Property services page", description: "Introductory copy for the published property-management directory.", fields: [
    { path: "pages.propertyManagement.eyebrow", label: "Eyebrow" }, { path: "pages.propertyManagement.title", label: "Heading" }, { path: "pages.propertyManagement.description", label: "Introduction", multiline: true },
  ] },
  { title: "Owner-supplied legal and safety pages", description: "These fields start blank intentionally. The Owner must supply and approve the final wording; this editor does not invent legal content.", fields: [
    { path: "pages.safety.eyebrow", label: "Safety page eyebrow" }, { path: "pages.safety.title", label: "Safety page title" }, { path: "pages.safety.description", label: "Safety page introduction", multiline: true },
    { path: "pages.terms.eyebrow", label: "Terms page eyebrow" }, { path: "pages.terms.title", label: "Terms page title" }, { path: "pages.terms.description", label: "Terms page introduction", multiline: true },
    { path: "pages.privacy.eyebrow", label: "Privacy page eyebrow" }, { path: "pages.privacy.title", label: "Privacy page title" }, { path: "pages.privacy.description", label: "Privacy page introduction", multiline: true },
  ] },
];

const jsonFields = [
  { path: "navigation.links", label: "Header navigation links" },
  { path: "homepage.propertyIntents", label: "Buy, Rent, Shortlet and Land shortcuts" },
  { path: "homepage.reviewSteps", label: "Homepage review steps" },
  { path: "categories", label: "Homepage category cards and their links" },
  { path: "footer.columns", label: "Footer columns and links" },
  { path: "pages.about.sections", label: "About page content blocks" },
  { path: "pages.blog.sections", label: "Blog page content blocks" },
  { path: "pages.contact.sections", label: "Contact page content blocks" },
  { path: "pages.propertyManagement.sections", label: "Property services content blocks" },
  { path: "pages.safety.sections", label: "Owner-approved safety page sections" },
  { path: "pages.terms.sections", label: "Owner-approved terms sections" },
  { path: "pages.privacy.sections", label: "Owner-approved privacy sections" },
];

const visibilityFields: Field[] = [
  { path: "homepage.showCategories", label: "Show categories" }, { path: "homepage.showFeatured", label: "Show featured listings" },
  { path: "homepage.showLatest", label: "Show recent listings" }, { path: "homepage.showReview", label: "Show review explanation" },
  { path: "homepage.showRequest", label: "Show property request CTA" }, { path: "homepage.showSeller", label: "Show seller CTA" },
];

function readPath(root: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((value, key) => value && typeof value === "object" ? (value as Record<string, unknown>)[key] : undefined, root);
}
function writePath(root: SiteContentData, path: string, value: unknown) {
  const copy = JSON.parse(JSON.stringify(root)) as Record<string, unknown>;
  const keys = path.split(".");
  let cursor = copy;
  for (const key of keys.slice(0, -1)) {
    if (!cursor[key] || typeof cursor[key] !== "object") cursor[key] = {};
    cursor = cursor[key] as Record<string, unknown>;
  }
  cursor[keys[keys.length - 1]] = value;
  return copy as SiteContentData;
}

export function SiteContentEditor({ initialDraft, initialDraftVersion, publishedVersion, publishedAt, revisions, canPublish }: Props) {
  const [draft, setDraft] = useState(initialDraft);
  const [draftVersion, setDraftVersion] = useState(initialDraftVersion);
  const [published, setPublished] = useState(publishedVersion);
  const [publishedDate, setPublishedDate] = useState(publishedAt ? new Date(publishedAt).toLocaleString("en-NG") : "Not published yet");
  const [history, setHistory] = useState(revisions);
  const [jsonText, setJsonText] = useState<Record<string, string>>(() => Object.fromEntries(jsonFields.map((field) => [field.path, JSON.stringify(readPath(initialDraft, field.path), null, 2)])));
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState<string | null>(null);

  const preview = useMemo(() => ({ name: draft.brand.name, logo: draft.brand.logoUrl || draft.brand.compactLogoUrl, title: draft.homepage.heroTitle, accent: draft.homepage.heroAccent, description: draft.homepage.heroDescription }), [draft]);
  function update(path: string, value: unknown) { setDraft((current) => writePath(current, path, value)); setDirty(true); setMessage(""); }

  async function uploadAsset(path: string, file?: File) {
    if (!file) return;
    setUploading(path); setError(""); setMessage("");
    try {
      const body = new FormData(); body.append("file", file);
      const response = await fetch("/api/admin/site-content/assets", { method: "POST", body, credentials: "same-origin" });
      const result = await response.json() as { ok?: boolean; url?: string; error?: string };
      if (!response.ok || !result.ok || !result.url) throw new Error(result.error || "Asset upload failed");
      update(path, result.url);
      setMessage("Image uploaded. Save the draft and publish it to make the change live.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Asset upload failed"); }
    finally { setUploading(null); }
  }

  function prepareDraft() {
    let prepared = draft;
    try {
      for (const field of jsonFields) prepared = writePath(prepared, field.path, JSON.parse(jsonText[field.path] || "null"));
      return prepared;
    } catch (cause) {
      throw new Error(`Check the JSON in ${jsonFields.find((field) => { try { JSON.parse(jsonText[field.path] || "null"); return false; } catch { return true; } })?.label || "the structured content"}.`);
    }
  }

  async function saveDraft(): Promise<number | null> {
    setBusy(true); setError(""); setMessage("");
    try {
      const prepared = prepareDraft();
      const response = await fetch("/api/admin/site-content", {
        method: "PUT", credentials: "same-origin", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draft: prepared, expectedDraftVersion: draftVersion, note: "Saved from Owner content studio" }),
      });
      const result = await response.json() as { ok?: boolean; error?: string; draftVersion?: number; revisions?: Revision[] };
      if (!response.ok || !result.ok || typeof result.draftVersion !== "number") throw new Error(result.error || "Draft could not be saved");
      setDraft(prepared); setDraftVersion(result.draftVersion); setDirty(false); setHistory(result.revisions || history); setMessage(`Draft saved as version ${result.draftVersion}. It is not public until the Owner publishes it.`);
      return result.draftVersion;
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Draft could not be saved"); return null; }
    finally { setBusy(false); }
  }

  async function publish() {
    if (!canPublish) return;
    const version = dirty ? await saveDraft() : draftVersion;
    if (version === null) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/admin/site-content/publish", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ expectedDraftVersion: version }) });
      const result = await response.json() as { ok?: boolean; error?: string; publishedVersion?: number; publishedAt?: string };
      if (!response.ok || !result.ok || typeof result.publishedVersion !== "number") throw new Error(result.error || "Publishing failed");
      setPublished(result.publishedVersion); setPublishedDate(result.publishedAt ? new Date(result.publishedAt).toLocaleString("en-NG") : "Published");
      setMessage(`Version ${result.publishedVersion} is now published. Public pages will use the new content.`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Publishing failed"); }
    finally { setBusy(false); }
  }

  function loadRevision(revision: Revision) {
    try {
      const restored = revision.content as SiteContentData;
      setDraft(restored);
      setJsonText(Object.fromEntries(jsonFields.map((field) => [field.path, JSON.stringify(readPath(restored, field.path), null, 2)])));
      setDirty(true);
      setMessage(`Version ${revision.version} loaded into the editor. Save it as a new draft version before publishing.`);
      setError("");
    } catch { setError("That revision could not be loaded."); }
  }

  return <div className="mx-auto max-w-[1400px] px-4 py-7 sm:px-6 lg:px-8">
    <div className="mb-7 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
      <div><p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-[#006B1D]">Owner-controlled website</p><h1 className="mt-2 text-[27px] font-extrabold tracking-[-.045em] text-[#04180C] sm:text-[34px]">Website content studio</h1><p className="mt-2 max-w-2xl text-[12px] leading-6 text-[#69756E]">Manage brand assets, homepage content, navigation, categories, footer links and public information pages. Drafts remain private until the Owner publishes.</p></div>
      <div className="flex flex-wrap items-center gap-2"><span className="rounded-full border border-[#D5E5DC] bg-white px-3 py-2 text-[10px] font-bold text-[#5C6861]">Draft v{draftVersion}</span><span className="rounded-full border border-[#D7E3DB] bg-[#DDF1E6] px-3 py-2 text-[10px] font-bold text-[#006B1D]">Published v{published}</span></div>
    </div>

    {(message || error) && <div role="status" className={`mb-5 flex items-start gap-2 rounded-[11px] border p-3 text-[11px] leading-5 ${error ? "border-[#E8C5B7] bg-[#FBEEE9] text-[#98482E]" : "border-[#D7E3DB] bg-[#EAF3ED] text-[#006B1D]"}`}>{error ? <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />}{error || message}</div>}

    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-5">
        {fieldGroups.map((group) => <section key={group.title} className="rounded-[15px] border border-[#D5E5DC] bg-[#FFFFFF] p-4 sm:p-6">
          <div className="mb-5"><h2 className="text-[15px] font-extrabold text-[#04180C]">{group.title}</h2><p className="mt-1 text-[10px] leading-5 text-[#77827B]">{group.description}</p></div>
          <div className="grid gap-4 sm:grid-cols-2">
            {group.fields.map((field) => {
              const value = readPath(draft, field.path);
              return <label key={field.path} className="block"><span className="mb-1.5 block text-[10px] font-extrabold text-[#415047]">{field.label}</span>
                {field.multiline ? <textarea rows={field.rows || 3} value={String(value ?? "")} onChange={(event) => update(field.path, event.target.value)} className="min-h-[86px] w-full rounded-[9px] border border-[#D5E5DC] bg-white px-3 py-2.5 text-[11px] leading-5 text-[#04180C] outline-none focus:border-[#006B1D]" /> : <input value={String(value ?? "")} onChange={(event) => update(field.path, event.target.value)} className="h-10 w-full rounded-[9px] border border-[#D5E5DC] bg-white px-3 text-[11px] text-[#04180C] outline-none focus:border-[#006B1D]" />}
                {field.help && <span className="mt-1 block text-[9px] leading-4 text-[#849088]">{field.help}</span>}
              </label>;
            })}
          </div>
          {group.title === "Brand identity" && <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {[{ path: "brand.logoUrl", label: "Upload primary header logo" }, { path: "brand.logoLightUrl", label: "Upload light footer logo" }, { path: "brand.compactLogoUrl", label: "Upload compact logo" }, { path: "brand.faviconUrl", label: "Upload favicon image" }, { path: "brand.socialImageUrl", label: "Upload brand social image" }].map((asset) => <label key={asset.path} className="flex cursor-pointer items-center gap-3 rounded-[10px] border border-dashed border-[#C9D6CE] bg-[#F8FAF7] p-3"><span className="flex h-9 w-9 items-center justify-center rounded-[9px] bg-[#DDF1E6] text-[#006B1D]"><ImagePlus className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block text-[10px] font-extrabold text-[#24332C]">{asset.label}</span><span className="block text-[9px] text-[#7B867F]">JPEG, PNG or WebP · max 8 MB</span></span><UploadCloud className="h-4 w-4 text-[#006B1D]" />
              <input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" disabled={busy || Boolean(uploading)} onChange={(event) => uploadAsset(asset.path, event.target.files?.[0])} />
            </label>)}
            {uploading && <p className="text-[10px] text-[#006B1D] sm:col-span-2">Uploading approved brand asset…</p>}
          </div>}
        </section>)}

        <section className="rounded-[15px] border border-[#D5E5DC] bg-[#FFFFFF] p-4 sm:p-6"><div className="mb-4"><h2 className="text-[15px] font-extrabold text-[#04180C]">Homepage section visibility</h2><p className="mt-1 text-[10px] text-[#77827B]">Turn sections on or off without deleting their content.</p></div><div className="grid gap-2 sm:grid-cols-2">{visibilityFields.map((field) => <label key={field.path} className="flex min-h-11 items-center gap-3 rounded-[9px] bg-[#EAF6F1] px-3"><input type="checkbox" checked={Boolean(readPath(draft, field.path))} onChange={(event) => update(field.path, event.target.checked)} className="h-4 w-4 accent-[#006B1D]" /><span className="text-[10px] font-bold text-[#3C4A43]">{field.label}</span></label>)}</div></section>

        <section className="rounded-[15px] border border-[#D5E5DC] bg-[#FFFFFF] p-4 sm:p-6"><div className="mb-4"><h2 className="text-[15px] font-extrabold text-[#04180C]">Structured content and link groups</h2><p className="mt-1 text-[10px] leading-5 text-[#77827B]">These JSON lists control navigation, shortcut labels, homepage review steps, categories, footer columns and page content blocks. Keep the field names shown in each example.</p></div><div className="space-y-4">{jsonFields.map((field) => <label key={field.path} className="block"><span className="mb-1.5 block text-[10px] font-extrabold text-[#415047]">{field.label}</span><textarea spellCheck={false} rows={field.path.startsWith("pages.") ? 6 : 8} value={jsonText[field.path] || ""} onChange={(event) => {
            const nextText = event.target.value;
            setJsonText((current) => ({ ...current, [field.path]: nextText }));
            setDirty(true);
            try { const parsed = JSON.parse(nextText); setDraft((current) => writePath(current, field.path, parsed)); setError(""); }
            catch { /* Keep the previous valid preview while the JSON is incomplete. Save reports the exact invalid field. */ }
          }} className="w-full rounded-[9px] border border-[#D5E5DC] bg-[#FBFAF6] px-3 py-2.5 font-mono text-[10px] leading-5 text-[#24332C] outline-none focus:border-[#006B1D]" /></label>)}</div></section>

        <section className="rounded-[15px] border border-[#D5E5DC] bg-[#FFFFFF] p-4 sm:p-6"><div className="mb-4 flex items-center gap-2"><History className="h-4 w-4 text-[#006B1D]" /><h2 className="text-[15px] font-extrabold text-[#04180C]">Revision history</h2></div>{history.length ? <div className="space-y-2">{history.map((revision) => <div key={revision.version} className="flex flex-wrap items-center justify-between gap-3 rounded-[9px] bg-[#EAF6F1] px-3 py-3"><div><p className="text-[10px] font-extrabold text-[#283830]">Draft version {revision.version}</p><p className="mt-1 text-[9px] text-[#77827B]">{new Date(revision.createdAt).toLocaleString("en-NG")}{revision.note ? ` · ${revision.note}` : ""}</p></div><button type="button" onClick={() => loadRevision(revision)} className="inline-flex min-h-9 items-center gap-1 rounded-full border border-[#C9D6CE] bg-white px-3 text-[9px] font-extrabold text-[#006B1D]"><RotateCcw className="h-3 w-3" /> Load into editor</button></div>)}</div> : <p className="text-[10px] text-[#77827B]">Saved versions will appear here.</p>}</section>
      </div>

      <aside className="space-y-4 xl:sticky xl:top-[84px]">
        <section className="overflow-hidden rounded-[15px] border border-[#D8E2DB] bg-[#04180C] text-[#FFFFFF]">
          <div className="border-b border-white/10 px-4 py-3"><p className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[.12em] text-[#3FBF63]"><Eye className="h-3.5 w-3.5" /> Live homepage draft preview</p></div>
          <div className="space-y-4 p-4">
            <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
              <div className="flex min-w-0 items-center gap-2">{preview.logo ? <img src={preview.logo} alt={`${preview.name} logo preview`} className="max-h-8 max-w-[105px] object-contain object-left" /> : <span className="text-[14px] font-extrabold">{preview.name}</span>}</div>
              <div className="flex flex-wrap justify-end gap-2 text-[7px] font-bold text-white/65">{draft.navigation.links.filter((item) => item.enabled).slice(0, 3).map((item) => <span key={`${item.href}-${item.label}`}>{item.label}</span>)}</div>
            </div>
            <div className="rounded-[10px] bg-[#0F2A18] p-4">
              <p className="text-[7px] font-extrabold uppercase tracking-[.16em] text-[#3FBF63]">{draft.homepage.heroEyebrow}</p>
              <h3 className="mt-2 text-[22px] font-extrabold leading-[1.04] tracking-[-.045em]">{preview.title}<br /><span className="text-[#3FBF63]">{preview.accent}</span></h3>
              <p className="mt-2 text-[8px] leading-4 text-white/65">{preview.description}</p>
              <div className="mt-3 flex flex-wrap gap-2"><span className="rounded-full bg-[#A10D10] px-2.5 py-1.5 text-[7px] font-extrabold">{draft.homepage.primaryCtaLabel}</span><span className="rounded-full border border-white/20 px-2.5 py-1.5 text-[7px] font-extrabold">{draft.homepage.secondaryCtaLabel}</span></div>
            </div>
            <div className="rounded-[9px] bg-white p-3 text-[#04180C]">
              <p className="text-[9px] font-extrabold">{draft.homepage.searchTitle}</p>
              <p className="mt-2 rounded-[6px] border border-[#D5E5DC] px-2 py-2 text-[7px] text-[#7A857E]">{draft.homepage.searchPlaceholder}</p>
              <div className="mt-2 flex flex-wrap gap-1">{draft.homepage.propertyIntents.filter((item) => item.enabled).map((item) => <span key={`${item.href}-${item.label}`} className="rounded-full bg-[#DDF1E6] px-2 py-1 text-[7px] font-bold text-[#006B1D]">{item.label}</span>)}</div>
              <div className="mt-2 rounded-[6px] bg-[#006B1D] py-2 text-center text-[7px] font-extrabold text-white">{draft.homepage.searchSubmitLabel}</div>
            </div>
            <div className="flex items-center justify-between rounded-[9px] border border-white/10 bg-white/[.05] px-3 py-2 text-[7px] font-bold text-white/75">
              <span>{draft.mobileNav.homeLabel} · {draft.mobileNav.savedLabel} · {draft.mobileNav.messagesLabel}</span>
              <span className="rounded-full bg-[#A10D10] px-2 py-1 text-white">{draft.mobileNav.listLabel}</span>
            </div>
            {draft.homepage.showCategories && <div><p className="text-[7px] font-extrabold uppercase tracking-[.13em] text-[#3FBF63]">{draft.homepage.categoriesEyebrow}</p><p className="mt-1 text-[12px] font-extrabold">{draft.homepage.categoriesTitle}</p><div className="mt-2 grid grid-cols-2 gap-1.5">{draft.categories.filter((item) => item.enabled).slice(0, 4).map((item) => <div key={item.key} className="rounded-[7px] border border-white/10 bg-white/[.05] p-2"><p className="text-[8px] font-extrabold">{item.label}</p><p className="mt-1 text-[7px] text-white/50">{item.description}</p></div>)}</div></div>}
            {draft.homepage.showFeatured && <div className="border-t border-white/10 pt-3"><div className="flex items-center justify-between gap-2"><p className="text-[7px] font-extrabold uppercase tracking-[.12em] text-[#3FBF63]">{draft.homepage.featuredEyebrow}</p><span className="rounded-full bg-[#A10D10] px-2 py-1 text-[7px] font-extrabold text-white">{draft.homepage.featuredBadgeLabel}</span></div><p className="mt-1 text-[12px] font-extrabold">{draft.homepage.featuredTitle}</p></div>}
            {draft.homepage.showLatest && <div className="border-t border-white/10 pt-3"><p className="text-[7px] font-extrabold uppercase tracking-[.12em] text-[#3FBF63]">{draft.homepage.latestEyebrow}</p><p className="mt-1 text-[12px] font-extrabold">{draft.homepage.latestTitle}</p><p className="mt-1 text-[7px] text-white/55">{draft.homepage.latestDescription}</p><p className="mt-2 text-[7px] italic text-white/45">Actual published listings are loaded from marketplace inventory.</p></div>}
            {draft.homepage.showReview && <div className="border-t border-white/10 pt-3"><p className="text-[7px] font-extrabold uppercase tracking-[.12em] text-[#3FBF63]">{draft.homepage.reviewEyebrow}</p><p className="mt-1 text-[12px] font-extrabold">{draft.homepage.reviewTitle}</p></div>}
            {draft.homepage.showRequest && <div className="rounded-[8px] bg-[#DCE9E1] p-3 text-[#04180C]"><p className="text-[7px] font-extrabold uppercase">{draft.homepage.requestEyebrow}</p><p className="mt-1 text-[11px] font-extrabold">{draft.homepage.requestTitle}</p><p className="mt-1 text-[7px] leading-4">{draft.homepage.requestBody}</p></div>}
            {draft.homepage.showSeller && <div className="rounded-[8px] border border-white/10 p-3"><p className="text-[7px] font-extrabold uppercase tracking-[.12em] text-[#3FBF63]">{draft.homepage.sellerEyebrow}</p><p className="mt-1 text-[11px] font-extrabold">{draft.homepage.sellerTitle}</p><p className="mt-1 text-[7px] leading-4 text-white/60">{draft.homepage.sellerBody}</p></div>}
            <div className="border-t border-white/10 pt-3"><p className="text-[7px] text-white/50">{draft.homepage.listingCountPrefix} 0 {draft.homepage.listingCountPlural} {draft.homepage.listingCountSuffix}</p><p className="mt-2 text-[9px] font-extrabold">{draft.brand.name}</p><p className="mt-1 text-[7px] text-white/50">{draft.footer.description}</p><p className="mt-2 text-[7px] text-white/40">{draft.footer.bottomNote}</p></div>
          </div>
          <div className="border-t border-white/10 px-4 py-3 text-[8px] leading-4 text-white/45">This preview updates as you edit. The public website continues to show the last published version until the Owner publishes this draft.</div>
        </section>
        <section className="rounded-[13px] border border-[#D5E5DC] bg-[#FFFFFF] p-4"><p className="text-[10px] font-extrabold text-[#04180C]">Publication status</p><p className="mt-2 text-[10px] text-[#68736D]">Last published: {publishedDate}</p><p className="mt-2 text-[10px] text-[#68736D]">Current public version: {published}</p><p className="mt-2 text-[10px] text-[#68736D]">{dirty ? "Unsaved changes are present." : "No unsaved text changes detected."}</p></section>
        <div className="grid gap-2"><button type="button" disabled={busy} onClick={() => void saveDraft()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[9px] bg-[#006B1D] px-4 text-[11px] font-extrabold text-white transition hover:bg-[#004D15] disabled:opacity-50"><Save className="h-4 w-4" />{busy ? "Saving…" : "Save draft"}</button><button type="button" disabled={busy || !canPublish || (!dirty && draftVersion <= published)} onClick={() => void publish()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[9px] bg-[#A10D10] px-4 text-[11px] font-extrabold text-white transition hover:bg-[#7E0A0C] disabled:opacity-50"><Send className="h-4 w-4" />{busy ? "Working…" : "Publish website changes"}</button>{!canPublish && <p className="text-center text-[9px] leading-4 text-[#8A756A]">Only the designated ENES Owner can publish website changes.</p>}{canPublish && !dirty && draftVersion <= published && <p className="text-center text-[9px] leading-4 text-[#68736D]">The latest saved draft is already published.</p>}</div>
        <p className="text-[9px] leading-5 text-[#879189]">Uploaded site assets are public files in the configured approved R2 bucket. Do not upload private documents or unapproved listing photos here.</p>
      </aside>
    </div>
  </div>;
}
