import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const failures = [];
const pass = (label) => console.log(`PASS ${label}`);
const fail = (label) => failures.push(label);
const read = (path) => readFileSync(path, "utf8");

const schema = read("prisma/schema.prisma");
const requiredModels = [
  "User", "SellerProfile", "ProfessionalProfile", "Listing", "ListingVersion", "ListingStatusHistory",
  "CorrectionRequest", "ListingMedia", "Category", "CategoryAttribute", "AnalyticsEvent", "SavedSearch",
  "SavedListing", "Report", "Enquiry", "Conversation", "ConversationParticipant", "Message",
  "MessageModeration", "UserBlock", "PropertyRequest", "Notification", "NotificationDelivery",
  "VerificationRecord", "ConsentRecord", "SecurityEvent", "PropertyManagementService", "ServiceEnquiry", "AdminUser", "Role", "Permission",
  "AdminUserRole", "RolePermission", "AdminInvitation", "AdminInvitationRole", "AuditLog", "RateLimitBucket",
];
const models = [...schema.matchAll(/^model\s+(\w+)\s*\{/gm)].map((match) => match[1]);
if (new Set(models).size !== models.length) fail("Prisma schema contains duplicate model names");
else pass("Prisma model names are unique");
const missingModels = requiredModels.filter((model) => !models.includes(model));
if (missingModels.length) fail(`Required Prisma models missing: ${missingModels.join(", ")}`);
else pass(`All ${requiredModels.length} required marketplace, chat, moderation and RBAC models exist`);
if (!/^\s*emailNormalized\s+String\?\s+@unique/m.test(schema)) fail("User.emailNormalized must be unique for invitation lookup");
else pass("User email lookup has a unique database constraint");
const relationNames = [...schema.matchAll(/@relation\("([A-Za-z0-9_]+)"/g)].map((match) => match[1]);
const counts = new Map();
for (const name of relationNames) counts.set(name, (counts.get(name) || 0) + 1);
const brokenRelations = [...counts].filter(([, count]) => count !== 2).map(([name, count]) => `${name} (${count})`);
if (brokenRelations.length) fail(`Named relation pairs do not appear exactly twice: ${brokenRelations.join(", ")}`);
else pass("Named Prisma relation pairs have matching opposite fields");

const auth = read("src/lib/auth.ts");
if (!auth.includes("ENES_OWNER_CLERK_ID") || !auth.includes("clerkId === ownerId")) fail("Owner identity is not exclusively tied to ENES_OWNER_CLERK_ID");
else pass("Owner identity is bound to the configured Clerk user ID");
const seed = read("scripts/seed-rbac.mjs");
if (/adminUser\.(?:create|upsert)\s*\(/.test(seed) || /isOwner:\s*true/.test(seed)) fail("RBAC seed must not create or assign an Owner account");
else pass("RBAC seed creates roles and permissions only; it does not grant ownership");
if (!seed.includes('"media:view"') || !seed.includes('"media:approve"') || !seed.includes('"media:reject"')) fail("Media permissions are missing from the RBAC seed");
else pass("Media permissions are included in the RBAC seed");
const permissionBlock = /export const PERMISSIONS = \[(.*?)\] as const;/s.exec(read("src/lib/permissions.ts"))?.[1] || "";
const seedPermissionBlock = /const PERMISSIONS = \[(.*?)\];/s.exec(seed)?.[1] || "";
const quotedPermissions = (value) => new Set([...value.matchAll(/"([a-z_]+:[a-z_]+)"/g)].map((match) => match[1]));
const appPermissionKeys = quotedPermissions(permissionBlock);
const seedPermissionKeys = quotedPermissions(seedPermissionBlock);
if (!permissionBlock || !seedPermissionBlock || appPermissionKeys.size !== seedPermissionKeys.size || [...appPermissionKeys].some((key) => !seedPermissionKeys.has(key))) {
  fail("Application permissions and database seed permission keys are out of sync");
} else pass(`All ${appPermissionKeys.size} permission keys match between application and RBAC seed`);

const schemaModels = new Map();
for (const match of schema.matchAll(/^model\s+(\w+)\s*\{(.*?)^\}/gms)) {
  const fields = new Map();
  for (const line of match[2].split(/\r?\n/)) {
    const field = /^\s*(\w+)\s+(\w+)(?:\?|\[\])?\s*(.*)$/.exec(line);
    if (field) fields.set(field[1], { type: field[2], rest: field[3] });
  }
  schemaModels.set(match[1], fields);
}
let unpairedRelations = [];
let invalidRelationKeys = [];
for (const [modelName, fields] of schemaModels) {
  for (const [fieldName, field] of fields) {
    if (!schemaModels.has(field.type) || !field.rest.includes("@relation")) continue;
    const relationName = /@relation\("([^"]+)"/.exec(field.rest)?.[1] || null;
    const opposite = [...(schemaModels.get(field.type) || new Map()).values()].some((candidate) =>
      candidate.type === modelName && (!relationName || candidate.rest.includes(`@relation("${relationName}"`)));
    if (!opposite) unpairedRelations.push(`${modelName}.${fieldName}`);
    const localFields = /fields:\s*\[([^\]]+)\]/.exec(field.rest)?.[1];
    const referencedFields = /references:\s*\[([^\]]+)\]/.exec(field.rest)?.[1];
    if (localFields) {
      const localNames = localFields.split(",").map((item) => item.trim());
      const referenceNames = (referencedFields || "").split(",").map((item) => item.trim());
      if (localNames.some((name) => !fields.has(name)) || !referenceNames.length || referenceNames.some((name) => !(schemaModels.get(field.type) || new Map()).has(name))) {
        invalidRelationKeys.push(`${modelName}.${fieldName}`);
      }
    }
  }
}
if (unpairedRelations.length) fail(`Prisma relations missing opposite fields: ${unpairedRelations.join(", ")}`);
else pass("All Prisma relation fields have matching opposite relations");
if (invalidRelationKeys.length) fail(`Prisma relation keys refer to missing fields: ${invalidRelationKeys.join(", ")}`);
else pass("All explicit Prisma relation keys reference defined fields");
if (!schema.includes('model PropertyManagementService') || !schema.includes('model ServiceEnquiry')) fail("Property-management services are not modeled separately from marketplace listings");
else pass("Property-management services and their enquiries have separate database models");

const publicListings = read("src/app/api/listings/route.ts");
if (!publicListings.includes('where: { status: "PUBLISHED" }') || /sellerId\s*:\s*body\.sellerId/.test(publicListings)) fail("Public listing API must expose published listings only and must not trust sellerId from the client");
else pass("Public listing API filters unpublished listings and derives seller identity server-side");
const adminListings = read("src/app/api/admin/listings/route.ts");
if (!adminListings.includes('requireAdminPermission("listings:create_for_seller")') || !adminListings.includes('status: "PENDING_REVIEW"')) fail("Admin-created listings are not permission-guarded and moderation-gated");
else pass("Admin listing creation requires permission and enters moderation");
const upload = read("src/app/api/upload/route.ts");
if (!upload.includes("ensureCurrentUser") || !read("src/lib/media/storage.ts").includes('`pending/${input.userId}/${mediaId}.')) fail("Uploads must be authenticated and keyed in the private pending area");
else pass("Media upload requires an authenticated user and private pending object key");
const mediaReview = read("src/app/api/admin/media/[id]/route.ts");
if (!mediaReview.includes('"media:approve"') || !mediaReview.includes("R2_PUBLIC_BUCKET_NAME") || !mediaReview.includes("R2_BUCKET_NAME")) fail("Media approval does not enforce role permission and separate R2 buckets");
else pass("Media approval is permission-gated and requires distinct private/public buckets");

const team = read("src/app/api/admin/team/[id]/route.ts");
if (!team.includes("requireOwner()") || !team.includes("assertNotOwnerClerkId") || !team.includes("target.isOwner")) fail("Administrator team management does not protect the designated Owner");
else pass("Administrator team changes are Owner-only and protect the Owner record");
const invitation = read("src/app/api/admin/invitations/route.ts");
if (!invitation.includes("requireOwner()") || !invitation.includes("ASSIGNABLE_ROLE_KEYS")) fail("Administrator invitations are not Owner-only or not restricted to assignable roles");
else pass("Administrator invitations are Owner-only and cannot grant OWNER");

if (existsSync("src/app/api/poc")) fail("POC API route directory is still present");
else pass("POC API route directory is retired");
if (existsSync("scripts/smoke.mjs")) fail("Obsolete POC smoke script is still present");
else pass("Obsolete POC CRUD smoke script is removed");
const packageJson = JSON.parse(read("package.json"));
if (packageJson.scripts?.["poc:smoke"]) fail("Obsolete POC smoke command remains in package scripts");
else pass("Obsolete POC smoke command is removed from package scripts");
if (!existsSync("prisma/poc-baseline.prisma") || !existsSync("prisma/migrations/20261113221212_poc_init/migration.sql")) fail("Historical POC baseline/migration must be preserved for safe migration diff");
else pass("Historical POC baseline and migration are preserved");

const envExample = read(".env.example");
for (const required of ["ENES_OWNER_CLERK_ID=", "R2_PUBLIC_BUCKET_NAME=", "RATE_LIMIT_HASH_SECRET=", "RESEND_FROM_EMAIL=", "ENES_ADMIN_EMAIL="]) {
  if (!envExample.split(/\r?\n/).some((line) => line.startsWith(required))) fail(`Environment placeholder missing: ${required}`);
}
if (failures.length) {
  console.error(`\n${failures.length} V6 static check(s) failed:`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("\nV6 static checks passed.");
