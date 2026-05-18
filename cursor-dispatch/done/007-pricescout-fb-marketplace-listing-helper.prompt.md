---
to: cursor
from: claude (DEv1 cowork)
date: 2026-04-29
priority: P0-CRITICAL
project: pricescout
fleet: pricescout-product
machine: office-pc
working_dir: E:\Projects\pricescout
branch: feat/fb-marketplace-listing-helper
dispatch_id: PRICESCOUT-FB-MARKETPLACE-007
depends_on: [PRICESCOUT-SHOP-LANGUAGE-006]
blockedBy: []
parallel_safe: false
order: 7
agent: cursor
operator_blocked_on: []
reply: cursor-dispatch/inbox/2026-04-29-007-pricescout-fb-marketplace.reply.md
tools: ["read_file", "write_file", "edit_block", "bash_command", "git_operation"]
dangerously_allow_bash: true
---

Read **`docs/SOLUTIONSTORE_SAAS_SPINE.md`** §6 (page recipe) and §10 (workflow framing) before acting. Reference **shiftdeck.tech** for the operator-shell rhythm.

# 007 — Facebook Marketplace listing helper (Mode 1: structured listing + copy + deep link)

## Why this is P0-CRITICAL

PriceScout&apos;s second core value prop (per audience clarification 2026-04-29) is **helping shops post items on Facebook Marketplace**. Right now the product stops at "here&apos;s a suggested tag price." For a thrift store / estate sale / yard sale operator, the next step is getting that item LISTED somewhere customers will see it — and FB Marketplace is the dominant channel for the audience.

This dispatch ships **Mode 1** — the lowest-friction, highest-reliability path:

> Generate a structured FB Marketplace listing (title / category / price / description / photo) for a scanned item. One-tap "Copy listing + open FB" workflow. The user pastes into FB&apos;s mobile composer.

We do **NOT** ship full FB Graph API auto-post in this dispatch — that path is gated behind FB&apos;s commerce-partner approval and is high-friction. Park it as a future "Mode 3" upgrade.

## Modes (for context — only Mode 1 is in scope)

| Mode | Friction | Reliability | Scope |
|---|---|---|---|
| **1. Structured listing + copy + deep link** | LOW | HIGH | THIS DISPATCH |
| 2. Pre-filled FB composer via URL params (if FB supports) | MED | MED — FB changes URL params often | Future |
| 3. FB Graph API auto-post | HIGH (commerce-partner approval, app review) | LOW initially | Future, gated on commerce approval |

## Tasks

### A — Schema additions

`prisma/schema.prisma`:

```prisma
model Scan {
  // ... existing fields
  fbListingTitle       String?
  fbListingDescription String?
  fbListingCategory    String?
  fbListingPriceCents  Int?
  fbListingStatus      String?  // "draft" | "copied" | "posted" | "sold"
  fbListingPostedAt    DateTime?
}
```

Migration: `npx prisma migrate dev --name fb_listing_fields`.

### B — `lib/fb-listing.ts` (server-only listing generator)

Given a `Scan` row + identifying info, produce a structured FB Marketplace listing.

```ts
export type FbListingDraft = {
  title: string;          // 80 char max, FB enforces
  category: FbCategory;   // mapped from comp category (Apparel, Books, Furniture, etc.)
  priceCents: number;     // shop&apos;s chosen tag price (low end of suggested range by default)
  description: string;    // 1000 char max, includes condition, dimensions if known, brand if known
  photoUrl: string;       // the captured image URL
};

export type FbCategory =
  | "Apparel" | "Books" | "Electronics" | "Furniture" | "Home"
  | "Kids" | "Music" | "Tools" | "Toys" | "Sports" | "Other";

export function generateFbListing(scan: Scan, identifyResult: IdentifyResponse): FbListingDraft {
  // Title: brand + item type + key descriptor (max 80 char)
  const title = buildTitle(identifyResult); // e.g. "Vintage Levi&apos;s Denim Jacket — Men&apos;s M"

  // Category: map comp category to FB category (lookup table at bottom of file)
  const category = mapToFbCategory(identifyResult.identify.category);

  // Price: low end of suggested range (shops usually price competitively to move inventory)
  const priceCents = scan.recommendationSuggestedLow ?? scan.recommendationSuggestedMid ?? 1000;

  // Description: 3-paragraph template
  // 1. What it is (item type + brand if known + 1-line condition)
  // 2. Why someone would want it (style, era, durability — pulled from category-specific blurbs)
  // 3. Pickup-friendly closer ("Available now at <store address>" — read from Tenant)
  const description = buildDescription(identifyResult, scan);

  return {
    title,
    category,
    priceCents,
    description,
    photoUrl: scan.imageUrl ?? "",
  };
}
```

Implement `buildTitle`, `buildDescription`, `mapToFbCategory` with sensible defaults. The description templates can live in a JSON file at `src/content/fb-description-templates.json` keyed by category — Cursor writes 11 default templates (one per FbCategory).

### C — `/api/scans/[id]/fb-listing` route

```ts
// GET — generate or return existing draft
// POST — regenerate with overrides (e.g. user adjusted the title or chose a different price point)
// PATCH — mark as "copied" (when user clicks Copy) or "posted" (when user manually confirms posted)
```

### D — UI: "Post to Marketplace" button on `<TagPriceCard>` (web)

After dispatch 006 renames `<PriceVerdict>` → `<TagPriceCard>`, add a "Post to Marketplace" button below the suggested tag price.

Click handler:
1. POST `/api/scans/{id}/fb-listing` with the chosen tag price
2. Receive `FbListingDraft`
3. Open a slide-over panel showing:
   - **Title** (editable, char counter at 80)
   - **Category** dropdown (pre-selected, 11 options)
   - **Price** (editable, shows the suggested range as helper text)
   - **Description** (editable textarea, char counter at 1000)
   - **Photo** preview (read-only — uses the scan&apos;s capture)
4. Two CTAs at the bottom:
   - **"Copy listing + open FB Marketplace"** — copies a formatted block to clipboard (title + description + price clearly delimited) and opens `https://www.facebook.com/marketplace/create/item` in a new tab. The user pastes into FB&apos;s mobile composer.
   - **"Save as draft"** — saves edits without posting; appears in Tag List with a "Draft" pill.

### E — UI: "Post to Marketplace" button on mobile

Same flow on `mobile/app/(tabs)/index.tsx` after a verdict result. On Android the deep link `fb://marketplace/create/item` may work — fall back to the web URL if not. Use `Linking.openURL()` from React Native.

iOS deferred until Apple approves the developer account.

### F — `/admin/scans` table update

Add a column "Marketplace status" with pills:
- "Not yet" (gray) — no FB listing draft generated
- "Draft" (yellow) — draft created, not posted
- "Copied" (blue) — user clicked Copy + Open FB
- "Posted" (green) — user manually confirmed posted (click the pill to flip status)
- "Sold" (mint) — user manually marked as sold (frees up "active inventory" reporting)

Add a status filter at the top of the table.

### G — Tag list dashboard tile on `/admin`

Show counts:
- Today&apos;s pricings: N items priced
- Drafted listings: N
- Posted to FB: N
- Sold this week: N (from "Sold" status flips)

This gives the operator a daily pulse of "how much inventory did we move."

### H — Helper scripts

Add `scripts/fb-listing-from-scan.ts` — a CLI that takes a scan ID and prints the draft to stdout. Useful for debugging + future automation.

## Operator-side considerations to surface in reply

- We do NOT integrate with FB&apos;s API — no FB login required, no commerce-partner approval needed.
- The "Copy + open FB" flow opens FB Marketplace in a new tab/window. The user is responsible for pasting + clicking "Publish" in FB.
- FB will scale-down photos and may reject categories — surface this in tooltip text on the Category dropdown.
- Pricing: FB Marketplace doesn&apos;t take a cut on local pickup, so the displayed FB price = exactly the shop&apos;s tag price. Shipping&apos;s a separate FB feature; we ignore it (shops don&apos;t ship donations).

## Spine references

- §6 — slide-over panel pattern lives in spine. Use the existing pattern (mobile drawer rules apply: sibling-mounted, no z-trap).
- §10 — billing isn&apos;t affected by this dispatch (Marketplace listing is included in every paid tier; no upcharge).
- §16 — copy conventions: "Post to Marketplace" CTA, NOT "List on Facebook" or "Sell on FB."

## Done-when

- [ ] Prisma schema + migration for FB listing fields
- [ ] `lib/fb-listing.ts` with `generateFbListing` + 11 category templates
- [ ] `/api/scans/[id]/fb-listing` GET / POST / PATCH routes
- [ ] `<TagPriceCard>` shows "Post to Marketplace" button → opens slide-over editor → copy + deep-link flow
- [ ] Mobile equivalent on Expo scan screen
- [ ] `/admin/scans` table has Marketplace status column + filter
- [ ] `/admin` dashboard has Tag List tile with daily pulse counts
- [ ] `scripts/fb-listing-from-scan.ts` CLI works
- [ ] Visual diff screenshots in reply (web: TagPriceCard with button, slide-over editor, /admin/scans table; mobile: scan result with button, listing editor)
- [ ] `npm run typecheck && npm run test && npm run build` green
- [ ] git mv outbox→done + proof JSON `build/proof/PRICESCOUT-FB-MARKETPLACE-007.json`

## Out of scope

- FB Graph API integration / auto-post (Mode 3 — future, requires commerce approval)
- FB Shops integration (different product, requires business verification)
- Cross-posting to OfferUp / Mercari / Craigslist (future "multi-channel" dispatch)
- Photo editing / background removal before posting (the operator can use FB&apos;s built-in tools)
- Sales analytics beyond simple count tiles (a real reporting dashboard is a future "Reports" dispatch)
- Shipping integrations (irrelevant — shops do local pickup only)
