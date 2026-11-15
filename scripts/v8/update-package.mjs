import { readFileSync, writeFileSync } from "node:fs";

const path = "package.json";
const pkg = JSON.parse(readFileSync(path, "utf8"));
pkg.scripts ??= {};
const additions = {
  "v8:verify": "sh scripts/v8/verify.sh",
  "v8:preflight": "node scripts/v8/preflight.mjs --production",
};
for (const [name, command] of Object.entries(additions)) {
  if (pkg.scripts[name] && pkg.scripts[name] !== command) {
    throw new Error(`Refusing to replace an existing custom package script: ${name}`);
  }
  pkg.scripts[name] = command;
}
writeFileSync(path, `${JSON.stringify(pkg, null, 2)}\n`);
console.log("PASS Added V8 npm commands without replacing existing package settings or dependencies.");
