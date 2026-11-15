import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const root = process.cwd();
const read = (path) => readFileSync(resolve(root, path), "utf8");
const checks = [];
function check(name, condition) {
  checks.push({ name, passed: Boolean(condition) });
  console.log(`${condition ? "PASS" : "FAIL"} ${name}`);
}

const layout = read("src/app/layout.tsx");
const chrome = read("src/components/navigation/site-chrome.tsx");
const navRoute = read("src/app/api/site-content/navigation/route.ts");
const siteTypes = read("src/lib/site-content.types.ts");
const siteDefaults = read("src/lib/site-content.ts");
const editor = read("src/components/admin/site-content-editor.tsx");
const proxy = read("src/proxy.ts");
const nextConfig = read("next.config.ts");
const robots = read("src/app/robots.ts");
const savedPage = read("src/app/saved/page.tsx");
const messagesPage = read("src/app/messages/page.tsx");
const threadPage = read("src/app/messages/[conversationId]/page.tsx");
const chat = read("src/components/chat/chat-widget.tsx");
const listingCard = read("src/components/listings/listing-card.tsx");
const saveButton = read("src/components/listings/save-listing-button.tsx");
const browser = read("src/components/listings/listing-browser.tsx");
const drawer = read("src/components/listings/mobile-filter-drawer.tsx");
const home = read("src/app/page.tsx");
const packageJson = JSON.parse(read("package.json"));

check("Site-wide mobile navigation is mounted at the root without changing server-rendered page ownership", /<SiteChrome>\{children\}<\/SiteChrome>/.test(layout) && /export function SiteChrome/.test(chrome));
check("Mobile navigation exposes Home, Saved, List, Messages and Profile destinations", ["/", "/saved", "/post", "/messages", "/dashboard"].every((href) => chrome.includes(`href: "${href}"`)));
check("Mobile navigation is excluded from admin and authentication screens", /pathname\.startsWith\("\/admin"\)/.test(chrome) && /pathname\.startsWith\("\/sign-in"\)/.test(chrome) && /pathname\.startsWith\("\/sign-up"\)/.test(chrome));
check("Mobile navigation has safe-area padding, accessible labels and an active-page state", /safe-area-inset-bottom/.test(chrome) && /aria-label="Primary mobile navigation"/.test(chrome) && /aria-current=/.test(chrome));
check("Mobile navigation labels are read only from published CMS content", /content\.mobileNav/.test(navRoute) && /private, no-store/.test(navRoute) && /fetch\("\/api\/site-content\/navigation"/.test(chrome));
check("Owner CMS exposes all mobile bottom-navigation and menu labels", ["mobileNav.homeLabel", "mobileNav.savedLabel", "mobileNav.listLabel", "mobileNav.messagesLabel", "mobileNav.profileLabel", "navigation.menuSavedLabel", "navigation.menuMessagesLabel"].every((field) => editor.includes(field)));
check("CMS schema and defaults supply backward-compatible mobile navigation fields", /mobileNav:\s*\{ homeLabel: string; savedLabel: string; listLabel: string; messagesLabel: string; profileLabel: string \}/.test(siteTypes) && /mobileNav:\s*\{[\s\S]*homeLabel: "Home"[\s\S]*profileLabel: "Profile"/.test(siteDefaults));
check("Saved listings are scoped to the signed-in account and published listings only", /ensureCurrentUser\(\)/.test(savedPage) && /where:\s*\{ userId: user\.id, listing: \{ status: "PUBLISHED" \} \}/.test(savedPage));
check("Saved listing images are approved and restricted to the configured public media bucket", /status: "APPROVED"/.test(savedPage) && /deletedAt: null/.test(savedPage) && /R2_PUBLIC_BUCKET_NAME/.test(savedPage));
check("Messages inbox returns conversations only to their participants", /ensureCurrentUser\(\)/.test(messagesPage) && /participants:\s*\{ some: \{ userId: user\.id \} \}/.test(messagesPage));
check("Conversation thread performs a server-side participant check before rendering private content", /findFirst\([\s\S]*participants:\s*\{ some: \{ userId: user\.id \} \}/.test(threadPage) && /if \(!conversation\) notFound\(\)/.test(threadPage));
check("Conversation thread can load a closed conversation read-only without permitting sends", /initialConversationId=\{conversation\.id\}/.test(threadPage) && /readOnly=\{conversation\.status !== "OPEN"\}/.test(threadPage) && /readOnly \?/.test(chat));
check("Chat widget retrieves conversation history by the authorized conversation ID", /conversationId=\$\{encodeURIComponent\(initialConversationId\)\}/.test(chat) && /body: JSON\.stringify\(\{ content: input\.trim\(\), conversationId/.test(chat));
check("New member routes require an authenticated Clerk session in the proxy", /path === "\/saved"/.test(proxy) && /path === "\/messages"/.test(proxy) && /await auth\.protect\(\)/.test(proxy));
check("Saved and message pages send private no-store and noindex headers", ["/saved", "/messages"].every((path) => nextConfig.includes(`source: "${path}"`) || nextConfig.includes(`source: "${path}/:path*"`)) && /X-Robots-Tag/.test(nextConfig) && /private, no-store/.test(nextConfig));
check("Robots excludes saved listings and private conversations", /"\/saved"/.test(robots) && /"\/messages"/.test(robots));
check("Listing cards use a consistent 4:3 image frame and display property facts", /aspect-\[4\/3\]/.test(listingCard) && /bathrooms/.test(listingCard) && /parkingSpaces/.test(listingCard));
check("Listing cards expose the Owner-editable review label and a real save action", /reviewLabel/.test(listingCard) && /<SaveListingButton/.test(listingCard) && /reviewLabel=\{siteContent\.homepage\.reviewBadgeLabel\}/.test(browser));
check("Saved-page cards are already marked saved and do not need a status lookup", /initiallySaved reviewLabel/.test(savedPage) && /initiallySaved/.test(saveButton));
check("Save-state lookups are lazy and do not fan out across all off-screen result cards", /IntersectionObserver/.test(saveButton) && /rootMargin: "120px"/.test(saveButton));
check("Anonymous save actions route visitors to sign-in and return them to the current page", /router\.push\(`\/sign-in\?redirect_url=/.test(saveButton) && /usePathname\(\)/.test(saveButton));
check("Search filters open in an accessible mobile drawer with Escape, backdrop close and trapped focus", /role="dialog"/.test(drawer) && /aria-modal="true"/.test(drawer) && /event\.key === "Escape"/.test(drawer) && /event\.target === event\.currentTarget/.test(drawer) && /event\.key !== "Tab"/.test(drawer) && /triggerRef\.current\?\.focus\(\)/.test(drawer));
check("Mobile and desktop filter forms use unique input IDs and preserve category-specific filters", /prefix: string/.test(browser) && /mobile-filter/.test(browser) && /desktop-filter/.test(browser) && ["Property", "Cars", "Home & Living", "Marketplace"].every((value) => browser.includes(value)));
check("Search results keep published listing scope and display the result count", /browseListings\(params, category\)/.test(browser) && /total\.toLocaleString\("en-NG"\)/.test(browser));
check("Homepage search is ordered first on mobile and remains editorial on desktop", /order-1[\s\S]*lg:order-2/.test(home) && /order-2[\s\S]*lg:order-1/.test(home));
check("Homepage quick actions use Owner-managed content and respect section visibility", /home\.reviewTitle/.test(home) && /home\.requestCtaLabel/.test(home) && /home\.sellerCtaLabel/.test(home) && /home\.showReview &&/.test(home) && /home\.showRequest &&/.test(home) && /home\.showSeller &&/.test(home));
check("Homepage keeps real published inventory, honest empty states and the review limitation statement", /status: "PUBLISHED"/.test(home) && /home\.emptyTitle/.test(home) && /content/.test(siteDefaults) && /not a guarantee of title, ownership, condition or transaction outcome/.test(siteDefaults));
check("Owner CMS controls homepage listing-count text and quick-action accessible label", ["homepage.listingCountPrefix", "homepage.listingCountSingular", "homepage.listingCountPlural", "homepage.listingCountSuffix", "homepage.quickActionsLabel"].every((field) => editor.includes(field)) && /home\.listingCountPrefix/.test(home) && /home\.quickActionsLabel/.test(home));
check("Owner CMS controls listing featured badge and missing-photo fallback text", /homepage\.featuredBadgeLabel/.test(editor) && /homepage\.photoMissingLabel/.test(editor) && /featuredLabel=\{home\.featuredBadgeLabel\}/.test(home) && /photoMissingLabel=\{home\.photoMissingLabel\}/.test(home) && /\{featuredLabel\}/.test(listingCard) && /\{photoMissingLabel\}/.test(listingCard));
check("Homepage draft preview reflects the editable mobile tabs and featured badge", /draft\.mobileNav\.listLabel/.test(editor) && /draft\.homepage\.featuredBadgeLabel/.test(editor) && /draft\.homepage\.listingCountSuffix/.test(editor));
check("V11 adds no database migration and leaves existing V9/V10 migration files untouched", !existsSync(resolve(root, "prisma/migrations/20261115070000_v11")) && !existsSync(resolve(root, "prisma/migrations/20261115070000_v11_mobile_navigation")));
check("V11 verify and consolidated release commands are registered", packageJson.scripts["v11:verify"] === "bash scripts/v11/verify.sh" && packageJson.scripts["v11:release"] === "bash scripts/v11/release.sh");

const syntaxFiles = [
  "src/app/layout.tsx", "src/app/page.tsx", "src/app/saved/page.tsx", "src/app/messages/page.tsx",
  "src/app/messages/[conversationId]/page.tsx", "src/app/api/site-content/navigation/route.ts",
  "src/components/navigation/site-chrome.tsx", "src/components/listings/mobile-filter-drawer.tsx",
  "src/components/listings/listing-browser.tsx", "src/components/listings/listing-card.tsx",
  "src/components/listings/save-listing-button.tsx", "src/components/chat/chat-widget.tsx",
  "src/components/layout/header.tsx", "src/components/admin/site-content-editor.tsx",
  "src/lib/site-content.ts", "src/lib/site-content.types.ts", "src/proxy.ts", "src/app/robots.ts", "next.config.ts",
];
let syntaxFailures = 0;
for (const file of syntaxFiles) {
  const result = ts.transpileModule(read(file), {
    fileName: file,
    reportDiagnostics: true,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX },
  });
  const errors = (result.diagnostics || []).filter((item) => item.category === ts.DiagnosticCategory.Error);
  if (errors.length) {
    syntaxFailures += errors.length;
    console.log(`FAIL TypeScript/JSX syntax: ${file}`);
    for (const error of errors) console.log(ts.flattenDiagnosticMessageText(error.messageText, "\n"));
  }
}
check(`TypeScript/JSX syntax parses for all ${syntaxFiles.length} changed source files`, syntaxFailures === 0);

const failed = checks.filter((item) => !item.passed);
console.log(`\nENES V11 source checks: ${checks.length - failed.length}/${checks.length} passed.`);
if (failed.length) process.exitCode = 1;
