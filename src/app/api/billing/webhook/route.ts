import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function markFoundersTier(tenantId: string | undefined, tenantSlug: string | undefined) {
  const where = tenantId
    ? { id: tenantId }
    : tenantSlug
      ? { slug: tenantSlug }
      : null;
  if (!where) return;

  const foundersCount = await prisma.tenant.count({ where: { foundersTier: true } });
  await prisma.tenant.updateMany({
    where,
    data: { foundersTier: true, subscriptionStatus: "active" },
  });

  if (foundersCount >= 100 && process.env.RESEND_API_KEY && process.env.RESEND_FROM) {
    try {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM,
          to: "hello@pricescout.pro",
          subject: "PriceScout Founders Lifetime cap exceeded (#101+)",
          text: `Founders count was ${foundersCount} before this sale. Tenant ${tenantId ?? tenantSlug} was marked foundersTier=true — operator decides refund vs honor.`,
        }),
      });
    } catch (e) {
      console.error("founders cap alert email failed", e);
    }
  }
}

export async function POST(req: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const sig = req.headers.get("stripe-signature");
  const client = getStripe();

  if (!webhookSecret || !sig || !client) {
    return NextResponse.json(
      { error: "Webhook not configured", message: "STRIPE_WEBHOOK_SECRET or STRIPE_SECRET_KEY unset." },
      { status: 503 },
    );
  }

  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = client.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "bad_signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const tenantId = session.metadata?.tenantId || undefined;
      const slug = session.metadata?.tenant_slug || undefined;
      const tier = session.metadata?.tier;
      const cust = session.customer;
      const customerId = typeof cust === "string" ? cust : cust?.id;

      const where = tenantId ? { id: tenantId } : slug ? { slug } : null;
      if (where && customerId) {
        await prisma.tenant.updateMany({
          where,
          data: {
            stripeCustomerId: customerId,
            subscriptionStatus: "active",
          },
        });
      }

      if (tier === "founders_lifetime") {
        await markFoundersTier(tenantId, slug);
      }
      break;
    }
    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const cust = sub.customer;
      const customerId = typeof cust === "string" ? cust : cust?.id;
      if (customerId) {
        await prisma.tenant.updateMany({
          where: { stripeCustomerId: customerId },
          data: {
            subscriptionStatus: sub.status ?? "active",
            currentPeriodEnd: sub.current_period_end
              ? new Date(sub.current_period_end * 1000)
              : undefined,
          },
        });
      }
      break;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const cust = sub.customer;
      const customerId = typeof cust === "string" ? cust : cust?.id;
      if (customerId) {
        await prisma.tenant.updateMany({
          where: { stripeCustomerId: customerId },
          data: { subscriptionStatus: "canceled" },
        });
      }
      break;
    }
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const cust = invoice.customer;
      const customerId = typeof cust === "string" ? cust : cust?.id;
      if (customerId) {
        await prisma.tenant.updateMany({
          where: { stripeCustomerId: customerId },
          data: { subscriptionStatus: "past_due" },
        });
      }
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
