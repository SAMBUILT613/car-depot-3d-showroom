# ENES V9.3 — Administrator invitation concurrency hardening

## Scope

This patch makes invitation acceptance and revocation mutually exclusive through conditional database updates. Acceptance claims only a still-pending, unexpired invitation addressed to the currently verified Clerk email, inside the same database transaction that provisions administrator access and records the audit event. Revocation only changes a still-pending invitation and reports a conflict if another operation already changed its state.

## Why

The prior implementation read a pending invitation and later updated it unconditionally. Two overlapping requests could therefore race: an acceptance could overwrite a revocation, or a revocation could overwrite an acceptance. Conditional `updateMany` operations use the database as the concurrency arbiter.

## Files

- `src/app/api/admin/invitations/accept/route.ts`
- `src/app/api/admin/invitations/[id]/route.ts`
- `scripts/v9/verify-source.mjs`

## Verification

The V9 source verifier now includes four invitation concurrency assertions. Expected result: 30/30 source checks. Run `npm run v9:verify` on the project to additionally run Prisma schema validation and TypeScript verification.

## Boundaries

No Prisma schema or migration changes, package upgrades, secret changes, DNS changes, Cloudflare deployment, payments, or legal page edits are included. Source assertions are not a substitute for live database concurrency testing; the latter remains pending in a controlled environment.
