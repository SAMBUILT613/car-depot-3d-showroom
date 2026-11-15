# ENES V10 — Cloudflare client/server boundary correction

## Root cause
The V10 site-content reader imports Prisma and the PostgreSQL `pg` adapter. It was imported by the shared Header/Footer components, and three client route pages imported those components directly. Next.js consequently traced `pg` into the browser bundle and attempted to resolve Node built-ins (`dns`, `fs`, `net`, `tls`, `util/types`).

## Correction
- Mark the Prisma-backed site-content module as `server-only`.
- Move CMS-only TypeScript declarations to `src/lib/site-content.types.ts`, which contains no runtime server imports.
- Update client-safe type imports to use the shared type module.
- Keep listing, property-request and property-service forms as client components.
- Render the CMS-aware Header and Footer in the corresponding server route wrappers, passing only the client forms across the Server/Client Component boundary.
- Add V10 regression assertions for this boundary and keep V10 verification invoked through Bash.

## Safety
No database schema, migration, data, authentication, permissions, R2 configuration, deployment, or DNS changes are included in this correction.

## Verification performed for this patch
- V10 source assertions: 40/40 passed.
- TypeScript/JSX syntax transpilation for all 10 changed TypeScript files: 10/10 passed.
- Static scan: no client TSX file imports the database module, server content reader, or server Header/Footer.

A full local TypeScript check and Cloudflare build must still be run in the project environment after installing this patch.
