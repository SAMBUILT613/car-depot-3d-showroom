import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
let failures = 0;
let passes = 0;

function check(label, condition) {
  if (condition) {
    passes += 1;
    console.log(`PASS ${label}`);
  } else {
    failures += 1;
    console.error(`FAIL ${label}`);
  }
}

const dbPath = path.join(root, "src/lib/db.ts");
const db = fs.readFileSync(dbPath, "utf8");
const netlify = fs.readFileSync(path.join(root, "netlify.toml"), "utf8");
const nvmrc = fs.readFileSync(path.join(root, ".nvmrc"), "utf8").trim();
const ignore = fs.readFileSync(path.join(root, ".gitignore"), "utf8");
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));

check("Netlify build uses the existing Next.js production build", /command\s*=\s*"npm run build"/.test(netlify));
check("Node runtime is pinned to 22", nvmrc === "22" && /NODE_VERSION\s*=\s*"22"/.test(netlify));
check("Netlify adapter is not manually pinned", !/plugin-nextjs/.test(netlify));
check("Netlify publish directory is left to framework adapter", !/^\s*publish\s*=/m.test(netlify));
check("Prisma runtime uses DATABASE_URL", /process\.env\.DATABASE_URL/.test(db));
check("Prisma runtime no longer imports Cloudflare context", !/getCloudflareContext|@opennextjs\/cloudflare/.test(db));
check("Prisma runtime uses the PostgreSQL adapter", /new PrismaPg\(pool\)/.test(db));
check("Prisma pool is reused per warm Node instance", /__enesPgPool/.test(db) && /__enesPrisma/.test(db));
check("Prisma pool has a bounded connection count", /Math\.min\(3, Math\.max\(1, configuredMax\)\)/.test(db));
check("Prisma pool configures connection and idle timeouts", /connectionTimeoutMillis:\s*10_000/.test(db) && /idleTimeoutMillis:\s*10_000/.test(db));
check("Environment files are excluded from Git", /^\.env\*$/m.test(ignore) && /^!\.env\.example$/m.test(ignore));
check("Current Next.js build script remains present", pkg.scripts?.build === "next build");
check("Prisma schema and migrations remain present", fs.existsSync(path.join(root, "prisma/schema.prisma")) && fs.existsSync(path.join(root, "prisma/migrations")));
check("No database migration is introduced by hosting prep", !fs.existsSync(path.join(root, "prisma/migrations/20261115190000_netlify_hosting")));

console.log(`\nENES Netlify preparation checks: ${passes}/${passes + failures} passed.`);
if (failures) process.exit(1);
