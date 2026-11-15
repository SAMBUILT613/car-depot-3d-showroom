# ENES Properties — Netlify hosting preparation

This preparation is intended for the isolated `enesproperties-netlify` working copy only.

## Runtime changes

- Netlify's maintained Next.js OpenNext adapter is auto-detected; do not pin a plugin or set a static publish directory.
- Node.js 22 is selected for builds.
- The Prisma runtime no longer imports the Cloudflare Hyperdrive binding.
- The Prisma client and a small PostgreSQL pool are reused per warm Node.js function instance.
- `DATABASE_URL` must be configured in Netlify as a Neon connection URL appropriate for the Node `pg` adapter. Keep `DIRECT_URL` for Prisma CLI DDL operations; do not run migrations as part of deployment.

## Required Netlify environment variables

Configure the runtime/build variables from the local private `.env.local` in Netlify's dashboard. Never commit `.env.local` or paste its values into chat. At minimum, review:

- `DATABASE_URL`
- `DIRECT_URL` (for Prisma CLI tasks only; normally not required by request runtime)
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `ENES_OWNER_CLERK_ID`
- `RATE_LIMIT_HASH_SECRET`
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`
- `R2_PUBLIC_BUCKET_NAME`
- `R2_PUBLIC_URL`
- `TURNSTILE_SECRET_KEY`
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
- `ABLY_API_KEY` (if enabled)
- `RESEND_API_KEY` and `RESEND_FROM_EMAIL` (if email is enabled)
- `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` (if maps are enabled)

Set `NEXT_PUBLIC_APP_URL` to the exact Netlify site origin. Update Clerk development allowed origins/redirect URLs to include that origin. Use development Clerk keys only for review, not production customers.

## Database and storage

- No schema change or migration is included.
- Keep Neon and both existing Cloudflare R2 buckets.
- Netlify runtime uses `DATABASE_URL` directly; Cloudflare Hyperdrive is not used in this copy.
- Do not expose `DATABASE_URL`, `DIRECT_URL`, `CLERK_SECRET_KEY`, or R2 secret credentials to browser variables.

## Build

- Build command: `npm run build`
- Node: 22
- Leave publish directory unset/adapter managed.
- Let Netlify's maintained Next.js adapter auto-detect the project.
