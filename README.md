# ENES V12 — Supabase Dashboard Function Bundle

This bundle contains four self-contained V12 Edge Functions for deployment through the Supabase Dashboard editor. It avoids local Supabase CLI use on the user's Linux system, where the available CLI launchers crashed with `Illegal instruction`.

## Protected release boundary

- Target project: `tlpznfgxpibzysuxpcmb` only.
- V12 functions are read-only public-data endpoints plus health and Clerk token verification. They do not create, update, publish, moderate, message, or administer marketplace records.
- No SQL migrations are included or required.
- Do not deploy these functions to the original Cloudflare Worker.
- Keep these local files as the canonical source. Supabase documents that Dashboard editor changes currently have no built-in version control or rollback; use this bundle as the source of truth and retain it locally.

## Files to copy into Dashboard editor

- `dashboard-copy/health/index.ts`
- `dashboard-copy/public-site-content/index.ts`
- `dashboard-copy/public-listings/index.ts`
- `dashboard-copy/clerk-session-check/index.ts`

Each file is self-contained for the Dashboard editor. Dependencies are version-pinned with Deno `npm:` specifiers:
- `postgres@3.4.7`
- `jose@5.9.6`

## Configure Edge Function secrets

Open Supabase Dashboard → Edge Function Secrets. Add the following. Never place their values in frontend config, source control, or chat.

| Name | Value source |
| --- | --- |
| `DATABASE_URL` | Existing Neon **pooled** connection string from Neon Connect, suitable for serverless/transaction-pooler use. Do not use Supabase's own database URL and do not use the Cloudflare Hyperdrive binding ID. |
| `R2_PUBLIC_BUCKET_NAME` | Existing ENES public R2 bucket name from local `.env.local`. This is only a bucket name, not an R2 credential. |
| `ENES_ALLOWED_ORIGINS` | Exact HTTPS origin of the separate Cloudflare Pages preview. No paths and no trailing slash. Add localhost only if deliberately doing local browser tests, e.g. `http://localhost:4173`. Multiple origins are comma-separated. |
| `CLERK_JWKS_URL` | Clerk development Frontend API URL plus `/.well-known/jwks.json`. |
| `CLERK_JWT_ISSUER` | Exact Clerk development Frontend API URL, e.g. `https://your-instance.clerk.accounts.dev`; use the actual value from Clerk. |

The existing V11 project used Cloudflare Hyperdrive in the Worker, but Supabase functions cannot use that binding. Here, `DATABASE_URL` must be the Neon connection string stored privately in Supabase Edge Function Secrets. Use the Neon pooled endpoint and keep prepared statements disabled as this code does.

## Deploy each function through the Dashboard

1. Confirm the selected Supabase project is `tlpznfgxpibzysuxpcmb`.
2. Open Edge Functions → Deploy a new function → Via Editor.
3. Create the exact function name: `health`, `public-site-content`, `public-listings`, or `clerk-session-check`.
4. Replace the template `index.ts` with the complete matching local file from `dashboard-copy/<function>/index.ts`.
5. Deploy the function.
6. On the function details page, turn **Verify JWT OFF**. This is deliberate: Supabase's platform JWT check expects Supabase Auth JWTs, while this app uses Clerk. The `clerk-session-check` function validates Clerk JWT signature, issuer, subject, authorized party and exact Origin itself. The public read-only endpoints expose published data only. Do not remove those in-function checks.
7. Repeat for all four functions.

Supabase official dashboard workflow: https://supabase.com/docs/guides/functions/quickstart-dashboard

Important: Dashboard editor edits do not currently have built-in version control or rollback. This local bundle is the canonical backup. Deploy only to the separate V12 project.

## Test order

Use the Supabase Dashboard's function Test tool, or a browser/curl request after deployment:

1. `GET https://tlpznfgxpibzysuxpcmb.supabase.co/functions/v1/health`
2. `GET https://tlpznfgxpibzysuxpcmb.supabase.co/functions/v1/public-site-content`
3. `GET https://tlpznfgxpibzysuxpcmb.supabase.co/functions/v1/public-listings?limit=5`
4. `GET https://tlpznfgxpibzysuxpcmb.supabase.co/functions/v1/clerk-session-check` with a genuine Clerk session bearer token and the exact preview `Origin` header. Without a token, `401` is expected and proves only that the handler is reachable; it does not prove successful token verification.

For browser calls, include the Supabase project's **publishable** key in the `apikey` header. Never use a secret/service-role key in the browser. The frontend already sends `apikey` and omits cookies by default.

## Acceptance gates

- Health returns `200` with `database: "connected"`.
- Public CMS returns only published JSON (or `null` if no content has yet been published); it never returns draft.
- Public listings returns only `PUBLISHED` listings and approved, non-deleted media matching the configured public bucket. Raw seller phone/email fields are not returned; only a WhatsApp URL is derived from the contact number.
- Clerk check rejects missing/invalid tokens, accepts a real session token from the configured Clerk development instance, and verifies `iss`, `sub`, `azp`, and exact Origin.
- A wrong browser origin receives `403`.
- No database migration, production Worker deployment, R2 mutation or DNS change occurs in V12.

## Re-run local bundle checks

From the ENES project root after extracting this bundle:

```bash
node scripts/v12/verify-dashboard.mjs
```
