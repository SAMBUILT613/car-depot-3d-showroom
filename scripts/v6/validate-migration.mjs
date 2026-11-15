import { readFileSync, statSync } from "node:fs";

const file = "prisma/migrations/20261114150000_v6_marketplace_foundation/migration.sql";
const schemaFile = "prisma/schema.prisma";

const fail = (message) => {
  console.error(`V6 migration validation failed: ${message}`);
  process.exit(2);
};

let sql;
let schema;

try {
  sql = readFileSync(file, "utf8");
  schema = readFileSync(schemaFile, "utf8");
} catch {
  fail("Migration SQL or Prisma schema is missing.");
}

const models = [...schema.matchAll(/^model\s+(\w+)\s*\{/gm)]
  .map((match) => match[1]);

const creates = [...sql.matchAll(/^CREATE TABLE\s+"([^"]+)"/gm)]
  .map((match) => match[1]);

const drops = [...sql.matchAll(/^DROP TABLE IF EXISTS\s+"([^"]+)";/gm)]
  .map((match) => match[1]);

const allowedDrops = [
  "AnalyticsEvent",
  "Listing",
  "Message",
  "PocItem",
  "Report",
  "SavedSearch",
];

const allDrops = [...sql.matchAll(
  /^\s*DROP\s+(?:TABLE|TYPE|SCHEMA|SEQUENCE|INDEX|FUNCTION|TRIGGER)\b[^;]*;/gim
)].map((match) => match[0].trim());

if (models.length !== 37) fail(`Expected 37 Prisma models; found ${models.length}.`);
if (creates.length !== 37) fail(`Expected 37 CREATE TABLE statements; found ${creates.length}.`);
if (new Set(creates).size !== creates.length) fail("Duplicate table creation detected.");

if (models.some((name) => !creates.includes(name))) {
  fail("One or more Prisma models are absent from the migration.");
}

if (creates.some((name) => !models.includes(name))) {
  fail("Migration creates a table not defined in the Prisma schema.");
}

if (
  drops.length !== allowedDrops.length ||
  [...drops].sort().join(",") !== [...allowedDrops].sort().join(",")
) {
  fail("The six permitted legacy table retirements do not match exactly.");
}

if (
  allDrops.length !== allowedDrops.length ||
  !allDrops.every((statement) => /^DROP TABLE IF EXISTS\s+"(?:AnalyticsEvent|Listing|Message|PocItem|Report|SavedSearch)";$/i.test(statement))
) {
  fail("Unexpected destructive DROP statement detected.");
}

if (!/^\s*BEGIN;\s*$/m.test(sql)) fail("Explicit transaction BEGIN is missing.");
if (!/COMMIT;\s*$/.test(sql)) fail("Explicit transaction COMMIT is missing.");
if (!sql.includes("$enes_v6_guard$")) fail("Database safety guard is missing.");

if (!sql.includes("20261113221212_poc_init")) {
  fail("Original POC migration-history check is missing.");
}

if (!sql.includes("ENES V6 found an unexpected public table")) {
  fail("Unexpected-table protection is missing.");
}

for (const table of allowedDrops) {
  if (!sql.includes(`IF to_regclass('public."${table}"') IS NOT NULL THEN`)) {
    fail(`Existence check is missing for ${table}.`);
  }

  if (!sql.includes(`ENES V6 refused to retire ${table}`)) {
    fail(`Non-empty table protection is missing for ${table}.`);
  }
}

const lockCount = (sql.match(/LOCK TABLE %I\.%I IN ACCESS EXCLUSIVE MODE/g) || []).length;
const rowGuardCount = (sql.match(/IF table_rows <> 0 THEN/g) || []).length;

if (lockCount !== 6) fail(`Expected six exclusive table locks; found ${lockCount}.`);
if (rowGuardCount !== 6) fail(`Expected six row-count guards; found ${rowGuardCount}.`);

if (/\bALTER\s+TABLE\b[^;]*\bDROP\s+(?:COLUMN|CONSTRAINT)\b/i.test(sql)) {
  fail("Destructive ALTER TABLE operation detected.");
}

if (/^\s*(?:TRUNCATE|DELETE\s+FROM)\b/im.test(sql)) {
  fail("Unexpected data deletion statement detected.");
}

if (/^\s*DROP TABLE[^;]*\bCASCADE\b/im.test(sql)) {
  fail("Cascading table drop detected.");
}

if (sql.includes('DROP TABLE "PocItem";')) {
  fail("Unmodified original POC drop statement remains.");
}

console.log("PASS: Exactly 37 V6 models are created.");
console.log("PASS: All six permitted legacy tables have guarded retirement.");
console.log("PASS: All six legacy tables are locked before row checks.");
console.log("PASS: Original POC migration history is preserved.");
console.log("PASS: Unexpected public tables are rejected.");
console.log("PASS: No unapproved destructive SQL was detected.");
console.log("PASS: Migration is wrapped in BEGIN/COMMIT.");

console.log(`V6 migration validation passed (${statSync(file).size} bytes).`);
