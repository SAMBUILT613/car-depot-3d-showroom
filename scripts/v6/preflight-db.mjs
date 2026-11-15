import "dotenv/config";
import { Pool } from "pg";

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error("V6 preflight stopped: database URL is missing.");
  process.exit(2);
}

const pool = new Pool({
  connectionString,
  max: 1,
  connectionTimeoutMillis: 15000,
  ssl: { rejectUnauthorized: true },
});

const baselineMigration = "20261113221212_poc_init";

const supportedProfiles = [
  {
    name: "Existing empty ENES prototype",
    tables: ["AnalyticsEvent", "Listing", "Message", "Report", "SavedSearch"],
  },
  {
    name: "Fresh POC baseline",
    tables: ["PocItem"],
  },
];

try {
  const result = await pool.query(`
    SELECT table_name, table_type
    FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name
  `);

  const migrationTable = result.rows.find(
    (row) => row.table_name === "_prisma_migrations"
  );

  if (!migrationTable || migrationTable.table_type !== "BASE TABLE") {
    throw new Error("The Prisma migration history table is missing or invalid.");
  }

  const applicationObjects = result.rows.filter(
    (row) => row.table_name !== "_prisma_migrations"
  );

  const unexpectedTypes = applicationObjects.filter(
    (row) => row.table_type !== "BASE TABLE"
  );

  if (unexpectedTypes.length) {
    throw new Error(
      `Unsupported public database objects: ${unexpectedTypes
        .map((row) => `${row.table_name} (${row.table_type})`)
        .join(", ")}`
    );
  }

  const actualTables = applicationObjects
    .map((row) => row.table_name)
    .sort();

  const profile = supportedProfiles.find(
    (candidate) =>
      JSON.stringify(candidate.tables) === JSON.stringify(actualTables)
  );

  if (!profile) {
    throw new Error(
      `Database does not match either reviewed starting state. Found: ${
        actualTables.join(", ") || "no application tables"
      }`
    );
  }

  const history = await pool.query(`
    SELECT migration_name, finished_at, rolled_back_at
    FROM "_prisma_migrations"
    ORDER BY started_at
  `);

  const unfinished = history.rows.filter(
    (row) => !row.finished_at && !row.rolled_back_at
  );

  if (unfinished.length) {
    throw new Error("An unfinished migration exists. Resolve it before proceeding.");
  }

  const applied = history.rows.filter(
    (row) => row.finished_at && !row.rolled_back_at
  );

  if (
    applied.length !== 1 ||
    applied[0].migration_name !== baselineMigration
  ) {
    throw new Error(
      "Migration history is not the verified single POC baseline."
    );
  }

  for (const table of actualTables) {
    const count = await pool.query(
      `SELECT count(*)::text AS row_count FROM public."${table}"`
    );

    if (BigInt(count.rows[0].row_count) !== 0n) {
      throw new Error(
        `Table ${table} contains ${count.rows[0].row_count} row(s). No migration is permitted.`
      );
    }

    console.log(`PASS ${table}: empty`);
  }

  console.log("");
  console.log("V6 database preflight passed.");
  console.log(`Recognised state: ${profile.name}`);
  console.log("The original POC migration history is preserved.");
  console.log("No database writes were performed.");
} catch (error) {
  console.error("V6 preflight stopped safely.");
  console.error(error instanceof Error ? error.message : "Unknown database error");
  process.exitCode = 4;
} finally {
  await pool.end();
}
