import { Suspense } from "react";
import { PricingTiers } from "@/components/PricingTiers";
import { PricingCancelToast } from "@/components/PricingCancelToast";
import { FAQ } from "@/components/FAQ";
import { brand } from "@/lib/brand";
import EbayTrustStrip from "@/components/EbayTrustStrip";

const PRICING_DEVICE_FAQ = [
  {
    q: "Does the back-room laptop count toward the 4 scanner installs?",
    a: "Yes. Each registered browser counts as one install, same as a phone. The 4-included pool covers any mix.",
  },
  {
    q: "What if my laptop loses its registration?",
    a: "Browsers re-register on first scan after a session expires. We don't double-charge a device that legitimately re-paired itself within 30 days.",
  },
];

export const metadata = {
  title: `Pricing — ${brand.name}`,
  description: `Pricing for ${brand.name}: Week Pass $29, Pro Monthly $49, Pro Annual $490, Founders Lifetime $699 (cap 100). Up to 4 scanners on every tier; add devices for $15/mo each.`,
};

export default function PricingPage() {
  return (
    <section className="section-cream py-20">
      <EbayTrustStrip />

      <div className="container-pricescout">
        <div className="section-header-center">
          <h1 className="section-title">Pricing that fits the size of your operation</h1>
          <p className="section-subtitle">
            Running a one-weekend yard sale? Grab a Week Pass. Running a thrift store year-round? Pro Annual saves you
            ~17%. Up to 4 scanners on every tier; add more for $15/mo each.
          </p>
        </div>
        <Suspense fallback={null}>
          <PricingCancelToast />
        </Suspense>
        <div className="mt-16">
          <PricingTiers />
        </div>
        <div className="mx-auto mt-14 max-w-3xl">
          <h2 className="mb-6 text-center text-xl font-semibold text-ink">Scanner installs</h2>
          <FAQ items={PRICING_DEVICE_FAQ} />
        </div>
        <div className="mx-auto mt-12 max-w-2xl text-center text-sm text-soft">
          <p>
            Stripe handles billing. Cancel anytime. Founders Lifetime is a one-time purchase &mdash; no subscription,
            no renewals.
          </p>
          <p className="mt-2">
            Each subscription runs across up to 4 scanner installs (Android live; iOS in review). Add additional
            scanners for $15/month each &mdash; manage devices in the app&rsquo;s Devices tab.
          </p>
        </div>
      </div>
    </section>
  );
}
