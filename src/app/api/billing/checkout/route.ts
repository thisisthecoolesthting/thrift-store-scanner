import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { checkoutBodySchema, checkoutTierSchema } from "@/lib/api-schemas";
import { getSession } from "@/lib/session";
import { getStripe, priceIdForTier, tierCheckoutMode, type CheckoutTier } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function appOrigin(req: Request): string {
  const url = new URL(req.url);
  return process.env.NEXT_PUBLIC_APP_URL ?? `${url.protocol}//${url.host}`;
}

async function createCheckoutSession(
  req: Request,
  tier: CheckoutTier,
  quantity: number,
): Promise<NextResponse> {
  const client = getStripe();
  const priceId = priceIdForTier(tier);

  if (!client || !priceId) {
    return NextResponse.json(
      {
        error: "billing_not_ready",
        message:
          "Billing is being set up. Email hello@pricescout.pro and we will lock in your tier when the gateway is live.",
        tier,
      },
      { status: 503 },
    );
  }

  const session = await getSession();
  const origin = appOrigin(req);

  const checkout = await client.checkout.sessions.create({
    mode: tierCheckoutMode(tier),
    line_items: [{ price: priceId, quantity }],
    success_url: `${origin}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/pricing?canceled=1`,
    customer_email: session?.email,
    client_reference_id: session?.tenantId ?? `guest-${randomUUID()}`,
    metadata: {
      tier,
      tenantId: session?.tenantId ?? "",
      userId: session?.userId ?? "",
      tenant_slug: process.env.DEFAULT_TENANT_SLUG ?? "",
    },
    allow_promotion_codes: true,
    billing_address_collection: "auto",
  });

  if (!checkout.url) {
    return NextResponse.json({ error: "stripe_no_url" }, { status: 500 });
  }

  return NextResponse.json({ url: checkout.url });
}

/** POST JSON { tier, quantity? } — primary path for CheckoutButton. */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = checkoutBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "unknown_tier", message: "That tier is not recognized." },
      { status: 400 },
    );
  }

  return createCheckoutSession(req, parsed.data.tier, parsed.data.quantity ?? 1);
}

/** GET ?tier=… — legacy redirect for bookmarked pricing links. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const tierRaw = url.searchParams.get("tier");
  const tierParsed = tierRaw ? checkoutTierSchema.safeParse(tierRaw) : { success: false as const };
  if (!tierParsed.success) {
    return NextResponse.json({ error: "unknown_tier" }, { status: 400 });
  }

  const res = await createCheckoutSession(req, tierParsed.data, 1);
  if (res.status !== 200) return res;
  const { url: checkoutUrl } = (await res.json()) as { url: string };
  return NextResponse.redirect(checkoutUrl, 303);
}
