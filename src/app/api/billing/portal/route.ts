import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST authenticated session → Stripe Billing Portal URL. */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenant = await prisma.tenant.findUnique({ where: { id: session.tenantId } });
  if (!tenant?.stripeCustomerId) {
    return NextResponse.json(
      { error: "no_customer", message: "Open the Customer Portal once checkout links this workspace to Stripe." },
      { status: 409 },
    );
  }

  const client = getStripe();
  if (!client) {
    return NextResponse.json(
      { error: "billing_not_ready", message: "Stripe billing is not configured yet for this deployment." },
      { status: 503 },
    );
  }

  const url = new URL(req.url);
  const origin =
    process.env.NEXT_PUBLIC_APP_URL ?? `${url.protocol}//${url.host}`;

  try {
    const portal = await client.billingPortal.sessions.create({
      customer: tenant.stripeCustomerId,
      return_url: `${origin}/admin/billing`,
    });
    if (!portal.url) {
      return NextResponse.json({ error: "stripe_no_url" }, { status: 500 });
    }
    return NextResponse.json({ url: portal.url });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "stripe_portal_failed" }, { status: 502 });
  }
}
