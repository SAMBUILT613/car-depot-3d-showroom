#!/usr/bin/env sh
set -eu

printf '\nENES V9 source verification\n'
node scripts/v9/verify-source.mjs

printf '\nPrisma schema validation\n'
npx prisma validate

printf '\nTypeScript verification (non-incremental)\n'
npx tsc --noEmit --incremental false

printf '\nENES V9 static verification passed.\n'
printf 'No database migration or Cloudflare deployment was performed.\n'
