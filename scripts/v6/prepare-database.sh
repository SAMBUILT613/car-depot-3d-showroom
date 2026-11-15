#!/bin/sh
set -eu
cd "$(dirname "$0")/../.."

echo "ENES V6 database preparation — read checks and local backup only."
node scripts/v6/preflight-db.mjs
node scripts/v6/backup-db.mjs
if [ ! -s prisma/migrations/20261114150000_v6_marketplace_foundation/migration.sql ]; then
  node scripts/v6/generate-migration.mjs
else
  echo "An existing V6 migration file was found; it will not be overwritten."
fi
node scripts/v6/validate-migration.mjs
node scripts/v6/verify-backup.mjs

echo "Preparation complete. No database schema changes were applied."
echo "Review prisma/migrations/20261114150000_v6_marketplace_foundation/migration.sql before applying."
echo "To apply only after that review, explicitly set ENES_V6_APPLY_DATABASE=YES."
