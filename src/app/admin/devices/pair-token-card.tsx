"use client";

import { useMemo, useState } from "react";
import QRCode from "qrcode";

type PairResponse = {
  token: string;
  pairUrl: string;
  expiresAt: string;
};

export function CreatePairTokenCard() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pair, setPair] = useState<PairResponse | null>(null);
  const [qrData, setQrData] = useState<string | null>(null);

  const expiresLabel = useMemo(() => {
    if (!pair) return "";
    return new Date(pair.expiresAt).toLocaleTimeString();
  }, [pair]);

  async function createToken() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/devices/pair-token", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ deviceKind: "phone" }),
      });
      if (!res.ok) {
        setError("Could not create a pair token right now.");
        return;
      }
      const json = (await res.json()) as PairResponse;
      setPair(json);
      const data = await QRCode.toDataURL(json.pairUrl, { width: 220, margin: 1 });
      setQrData(data);
    } catch {
      setError("Could not create a pair token right now.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-2xl border border-line/60 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-ink">Add device</h2>
          <p className="mt-1 text-sm text-muted">
            Generate a 5-minute QR pair token for a phone or kiosk browser.
          </p>
        </div>
        <button
          type="button"
          onClick={createToken}
          disabled={loading}
          className="btn-primary px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? "Generating..." : "Generate QR"}
        </button>
      </div>

      {error ? <p className="mt-3 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}

      {pair && qrData ? (
        <div className="mt-5 grid gap-4 sm:grid-cols-[240px_1fr] sm:items-start">
          {/* eslint-disable-next-line @next/next/no-img-element -- QR data URL generated client-side */}
          <img src={qrData} alt="Device pair QR" className="rounded-xl border border-line" />
          <div className="space-y-2">
            <p className="text-sm text-ink">
              Token expires at <strong>{expiresLabel}</strong>.
            </p>
            <p className="rounded-lg bg-cream px-3 py-2 font-mono text-xs text-soft break-all">{pair.pairUrl}</p>
          </div>
        </div>
      ) : null}
    </section>
  );
}

