import Link from "next/link";
import { getStripe } from "@/lib/stripe";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

const TIER_LABELS: Record<string, string> = {
  week_pass: "Week Pass",
  pro_monthly: "Pro Monthly",
  pro_annual: "Pro Annual",
  founders_lifetime: "Founders Lifetime",
  device_addon: "Device add-on",
};

type Props = { searchParams: Promise<{ session_id?: string }> };

export default async function BillingSuccessPage({ searchParams }: Props) {
  const { session_id: sessionId } = await searchParams;
  const auth = await getSession();

  let tierLabel = "your plan";
  let receiptUrl: string | null = null;
  let nextBilling: string | null = null;

  if (sessionId) {
    const stripe = getStripe();
    if (stripe) {
      try {
        const checkout = await stripe.checkout.sessions.retrieve(sessionId, {
          expand: ["subscription"],
        });
        const tier = checkout.metadata?.tier;
        if (tier && TIER_LABELS[tier]) tierLabel = TIER_LABELS[tier];
        receiptUrl = checkout.url ?? null;

        const sub = checkout.subscription;
        if (sub && typeof sub === "object" && "current_period_end" in sub && sub.current_period_end) {
          nextBilling = new Date(sub.current_period_end * 1000).toLocaleDateString();
        }
      } catch (e) {
        console.error("billing success retrieve failed", e);
      }
    }
  }

  const ctaHref = auth ? "/admin" : "/scan";

  return (
    <section className="section-cream py-20">
      <div className="container-pricescout mx-auto max-w-lg text-center">
        <h1 className="section-title mb-4">You&apos;re in — {tierLabel}</h1>
        <p className="section-subtitle mb-8">
          Payment received. Your workspace will reflect the new tier within a minute after Stripe confirms the webhook.
        </p>
        {nextBilling ? (
          <p className="mb-6 text-sm text-muted">Next billing date: {nextBilling}</p>
        ) : null}
        {receiptUrl ? (
          <p className="mb-6 text-sm">
            <a href={receiptUrl} className="text-mint-600 underline" target="_blank" rel="noreferrer">
              Open Stripe checkout receipt
            </a>
          </p>
        ) : null}
        <Link href={ctaHref} className="btn-primary btn-large">
          {auth ? "Go to admin" : "Go to your scanner"}
        </Link>
      </div>
    </section>
  );
}
