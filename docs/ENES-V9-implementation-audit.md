# ENES Properties — V9 implementation and release audit

## Applied in this V9.2 source patch
- Removed the module-global PrismaClient and `pg.Pool` cache from `src/lib/db.ts`.
- Prisma client creation is now wrapped in React's request/render cache, which shares it within a server render; outside that cache scope, each Prisma operation gets a fresh client.
- The `pg` pool is bounded to one connection and one use (`max: 1`, `maxUses: 1`), following OpenNext's Hyperdrive guidance. Hyperdrive remains responsible for upstream pooling.
- V9 source verification now checks that the global Prisma client/pool cache has not returned and that the Hyperdrive binding remains in use.

## Applied in V9.1
- Admin media approve/reject now uses database compare-and-set transitions so concurrent moderators cannot both change a pending media record.
- Approval copies the private object to the approved bucket before the database transition, and removes the pending object only after the transition succeeds.
- Concurrent approval attempts share the deterministic object key; a losing request checks the winning database record and does not delete the winning public object.
- V9 static verification checks the media race protections, private preview path, public sitemap scope, origin guard and release scripts.
- V9 verification uses `tsc --noEmit --incremental false` to avoid stale `.tsbuildinfo` / generated Next type cache failures.
- No database schema migration is introduced.

## Explicitly left for the owner
The Terms, Privacy and Safety pages remain unchanged. They contain owner/legal-review placeholders. No legal claims, retention periods, privacy contact details, dispute terms, safety promises or support email have been invented. The owner should provide approved copy and obtain appropriate Nigerian legal review before public launch.

## Not claimed as verified
- Cloudflare Worker runtime behaviour and Prisma/Hyperdrive connection lifecycle. The V9.2 change aligns source structure with current OpenNext/Cloudflare guidance, but it is not a substitute for running the Worker and testing repeated requests against Hyperdrive.
- Real R2 read/write permissions, bucket CORS, object delivery and public-cache behaviour.
- Clerk production instance, production domain, callback/redirect allowlists or Cloudflare production secrets.
- End-to-end user/admin role matrix, accessibility, responsive browser testing, backup restoration and incident monitoring.
- Resend, Ably, Mapbox, Turnstile and Sentry live integrations.
- Real listing inventory and public launch readiness.

## Safe next commands on the owner's Linux workstation
1. Back up the working tree before installing the patch.
2. Apply the patch archive preserving paths.
3. Run `npm run v9:verify`.
4. Run `npm run cf:build` only after local dependencies and required build-time environment are present. This creates a local Worker build artifact; it does not deploy.
5. Inspect the resulting Worker bundle and run an isolated, non-public preview only after confirming the preview cannot publish or mutate production data.

Do not run database migrations, `wrangler deploy`, DNS changes, payment activation or production launch as part of this audit.
