import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { MarketplaceStatusPill } from "@/components/admin/MarketplaceStatusPill";

const PAGE_SIZE = 25;
const MARKET_STATUS_VALUES = ["not_yet", "draft", "copied", "posted", "sold"] as const;
type MarketStatus = (typeof MARKET_STATUS_VALUES)[number];

export const dynamic = "force-dynamic";

export default async function AdminScansPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; marketplace?: string }>;
}) {
  const session = await getSession();
  if (!session) return null;

  const sp = await searchParams;
  const marketplaceRaw = sp.marketplace ?? "all";
  const marketplaceFilter = MARKET_STATUS_VALUES.includes(marketplaceRaw as MarketStatus)
    ? (marketplaceRaw as MarketStatus)
    : "all";
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const skip = (page - 1) * PAGE_SIZE;

  const tenantId = session.tenantId;
  const where = {
    tenantId,
    ...(marketplaceFilter === "all"
      ? {}
      : marketplaceFilter === "not_yet"
        ? { fbListingStatus: null }
        : { fbListingStatus: marketplaceFilter }),
  };

  const [total, scans] = await Promise.all([
    prisma.scan.count({ where }),
    prisma.scan.findMany({
      where,
      orderBy: { scannedAt: "desc" },
      skip,
      take: PAGE_SIZE,
      include: { user: true, device: true },
    }),
  ]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-ink">Scans</h1>
        <p className="mt-2 text-muted">
          Paginated tag list ({total} rows). Showing page {page} of {pages}.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-line/60 bg-white p-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-soft">Marketplace status:</span>
        {[
          { key: "all", label: "All" },
          { key: "not_yet", label: "Not yet" },
          { key: "draft", label: "Draft" },
          { key: "copied", label: "Copied" },
          { key: "posted", label: "Posted" },
          { key: "sold", label: "Sold" },
        ].map((opt) => {
          const active = marketplaceFilter === opt.key;
          return (
            <Link
              key={opt.key}
              href={`/admin/scans?page=1&marketplace=${opt.key}`}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                active ? "bg-mint-600 text-white" : "bg-cream text-ink hover:bg-cream/80"
              }`}
            >
              {opt.label}
            </Link>
          );
        })}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-line/60 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-line/60 bg-cream/60">
            <tr className="text-soft">
              <th className="px-4 py-3 font-semibold">Title</th>
              <th className="px-4 py-3 font-semibold">Category</th>
              <th className="px-4 py-3 font-semibold">Note</th>
              <th className="px-4 py-3 font-semibold">Median</th>
              <th className="px-4 py-3 font-semibold">Staff</th>
              <th className="px-4 py-3 font-semibold">Device</th>
              <th className="px-4 py-3 font-semibold">Marketplace status</th>
              <th className="px-4 py-3 font-semibold">When</th>
            </tr>
          </thead>
          <tbody>
            {scans.map((s) => (
              <tr key={s.id} className="border-b border-line/40">
                <td className="px-4 py-3 font-medium text-ink">{s.identifyTitle ?? "—"}</td>
                <td className="px-4 py-3 text-muted">{s.identifyCategory ?? "—"}</td>
                <td className="px-4 py-3 capitalize text-muted">{s.verdict ?? "—"}</td>
                <td className="px-4 py-3 text-muted">
                  {s.compMedian != null ? `$${s.compMedian.toFixed(2)}` : "—"}
                </td>
                <td className="px-4 py-3 text-muted">{s.user.name}</td>
                <td className="px-4 py-3 text-muted">{s.device?.name ?? "—"}</td>
                <td className="px-4 py-3">
                  <MarketplaceStatusPill scanId={s.id} initialStatus={s.fbListingStatus} />
                </td>
                <td className="px-4 py-3 text-muted">{s.scannedAt.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-soft">
          Page {page} / {pages}
        </p>
        <div className="flex gap-3">
          {page > 1 ? (
            <Link
              href={`/admin/scans?page=${page - 1}${marketplaceFilter === "all" ? "" : `&marketplace=${marketplaceFilter}`}`}
              className="rounded-xl border border-line/70 px-4 py-2 text-sm font-medium text-ink hover:bg-cream"
            >
              Previous
            </Link>
          ) : (
            <span className="rounded-xl border border-transparent px-4 py-2 text-sm text-soft">Previous</span>
          )}
          {page < pages ? (
            <Link
              href={`/admin/scans?page=${page + 1}${marketplaceFilter === "all" ? "" : `&marketplace=${marketplaceFilter}`}`}
              className="rounded-xl border border-line/70 px-4 py-2 text-sm font-medium text-ink hover:bg-cream"
            >
              Next
            </Link>
          ) : (
            <span className="rounded-xl border border-transparent px-4 py-2 text-sm text-soft">Next</span>
          )}
        </div>
      </div>
    </div>
  );
}
