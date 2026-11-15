import { readFileSync } from "node:fs";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

const failures = [];
const warnings = [];
const production = process.argv.includes("--production");

function present(name) {
  return typeof process.env[name] === "string" && process.env[name].trim().length > 0;
}

function requireValue(name) {
  if (!present(name)) failures.push(`Missing required setting: ${name}`);
}

function validUrl(name, { https = false, originOnly = false } = {}) {
  const raw = process.env[name]?.trim();
  if (!raw) return;
  try {
    const parsed = new URL(raw);
    if (https && parsed.protocol !== "https:") throw new Error("https required");
    if (parsed.username || parsed.password || parsed.search || parsed.hash) throw new Error("credentials, query and hash are not allowed");
    if (originOnly && parsed.pathname !== "/") throw new Error("root origin required");
  } catch {
    failures.push(`Invalid URL setting: ${name}`);
  }
}

if (!production) {
  console.log("ENES V8 preflight (local configuration mode)");
  warnings.push("Use --production to run the full release configuration checks.");
} else {
  console.log("ENES V8 production configuration preflight");
  [
    "NEXT_PUBLIC_APP_URL",
    "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
    "CLERK_SECRET_KEY",
    "ENES_OWNER_CLERK_ID",
    "RATE_LIMIT_HASH_SECRET",
    "NEXT_PUBLIC_TURNSTILE_SITE_KEY",
    "TURNSTILE_SECRET_KEY",
    "R2_ACCOUNT_ID",
    "R2_ACCESS_KEY_ID",
    "R2_SECRET_ACCESS_KEY",
    "R2_BUCKET_NAME",
    "R2_PUBLIC_BUCKET_NAME",
    "R2_PUBLIC_URL",
  ].forEach(requireValue);

  validUrl("NEXT_PUBLIC_APP_URL", { https: true, originOnly: true });
  validUrl("R2_PUBLIC_URL", { https: true });

  if (present("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY") && !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.startsWith("pk_live_")) {
    failures.push("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY must be a Clerk live publishable key for production.");
  }
  if (present("CLERK_SECRET_KEY") && !process.env.CLERK_SECRET_KEY.startsWith("sk_live_")) {
    failures.push("CLERK_SECRET_KEY must be a Clerk live secret key for production.");
  }
  if (present("ENES_OWNER_CLERK_ID") && !/^user_[A-Za-z0-9_]+$/.test(process.env.ENES_OWNER_CLERK_ID.trim())) {
    failures.push("ENES_OWNER_CLERK_ID does not match the expected Clerk user ID format.");
  }
  if (present("RATE_LIMIT_HASH_SECRET") && process.env.RATE_LIMIT_HASH_SECRET.length < 32) {
    failures.push("RATE_LIMIT_HASH_SECRET must contain at least 32 characters.");
  }
  if (present("R2_BUCKET_NAME") && present("R2_PUBLIC_BUCKET_NAME")
    && process.env.R2_BUCKET_NAME.trim() === process.env.R2_PUBLIC_BUCKET_NAME.trim()) {
    failures.push("R2_BUCKET_NAME and R2_PUBLIC_BUCKET_NAME must be different buckets.");
  }

  try {
    const config = JSON.parse(readFileSync("wrangler.jsonc", "utf8"));
    const hasHyperdrive = Array.isArray(config.hyperdrive)
      && config.hyperdrive.some((item) => item?.binding === "HYPERDRIVE" && typeof item.id === "string" && item.id.trim());
    if (!hasHyperdrive) failures.push("wrangler.jsonc must define the configured HYPERDRIVE binding.");
  } catch {
    failures.push("wrangler.jsonc could not be read as JSON; verify the Worker configuration.");
  }

  if (!present("ABLY_API_KEY")) warnings.push("ABLY_API_KEY is not set; realtime chat may be unavailable.");
  if (!present("RESEND_API_KEY") || !present("RESEND_FROM_EMAIL")) warnings.push("Resend credentials are incomplete; outbound email delivery may be unavailable.");
  if (!present("NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN")) warnings.push("NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN is not set; map features may be unavailable.");
}

for (const warning of warnings) console.warn(`WARN ${warning}`);
for (const failure of failures) console.error(`FAIL ${failure}`);

if (failures.length) {
  console.error(`V8 preflight failed: ${failures.length} blocking issue(s). Secret values were not printed.`);
  process.exitCode = 1;
} else {
  console.log("PASS V8 preflight checks completed. Secret values were not printed.");
}
