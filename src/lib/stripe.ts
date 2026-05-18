import Stripe from "stripe";

const API_VERSION = "2024-12-18.acacia";

export type CheckoutTier =
  | "week_pass"
  | "pro_monthly"
  | "pro_annual"
  | "founders_lifetime"
  | "device_addon";

export const PRICE_IDS: Record<CheckoutTier, string | undefined> = {
  week_pass: process.env.STRIPE_PRICE_WEEK_PASS,
  pro_monthly: process.env.STRIPE_PRICE_PRO_MONTHLY,
  pro_annual: process.env.STRIPE_PRICE_PRO_ANNUAL,
  founders_lifetime: process.env.STRIPE_PRICE_FOUNDERS_LIFETIME,
  device_addon: process.env.STRIPE_PRICE_DEVICE_ADDON,
};

export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key, { apiVersion: API_VERSION, typescript: true });
}

export function checkoutMode(tier: CheckoutTier): Stripe.Checkout.SessionCreateParams.Mode {
  if (tier === "week_pass" || tier === "founders_lifetime") return "payment";
  return "subscription";
}

export const tierCheckoutMode = checkoutMode;

export function priceIdForTier(tier: CheckoutTier): string | undefined {
  return PRICE_IDS[tier];
}
