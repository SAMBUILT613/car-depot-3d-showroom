# ENES Properties V8 — Production readiness and security hardening

## Scope

V8 is delivered in three coordinated batches:

- **V8.1 — Security hardening:** same-origin protection for unsafe API writes, browser security headers, noindex/no-store handling for private responses, and safer R2 upload errors.
- **V8.2 — Public discoverability:** remove the unconfirmed domain fallback and generate robots/sitemap metadata from the approved URL and published public records only.
- **V8.3 — Release operations:** production configuration preflight, source verification, protected backups and rollback, plus a launch checklist.

It builds on the verified V7 marketplace without changing the product's approved design or database architecture.

This release does **not** change the Prisma schema or migration history, run database commands, create test listings, enable payments or fees, configure a domain, change DNS, or deploy to Cloudflare.

## Apply and verify

1. Keep `.env.local` and all existing database backups in the project. They are not part of the V8 update package.
2. From the project root, run the supplied `V8-apply.sh` script. It creates a timestamped source backup before copying files.
3. Run `sh scripts/v8/verify.sh`. This performs V8 source assertions, Prisma schema validation, and TypeScript checking. It does not migrate or write to the database.
4. Before a production release, run `npm run v8:preflight` in an environment containing the intended production configuration. It checks names and formats only; it never prints secret values.

## Required production settings

The preflight requires:

- `NEXT_PUBLIC_APP_URL` — the exact HTTPS origin approved for ENES. Do not enter a guessed domain.
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` — Clerk live keys.
- `ENES_OWNER_CLERK_ID` — the designated Owner's Clerk user ID.
- `RATE_LIMIT_HASH_SECRET` — at least 32 characters, unique to ENES.
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY`.
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_BUCKET_NAME`, and `R2_PUBLIC_URL`.

The private pending-media bucket and public approved-media bucket must be different. `wrangler.jsonc` must retain the configured `HYPERDRIVE` binding. The production preflight warns—but does not block—when Ably, Resend, or Mapbox settings are absent.

For Cloudflare Worker secrets, inspect configured **names only** with `npx wrangler secret list`. Ensure the required private values are set in the correct Worker environment; do not paste their values into chat or commit them. Public `NEXT_PUBLIC_*` values must be available to the production build/runtime as required by the Cloudflare deployment setup.

## Release checks before any public launch

- Confirm the production origin and Clerk production instance with the Owner.
- Confirm the Cloudflare Worker has the correct Hyperdrive binding and production variables/secrets.
- Confirm private and public R2 buckets are separate and the public media URL points only to approved media.
- Sign in using the configured Owner account and confirm `/admin` access; confirm ordinary member accounts cannot access admin routes.
- Submit one owner-approved test listing, verify it remains private while pending, approve it, and confirm only the published listing and approved media are publicly visible.
- Confirm the WhatsApp action uses the listing's actual seller contact and opens the expected chat.
- Exercise a cross-origin API write and confirm it is rejected; verify same-origin listing, report, enquiry, saved-listing and property-request flows still work.
- Confirm private dashboard/admin/API responses are not cached, then verify real analytics only after genuine visitor activity.
- Review the actual privacy, terms, safety and contact copy with the Owner before making the site public. V8 does not add legal representations.

## Notes and limitations

- The sitemap and robots metadata receive public cache headers to reduce repeated crawl load. The sitemap is generated only when `NEXT_PUBLIC_APP_URL` is configured. It includes fixed public discovery pages, published listings, and published services from active providers; it does not include drafts, private requests, dashboard or admin pages.
- `X-Frame-Options: DENY` and the other security headers are set globally. A strict Content Security Policy and HSTS are not imposed in this release because the final approved domain and all external script/connect origins have not been confirmed; adding them prematurely could break Clerk, Turnstile, Mapbox, Sentry or realtime features.
- The origin guard is intended for the first-party browser application. Any future trusted external client or webhook needs a separately designed authentication contract rather than an origin exception.
- This package is not a Cloudflare runtime test and does not prove that production secrets, external services, DNS, or domain routing are correct. No deployment has been performed.
