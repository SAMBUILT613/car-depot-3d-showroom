import "dotenv/config";
import { spawnSync } from "node:child_process";
import {
  chmodSync,
  closeSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  readSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";

const value = process.env.DIRECT_URL;

if (!value) {
  console.error("Backup stopped: DIRECT_URL is required.");
  process.exit(2);
}

let url;

try {
  url = new URL(value);
} catch {
  console.error("Backup stopped: DIRECT_URL is not a valid PostgreSQL URL.");
  process.exit(2);
}

if (!["postgres:", "postgresql:"].includes(url.protocol)) {
  console.error("Backup stopped: DIRECT_URL must use PostgreSQL.");
  process.exit(2);
}

const host = url.hostname;
const port = url.port || "5432";
const user = decodeURIComponent(url.username);
const database = decodeURIComponent(url.pathname.replace(/^\//, ""));
const password = decodeURIComponent(url.password);

if (!host || !user || !database || !password) {
  console.error("Backup stopped: DIRECT_URL is missing required connection details.");
  process.exit(2);
}

const pgBin = "/usr/lib/postgresql/18/bin";

const pgDump =
  process.env.PG_DUMP_BIN ||
  (existsSync(join(pgBin, "pg_dump")) ? join(pgBin, "pg_dump") : "pg_dump");

const pgRestore =
  process.env.PG_RESTORE_BIN ||
  (existsSync(join(pgBin, "pg_restore")) ? join(pgBin, "pg_restore") : "pg_restore");

const project = resolve(process.cwd());
const backupDir = join(project, ".v6-backups");

mkdirSync(backupDir, { recursive: true, mode: 0o700 });
chmodSync(backupDir, 0o700);

const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupFile = join(backupDir, `enes-pre-v6-${timestamp}.dump`);
const temporaryBackupFile = `${backupFile}.partial`;

const tempDir = mkdtempSync(join(tmpdir(), "enes-v6-pgpass-"));
const passFile = join(tempDir, "pgpass");

const escapePgpass = (input) =>
  input.replace(/\\/g, "\\\\").replace(/:/g, "\\:");

try {
  writeFileSync(
    passFile,
    `${escapePgpass(host)}:${escapePgpass(port)}:${escapePgpass(database)}:${escapePgpass(user)}:${escapePgpass(password)}\n`,
    { mode: 0o600 },
  );

  console.log("Using PostgreSQL client tools:");
  console.log(pgDump);
  console.log(pgRestore);
  console.log("Starting database backup...");

  const dumpResult = spawnSync(
    pgDump,
    [
      "--host", host,
      "--port", port,
      "--username", user,
      "--dbname", database,
      "--format=custom",
      "--no-owner",
      "--no-acl",
      "--file", temporaryBackupFile,
    ],
    {
      encoding: "utf8",
      env: {
        ...process.env,
        PGPASSFILE: passFile,
        PGSSLMODE: url.searchParams.get("sslmode") || "require",
      },
      maxBuffer: 10 * 1024 * 1024,
    },
  );

  if (dumpResult.error) throw dumpResult.error;

  if (dumpResult.status !== 0) {
    throw new Error(
      dumpResult.stderr ||
      `pg_dump exited with status ${dumpResult.status}`,
    );
  }

  if (!existsSync(temporaryBackupFile)) {
    throw new Error("pg_dump reported success but produced no backup file.");
  }

  const backupStat = statSync(temporaryBackupFile);

  if (backupStat.size < 5) {
    throw new Error("The generated backup is empty or incomplete.");
  }

  const descriptor = openSync(temporaryBackupFile, "r");
  const header = Buffer.alloc(5);

  try {
    readSync(descriptor, header, 0, 5, 0);
  } finally {
    closeSync(descriptor);
  }

  if (header.toString("ascii") !== "PGDMP") {
    throw new Error("The generated file does not have a valid PostgreSQL archive header.");
  }

  console.log("Backup file created. Checking archive readability...");

  const restoreResult = spawnSync(
    pgRestore,
    ["--list", temporaryBackupFile],
    {
      encoding: "utf8",
      maxBuffer: 30 * 1024 * 1024,
    },
  );

  if (restoreResult.error) throw restoreResult.error;

  if (restoreResult.status !== 0) {
    throw new Error(
      restoreResult.stderr ||
      "pg_restore could not read the generated archive.",
    );
  }

  const entries = (restoreResult.stdout || "")
    .split(/\r?\n/)
    .filter((line) => /^\d+;\s/.test(line));

  if (entries.length === 0) {
    throw new Error("The backup archive contains no verifiable database entries.");
  }

  renameSync(temporaryBackupFile, backupFile);

  // Remove only old zero-byte failed backup artifacts, after a valid backup exists.
  for (const name of readdirSync(backupDir)) {
    if (!name.startsWith("enes-pre-v6-") || !name.endsWith(".dump")) continue;

    const oldFile = join(backupDir, name);

    if (oldFile === backupFile) continue;

    if (statSync(oldFile).size === 0) {
      unlinkSync(oldFile);
      console.log(`Removed incomplete zero-byte backup artifact: ${name}`);
    }
  }

  console.log("PASS: Database backup completed.");
  console.log("PASS: PostgreSQL archive format verified.");
  console.log(`PASS: pg_restore read ${entries.length} archive entries.`);
  console.log(`Backup file: ${backupFile}`);
  console.log(`Backup size: ${(statSync(backupFile).size / 1024 / 1024).toFixed(2)} MB`);
  console.log("No database schema or data was modified.");
} catch (error) {
  if (existsSync(temporaryBackupFile)) {
    unlinkSync(temporaryBackupFile);
  }

  console.error("Database backup failed. Migration must not proceed.");
  console.error(error instanceof Error ? error.message : "Unknown backup error");
  process.exitCode = 3;
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}
