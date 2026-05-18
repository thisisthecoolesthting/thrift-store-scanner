---
to: cursor
from: claude (DEv1 cowork)
date: 2026-04-29
priority: P1-HIGH
project: pricescout
fleet: pricescout-product
machine: office-pc
working_dir: E:\Projects\pricescout
branch: feat/scan-polish-kiosk-pairing
dispatch_id: PRICESCOUT-SCAN-POLISH-005
depends_on: [PRICESCOUT-BOOTSTRAP-STANDALONE-001, PRICESCOUT-DUAL-SURFACE-COPY-002, PRICESCOUT-SHOP-LANGUAGE-006]
blockedBy: []
parallel_safe: false
order: 5
agent: cursor
operator_blocked_on: []
reply: cursor-dispatch/inbox/2026-04-29-005-pricescout-scan-polish.reply.md
audience_note: "PriceScout is for thrift-store SHOPS, not flippers. Do NOT introduce flipper-coded language. Use 'tag list' / 'inventory log' instead of 'flip log'. Use 'suggested tag price' instead of 'BUY/SKIP verdict'. Reference memory note project_pricescout_audience_and_features."
tools: ["read_file", "write_file", "edit_block", "bash_command", "git_operation"]
dangerously_allow_bash: true
---

Read **`docs/SOLUTIONSTORE_SAAS_SPINE.md`** §6 (page recipe) and §10 (auth + billing — the device-pool math is in scope here) before acting. Reference **shiftdeck.tech** for the operator-shell rhythm — kiosk mode borrows the back-room/in-store framing.

# 005 — `/scan` web flow polish: camera enumeration UI, kiosk mode, browser device pairing

## Context

`src/components/Scanner.tsx` already does the heavy lifting: `getUserMedia`, video stream, barcode reader, capture-to-canvas, POST to `/api/identify`, manual fallback. **Three things are missing:**

1. **Camera enumeration UI** — if a laptop has a built-in FaceTime cam AND a USB overhead cam, the user can&apos;t pick which one to use. We auto-grab the default which is wrong half the time.
2. **Kiosk mode** — `/scan?mode=kiosk` should be a chrome-less, full-screen, auto-resetting view designed for a back-room laptop or counter-top tablet that lives at one URL all day.
3. **Browser device pairing** — a registered browser counts as one of the 4-included scanner installs (per dispatch 002 dual-surface copy). We need a "pair this browser" UX that creates a `Device` row + cookie, and a `/admin/devices/pair` QR-code view to pair from a phone.

ShiftDeck has an analogous "remote PIN-pad" mode for unattended terminals — borrow that mental model.

## Tasks

### A — Camera enumeration UI

In `Scanner.tsx`, add a camera picker shown when `getUserMedia` is granted but multiple devices are available:

```tsx
const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);

useEffect(() => {
  navigator.mediaDevices.enumerateDevices().then((devices) => {
    setCameras(devices.filter((d) => d.kind === "videoinput"));
  });
}, []);

// Pass deviceId into getUserMedia:
const constraints = {
  video: selectedCameraId ? { deviceId: { exact: selectedCameraId } } : { facingMode: "environment" },
  audio: false,
};
```

UI: a small `<select>` above the video element with each camera&apos;s label. Default selection = back camera if a label hints at it (case-insensitive match for `back`, `rear`, `environment`), else the first device. When the user changes selection, restart the stream with the new constraint.

Persist the selected camera in `localStorage` keyed `ps_preferred_camera_id` so the next visit defaults to the same camera.

### B — Kiosk mode at `/scan?mode=kiosk`

Add kiosk mode handling in `src/app/scan/page.tsx`:

```tsx
import { headers } from "next/headers";
// ... or use a client component to read searchParams

const isKiosk = searchParams.mode === "kiosk";
```

When `isKiosk`:
- **Hide all chrome** — no `Header`, no `Footer`, no nav links. Use a barebones layout via Next route groups: create `src/app/(kiosk)/layout.tsx` and `src/app/(kiosk)/scan/kiosk/page.tsx` mirroring `/scan` but with the chrome-less layout. The current `/scan` route stays for the normal browser flow; kiosk lives at `/scan/kiosk` (cleaner than a query param for SEO).
- **Full-bleed viewport** — `<html className="h-full">`, body `h-full overflow-hidden`. No max-width container.
- **Big touch targets** — buttons 64px min height, font-size 24px+, no small interactive elements.
- **Auto-reset timer** — 30 seconds after a verdict displays, dim the screen and return to capture state. Show a 5-second countdown overlay (`Returning to camera in 5...4...3...`).
- **Help button** in the corner — tap shows a modal with "How to use this scanner" + a 3-step recipe + a "How are we using your data?" privacy note.
- **No login required** — kiosk mode is anonymous by default. Saves go to a kiosk-tenant queue rather than a user&apos;s flip log. Operator can claim the kiosk to a tenant via `/admin/devices/pair`.

Add a `<Link href="/scan/kiosk">` button on `/admin/devices` labeled "Open kiosk mode in a new tab" — this is how the operator launches the back-room laptop browser at the right URL.

### C — Browser device pairing

#### C.1 — `Device` row creation flow

When `/scan` (or `/scan/kiosk`) loads on a browser that doesn&apos;t have a `ps_device_id` cookie set:
1. Show a small banner (non-blocking): "This browser will count as 1 of your 4 scanner installs once you save your first scan. Already paired? [Sign in](/login)."
2. On first successful save-to-flip-log, create the `Device` row via `/api/devices/register`:
   ```ts
   POST /api/devices/register
   body: { fingerprint: <stable client ID>, name: <user-agent shorthand>, kind: "browser" }
   ```
3. Set a long-lived `ps_device_id` cookie pointing to the new `Device.id`. Future scans tag this device.
4. If the tenant is already at 4 devices, return 402 with a friendly error: "You&apos;re at your 4-installs limit. Add another for $15/mo or revoke an existing device at /admin/devices."

Stable client fingerprint generation: use `crypto.randomUUID()` on first visit, persist in `localStorage.ps_device_fingerprint`. Don&apos;t do canvas/WebGL fingerprinting — too creepy and easy to evade.

#### C.2 — `/admin/devices/pair` QR view

For pairing the mobile app to a tenant&apos;s account:
- Render a QR code (use `qrcode` npm package — `npm i qrcode`) encoding `https://pricescout.pro/api/devices/pair-token/{token}` where `{token}` is a single-use token valid for 5 minutes
- The mobile app scans the QR via expo-camera → POSTs the URL → server returns a session token → mobile stores it in expo-secure-store

#### C.3 — `/admin/devices` page (already exists, extend)

Add columns: `kind` (phone / browser / kiosk), `name`, `lastSeenAt`, `scanCount` (count of related Scan rows in the last 30d), `actions` (revoke).

Add an "Add device" CTA showing the QR pair view inline as a modal.

### D — `/api/identify` + `/api/lookup/[upc]` device tagging

Both endpoints should:
1. Read `ps_device_id` cookie → set `Scan.deviceId` on the new row
2. If no cookie, set `Scan.deviceId = null` (the kiosk-anonymous case)
3. Increment `Device.lastSeenAt` and `Device.scanCount` on every call (use a `Device.scanCount` column or COUNT it on read — count-on-read is simpler, no migration needed)

### E — Add a `/scan/embed` route (bonus)

A minimal iframe-able version of the scanner at `/scan/embed` — same camera UI, no chrome, transparent background, postMessage results to the parent window. This is for partner sites (a thrift-store association&apos;s newsletter, e.g.) to embed our scanner. Out of scope for tomorrow but the route should exist as a stub that returns "Coming soon — contact partnerships@pricescout.pro" so the URL is squatted.

## Spine references to follow

- §6 — kiosk mode is a stripped-down version of the home page&apos;s scan flow. Don&apos;t reinvent the verdict card; reuse `<PriceVerdict>`.
- §7 — kiosk mode bumps font sizes and target sizes BUT uses the same color tokens. Don&apos;t introduce ad-hoc red/green for buy/skip pills — `colors.buy` / `colors.skip` already exist.
- §8 — mobile drawer rules don&apos;t apply (kiosk is not a drawer) but the same stacking-context lessons apply: kiosk overlays (countdown, help modal) should be `position: fixed` siblings of the main content, not nested inside it.
- §10 — device-pool math: 4 installs included, $15/mo per add-on. Founders Lifetime tier has same 4-included pool (NOT unlimited).

## Done-when

- [ ] Camera picker in `Scanner.tsx` enumerates devices, persists selection, restarts stream on change
- [ ] `/scan/kiosk` route group with chrome-less layout, full-bleed view, 64px buttons, 30s auto-reset, help modal
- [ ] `/api/devices/register` creates a `Device` row, sets `ps_device_id` cookie, enforces 4-device limit
- [ ] `/admin/devices/pair` shows a QR + token-mint endpoint
- [ ] `/admin/devices` page extended with kind/name/lastSeen/scanCount/revoke
- [ ] `/api/identify` + `/api/lookup/[upc]` write `Scan.deviceId` from cookie
- [ ] `/scan/embed` stub route exists
- [ ] No ad-hoc spacing/color — spine §7 only
- [ ] Visual diff screenshots in the reply (4 screenshots: /scan with picker, /scan/kiosk verdict, /scan/kiosk countdown overlay, /admin/devices with QR modal)
- [ ] git mv outbox→done + proof JSON `build/proof/PRICESCOUT-SCAN-POLISH-005.json`

## Out of scope

- Mobile app QR-pair flow client-side (separate dispatch — needs Expo work)
- Real-time SSE flip-log feed (separate dispatch 006)
- Browser fingerprinting hardening — we use a UUID + cookie. If it gets cleared, the user re-pairs on next save. Acceptable.
- Multi-tenant kiosk routing (one kiosk → many tenants) — out of scope, kiosk auto-claims to whichever tenant&apos;s admin URL launched it
- Apple Pay / Google Pay on the kiosk — the kiosk doesn&apos;t collect payment, only scans
