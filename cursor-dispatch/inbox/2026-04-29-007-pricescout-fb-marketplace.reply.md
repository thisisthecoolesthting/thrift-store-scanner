# Reply — PRICESCOUT-FB-MARKETPLACE-007

**Status:** completed - Mode 1 shipped on `main`.

## Delivered (Mode 1 only)

- Prisma `Scan` FB listing columns are present with migration `20260518144000_fb_listing_fields`.
- `src/lib/fb-listing.ts` now provides server-only listing generation (`buildTitle`, `buildDescription`, `mapToFbCategory`, `generateFbListing`) using 11 templates from `src/content/fb-description-templates.json`.
- `/api/scans/[id]/fb-listing` supports `GET` (return/generate draft), `POST` (regenerate/save with overrides), and `PATCH` (status transitions: `draft|copied|posted|sold`).
- `TagPriceCard` (`PriceVerdict`) includes **Post to Marketplace** button, slide-over editor, char counters, category selector, photo preview, **Copy listing + open FB Marketplace** and **Save as draft** CTAs.
- Mobile flow in `mobile/app/(tabs)/index.tsx` + `mobile/lib/marketplace.ts` now does clipboard copy + deep-link open (`fb://marketplace/create/item`) with web fallback.
- `/admin/scans` has Marketplace status column, status filter chips, and clickable status pill transitions for posted/sold.
- `/admin` dashboard Tag list pulse tile includes Today's pricings, Drafted listings, Posted to FB, Sold this week.
- `scripts/fb-listing-from-scan.ts` prints generated draft JSON by scan ID.

## Operator notes surfaced

- No Facebook Graph API integration was added (Mode 3 remains out of scope; no FB login or commerce approval required).
- Copy + open flow hands off publishing to operator inside FB composer.
- Category help text warns FB may adjust categories in composer.
- FB price remains exact shop tag price (local pickup flow).

## Required command results

- `npx prisma generate` - pass
- `npm run typecheck` - pass
- `npm run test` - pass (4 tests)
- `npm run build` - pass

## Proof

- `build/proof/PRICESCOUT-FB-MARKETPLACE-007.json` updated with command evidence and shipped scope.
