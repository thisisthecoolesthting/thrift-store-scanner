"use client";

import { useState } from "react";
import { CircleDollarSign, ThumbsDown, ThumbsUp, HelpCircle, AlertTriangle, Copy, ExternalLink, X } from "lucide-react";
import type { FbCategory } from "@/lib/fb-listing";

export interface VerdictPayload {
  identify: { title: string; query: string; category: string; confidence: number; source: string };
  comp: { median: number | null; sampleSize: number; source: string; fetchedAt: string };
  score: {
    verdict: "buy" | "maybe" | "skip" | "unknown";
    netUsd: number | null;
    netMargin: number | null;
    score: number | null;
    explanation: string;
  };
  costBasis: number;
  scanId?: string;
}

const VERDICT_META: Record<
  VerdictPayload["score"]["verdict"],
  { label: string; bg: string; fg: string; icon: React.ComponentType<{ className?: string }> }
> = {
  buy: { label: "Buy", bg: "bg-brand-accent2", fg: "text-white", icon: ThumbsUp },
  maybe: { label: "Maybe", bg: "bg-amber-500", fg: "text-white", icon: AlertTriangle },
  skip: { label: "Skip", bg: "bg-rose-500", fg: "text-white", icon: ThumbsDown },
  unknown: { label: "Unknown", bg: "bg-zinc-500", fg: "text-white", icon: HelpCircle },
};

export function PriceVerdict({ payload }: { payload: VerdictPayload | null }) {
  const [panelOpen, setPanelOpen] = useState(false);
  const [draft, setDraft] = useState<FbListingDraftState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  if (!payload) return null;
  const meta = VERDICT_META[payload.score.verdict];
  const Icon = meta.icon;
  const fmt = (n: number | null, prefix = "") =>
    n == null ? "—" : `${prefix}${n.toFixed(2)}`;
  const fmtPct = (n: number | null) => (n == null ? "—" : `${Math.round(n * 100)}%`);
  const suggestedLow = payload.comp.median != null ? Math.max(1, Math.round(payload.comp.median * 0.8)) : 10;
  const suggestedHigh =
    payload.comp.median != null ? Math.max(suggestedLow + 1, Math.round(payload.comp.median * 1.1)) : 25;

  const openMarketplacePanel = async () => {
    if (!payload.scanId) {
      setError("Sign in to save a listing draft from this scan.");
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/scans/${payload.scanId}/fb-listing`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ priceCents: suggestedLow * 100 }),
      });
      if (!res.ok) throw new Error(`Could not create draft (${res.status})`);
      const json = (await res.json()) as { draft: FbListingDraftState };
      setDraft(json.draft);
      setPanelOpen(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate listing draft.");
    } finally {
      setBusy(false);
    }
  };

  const saveDraft = async () => {
    if (!payload.scanId || !draft) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/scans/${payload.scanId}/fb-listing`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (!res.ok) throw new Error(`Could not save draft (${res.status})`);
      setNotice("Draft saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save draft.");
    } finally {
      setBusy(false);
    }
  };

  const copyAndOpen = async () => {
    if (!payload.scanId || !draft) return;
    setBusy(true);
    setError(null);
    try {
      const copyBlock = [
        `TITLE: ${draft.title}`,
        `CATEGORY: ${draft.category}`,
        `PRICE: $${(draft.priceCents / 100).toFixed(2)}`,
        "",
        "DESCRIPTION:",
        draft.description,
      ].join("\n");

      await navigator.clipboard.writeText(copyBlock);
      await fetch(`/api/scans/${payload.scanId}/fb-listing`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "copied" }),
      });
      window.open("https://www.facebook.com/marketplace/create/item", "_blank", "noopener,noreferrer");
      setNotice("Copied. Facebook Marketplace opened in a new tab.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Copy flow failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <article className="card overflow-hidden p-0">
        <header
          className={`flex items-center justify-between gap-3 px-5 py-3 ${meta.bg} ${meta.fg}`}
        >
          <div className="flex items-center gap-2">
            <Icon className="h-5 w-5" />
            <span className="font-display text-lg font-semibold">{meta.label}</span>
          </div>
          {payload.score.score != null ? (
            <span className="text-sm font-semibold tabular-nums">{payload.score.score}/100</span>
          ) : null}
        </header>

        <div className="p-5">
          <h3 className="font-display text-lg font-semibold text-brand-ink">
            {payload.identify.title}
          </h3>
          <p className="text-xs text-brand-mute">
            {payload.identify.category} &middot; ID source: {payload.identify.source} &middot;{" "}
            confidence {fmtPct(payload.identify.confidence)}
          </p>

          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <Stat label="Comp median" value={fmt(payload.comp.median, "$")} />
            <Stat label="Sample" value={`${payload.comp.sampleSize}`} />
            <Stat
              label="Item cost"
              value={`$${payload.costBasis.toFixed(2)}`}
            />
            <Stat
              label="Net (est.)"
              value={fmt(payload.score.netUsd, "$")}
              tone={payload.score.verdict === "buy" ? "good" : payload.score.verdict === "skip" ? "bad" : undefined}
            />
          </dl>

          <p className="mt-4 text-sm text-brand-ink/80">
            <CircleDollarSign aria-hidden className="mr-1 inline h-4 w-4 text-brand-accent" />
            <span dangerouslySetInnerHTML={{ __html: payload.score.explanation }} />
          </p>

          <p className="mt-3 text-[11px] uppercase tracking-wide text-brand-mute">
            Comp source: {payload.comp.source} &middot; fetched {timeAgo(payload.comp.fetchedAt)}
          </p>

          <div className="mt-4 border-t border-brand-ink/10 pt-4">
            <button
              type="button"
              onClick={openMarketplacePanel}
              disabled={busy}
              className="btn-accent w-full disabled:cursor-not-allowed disabled:opacity-60"
            >
              Post to Marketplace
            </button>
            {error ? <p className="mt-2 text-xs text-rose-700">{error}</p> : null}
            {notice ? <p className="mt-2 text-xs text-emerald-700">{notice}</p> : null}
          </div>
        </div>
      </article>

      {panelOpen && draft ? (
        <div className="fixed inset-0 z-[70]">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label="Close listing panel"
            onClick={() => setPanelOpen(false)}
          />
          <aside className="absolute inset-y-0 right-0 z-[71] w-full max-w-xl overflow-y-auto bg-white p-5 shadow-2xl ring-1 ring-black/5">
            <div className="mb-4 flex items-center justify-between">
              <h4 className="font-display text-xl font-semibold text-brand-ink">Marketplace listing</h4>
              <button type="button" onClick={() => setPanelOpen(false)} className="btn-ghost px-2 py-2">
                <X className="h-4 w-4" />
              </button>
            </div>

            <label className="mb-3 block text-xs font-semibold uppercase tracking-wide text-brand-mute">
              Title ({draft.title.length}/80)
              <input
                type="text"
                maxLength={80}
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                className="mt-1 block w-full rounded-md border border-brand-ink/20 px-3 py-2 text-sm"
              />
            </label>

            <label className="mb-3 block text-xs font-semibold uppercase tracking-wide text-brand-mute">
              Category
              <select
                value={draft.category}
                onChange={(e) => setDraft({ ...draft, category: e.target.value as FbCategory })}
                className="mt-1 block w-full rounded-md border border-brand-ink/20 bg-white px-3 py-2 text-sm"
                title="Facebook may adjust category options in its composer."
              >
                {FB_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>

            <label className="mb-3 block text-xs font-semibold uppercase tracking-wide text-brand-mute">
              Price
              <input
                type="number"
                min={1}
                step={1}
                value={Math.max(1, Math.round(draft.priceCents / 100))}
                onChange={(e) => {
                  const dollars = Math.max(1, Number(e.target.value || 1));
                  setDraft({ ...draft, priceCents: Math.round(dollars * 100) });
                }}
                className="mt-1 block w-full rounded-md border border-brand-ink/20 px-3 py-2 text-sm"
              />
              <p className="mt-1 text-[11px] normal-case text-brand-mute">
                Suggested range: ${suggestedLow} - ${suggestedHigh}
              </p>
            </label>

            <label className="mb-3 block text-xs font-semibold uppercase tracking-wide text-brand-mute">
              Description ({draft.description.length}/1000)
              <textarea
                maxLength={1000}
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                rows={8}
                className="mt-1 block w-full rounded-md border border-brand-ink/20 px-3 py-2 text-sm"
              />
            </label>

            {draft.photoUrl ? (
              <div className="mb-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-mute">Photo preview</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={draft.photoUrl} alt="Scan capture" className="h-auto w-full rounded-lg border border-brand-ink/10" />
              </div>
            ) : null}

            <div className="sticky bottom-0 mt-6 space-y-2 border-t border-brand-ink/10 bg-white pt-4">
              <button type="button" onClick={copyAndOpen} disabled={busy} className="btn-accent w-full">
                <Copy className="mr-2 h-4 w-4" />
                Copy listing + open FB Marketplace
                <ExternalLink className="ml-2 h-4 w-4" />
              </button>
              <button type="button" onClick={saveDraft} disabled={busy} className="btn-ghost w-full">
                Save as draft
              </button>
              {error ? <p className="text-xs text-rose-700">{error}</p> : null}
              {notice ? <p className="text-xs text-emerald-700">{notice}</p> : null}
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}

const FB_CATEGORIES: FbCategory[] = [
  "Apparel",
  "Books",
  "Electronics",
  "Furniture",
  "Home",
  "Kids",
  "Music",
  "Tools",
  "Toys",
  "Sports",
  "Other",
];

type FbListingDraftState = {
  title: string;
  category: FbCategory;
  priceCents: number;
  description: string;
  photoUrl: string;
};

function Stat({ label, value, tone }: { label: string; value: string; tone?: "good" | "bad" }) {
  const toneClass =
    tone === "good" ? "text-brand-accent2" : tone === "bad" ? "text-rose-600" : "text-brand-ink";
  return (
    <div className="rounded-md bg-brand-paper px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-brand-mute">{label}</div>
      <div className={`text-sm font-semibold tabular-nums ${toneClass}`}>{value}</div>
    </div>
  );
}

function timeAgo(iso: string): string {
  const d = Date.parse(iso);
  if (!Number.isFinite(d)) return "—";
  const sec = Math.max(0, Math.round((Date.now() - d) / 1000));
  if (sec < 60) return `${sec}s ago`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  return `${hr}h ago`;
}

