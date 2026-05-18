# Reply — PRICESCOUT-FB-MARKETPLACE-007

**Status:** Mode 1 shipped on `main`.

## Delivered

- Prisma `Scan` FB listing columns + migration
- `src/lib/fb-listing.ts` — title/category/price/description generation from scan + templates
- `GET`/`PATCH` `/api/scans/[id]/fb-listing` — draft, copy, posted states
- `TagPriceCard` — copy listing + open Facebook Marketplace deep link
- Admin inventory log — marketplace status pill per scan
- Mobile `marketplace.ts` helper for Expo follow-up dispatch

## Out of scope (as prompt)

- FB Graph API auto-post (Mode 3)

## Proof

`build/proof/PRICESCOUT-FB-MARKETPLACE-007.json`
