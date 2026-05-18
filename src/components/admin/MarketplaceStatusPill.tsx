"use client";

import { useState } from "react";

type Status = "not_yet" | "draft" | "copied" | "posted" | "sold";

export function MarketplaceStatusPill({ scanId, initialStatus }: { scanId: string; initialStatus: string | null }) {
  const [status, setStatus] = useState<Status>(normalizeStatus(initialStatus));
  const [busy, setBusy] = useState(false);

  const canToggle = status === "posted" || status === "sold";

  const onClick = async () => {
    if (!canToggle || busy) return;
    const nextStatus: Status = status === "posted" ? "sold" : "posted";
    setBusy(true);
    try {
      const res = await fetch(`/api/scans/${scanId}/fb-listing`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) setStatus(nextStatus);
    } finally {
      setBusy(false);
    }
  };

  const className = `rounded-full px-2.5 py-1 text-xs font-semibold ${pillClasses(status)} ${
    canToggle ? "cursor-pointer hover:opacity-90" : ""
  } ${busy ? "opacity-60" : ""}`;

  return (
    <button type="button" className={className} onClick={onClick} disabled={busy || !canToggle} title={canToggle ? "Click to flip posted/sold" : ""}>
      {pillLabel(status)}
    </button>
  );
}

function normalizeStatus(status: string | null): Status {
  if (status === "draft" || status === "copied" || status === "posted" || status === "sold") return status;
  return "not_yet";
}

function pillLabel(status: Status): string {
  if (status === "not_yet") return "Not yet";
  if (status === "draft") return "Draft";
  if (status === "copied") return "Copied";
  if (status === "posted") return "Posted";
  return "Sold";
}

function pillClasses(status: Status): string {
  if (status === "not_yet") return "bg-zinc-100 text-zinc-700";
  if (status === "draft") return "bg-amber-100 text-amber-800";
  if (status === "copied") return "bg-sky-100 text-sky-800";
  if (status === "posted") return "bg-emerald-100 text-emerald-800";
  return "bg-mint-50 text-mint-700";
}
