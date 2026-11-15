#!/usr/bin/env bash
set -euo pipefail

bash scripts/v11/verify.sh
printf '\nBuilding the Cloudflare Worker bundle\n'
npm run cf:build
printf '\nENES V11 release build completed.\n'
printf 'This command does not deploy the Worker or change DNS.\n'
