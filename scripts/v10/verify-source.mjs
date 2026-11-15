import { readFileSync, existsSync } from "node:fs";

const root = process.cwd();
const read = (path) => readFileSync(`${root}/${path}`, "utf8");
const checks = [];
function check(label, test) {
  const passed = Boolean(test);
  checks.push({ label, passed });
  console.log(`${passed ? "PASS" : "FAIL"} ${label}`);
}

const schema = read("prisma/schema.prisma");
const migration = read("prisma/migrations/20261115050000_v10_site_content_cms/migration.sql");
const content = read("src/lib/site-content.ts");
const api = read("src/app/api/admin/site-content/route.ts");
const publish = read("src/app/api/admin/site-content/publish/route.ts");
const assets = read("src/app/api/admin/site-content/assets/route.ts");
const editor = read("src/components/admin/site-content-editor.tsx");
const header = read("src/components/layout/header.tsx");
const footer = read("src/components/layout/footer.tsx");
const home = read("src/app/page.tsx");
const permissions = read("src/lib/permissions.ts");
const seed = read("scripts/seed-rbac.mjs");
const adminLayout = read("src/app/admin/layout.tsx");
const legalPages = ["terms", "privacy", "safety"].map((slug) => read(`src/app/${slug}/page.tsx`)).join("\n");
const packageJson = JSON.parse(read("package.json"));

check("V10 adds versioned SiteContent and SiteContentRevision models", /model SiteContent\s*\{/s.test(schema) && /model SiteContentRevision\s*\{/s.test(schema) && /@@unique\(\[siteContentKey, version\]\)/.test(schema));
check("V10 migration is additive and contains no destructive table operations", /CREATE TABLE "SiteContent"/.test(migration) && /CREATE TABLE "SiteContentRevision"/.test(migration) && !/DROP\s+(TABLE|COLUMN|INDEX)/i.test(migration));
check("V10 migration protects revision history with a cascading parent relation", /FOREIGN KEY \("siteContentKey"\).*ON DELETE CASCADE/.test(migration) && /UNIQUE INDEX "SiteContentRevision_siteContentKey_version_key"/.test(migration));
check("Public content reader selects only the published document", /select:\s*\{\s*published:\s*true\s*\}/s.test(content) && !/select:\s*\{\s*draft:\s*true/.test(content));
check("Draft and published documents are stored independently", /draft\s+Json/.test(schema) && /published\s+Json\?/.test(schema));
check("Content parser rejects unknown fields, oversized documents and unsafe URLs", /180_000/.test(content) && /Unsupported field/.test(content) && /isSafeHref/.test(content) && /isSafeAssetUrl/.test(content));
check("Public content reads use request-time rendering and never expose drafts", /await connection\(\)/.test(content) && /record\?\.published \?\? DEFAULT_SITE_CONTENT/.test(content));
check("Admin content reads and saves require content:manage", /requireAdminPermission\("content:manage"\)/.test(api));
check("Content writes reject non-same-origin requests", /isTrustedMutationOrigin\(request\)/.test(api));
check("Draft saves use optimistic compare-and-set version control", /where:\s*\{\s*key:\s*"global",\s*draftVersion:\s*current\.draftVersion\s*\}/s.test(api) && /claimed\.count !== 1/.test(api));
check("Draft saves create a recoverable revision and audit record", /siteContentRevision\.create/.test(api) && /SITE_CONTENT_DRAFT_SAVED/.test(api));
check("Publishing is restricted to the designated Owner", /requireOwner\(\)/.test(publish) && !/requireAdminPermission/.test(publish));
check("Publishing checks expected draft and previously published versions atomically", /draftVersion:\s*Number\(expectedDraftVersion\)/.test(publish) && /publishedVersion:\s*\{\s*lt:\s*Number\(expectedDraftVersion\)\s*\}/.test(publish) && /claimed\.count !== 1/.test(publish));
check("Publishing records an audit event and revalidates the public site", /SITE_CONTENT_PUBLISHED/.test(publish) && /revalidatePath\("\/",\s*"layout"\)/.test(publish));
check("Brand asset uploads require authenticated content permissions and same-origin writes", /requireAdminPermission\("content:manage"\)/.test(assets) && /isTrustedMutationOrigin\(request\)/.test(assets));
check("Brand assets use the public R2 bucket, separate from pending listing media", /R2_PUBLIC_BUCKET_NAME/.test(assets) && /R2_BUCKET_NAME/.test(assets) && /bucket === process\.env\.R2_BUCKET_NAME/.test(assets));
check("Brand assets are checked by actual file signature, MIME, dimensions and size", /detectImage\(bytes\)/.test(assets) && /file\.type/.test(assets) && /MAX_SITE_ASSET_BYTES/.test(assets) && /MAX_PIXELS/.test(assets));
check("R2 brand uploads strip image metadata and use immutable object names", /stripImageMetadata/.test(assets) && /randomUUID\(\)/.test(assets) && /immutable/.test(assets));
check("Content publishing permission is reserved for Owner-level role grants", /"content:publish"/.test(permissions) && /"content:publish"/.test(seed) && /content:publish/.test(permissions.split("const ADMIN_CONTROL")[1]?.split("export const ROLE_PRESETS")[0] || "") && !/CONTENT_MANAGER[^\n]*content:publish/.test(seed));
check("Website content studio is permission protected and Owner-only publish is surfaced", /requireAdminPage\("content:manage"\)/.test(read("src/app/admin/site-content/page.tsx")) && /canPublish=\{actor\.isOwner\}/.test(read("src/app/admin/site-content/page.tsx")));
check("Admin navigation exposes the new website content studio", /Website content/.test(adminLayout) && /content:manage/.test(adminLayout));
check("Editor covers brand assets, homepage, nav, category pages, footer, SEO and owner-supplied legal pages", ["brand.logoUrl", "brand.logoLightUrl", "homepage.heroTitle", "navigation.links", "categoryPages.property.title", "categoryPages.search.description", "categories", "footer.columns", "seo.defaultTitle", "pages.terms.sections", "pages.privacy.sections"].every((key) => editor.includes(key)));
check("Editor supports draft preview, publication, JSON editing and revision recovery", /homepage draft preview/i.test(editor) && /Publish website changes/.test(editor) && /Revision history/.test(editor) && /Load into editor/.test(editor) && /setDraft\(\(current\) => writePath\(current, field\.path, parsed\)\)/.test(editor));
check("Header uses editable brand and navigation with an accessible mobile menu and listing CTA", /getPublishedSiteContent/.test(header) && /details className="relative/.test(header) && /content\.navigation\.listCtaLabel/.test(header) && /aria-label="Mobile marketplace menu"/.test(header));
check("Footer logo, description, columns and copyright are CMS-driven", /getPublishedSiteContent/.test(footer) && /brand\.logoLightUrl/.test(footer) && /content\.footer\.columns/.test(footer));
check("Database-backed site content module is explicitly server-only", /^import "server-only";/m.test(content) && /from "@\/lib\/db"/.test(content));
check("Site-content types are isolated in a browser-safe type module", existsSync(`${root}/src/lib/site-content.types.ts`) && !/from "@\/lib\/db"|from "next\/server"/.test(read("src/lib/site-content.types.ts")));
check("Client listing and request forms no longer import server Header or Footer components", ["src/components/forms/post-listing-form.tsx", "src/components/forms/property-request-form.tsx", "src/components/forms/property-service-form.tsx"].every((path) => !/components\/layout\/(header|footer)|lib\/site-content(?:\.ts)?/.test(read(path))));
check("Client form routes render Header and Footer from server route wrappers", ["src/app/post/page.tsx", "src/app/property-request/new/page.tsx", "src/app/property-management/new/page.tsx"].every((path) => /components\/layout\/header/.test(read(path)) && /components\/layout\/footer/.test(read(path)) && /components\/forms\//.test(read(path))));
check("Homepage hero, search, intent shortcuts, categories and section visibility are CMS-driven", /getPublishedSiteContent/.test(home) && /home\.heroTitle/.test(home) && /home\.propertyIntents/.test(home) && /content\.categories/.test(home) && /home\.showCategories/.test(home));

check("Homepage microcopy, section labels and CTA labels are editable", ["home.searchEyebrow", "home.searchBrowseLabel", "home.searchAllListingsLabel", "home.categoriesBrowseLabel", "home.featuredBrowseLabel", "home.latestBrowseLabel", "home.reviewBadgeLabel", "home.requestEyebrow", "home.sellerEyebrow", "home.sellerServiceCtaLabel"].every((key) => home.includes(key)));
check("Homepage category search options follow Owner-edited category labels", /searchCategories/.test(home) && /item\.label/.test(home));
check("Header account, mobile menu and search microcopy are editable", ["navigation.accountLabel", "navigation.signInLabel", "navigation.menuHeading", "navigation.headerSearchPlaceholder"].every((key) => header.includes(key)));
check("Footer closing note and category search titles are editable", /footer\.bottomNote/.test(footer) && /siteContent\.categoryPages\.search/.test(read("src/components/listings/listing-browser.tsx")));

check("Homepage retains genuine published-listing queries and honest empty state", /status:\s*"PUBLISHED"/.test(home) && /home\.emptyTitle/.test(home) && /publicCount\.toLocaleString/.test(home));
check("SEO metadata and favicon are read from published content", /getPublishedSiteContent/.test(read("src/app/layout.tsx")) && /content\.seo\.defaultTitle/.test(read("src/app/layout.tsx")) && /content\.brand\.faviconUrl/.test(read("src/app/layout.tsx")));
check("About and contact pages render Owner-editable page content", /content\.pages\.about/.test(read("src/app/about/page.tsx")) && /content\.pages\.contact/.test(read("src/app/contact/page.tsx")));
check("Property services and category directory headings are content-managed", /pageContent\.title/.test(read("src/app/property-management/page.tsx")) && /siteContent\.categoryPages/.test(read("src/components/listings/listing-browser.tsx")));
check("Existing legal and safety placeholder copy is retained until Owner supplies approved content", /final legal copy is currently under review/.test(legalPages) && /if \(managed\.title\.trim\(\)/.test(legalPages));
check("V10 verification is registered and the migration does not touch marketplace records", packageJson.scripts["v10:verify"] === "bash scripts/v10/verify.sh" && !/DROP TABLE|DELETE FROM/i.test(migration));

const failed = checks.filter((item) => !item.passed);
console.log(`\nENES V10 source checks: ${checks.length - failed.length}/${checks.length} passed.`);
if (failed.length) process.exitCode = 1;
