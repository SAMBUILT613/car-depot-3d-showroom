#!/bin/sh
set -eu
cd "$(dirname "$0")/../.."

echo "ENES V7 source checks"
node --check scripts/v7/verify-source.mjs
node scripts/v7/verify-source.mjs

echo
echo "ENES V6 + V7 application verification"
sh scripts/v6/verify-source.sh

echo
echo "V7 verification completed. No Cloudflare deployment was performed."
