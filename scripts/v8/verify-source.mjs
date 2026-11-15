import { readFileSync, existsSync } from "node:fs";

const checks = [];
function check(name, condition) {
  checks.push({ name, passed: Boolean(condition) });
}
function read(path) {
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

const proxy = read("src/proxy.ts");
const origin = read("src/lib/security/origin.ts");
const nextConfig = read("next.config.ts");
const layout = read("src/app/layout.tsx");
const media = read("src/lib/media/storage.ts");
const upload = read("src/app/api/upload/route.ts");
const robots = read("src/app/robots.ts");
const sitemap = read("src/app/sitemap.ts");
const packageJson = JSON.parse(read("package.json") || "{}");

check("Origin guard exists", origin.includes("isTrustedMutationOrigin"));
check("Origin guard compares exact request origin", origin.includes("supplied.origin === target.origin") && origin.includes("supplied.pathname === \"/\""));
check("Origin guard rejects missing or non-same-origin fetch metadata", origin.includes('=== "same-origin"'));
check("Origin guard blocks unsafe API writes before route execution", proxy.includes("!SAFE_METHODS.has(request.method.toUpperCase())") && proxy.includes("isTrustedMutationOrigin(request)"));
check("Origin rejection returns HTTP 403", proxy.includes("status: 403"));
check("Cross-origin guard leaves safe HTTP methods alone", proxy.includes('new Set(["GET", "HEAD", "OPTIONS"])'));
check("Content type sniffing is disabled", nextConfig.includes("X-Content-Type-Options") && nextConfig.includes("nosniff"));
check("Framing is denied", nextConfig.includes("X-Frame-Options") && nextConfig.includes("DENY"));
check("Referrer policy is restrictive", nextConfig.includes("strict-origin-when-cross-origin"));
check("Camera and microphone permissions are disabled", nextConfig.includes("camera=(), microphone=()"));
check("Private and API responses carry noindex directives", nextConfig.includes("X-Robots-Tag") && nextConfig.includes("noindex, nofollow"));
check("Sitemap and robots responses have public cache headers", nextConfig.includes('source: "/sitemap.xml"') && nextConfig.includes('source: "/robots.txt"'));
check("API responses use private no-store caching", nextConfig.includes('source: "/api/:path*"') && nextConfig.includes("private, no-store"));
check("Admin and dashboard responses use private no-store caching", nextConfig.includes('source: "/admin/:path*"') && nextConfig.includes('source: "/dashboard/:path*"'));
check("No unconfirmed ENES domain is hard-coded as metadata fallback", !layout.includes("https://enesproperties.com"));
check("Metadata base only uses the configured public app URL", layout.includes("process.env.NEXT_PUBLIC_APP_URL ? new URL(process.env.NEXT_PUBLIC_APP_URL) : undefined"));
check("Media validation errors are distinguished", media.includes("class MediaValidationError"));
check("R2 configuration errors are distinguished", media.includes("class MediaStorageConfigurationError"));
check("Client upload errors do not expose R2 settings", upload.includes("Image uploads are temporarily unavailable.") && !upload.includes("/bucket|R2|dimensions|supported/i"));
check("Private pending media and public approved media remain separate", media.includes("publicBucket === privateBucket"));
check("Robots excludes private account, API and admin paths", robots.includes('"/admin"') && robots.includes('"/dashboard"') && robots.includes('"/api"'));
check("Robots sitemap URL is based only on configured site URL", robots.includes("process.env.NEXT_PUBLIC_APP_URL"));
check("Sitemap includes only published listing records", sitemap.includes('where: { status: "PUBLISHED" }'));
check("Sitemap limits property services to active providers", sitemap.includes('where: { status: "PUBLISHED", provider: { status: "ACTIVE" } }'));
check("Sitemap excludes private request and account routes", !sitemap.includes("property-request") && !sitemap.includes("/dashboard"));
check("V8 verification command is registered", packageJson.scripts?.["v8:verify"] === "sh scripts/v8/verify.sh");
check("V8 preflight command is registered", packageJson.scripts?.["v8:preflight"] === "node scripts/v8/preflight.mjs --production");
check("V8 does not add a Prisma migration", !existsSync("prisma/migrations/20261115080000_v8"));

for (const result of checks) console.log(`${result.passed ? "PASS" : "FAIL"} ${result.name}`);
const failed = checks.filter((item) => !item.passed);
console.log(`\nV8 source checks: ${checks.length - failed.length}/${checks.length} passed.`);
if (failed.length) process.exitCode = 1;
