import { closeSync, openSync, readSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
const directory = ".v6-backups";
let files = [];
try { files = readdirSync(directory).filter((name) => name.startsWith("enes-pre-v6-") && name.endsWith(".dump")); } catch {}
files = files.map((name) => ({ name, path: join(directory, name) })).sort((a, b) => statSync(b.path).mtimeMs - statSync(a.path).mtimeMs);
const latest = files[0];
if (!latest) {
  console.error("V6 database apply stopped: no local pre-migration backup was found. Run prepare-database.sh first.");
  process.exit(2);
}
const stat = statSync(latest.path);
const ageMs = Date.now() - stat.mtimeMs;
if (stat.size < 5 || ageMs > 24 * 60 * 60 * 1000) {
  console.error("V6 database apply stopped: latest backup is empty or older than 24 hours. Prepare a fresh backup.");
  process.exit(3);
}
const fileDescriptor = openSync(latest.path, "r");
const headerBuffer = Buffer.alloc(5);
try { readSync(fileDescriptor, headerBuffer, 0, 5, 0); } finally { closeSync(fileDescriptor); }
const header = headerBuffer.toString("ascii");
if (header !== "PGDMP") {
  console.error("V6 database apply stopped: latest backup does not have a valid PostgreSQL custom-dump header.");
  process.exit(4);
}
console.log(`Pre-migration backup verified: ${latest.name} (${stat.size} bytes).`);
