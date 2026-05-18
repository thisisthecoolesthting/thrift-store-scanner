import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { MobileAppCard } from "@/components/admin/MobileAppCard";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const session = await getSession();
  if (!session) return null;

  const tenantId = session.tenantId;
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 7);

  const [totalScans, recent, categories, todaysPricings, draftedListings, postedListings, soldThisWeek] = await Promise.all([
    prisma.scan.count({ where: { tenantId } }),
    prisma.scan.findMany({
      where: { tenantId },
      orderBy: { scannedAt: "desc" },
      take: 8,
      include: { user: true, device: true },
    }),
    prisma.scan.groupBy({
      by: ["identifyCategory"],
      where: { tenantId },
      _count: { _all: true },
    }),
    prisma.scan.count({ where: { tenantId, scannedAt: { gte: todayStart } } }),
    prisma.scan.count({ where: { tenantId, fbListingStatus: "draft" } }),
    prisma.scan.count({ where: { tenantId, fbListingStatus: "posted" } }),
    prisma.scan.count({ where: { tenantId, fbListingStatus: "sold", fbListingPostedAt: { gte: weekStart } } }),
  ]);

  const hist = [...categories].sort((a, b) => (b._count._all ?? 0) - (a._count._all ?? 0));

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-bold text-ink">Dashboard</h1>
        <p className="mt-2 text-muted">Recent flip activity across your tenant.</p>
      </div>

      <MobileAppCard />

      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded-2xl border border-line/60 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-soft">Total scans</p>
          <p className="mt-2 text-4xl font-bold text-ink">{totalScans}</p>
        </div>
        <div className="rounded-2xl border border-line/60 bg-white p-6 shadow-sm md:col-span-2">
          <p className="text-sm font-medium text-soft">Categories (confidence buckets)</p>
          <ul className="mt-4 space-y-2">
            {hist.slice(0, 6).map((row) => (
              <li key={row.identifyCategory ?? "unknown"} className="flex justify-between text-sm">
                <span className="text-ink">{row.identifyCategory ?? "Uncategorized"}</span>
                <span className="font-semibold text-mint-700">{row._count._all}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <section className="rounded-2xl border border-line/60 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold text-ink">Tag list pulse</h2>
          <Link href="/admin/scans" className="text-sm font-medium text-mint-700 underline">
            Open scans
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <PulseStat label="Today&apos;s pricings" value={todaysPricings} />
          <PulseStat label="Drafted listings" value={draftedListings} />
          <PulseStat label="Posted to FB" value={postedListings} />
          <PulseStat label="Sold this week" value={soldThisWeek} />
        </div>
      </section>

      <section className="rounded-2xl border border-line/60 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold text-ink">Recent scans</h2>
          <Link href="/admin/scans" className="text-sm font-medium text-mint-700 underline">
            View all
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line/60 text-soft">
                <th className="py-2 pr-4 font-medium">Title</th>
                <th className="py-2 pr-4 font-medium">Verdict</th>
                <th className="py-2 pr-4 font-medium">Median</th>
                <th className="py-2 pr-4 font-medium">Staff</th>
                <th className="py-2 font-medium">When</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((s) => (
                <tr key={s.id} className="border-b border-line/40">
                  <td className="py-3 pr-4 font-medium text-ink">{s.identifyTitle ?? "—"}</td>
                  <td className="py-3 pr-4 capitalize text-muted">{s.verdict ?? "—"}</td>
                  <td className="py-3 pr-4 text-muted">
                    {s.compMedian != null ? `$${s.compMedian.toFixed(2)}` : "—"}
                  </td>
                  <td className="py-3 pr-4 text-muted">{s.user.name}</td>
                  <td className="py-3 text-muted">{s.scannedAt.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function PulseStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-line/60 bg-cream/40 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-soft">{label}</p>
      <p className="mt-1 text-2xl font-bold text-ink tabular-nums">{value}</p>
    </div>
  );
}
