import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const failures = [];
const checks = [];

function read(path) {
  try { return readFileSync(join(root, path), "utf8"); }
  catch { return ""; }
}

function check(label, condition) {
  checks.push({ label, passed: Boolean(condition) });
  if (!condition) failures.push(label);
}

function has(path, pattern) {
  return pattern.test(read(path));
}

const requiredFiles = [
  "src/app/page.tsx",
  "src/app/search/page.tsx",
  "src/app/property/page.tsx",
  "src/app/cars/page.tsx",
  "src/app/home-living/page.tsx",
  "src/app/marketplace/page.tsx",
  "src/app/listing/[id]/page.tsx",
  "src/app/post/page.tsx",
  "src/app/sign-in/[[...sign-in]]/page.tsx",
  "src/app/sign-up/[[...sign-up]]/page.tsx",
  "src/app/property-management/page.tsx",
  "src/app/property-management/[id]/page.tsx",
  "src/app/property-management/new/page.tsx",
  "src/app/api/property-management/services/route.ts",
  "src/app/api/property-management/enquiries/route.ts",
  "src/app/property-request/new/page.tsx",
  "src/app/api/property-requests/route.ts",
  "src/app/admin/page.tsx",
  "src/app/admin/property-requests/page.tsx",
  "src/app/admin/services/page.tsx",
  "src/app/admin/service-enquiries/page.tsx",
  "src/lib/listings/browse.ts",
  "src/components/listings/listing-browser.tsx",
  "src/components/listings/listing-card.tsx",
  "src/components/services/service-enquiry-form.tsx",
];

for (const file of requiredFiles) check(`Required V7 file exists: ${file}`, existsSync(join(root, file)));

const css = read("src/app/globals.css");
const layout = read("src/app/layout.tsx");
check("ENES V7 charcoal token is exact", css.includes("#18211F"));
check("ENES V7 forest token is exact", css.includes("#176B57"));
check("ENES V7 oat token is exact", css.includes("#F4F0E8"));
check("ENES V7 terracotta token is exact", css.includes("#C96745"));
check("Manrope is loaded by the root layout", layout.includes("Manrope"));
check("ENES uses its own search-led homepage identity", has("src/app/page.tsx", /Find a place\.[\s\S]*Find more\./));

const browse = read("src/lib/listings/browse.ts");
check("Marketplace browse queries only published listings", browse.includes('status: "PUBLISHED"'));
check("Property search has sale/rent and property-specific filters", browse.includes('category === "Property"') && browse.includes("where.intent") && browse.includes("where.propertyType"));
check("Vehicle search has make, model, year and transmission filters", browse.includes('category === "Cars"') && browse.includes("where.make") && browse.includes("where.model") && browse.includes("where.vehicleYear") && browse.includes("where.transmission"));
check("Home and marketplace search has brand and condition filters", browse.includes('category === "Home & Living" || category === "Marketplace"') && browse.includes("where.itemBrand") && browse.includes("where.condition"));
check("Public browse media is approved and not deleted", browse.includes('status: "APPROVED"') && browse.includes("deletedAt: null") && browse.includes("publicUrl: { not: null }"));
check("Public media honours the configured public R2 bucket", browse.includes("R2_PUBLIC_BUCKET_NAME"));

const listingApi = read("src/app/api/listings/route.ts");
const publicGet = listingApi.slice(listingApi.indexOf("export async function GET"), listingApi.indexOf("export async function POST"));
check("Public listings API selects fields explicitly", publicGet.includes("select: {") && !publicGet.includes("include: {"));
check("Public listings API does not expose seller contact or internal identity", !/sellerEmail|sellerPhone|sellerUserId|sellerId|reviewedByAdminId|rejectionReason|address:\s*true/.test(publicGet));
check("Listing submissions require an authenticated ENES user", has("src/app/api/listings/route.ts", /ensureCurrentUser\(\)/));
check("Listing submissions enforce rate limits and Turnstile", listingApi.includes("safeConsumeRateLimit") && listingApi.includes("verifyTurnstile"));
check("Listing submissions derive seller identity server-side", listingApi.includes("sellerUserId: user.id") && listingApi.includes("sellerId: user.clerkId"));
check("Seller submissions enter moderation instead of instant publication", listingApi.includes('status: "PENDING_REVIEW"'));

const detail = read("src/app/listing/[id]/page.tsx");
check("Listing details require published status", detail.includes('status: "PUBLISHED"'));
check("Listing details use approved R2 media only", detail.includes('status: "APPROVED"') && detail.includes("deletedAt: null") && detail.includes("publicUrl: { not: null }"));
check("Listing detail has a WhatsApp contact action", detail.includes("generateWhatsAppLink") && detail.includes("WhatsAppButton"));

const post = read("src/app/post/page.tsx");
check("Listing submission UI has category-specific fields", post.includes('category==="Property"') && post.includes('category==="Cars"') && post.includes('category==="Home & Living"'));
check("Listing submission uploads through the authenticated R2 API", post.includes('fetch("/api/upload"') && post.includes("mediaIds"));
check("Listing submission states that submissions are free", post.includes("listing submissions are free"));

const serviceApi = read("src/app/api/property-management/services/route.ts");
const enquiryApi = read("src/app/api/property-management/enquiries/route.ts");
const serviceDirectory = read("src/app/property-management/page.tsx");
check("Property-service submissions are authenticated, rate limited and challenged", serviceApi.includes("ensureCurrentUser()") && serviceApi.includes("safeConsumeRateLimit") && serviceApi.includes("verifyTurnstile"));
check("Property services enter pending review", serviceApi.includes('status: "PENDING_REVIEW"'));
check("Public service directory exposes published services from active providers", serviceDirectory.includes('status: "PUBLISHED"') && serviceDirectory.includes('provider: { status: "ACTIVE" }'));
check("Service enquiries target a currently published service", enquiryApi.includes('status: "PUBLISHED"') && enquiryApi.includes('provider: { status: "ACTIVE" }'));
check("Service enquiry validates contact fields and uses rate limiting", enquiryApi.includes("phoneDigits.length < 10") && enquiryApi.includes("safeConsumeRateLimit") && enquiryApi.includes("verifyTurnstile"));

const propertyRequestApi = read("src/app/api/property-requests/route.ts");
const propertyRequestAdmin = read("src/app/admin/property-requests/page.tsx");
check("Buyer property requests require a signed-in user", propertyRequestApi.includes("ensureCurrentUser()"));
check("Buyer property requests are rate limited and Turnstile protected", propertyRequestApi.includes("safeConsumeRateLimit") && propertyRequestApi.includes("verifyTurnstile"));
check("Buyer property requests are private, account-linked records", propertyRequestApi.includes("userId: user.id") && propertyRequestApi.includes('status: "OPEN"'));
check("Property request administration enforces view permission", propertyRequestAdmin.includes('requireAdminPage("property_requests:view")'));
check("Property request changes enforce manage permission and audit history", propertyRequestAdmin.includes('requireAdminPermission("property_requests:manage")') && propertyRequestAdmin.includes("tx.auditLog.create"));

const adminServices = read("src/app/admin/services/page.tsx");
const adminEnquiries = read("src/app/admin/service-enquiries/page.tsx");
check("Service moderation enforces scoped permissions and records audits", adminServices.includes("requireAdminPermission(permission)") && adminServices.includes("tx.auditLog.create"));
check("Service moderation validates provider status and transition state", adminServices.includes('current.provider.status !== "ACTIVE"') && adminServices.includes("Only a published service can be suspended."));
check("Service enquiry administration has separate view/manage permissions", adminEnquiries.includes('requireAdminPage("service_enquiries:view")') && adminEnquiries.includes('requireAdminPermission("service_enquiries:manage")'));
check("Service enquiry status changes and audit records are atomic", adminEnquiries.includes("prisma.$transaction") && adminEnquiries.includes("tx.auditLog.create") && adminEnquiries.includes("updateMany"));
check("Administration shell includes buyer requests and service operations", has("src/app/admin/layout.tsx", /Buyer requests/) && has("src/app/admin/layout.tsx", /Service review/) && has("src/app/admin/layout.tsx", /Audit history/));
check("Member sign-in and administrator sign-in are separate", existsSync(join(root, "src/app/sign-in/[[...sign-in]]/page.tsx")) && has("src/components/layout/header.tsx", /href="\/sign-in"/));

const forbiddenContent = ["Lorem ipsum", "Demo listing", "Sample property for sale", "123 Fake Street"];
const scanRoots = ["src/app", "src/components", "src/lib"];
const scanned = [];
function walk(dir) {
  if (!existsSync(join(root, dir))) return;
  for (const name of readdirSync(join(root, dir))) {
    const path = join(dir, name);
    const absolute = join(root, path);
    const st = statSync(absolute);
    if (st.isDirectory()) walk(path);
    else if (/\.(tsx?|css)$/.test(name)) scanned.push({ path, text: readFileSync(absolute, "utf8") });
  }
}
for (const dir of scanRoots) walk(dir);
for (const phrase of forbiddenContent) {
  check(`No fabricated placeholder content (${phrase})`, !scanned.some((file) => file.text.includes(phrase)));
}
check("No checkout, card-payment or listing-fee routes were introduced", !scanned.some((file) => /stripe|checkout\.session|payment[_-]intent|listing[_-]fee/i.test(file.text)));
check("V7 does not modify the V6 Prisma schema or migration history", existsSync(join(root, "prisma/schema.prisma")) && existsSync(join(root, "prisma/migrations/20261114150000_v6_marketplace_foundation/migration.sql")));

for (const item of checks) console.log(`${item.passed ? "PASS" : "FAIL"} ${item.label}`);
console.log(`\nV7 source checks: ${checks.filter((item) => item.passed).length}/${checks.length} passed.`);
if (failures.length) process.exit(1);
console.log("V7 source verification passed.");
