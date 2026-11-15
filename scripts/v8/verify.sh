#!/usr/bin/env sh
set +e
printf '\nENES V8 source verification\n'
node scripts/v8/verify-source.mjs
SOURCE_STATUS=$?
if [ "$SOURCE_STATUS" -ne 0 ]; then
  echo "V8 source verification failed."
  exit 1
fi
printf '\nPrisma schema validation\n'
npx prisma validate
PRISMA_STATUS=$?
if [ "$PRISMA_STATUS" -ne 0 ]; then
  echo "Prisma validation failed."
  exit 1
fi
printf '\nTypeScript verification\n'
npx tsc --noEmit
TSC_STATUS=$?
if [ "$TSC_STATUS" -ne 0 ]; then
  echo "TypeScript verification failed."
  exit 1
fi
echo "V8 verification passed. No database migration or Cloudflare deployment was performed."
