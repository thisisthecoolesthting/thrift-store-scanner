"use client";

import { useSearchParams } from "next/navigation";

export function PricingCancelToast() {
  const params = useSearchParams();
  const canceled = params.get("canceled") === "1" || params.get("checkout") === "cancel";

  if (!canceled) return null;

  return (
    <div
      role="status"
      className="mx-auto mb-8 max-w-2xl rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm text-amber-900"
    >
      Checkout canceled. No charge was made. Week Pass is risk-free if you want to try the scanner this weekend.
    </div>
  );
}

