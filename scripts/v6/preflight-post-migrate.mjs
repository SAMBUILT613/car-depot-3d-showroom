import "dotenv/config";
import { Pool } from "pg";
import { readFileSync } from "node:fs";

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
const ownerId = process.env.ENES_OWNER_CLERK_ID?.trim();

if (!connectionString) {
  console.error("Post-migration verification stopped: database URL missing.");
  process.exit(2);
}

if (!/^user_[A-Za-z0-9]+$/.test(ownerId || "")) {
  console.error("Post-migration verification stopped: designated Owner ID is missing or invalid.");
  process.exit(2);
}

const schema = readFileSync("prisma/schema.prisma", "utf8");
const seed = readFileSync("scripts/seed-rbac.mjs", "utf8");

const models = [...schema.matchAll(/^model\s+(\w+)\s*\{/gm)]
  .map((match) => match[1]);

const permissionBlock = seed.match(/const PERMISSIONS = \[([\s\S]*?)\];/);
const roleBlock = seed.match(/const ROLE_DEFINITIONS = \[([\s\S]*?)\n\];/);

if (!permissionBlock || !roleBlock || models.length !== 37) {
  console.error("Post-migration verification stopped: schema or RBAC source is unexpected.");
  process.exit(2);
}

const expectedPermissions = [...permissionBlock[1].matchAll(/"([^"]+)"/g)]
  .map((match) => match[1]);

const expectedRoles = [...roleBlock[1].matchAll(/\{\s*key:\s*"([^"]+)"/g)]
  .map((match) => match[1]);

const expectedRolePermissionCounts = {
  OWNER: 51,
  SUPER_ADMIN: 45,
  OPERATIONS_MANAGER: 36,
  LISTING_MODERATOR: 17,
  CONTENT_MANAGER: 4,
  VERIFICATION_OFFICER: 5,
  SUPPORT_AGENT: 9,
  ANALYST: 7,
  PROPERTY_MANAGER_ADMIN: 13,
};

const expectedMigrationNames = [
  "20261113221212_poc_init",
  "20261114150000_v6_marketplace_foundation",
];

const pool = new Pool({
  connectionString,
  max: 1,
  connectionTimeoutMillis: 15000,
  ssl: { rejectUnauthorized: true },
});

function requireCheck(condition, message) {
  if (!condition) throw new Error(message);
  console.log(`PASS ${message}`);
}

function requireSameSet(actual, expected, label) {
  const left = [...actual].sort();
  const right = [...expected].sort();

  const same =
    left.length === right.length &&
    left.every((value, index) => value === right[index]);

  if (!same) {
    const missing = right.filter((value) => !left.includes(value));
    const extra = left.filter((value) => !right.includes(value));
    throw new Error(`${label}. Missing: ${missing.join(", ") || "none"}. Extra: ${extra.join(", ") || "none"}.`);
  }

  console.log(`PASS ${label}`);
}

try {
  const objects = await pool.query(`
    SELECT table_name, table_type
    FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name
  `);

  const unexpectedObjectTypes = objects.rows.filter(
    (row) => row.table_type !== "BASE TABLE"
  );

  requireCheck(
    unexpectedObjectTypes.length === 0,
    "Public schema contains no unexpected views or table objects."
  );

  const actualTables = objects.rows.map((row) => row.table_name);
  const expectedTables = [...models, "_prisma_migrations"];

  requireSameSet(
    actualTables,
    expectedTables,
    "Live database contains exactly the 37 V6 models and migration history table."
  );

  requireCheck(
    !actualTables.includes("PocItem"),
    "Obsolete POC table is absent."
  );

  const history = await pool.query(`
    SELECT migration_name, finished_at, rolled_back_at
    FROM "_prisma_migrations"
    ORDER BY started_at
  `);

  const unfinished = history.rows.filter(
    (row) => !row.finished_at && !row.rolled_back_at
  );

  requireCheck(
    unfinished.length === 0,
    "No unfinished database migration exists."
  );

  const applied = history.rows
    .filter((row) => row.finished_at && !row.rolled_back_at)
    .map((row) => row.migration_name);

  requireSameSet(
    applied,
    expectedMigrationNames,
    "Original POC and V6 migrations are both recorded successfully."
  );

  const permissions = await pool.query(`
    SELECT key FROM "Permission" ORDER BY key
  `);

  requireSameSet(
    permissions.rows.map((row) => row.key),
    expectedPermissions,
    "All 51 RBAC permissions match the application seed."
  );

  const roles = await pool.query(`
    SELECT key, "isSystem"
    FROM "Role"
    ORDER BY key
  `);

  requireSameSet(
    roles.rows.map((row) => row.key),
    expectedRoles,
    "All nine intended system roles exist."
  );

  requireCheck(
    roles.rows.every((row) => row.isSystem === true),
    "All nine seeded roles are marked as system roles."
  );

  const mappings = await pool.query(`
    SELECT r.key, count(rp."permissionId")::integer AS permission_count
    FROM "Role" r
    LEFT JOIN "RolePermission" rp ON rp."roleId" = r.id
    GROUP BY r.key
    ORDER BY r.key
  `);

  for (const [roleKey, expectedCount] of Object.entries(expectedRolePermissionCounts)) {
    const role = mappings.rows.find((row) => row.key === roleKey);

    requireCheck(
      role && role.permission_count === expectedCount,
      `${roleKey} has the expected ${expectedCount} permissions.`
    );
  }

  const totalMappings = mappings.rows.reduce(
    (total, row) => total + row.permission_count,
    0
  );

  requireCheck(
    totalMappings === 187,
    "The complete seeded role matrix contains exactly 187 assignments."
  );

  const administrators = await pool.query(`
    SELECT
      (SELECT count(*)::integer FROM "AdminUser") AS admin_count,
      (SELECT count(*)::integer FROM "AdminUserRole") AS assignment_count
  `);

  requireCheck(
    administrators.rows[0].admin_count === 0 &&
    administrators.rows[0].assignment_count === 0,
    "RBAC seed has not created administrators or granted ownership."
  );

  console.log("");
  console.log("V6 post-migration verification passed.");
  console.log("The configured Owner identity is syntactically valid.");
  console.log("Owner provisioning remains reserved for the configured Clerk identity.");
} catch (error) {
  console.error("");
  console.error(
    "V6 post-migration verification failed:",
    error instanceof Error ? error.message : "Unknown error"
  );
  process.exitCode = 3;
} finally {
  await pool.end();
}
