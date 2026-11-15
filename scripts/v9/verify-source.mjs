import { readFileSync, existsSync } from "node:fs";

const checks = [];
function check(name, condition) {
  checks.push({ name, passed: Boolean(condition) });
}
function read(path) {
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

const proxy = read("src/proxy.ts");
const db = read("src/lib/db.ts");
const origin = read("src/lib/security/origin.ts");
const nextConfig = read("next.config.ts");
const layout = read("src/app/layout.tsx");
const media = read("src/lib/media/storage.ts");
const upload = read("src/app/api/upload/route.ts");
const mediaReview = read("src/app/api/admin/media/[id]/route.ts");
const preview = read("src/app/api/admin/media/[id]/preview/route.ts");
const robots = read("src/app/robots.ts");
const sitemap = read("src/app/sitemap.ts");
const packageJson = JSON.parse(read("package.json") || "{}");
const invitationAccept = read("src/app/api/admin/invitations/accept/route.ts");
const invitationRevoke = read("src/app/api/admin/invitations/[id]/route.ts");

check("Origin guard exists and compares exact origins", origin.includes("isTrustedMutationOrigin") && origin.includes("supplied.origin === target.origin"));
check("Origin guard rejects missing or non-same-origin fetch metadata", origin.includes('=== "same-origin"'));
check("Origin guard blocks unsafe API writes before route execution", proxy.includes("!SAFE_METHODS.has(request.method.toUpperCase())") && proxy.includes("isTrustedMutationOrigin(request)"));
check("Origin rejection returns HTTP 403", proxy.includes("status: 403"));
check("Security headers deny sniffing and framing", nextConfig.includes("nosniff") && nextConfig.includes('X-Frame-Options') && nextConfig.includes("DENY"));
check("Private/API/admin responses are no-store and noindex", nextConfig.includes("private, no-store") && nextConfig.includes("noindex, nofollow"));
check("Metadata base uses only configured public URL", layout.includes("process.env.NEXT_PUBLIC_APP_URL ? new URL(process.env.NEXT_PUBLIC_APP_URL) : undefined"));
check("Media validation and configuration errors are distinguished", media.includes("class MediaValidationError") && media.includes("class MediaStorageConfigurationError"));
check("Uploads keep pending media private and separate from public bucket", media.includes("R2_BUCKET_NAME") && media.includes("publicBucket === privateBucket"));
check("Client upload errors do not expose R2 configuration", upload.includes("Image uploads are temporarily unavailable."));
check("Admin preview requires media:view and pending private object", preview.includes('requireAdminPermission("media:view")') && preview.includes('status: "PENDING_REVIEW"') && preview.includes('startsWith("pending/")'));
check("Media review uses compare-and-set transitions", mediaReview.includes("updateMany") && mediaReview.includes('status: "PENDING_REVIEW"'));
check("Concurrent approval loser preserves winning public object", mediaReview.includes("latest?.status === \"APPROVED\"") && mediaReview.includes("latest.objectKey === newKey"));
check("Approved media is copied before DB transition", mediaReview.indexOf("CopyObjectCommand") < mediaReview.indexOf("const changed = await prisma.listingMedia.updateMany"));
check("Private source deletion follows successful approval transition", mediaReview.indexOf("changed.count !== 1") < mediaReview.indexOf("DeleteObjectCommand({ Bucket: privateBucket"));
check("Robots excludes private account, API and admin paths", robots.includes('"/admin"') && robots.includes('"/dashboard"') && robots.includes('"/api"'));
check("Sitemap includes only published listings", sitemap.includes('where: { status: "PUBLISHED" }'));
check("Sitemap includes only active-provider published services", sitemap.includes('where: { status: "PUBLISHED", provider: { status: "ACTIVE" } }'));
check("V8 preflight remains registered", packageJson.scripts?.["v8:preflight"] === "node scripts/v8/preflight.mjs --production");
check("Cloudflare build command is registered", packageJson.scripts?.["cf:build"] === "opennextjs-cloudflare build");
check("V9 verification command is registered", packageJson.scripts?.["v9:verify"] === "sh scripts/v9/verify.sh");
check("Legal pages remain owner-controlled and are not silently rewritten", !read("src/app/terms/page.tsx").includes("ENES V9 legal copy"));
check("No V9 database migration is introduced", !existsSync("prisma/migrations/20261115090000_v9"));
check("Prisma client is request/render scoped rather than module-global", db.includes('import { cache } from "react"') && db.includes("const getPrismaClient = cache(createPrismaClient)") && !db.includes("__enesPrisma") && !db.includes("__enesPool"));
check("Cloudflare Prisma pool limits each connection to one use", db.includes("maxUses: 1"));
check("Prisma adapter still prefers the Hyperdrive request binding", db.includes("getCloudflareContext()") && db.includes("hyperdrive.connectionString"));
check("Invitation acceptance atomically claims a still-pending, unexpired token", invitationAccept.includes("tx.adminInvitation.updateMany") && invitationAccept.includes('status: "PENDING"') && invitationAccept.includes("expiresAt: { gt: new Date() }") && invitationAccept.includes("claimed.count !== 1"));
check("Invitation acceptance binds the claim to the verified account email", invitationAccept.includes("emailNormalized: user.email!.trim().toLowerCase()"));
check("Invitation claim races return a conflict instead of activating twice", invitationAccept.includes("InvitationClaimError") && invitationAccept.includes("status: 409"));
check("Invitation revocation uses a pending-only compare-and-set", invitationRevoke.includes("updateMany") && invitationRevoke.includes('status: "PENDING"') && invitationRevoke.includes("changed.count !== 1"));

for (const result of checks) console.log(`${result.passed ? "PASS" : "FAIL"} ${result.name}`);
const failed = checks.filter((item) => !item.passed);
console.log(`\nENES V9 source checks: ${checks.length - failed.length}/${checks.length} passed.`);
if (failed.length) process.exitCode = 1;
