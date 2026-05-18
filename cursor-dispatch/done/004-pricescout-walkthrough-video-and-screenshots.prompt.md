---
to: cursor
from: claude (DEv1 cowork)
date: 2026-04-29
priority: P1-HIGH
project: pricescout
fleet: pricescout-marketing
machine: office-pc
working_dir: E:\Projects\pricescout
branch: feat/walkthrough-video-and-screenshots
dispatch_id: PRICESCOUT-WALKTHROUGH-VIDEO-004
depends_on: [PRICESCOUT-BOOTSTRAP-STANDALONE-001]
blockedBy: []
parallel_safe: true
order: 4
agent: cursor
operator_blocked_on:
  - "Path B requires operator to phone-record a 60-90s /scan walkthrough on Android, upload to Vimeo unlisted, paste the embed URL into the dispatch reply"
  - "Or: skip Path B and wait for Playwright path (depends on seeded DB + auth — separate dispatch)"
reply: cursor-dispatch/inbox/2026-04-29-004-pricescout-walkthrough-video.reply.md
tools: ["read_file", "write_file", "edit_block", "bash_command", "git_operation"]
dangerously_allow_bash: true
---

Read **`docs/SOLUTIONSTORE_SAAS_SPINE.md`** §13 (Playwright + walkthrough video) and §14 (Leonardo→real-screenshot swap pattern) before acting. Reference **shiftdeck.tech/watch** for the watch-page rhythm PriceScout should match.

# 004 — Walkthrough video at /watch + Play Store screenshots

## Context

`/watch` currently references `/videos/walkthrough.webm` but that file doesn't exist — the page renders a broken `<video>` tag with the poster fallback. Marketing site uses Leonardo Flux Schnell phone-mockup images at hero, "how it works", and final-CTA. Play Store needs real screenshots of the Android app.

**Two paths exist for video — pick based on dependency state.** Path B is faster and unblocks tomorrow's demo; Path A is higher-fidelity but waits on a seeded DB.

## Path A — Playwright capture (deferred to a later dispatch)

Per spine §13: build a sibling `pw-runner-pricescout/` dir, install Playwright + Chromium, write `walkthrough.cjs` that:
1. Logs in as the seeded `maria.rodriguez@example.com`
2. Drives `/scan` → captures 30s of the upload + verdict flow
3. Drives `/admin/scans` → captures the flip-log feed update
4. Drives `/pricing` → captures the buy CTA
5. Records all of it as 1280×720 webm

Requires: Postgres seed running, auth working, all 5 Price IDs configured. **Defer Path A** until Stripe (003) and DB seed (TBD dispatch 006) are done.

## Path B — Operator phone-record + Vimeo embed (USE THIS FOR TOMORROW)

This unblocks `/watch` for tomorrow's use without waiting on Path A's deps.

### Step 1 — operator records (5 minutes of operator time)

Operator opens PriceScout on their Android phone, hits screen-record (Quick Settings tile), and walks through:
1. Open the app from home screen (1s)
2. Allow camera permission (skip if already granted) (2s)
3. Point at a vintage sweater on a counter, hit shutter (5s)
4. Wait for verdict — show the comp median + sample size + buy/skip (10s)
5. Tap "Save to flip log" (3s)
6. Switch to web — open https://pricescout.pro/scan in a browser, repeat once with the laptop webcam (15s)
7. Go to /pricing, hover over Founders Lifetime, scroll through features (10s)

Total: 60-80 seconds. Save as `pricescout-walkthrough.mp4`. Upload to Vimeo as **Unlisted** (no ads, embeddable, no engagement bait). Vimeo gives a URL like `https://vimeo.com/123456789`.

### Step 2 — Cursor wires the iframe at /watch

Replace `src/app/watch/page.tsx` video tag with:

```tsx
<div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-line bg-ink shadow-[0_30px_60px_-20px_rgba(17,203,157,0.25)]">
  {process.env.NEXT_PUBLIC_VIMEO_WALKTHROUGH_ID ? (
    <iframe
      src={`https://player.vimeo.com/video/${process.env.NEXT_PUBLIC_VIMEO_WALKTHROUGH_ID}?autoplay=0&loop=0&muted=1&title=0&byline=0&portrait=0`}
      className="h-full w-full"
      allow="autoplay; fullscreen; picture-in-picture"
      allowFullScreen
      title="PriceScout walkthrough"
    />
  ) : (
    <div className="flex h-full items-center justify-center p-8 text-center">
      <p className="text-soft">Walkthrough video coming soon — in the meantime, <Link href="/scan" className="text-mint-600 underline">try the scanner</Link>.</p>
    </div>
  )}
</div>
```

Add `NEXT_PUBLIC_VIMEO_WALKTHROUGH_ID=123456789` to `.env.example` with comment. Operator drops the real ID into `/var/www/pricescout/.env` after recording.

This **graceful-degrades**: if no env var, page shows a "coming soon" card instead of a broken video. Until the operator records, the page still looks intentional.

### Step 3 — also write the local fallback for offline/demo

Save the operator's recording as `public/videos/walkthrough.webm` (transcode the MP4 with `ffmpeg -i pricescout-walkthrough.mp4 -c:v libvpx-vp9 -b:v 1M -c:a libopus public/videos/walkthrough.webm` if ffmpeg is installed; otherwise skip and rely on Vimeo). The `<video>` fallback in the existing `watch/page.tsx` already has this src — leave it as a defensive backup.

## OG image for sharing

Create `src/app/watch/opengraph-image.tsx` (Next 15 native — generates a 1200×630 PNG at build time):

```tsx
import { ImageResponse } from "next/og";
export const runtime = "edge";
export const alt = "PriceScout — watch the 60-second tour";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div style={{ background: "linear-gradient(135deg, #11CB9D 0%, #0F6E56 100%)", width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", padding: 60 }}>
        <div style={{ fontSize: 90, fontWeight: 700, color: "white", letterSpacing: -2 }}>PriceScout</div>
        <div style={{ fontSize: 42, color: "rgba(255,255,255,0.9)", marginTop: 20 }}>Watch the 60-second tour</div>
        <div style={{ fontSize: 28, color: "rgba(255,255,255,0.75)", marginTop: 40 }}>Snap → comp → tag price</div>
      </div>
    ),
    { ...size }
  );
}
```

Same pattern at `src/app/opengraph-image.tsx` for the homepage with the dual-surface tagline.

## Play Store screenshot pipeline

`mobile/store-listing/play/`:

- `feature-graphic.png` 1024×500 — generate via Leonardo or hand-design in Figma. Show: a phone with the verdict UI on screen + a sweater + the PriceScout logo.
- `screenshots/01-scan.png` through `05-pricing.png` — 1080×1920 PNG each. **Operator captures these** by running the Android APK on their phone and using Quick Settings → Screenshot. 5 shots:
  1. Camera view with reticle overlay
  2. Verdict result card with "Buy" pill, comp median, net estimate
  3. Flip log list with 4-5 saved scans
  4. Pricing screen
  5. About / settings
- `short-description.txt` (80 chars max):
  > "Snap any thrift-store item — get the resale price and tag price in seconds."
- `long-description.txt` (4000 chars max) — Cursor lifts copy from `src/app/page.tsx` hero + how-it-works + a feature list. Format per Play Store guidelines (use `**` for bold, line breaks for readability).
- `whats-new.txt` (500 chars max):
  > "First public release. Snap any item, get a tag price your customers will pay. Up to 4 scanner installs per Pro plan."

Apple App Store assets (parked for iOS dev approval): mirror this structure under `mobile/store-listing/apple/screenshots/` at 1290×2796 (iPhone 15 Pro Max).

## Marketing screenshot swap (spine §14)

After Path A lands (or with operator-captured shots), per spine §14 image-swap pattern:

1. Copy current Leonardo placeholders to `public/images/_leonardo_backup/`
2. Drop real screenshots in their place
3. Diff page references — they should not need to change since filenames stay constant

Defer this until either Path A finishes or operator provides real captures.

## Done-when

- [ ] `/watch` Vimeo iframe with graceful "coming soon" fallback
- [ ] `NEXT_PUBLIC_VIMEO_WALKTHROUGH_ID` documented in `.env.example`
- [ ] `src/app/watch/opengraph-image.tsx` + `src/app/opengraph-image.tsx` produce 1200×630 OG images
- [ ] `mobile/store-listing/play/` populated with feature-graphic placeholder, short/long/whats-new descriptions
- [ ] `mobile/store-listing/play/screenshots/README.md` documents what each screenshot should show + capture instructions for the operator
- [ ] Reply documents Path B operator steps (record, upload, ID) clearly
- [ ] Reply marks Path A as deferred and points at the dispatch number that unblocks it (Playwright + DB seed)
- [ ] git mv outbox→done + proof JSON `build/proof/PRICESCOUT-WALKTHROUGH-VIDEO-004.json`

## Out of scope

- Audio narration on the walkthrough (spine §13: skip — captions clearer + no ffmpeg dep)
- Animated Lottie scan-flow on `/watch` (cute but doesn't show real product moving)
- iOS App Preview video (after Apple approval)
- YouTube embed instead of Vimeo (Vimeo Unlisted is ad-free, professional, embeddable — preferred over YouTube which auto-suggests competitor videos at end)
- Captions burned into the video (operator can add via Vimeo's caption editor post-upload if desired)
