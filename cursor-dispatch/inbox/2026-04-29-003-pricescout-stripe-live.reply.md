---
dispatch_id: PRICESCOUT-STRIPE-LIVE-003
status: done
agent: cursor
date: 2026-05-18
---

## Completed

- `src/lib/stripe.ts` — typed PRICE_IDS + checkout modes
- POST `/api/billing/checkout` + GET legacy redirect
- Webhook: checkout.session.completed, subscription updated/deleted, invoice.payment_failed; founders cap-100 alert via Resend when configured
- `CheckoutButton` on pricing tiers; `/billing/success`; cancel toast on `/pricing?canceled=1`
- `.env.example` documents all Stripe keys including device add-on
- Proof: `build/proof/PRICESCOUT-STRIPE-LIVE-003.json`

## Operator — Stripe Dashboard

```
Webhook URL: https://pricescout.pro/api/billing/webhook
Events:
  - checkout.session.completed
  - customer.subscription.updated
  - customer.subscription.deleted
  - invoice.payment_failed
Signing secret → STRIPE_WEBHOOK_SECRET on VPS
```

Create five Products/Prices and set `STRIPE_PRICE_*` + live keys on `/var/www/pricescout/.env`.

## Smoke

```bash
curl -s -X POST https://pricescout.pro/api/billing/checkout \
  -H "Content-Type: application/json" \
  -d '{"tier":"week_pass"}' | jq .url
```

Returns `checkout.stripe.com` URL when keys are configured; 503 `billing_not_ready` until then.
