"use client";

import { useState } from "react";
import type { CheckoutTier } from "@/lib/stripe";

type Props = {
  tier: CheckoutTier;
  label: string;
  primary?: boolean;
  quantity?: number;
};

export function CheckoutButton({ tier, label, primary, quantity = 1 }: Props) {
  const [loading, setLoading] = useState(false);

  return (
    <button
      type="button"
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        try {
          const res = await fetch("/api/billing/checkout", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tier, quantity }),
          });
          const data = (await res.json()) as { url?: string; error?: string; message?: string };
          if (!res.ok || !data.url) {
            alert(data.message ?? data.error ?? "Checkout could not start.");
            setLoading(false);
            return;
          }
          window.location.href = data.url;
        } catch {
          alert("Checkout could not start. Try again or email hello@pricescout.pro.");
          setLoading(false);
        }
      }}
      className={primary ? "btn-primary btn-full" : "btn-secondary btn-full"}
    >
      {loading ? "Redirecting…" : label}
    </button>
  );
}
