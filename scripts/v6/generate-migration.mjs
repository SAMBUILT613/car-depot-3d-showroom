import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const migrationDir = "prisma/migrations/20261114150000_v6_marketplace_foundation";
const outputFile = `${migrationDir}/migration.sql`;
const baseline = "prisma/poc-baseline.prisma";
const target = "prisma/schema.prisma";

if (existsSync(outputFile)) {
  console.error("Migration already exists. Refusing to overwrite it.");
  process.exit(2);
}

if (!existsSync(baseline) || !existsSync(target)) {
  console.error("POC baseline or V6 target schema is missing.");
  process.exit(2);
}

const models = [...readFileSync(target, "utf8").matchAll(/^model\s+(\w+)\s*\{/gm)]
  .map((match) => match[1]);

if (models.length !== 37) {
  console.error(`Expected 37 Prisma models; found ${models.length}.`);
  process.exit(2);
}

const cli = process.platform === "win32" ? "npx.cmd" : "npx";

const result = spawnSync(
  cli,
  [
    "prisma",
    "migrate",
    "diff",
    "--from-schema=prisma/poc-baseline.prisma",
    "--to-schema=prisma/schema.prisma",
    "--script",
  ],
  {
    encoding: "utf8",
    maxBuffer: 30 * 1024 * 1024,
  },
);

if (result.error || result.status !== 0) {
  console.error("Prisma migration generation failed.");
  console.error(result.error?.message || result.stderr);
  process.exit(3);
}

let sql = result.stdout.trim();

const originalDrops = [...sql.matchAll(/\bDROP\s+(?:TABLE|TYPE|SCHEMA|SEQUENCE|INDEX|FUNCTION|TRIGGER)\b[^;]*;/gi)]
  .map((match) => match[0].trim());

if (
  originalDrops.length !== 1 ||
  !/^DROP TABLE "PocItem";$/i.test(originalDrops[0])
) {
  console.error("Unexpected destructive SQL in Prisma diff. No migration written.");
  process.exit(4);
}

if (/\bALTER\s+TABLE\b[^;]*\bDROP\s+(?:COLUMN|CONSTRAINT)\b|\bTRUNCATE\b|\bDELETE\s+FROM\b/i.test(sql)) {
  console.error("Unexpected destructive SQL detected. No migration written.");
  process.exit(5);
}

const missing = models.filter(
  (name) => !new RegExp(`CREATE TABLE\\s+"${name}"\\s*\\(`).test(sql),
);

if (missing.length) {
  console.error(`Missing V6 table creation statements: ${missing.join(", ")}`);
  process.exit(6);
}

const legacyTables = [
  "AnalyticsEvent",
  "Message",
  "Report",
  "SavedSearch",
  "Listing",
  "PocItem",
];

const allowedTables = legacyTables.map((name) => `'${name}'`).join(", ");

const lockAndCheck = legacyTables.map((name) => `
  IF to_regclass('public."${name}"') IS NOT NULL THEN
    EXECUTE format(
      'LOCK TABLE %I.%I IN ACCESS EXCLUSIVE MODE',
      'public',
      '${name}'
    );

    EXECUTE format(
      'SELECT count(*) FROM %I.%I',
      'public',
      '${name}'
    ) INTO table_rows;

    IF table_rows <> 0 THEN
      RAISE EXCEPTION
        'ENES V6 refused to retire ${name}: table contains % row(s).',
        table_rows;
    END IF;
  END IF;
`).join("\n");

const retirement = legacyTables
  .map((name) => `DROP TABLE IF EXISTS "${name}";`)
  .join("\n");

sql = sql.replace(/^DROP TABLE "PocItem";\s*$/m, "").trim();

if (sql.includes('DROP TABLE "PocItem"')) {
  console.error("Could not safely remove original POC drop statement.");
  process.exit(7);
}

const guard = `
-- ENES V6 guarded reconciliation.
-- Only the five inspected empty prototype tables and optional empty PocItem
-- may be retired. The original Prisma migration history is preserved.
BEGIN;

DO $enes_v6_guard$
DECLARE
  table_rows BIGINT;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM "_prisma_migrations"
    WHERE migration_name = '20261113221212_poc_init'
      AND finished_at IS NOT NULL
      AND rolled_back_at IS NULL
  ) THEN
    RAISE EXCEPTION 'ENES V6 requires the successfully applied original POC migration.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      AND table_name <> '_prisma_migrations'
      AND table_name NOT IN (${allowedTables})
  ) THEN
    RAISE EXCEPTION 'ENES V6 found an unexpected public table. Migration refused.';
  END IF;

${lockAndCheck}
END
$enes_v6_guard$;

${retirement}

`;

const finalSql = `${guard}\n${sql}\n\nCOMMIT;\n`;

mkdirSync(dirname(outputFile), { recursive: true });
writeFileSync(outputFile, finalSql, { flag: "wx" });

console.log(`V6 migration generated: ${outputFile}`);
console.log(`V6 tables created: ${models.length}`);
console.log("Legacy tables are locked and checked for rows before retirement.");
console.log("Migration is wrapped in BEGIN/COMMIT.");
console.log("No database changes were applied.");
