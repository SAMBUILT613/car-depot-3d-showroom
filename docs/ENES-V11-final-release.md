# ENES V11 — Final marketplace and mobile experience release

## Release scope

V11 completes the outstanding non-legal, non-domain items from the supplied ENES mobile and marketplace review. It is an overlay on the verified V9.3 + V10 source and deliberately does not repeat the V9 security fixes or V10 Owner CMS/database work.

### Mobile marketplace experience

- Adds a persistent five-destination mobile bar: Home, Saved, List, Messages and Profile. Labels are read from the published Owner CMS document; the bar is hidden on admin and authentication screens.
- Keeps the homepage search panel first on narrow screens and retains the wider desktop editorial ordering.
- Adds mobile property-intent shortcuts and quick actions tied to existing Owner-managed content and section visibility.
- Uses denser 4:3 listing cards with listing facts, the CMS-managed review label, featured badge, missing-photo fallback and a real save action.
- Adds a mobile filter drawer with Escape handling, backdrop close, focus trapping/restoration and a separate set of input IDs from desktop filters. Existing category-specific filtering and sorting are retained.
- Shows real published inventory only and keeps the honest empty state when the marketplace has no approved listings.

### Member journeys

- Adds an authenticated Saved Listings page scoped to the signed-in account and published listings only.
- Adds an authenticated Messages inbox and conversation thread.
- Checks conversation membership on the server before rendering a thread. Closed conversations remain readable but cannot be used to send messages.
- Adds `/saved` and `/messages` to the authenticated route guard, no-store/noindex response handling and robots exclusions.

### Additional Owner CMS coverage

- Adds editable homepage text for the featured badge, missing-photo fallback, listing-count sentence and quick-action accessible label.
- Adds a bottom-navigation draft preview to the content studio.
- Does not add database columns or a migration. The existing versioned JSON content parser supplies defaults for older published/draft documents.

## Verification included

`npm run v11:verify` performs:

1. V11 source assertions, including TypeScript/JSX syntax parsing of changed files.
2. The existing complete V10 verification, which includes V10 source checks, Prisma Client generation, Prisma schema validation and full non-incremental TypeScript checking.

`npm run v11:release` runs the above verification and then `npm run cf:build` to generate the OpenNext Cloudflare Worker bundle. It does not deploy the Worker or modify DNS.

No V11 database migration, database seed, dependency upgrade, payment activation, DNS change or production deployment is included.

## Manual acceptance tests after installation

Run these tests against the configured test environment before inviting the client:

- At 360px and 390px, confirm the mobile bottom bar does not cover page content or footer actions; verify active states and the Owner-edited labels.
- Confirm the bottom bar is absent in `/admin`, `/sign-in` and `/sign-up`.
- Open Saved while signed out (sign-in should be required); sign in and verify only the current member's saved, published listings appear.
- Verify a member cannot access another member's saved listings or conversations by changing route IDs.
- Open a conversation as each participant; verify messages load, unread state is represented, and a closed thread is read-only.
- Open mobile filters, tab through controls, close with Escape and the close button, and ensure focus returns to the trigger. Confirm category-specific filters and sorting preserve query values.
- Verify listing save toggles work only for the signed-in user and show an understandable error if unavailable.
- Change a homepage field in the Owner CMS, save a draft, inspect the preview, and verify the public homepage is unchanged until the Owner publishes. Publish and confirm the public page updates without a Worker redeploy.
- Confirm the new homepage badge/count labels and mobile labels update after publication.
- Test at 768px, 1024px and 1440px for layout regressions and horizontal overflow.

## Remaining launch gates not solved by a source patch

- Production preflight previously reported that the Clerk publishable key and secret key are development keys. Configure a production Clerk instance privately; never paste credentials into chat.
- Resend credentials were incomplete. Configure and test email only if email notification journeys are to be enabled for the client.
- Perform a deployed Worker runtime smoke test for Hyperdrive, R2, Clerk and any enabled Ably/Mapbox integrations.
- Supply genuine approved inventory, the official ENES brand assets and owner-approved public/legal copy.
- The supplied review identified a mismatch between the legacy live homepage and the newer V8 source. Confirm the intended Worker/environment and test the live route after an explicitly approved deployment.
- Domain/DNS changes and public production launch require the Owner's explicit approval.

A successful local Worker build is not proof of live runtime connectivity or production sign-in.
