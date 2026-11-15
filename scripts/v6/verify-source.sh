#!/bin/sh
set -eu
cd "$(dirname "$0")/../.."

node scripts/v6/static-check.mjs
for script in scripts/v6/*.mjs scripts/seed-rbac.mjs prisma/seed.mjs; do
  node --check "$script"
done
for script in scripts/v6/*.sh; do
  sh -n "$script"
done

echo "Static source and shell syntax checks passed."
if [ -x node_modules/.bin/prisma ]; then
  node_modules/.bin/prisma validate
else
  echo "SKIP Prisma validation: local Prisma CLI is not installed."
fi
if [ -x node_modules/.bin/tsc ]; then
  node_modules/.bin/tsc --noEmit
else
  echo "SKIP TypeScript check: local TypeScript compiler is not installed."
fi
if [ -x node_modules/.bin/next ]; then
  node_modules/.bin/next build
else
  echo "SKIP Next.js production build: local Next.js dependency is not installed."
fi
