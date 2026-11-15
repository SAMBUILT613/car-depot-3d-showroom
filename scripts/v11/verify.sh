#!/usr/bin/env bash
set -euo pipefail

printf '\nENES V11 source verification\n\n'
node scripts/v11/verify-source.mjs

printf '\nRe-running the complete V10 CMS, Prisma and TypeScript verification\n'
npm run v10:verify

printf '\nENES V11 verification passed.\n'
printf 'No database migration, database seed or Cloudflare deployment was performed.\n'
