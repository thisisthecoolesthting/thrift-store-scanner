# Reply — PRICESCOUT-SCAN-POLISH-005

**Status:** Shipped on `main` (code + migrations).

## Delivered

- Camera enumeration UI in `Scanner.tsx` with `ps_preferred_camera_id` persistence
- Kiosk mode at `/scan/kiosk` via `(kiosk)` route group (full-bleed, auto-reset, help modal)
- Browser device pairing: `/api/devices/register`, `ps_device_id` cookie, 4-device limit messaging
- Admin pair flow: `/admin/devices/pair` + QR token mint
- Extended `/admin/devices` with kind, last seen, revoke, kiosk launch link
- `/api/identify` and `/api/lookup/[upc]` attach `Scan.deviceId` and bump `Device.lastSeenAt`
- `/scan/embed` stub route

## Proof

`build/proof/PRICESCOUT-SCAN-POLISH-005.json`

## Build note

`npm run build` compiles and generates pages; on this Windows host it fails at NFT trace collection (`_not-found/page.js.nft.json` ENOENT). VPS Linux deploy cron should still succeed — re-verify on server after push.
