---
to: cursor
from: claude (DEv1 cowork)
date: 2026-04-29
priority: P1-HIGH
project: pricescout
fleet: pricescout-billing
machine: office-pc
working_dir: E:\Projects\pricescout
branch: feat/stripe-live-wiring
dispatch_id: PRICESCOUT-STRIPE-LIVE-003
depends_on: [PRICESCOUT-BOOTSTRAP-STANDALONE-001, PRICESCOUT-DUAL-SURFACE-COPY-002]
blockedBy: []
parallel_safe: false
order: 3
agent: cursor
operator_blocked_on:
  - "Stripe Dashboard: create 5 products + capture each Price ID (Week Pass $29 / Pro Monthly $49 / Pro Annual $490 / Founders Lifetime $699 / Device Add-on $15)"
  - "VPS env: drop STRIPE_SECRET_KEY (live, sk_live_...), STRIPE_PUBLISHABLE_KEY (pk_live_...), STRIPE_WEBHOOK_SECRET (whsec_...), and 5 STRIPE_PRICE_* keys into /var/www/pricescout/.env"
reply: cursor-dispatch/inbox/2026-04-29-003-pricescout-stripe-live.reply.md
tools: ["read_file", "write_file", "edit_block", "bash_command", "git_operation"]
dangerously_allow_bash: true
---

Read **`docs/SOLUTIONSTORE_SAAS_SPINE.md`** §10 (auth + Stripe billing logic) and §15 (deploy pattern) before acting. Reference **shiftdeck.tech/pricing** for the live working-CTA pattern PriceScout should match.

# 003 — Wire Stripe checkout end-to-end (5 SKUs + customer portal + webhooks)

## Why this is urgent

Today the pricing page CTAs go nowhere. No checkout. No way for an operator to pay. This dispatch closes that — by tomorrow morning, every tier should be purchasable, the webhook should mark the tenant subscribed, and the admin billing tile should link to Stripe's customer portal.

The Stripe code stubs from earlier dispatches (082) exist in `src/app/api/billing/checkout/route.ts` and `src/app/api/billing/webhook/route.ts` — this dispatch finishes them and wires the frontend.

## Tasks

### A — Env scaffolding

Add to `.env.example` at repo root (not `.env` itself — that's operator-managed on VPS):

```bash
# Stripe (live)
STRIPE_SECRET_KEY=sk_live_xxxxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# Price IDs — operator captures these from Stripe Dashboard after creating each product
STRIPE_PRICE_WEEKPASS=price_xxxxx        # $29 one-time, 7-day pass
STRIPE_PRICE_PRO_MONTHLY=price_xxxxx     # $49/mo recurring
STRIPE_PRICE_PRO_ANNUAL=price_xxxxx      # $490/yr recurring
STRIPE_PRICE_FOUNDERS_LIFETIME=price_xxxxx  # $699 one-time, cap-100
STRIPE_PRICE_DEVICE_ADDON=price_xxxxx    # $15/mo recurring (per device over 4)

# Public URL for Stripe success/cancel redirects
NEXT_PUBLIC_APP_URL=https://pricescout.pro
```

Document each in a doc-comment block at the top of `.env.example`.

### B — `lib/stripe.ts` (server-only Stripe instance)

```ts
import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is not set");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-12-18.acacia",  // pin a version, don't float
  typescript: true,
});

export const PRICE_IDS = {
  weekPass: process.env.STRIPE_PRICE_WEEKPASS,
  proMonthly: process.env.STRIPE_PRICE_PRO_MONTHLY,
  proAnnual: process.env.STRIPE_PRICE_PRO_ANNUAL,
  foundersLifetime: process.env.STRIPE_PRICE_FOUNDERS_LIFETIME,
  deviceAddon: process.env.STRIPE_PRICE_DEVICE_ADDON,
} as const;

export type Tier = keyof typeof PRICE_IDS;
```

### C — `/api/billing/checkout` route

Accept `{ tier: Tier, quantity?: number }` POST body. Look up the tenant from the auth session (or create a guest tenant if no session — guests are allowed to buy Week Pass and Founders without signing up first; we capture their email on the Stripe checkout).

```ts
import { stripe, PRICE_IDS, type Tier } from "@/lib/stripe";
import { getSession } from "@/lib/session";  // existing auth helper

export async function POST(req: Request) {
  const { tier, quantity = 1 } = await req.json();
  if (!PRICE_IDS[tier as Tier]) {
    return Response.json({ error: "unknown tier" }, { status: 400 });
  }

  const session = await getSession();  // null OK for guest checkout
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://pricescout.pro";

  const checkout = await stripe.checkout.sessions.create({
    mode: tier === "weekPass" || tier === "foundersLifetime" ? "payment" : "subscription",
    line_items: [{ price: PRICE_IDS[tier as Tier]!, quantity }],
    success_url: `${baseUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/pricing?canceled=1`,
    customer_email: session?.user.email,
    client_reference_id: session?.tenantId ?? `guest-${crypto.randomUUID()}`,
    metadata: {
      tier,
      tenantId: session?.tenantId ?? "",
      userId: session?.user.id ?? "",
    },
    allow_promotion_codes: true,
    billing_address_collection: "auto",
  });

  return Response.json({ url: checkout.url });
}
```

### D — `/api/billing/webhook` route

Handle these events:
- `checkout.session.completed` — provision the subscription on the Tenant row, set `subscriptionStatus` to `active`, set `foundersTier=true` if tier was `foundersLifetime`
- `customer.subscription.updated` — sync `subscriptionStatus` (active / past_due / canceled / etc.)
- `customer.subscription.deleted` — set `subscriptionStatus="canceled"`
- `invoice.payment_failed` — set `subscriptionStatus="past_due"`, optionally fire a Resend email if `RESEND_API_KEY` is present

Verify webhook signature using `STRIPE_WEBHOOK_SECRET`. If verification fails, return 400. Per Stripe docs, return 200 quickly and process async — but for this scope, sync-process is fine since events are small.

Founders Lifetime cap-100 enforcement: count the number of Tenants with `foundersTier=true`. If that count is already 100 BEFORE marking this one true, set `foundersTier=true` on this tenant (Stripe already collected money — we honor it) BUT also fire an alert email to the operator that we sold #101. This is a soft cap — operator decides whether to refund or honor.

### E — Pricing page CTAs

In `src/components/PricingTiers.tsx` (or `src/app/pricing/page.tsx`), change every CTA from `<Link href="/scan">` to a `<form action="/api/billing/checkout" method="post">`-style button that POSTs `{ tier }` and redirects to the returned `url`.

Use a small client component wrapper:

```tsx
"use client";
import { useState } from "react";

export function CheckoutButton({ tier, label, primary }: { tier: string; label: string; primary?: boolean }) {
  const [loading, setLoading] = useState(false);
  return (
    <button
      onClick={async () => {
        setLoading(true);
        const res = await fetch("/api/billing/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tier }),
        });
        const { url, error } = await res.json();
        if (error) { alert(error); setLoading(false); return; }
        window.location.href = url;
      }}
      disabled={loading}
      className={primary ? "btn-primary btn-large" : "btn-secondary btn-large"}
    >
      {loading ? "Redirecting…" : label}
    </button>
  );
}
```

Replace every "Start 14-day trial" / "Buy Week Pass" / "Get Founders" CTA on the pricing page with this component.

### F — Success + cancel routes

Create `src/app/billing/success/page.tsx`:

- Read `?session_id=` from URL
- Fetch the session detail server-side (`stripe.checkout.sessions.retrieve(session_id)`)
- Show a celebration card with: tier purchased, next billing date (if subscription), receipt link
- CTA: "Go to your scanner" → `/scan` (or `/admin` if logged in)

The `/pricing` page already accepts `?canceled=1` per Task C — surface a small toast: "Checkout canceled. No charge made. Take another look at the tiers — Week Pass is risk-free."

### G — Customer portal link in `/admin/billing`

In the existing `/admin/billing` page (created by 081), add a "Manage subscription" button that POSTs to `/api/billing/portal`:

```ts
// /api/billing/portal
import { stripe } from "@/lib/stripe";
import { getSession } from "@/lib/session";

export async function POST() {
  const session = await getSession();
  if (!session) return Response.json({ error: "unauthorized" }, { status: 401 });

  const tenant = await prisma.tenant.findUnique({ where: { id: session.tenantId } });
  if (!tenant?.stripeCustomerId) return Response.json({ error: "no stripe customer" }, { status: 400 });

  const portal = await stripe.billingPortal.sessions.create({
    customer: tenant.stripeCustomerId,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/admin/billing`,
  });
  return Response.json({ url: portal.url });
}
```

The button on `/admin/billing` calls this and redirects.

### H — Webhook setup proof

In the proof JSON, document the exact Stripe Dashboard webhook configuration for the operator to set:

```
URL: https://pricescout.pro/api/billing/webhook
Listen to events:
  - checkout.session.completed
  - customer.subscription.updated
  - customer.subscription.deleted
  - invoice.payment_failed
Signing secret: copy whsec_... into /var/www/pricescout/.env as STRIPE_WEBHOOK_SECRET
```

Operator-blocked — Cursor cannot create the webhook (no Stripe Dashboard CLI auth in this loop).

### I — Smoke test

After deploy:

```bash
# Use Stripe CLI in test mode first if available, otherwise stub:
curl -X POST https://pricescout.pro/api/billing/checkout \
  -H "Content-Type: application/json" \
  -d '{"tier":"weekPass"}' | jq .url

# Should return a checkout.stripe.com URL. Open it in a browser, complete with test card 4242 4242 4242 4242, verify webhook fires, verify Tenant row updated.
```

If Stripe CLI is installed: `stripe listen --forward-to https://pricescout.pro/api/billing/webhook` to verify webhook signature handling locally.

## Done-when

- [ ] `.env.example` updated with all 8 Stripe keys + commented
- [ ] `lib/stripe.ts` exports typed `stripe` + `PRICE_IDS`
- [ ] `/api/billing/checkout` accepts all 5 tiers, handles guest + auth flows
- [ ] `/api/billing/webhook` handles 4 event types with signature verification
- [ ] `<CheckoutButton>` replaces every pricing CTA
- [ ] `/billing/success` displays purchase confirmation
- [ ] `/api/billing/portal` + button on `/admin/billing` work end-to-end
- [ ] Founders Lifetime cap-100 logic tested with a fake count of 99 → 100 → 101
- [ ] Smoke test produces a valid checkout URL
- [ ] Reply documents the exact Stripe Dashboard config the operator must do
- [ ] git mv outbox→done + proof JSON `build/proof/PRICESCOUT-STRIPE-LIVE-003.json`

## Out of scope

- Refund flows (operator handles via Stripe Dashboard)
- Coupon / promo code creation (Stripe Dashboard, allow_promotion_codes is on)
- Tax handling (Stripe Tax can be enabled in Dashboard later — not now)
- Email receipts (Stripe sends them automatically — don't double-send)
- Annual→monthly downgrade flow (customer portal handles it)
