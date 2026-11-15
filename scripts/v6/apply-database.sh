#!/bin/sh
set -eu
cd "$(dirname "$0")/../.."

if [ "${ENES_V6_APPLY_DATABASE:-}" != "YES" ]; then
  echo "Database changes were not applied."
  echo "Review the migration and backup first."
  echo "Explicit application requires ENES_V6_APPLY_DATABASE=YES."
  exit 0
fi

echo "Checking designated Owner configuration..."

node --input-type=module -e '
import "dotenv/config";
if (!/^user_[A-Za-z0-9]+$/.test(process.env.ENES_OWNER_CLERK_ID?.trim() || "")) {
  console.error("Application stopped: valid ENES_OWNER_CLERK_ID is required.");
  process.exit(2);
}
console.log("PASS: Designated Owner configuration is present.");
'

echo
echo "Checking the actual database starting state..."
node scripts/v6/preflight-db.mjs

echo
echo "Checking the pre-migration backup..."
node scripts/v6/verify-backup.mjs

echo
echo "Checking the migration SQL..."
node scripts/v6/validate-migration.mjs

echo
echo "Applying the V6 migration..."
npx prisma migrate deploy

echo
echo "Generating Prisma Client..."
npx prisma generate

echo
echo "Seeding system roles and permissions..."
node scripts/seed-rbac.mjs

echo
echo "Verifying the complete V6 database..."
node scripts/v6/preflight-post-migrate.mjs

echo
echo "V6 database migration and verification completed."
