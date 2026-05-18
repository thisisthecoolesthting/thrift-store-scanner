# Reply — PRICESCOUT-STRIPE-LIVE-003

**Status:** Code complete on `main`. Operator must configure Stripe Dashboard + VPS env before live checkout.

## Stripe Dashboard (operator)

1. Create 5 products + Price IDs: Week Pass $29, Pro Monthly $49/mo, Pro Annual $490/yr, Founders Lifetime $699, Device add-on $15/mo.
2. Webhook endpoint:
   - URL: `https://pricescout.pro/api/billing/webhook`
   - Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`
   - Copy signing secret → `STRIPE_WEBHOOK_SECRET` on VPS.
3. Paste all keys into `/var/www/pricescout/.env` per `.env.example`.

## Smoke test

```bash
curl -X POST https://pricescout.pro/api/billing/checkout \
  -H "Content-Type: application/json" \
  -d '{"tier":"week_pass"}' | jq .url
```

Returns `checkout.stripe.com` URL when keys are set; 503 `billing_not_ready` until then.

## Proof

`build/proof/PRICESCOUT-STRIPE-LIVE-003.json`
