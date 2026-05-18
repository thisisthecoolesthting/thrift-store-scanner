---
dispatch_id: PRICESCOUT-WALKTHROUGH-VIDEO-004
date: 2026-05-18
agent: codex-lane
status: completed_with_operator_followups
---

Implemented Path B wiring for `/watch` and completed listing asset scaffolding.

## Completed
- Replaced `/watch` primary video panel with Vimeo iframe gated by `NEXT_PUBLIC_VIMEO_WALKTHROUGH_ID`.
- Added graceful fallback UI when Vimeo ID is not set (intentional "coming soon" state) and retained local `.webm` fallback path inside fallback card.
- Added `NEXT_PUBLIC_VIMEO_WALKTHROUGH_ID` documentation to `.env.example`.
- Added OG image generators:
  - `src/app/watch/opengraph-image.tsx`
  - `src/app/opengraph-image.tsx`
- Created Play Store listing content files:
  - `mobile/store-listing/play/short-description.txt`
  - `mobile/store-listing/play/long-description.txt`
  - `mobile/store-listing/play/whats-new.txt`
  - `mobile/store-listing/play/feature-graphic.placeholder.md`
  - `mobile/store-listing/play/screenshots/README.md`
- Added parked iOS mirror readme:
  - `mobile/store-listing/apple/screenshots/README.md`
- Wrote proof file:
  - `build/proof/PRICESCOUT-WALKTHROUGH-VIDEO-004.json`

## Operator follow-ups (required)
1. Record Android walkthrough (60-90s) and upload to Vimeo as Unlisted.
2. Paste Vimeo video ID into production env:
   - `NEXT_PUBLIC_VIMEO_WALKTHROUGH_ID=<real_id>`
3. Optionally transcode local backup to:
   - `public/videos/walkthrough.webm`
4. Capture and add final Play Store screenshots and feature graphic assets per `mobile/store-listing/play/screenshots/README.md`.

## Deferred scope
- Path A (Playwright-generated walkthrough capture) is deferred pending seeded DB/auth/Stripe readiness; dispatch 006 remains part of the unblock chain.

## Validation
- Typecheck: failed due to pre-existing unrelated Prisma/type issues in current branch state.
- Tests: passed (`vitest`, 4/4 tests).
- Build: failed due to pre-existing unrelated `next/headers` import path issue in `src/lib/device-utils.ts`.
