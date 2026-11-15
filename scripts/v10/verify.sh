#!/usr/bin/env bash
set -euo pipefail

printf '\nENES V10 source verification\n\n'
node scripts/v10/verify-source.mjs

printf '\nPrisma client generation and schema validation\n'
npx prisma generate
npx prisma validate

printf '\nTypeScript verification (non-incremental)\n'
npx tsc --noEmit --incremental false

printf '\nENES V10 static verification passed.\n'
printf 'No database migration or Cloudflare deployment was performed.\n'
