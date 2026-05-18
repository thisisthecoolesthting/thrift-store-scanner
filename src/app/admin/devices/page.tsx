import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { brand } from "@/lib/brand";
import { MobileAppCard } from "@/components/admin/MobileAppCard";
import { addDevice, renameDevice, revokeDevice } from "./actions";
import { CreatePairTokenCard } from "./pair-token-card";

export const dynamic = "force-dynamic";

export default async function AdminDevicesPage() {
  const session = await getSession();
  if (!session) return null;

  const tenantId = session.tenantId;

  const [tenant, devices, scanCounts] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: tenantId } }),
    prisma.device.findMany({
      where: { tenantId },
      orderBy: { createdAt: "asc" },
    }),
    prisma.scan.groupBy({
      by: ["deviceId"],
      where: {
        tenantId,
        scannedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        deviceId: { not: null },
      },
      _count: { _all: true },
    }),
  ]);
  const scanCountMap = new Map(scanCounts.map((r) => [r.deviceId, r._count._all]));

  const origin = process.env.NEXT_PUBLIC_APP_URL ?? "https://pricescout.pro";
  const scanUrl = `${origin.replace(/\/$/, "")}/scan`;

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-bold text-ink">Devices</h1>
        <p className="mt-2 text-muted">
          Up to {tenant?.deviceLimit ?? 4} active installs on your plan — revoke retired phones anytime.
        </p>
      </div>

      <MobileAppCard />

      <section className="rounded-2xl border border-line/60 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-ink">Install URL</h2>
        <p className="mt-2 text-sm text-muted">
          Crew opens this URL on each scanner phone ({brand.name} web app). QR encode during onboarding UI polish.
        </p>
        <code className="mt-4 block rounded-xl bg-cream px-4 py-3 text-sm text-ink">{scanUrl}</code>
        <div className="mt-4 flex flex-wrap gap-3">
          <a
            href="/scan/kiosk"
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-line/70 px-3 py-2 text-sm font-medium text-ink hover:bg-cream"
          >
            Open kiosk mode in a new tab
          </a>
          <details className="group relative">
            <summary className="list-none cursor-pointer rounded-lg border border-line/70 px-3 py-2 text-sm font-medium text-ink hover:bg-cream">
              Add device
            </summary>
            <div className="absolute left-0 top-[calc(100%+0.5rem)] z-20 w-[min(92vw,34rem)] rounded-2xl border border-line/70 bg-white p-4 shadow-soft">
              <CreatePairTokenCard />
            </div>
          </details>
          <a href="/admin/devices/pair" className="rounded-lg border border-line/70 px-3 py-2 text-sm font-medium text-ink hover:bg-cream">
            Open full QR pair view
          </a>
        </div>
      </section>

      <section className="rounded-2xl border border-line/60 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-ink">Register another phone</h2>
        <form action={addDevice} className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <label className="mb-1 block text-xs font-medium text-soft" htmlFor="name">
              Friendly name
            </label>
            <input
              id="name"
              name="name"
              required
              placeholder="Front counter Pixel"
              className="w-full rounded-xl border border-line/70 px-4 py-2 text-sm text-ink outline-none ring-mint-500/30 focus:ring-2"
            />
          </div>
          <button type="submit" className="btn-primary px-6 py-2 text-sm">
            Add device slot
          </button>
        </form>
      </section>

      <div className="overflow-x-auto rounded-2xl border border-line/60 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-line/60 bg-cream/60">
            <tr className="text-soft">
              <th className="px-4 py-3 font-semibold">Kind</th>
              <th className="px-4 py-3 font-semibold">Name</th>
              <th className="px-4 py-3 font-semibold">Last seen</th>
              <th className="px-4 py-3 font-semibold">Scan count (30d)</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
        {devices.map((d) => (
            <tr key={d.id} className="border-b border-line/40 align-top">
              <td className="px-4 py-3 capitalize text-muted">{d.kind}</td>
              <td className="px-4 py-3">
                <p className="font-semibold text-ink">{d.name}</p>
                <p className="text-xs text-soft">
                  Fingerprint <span className="font-mono">{d.installFingerprint}</span>
                </p>
              </td>
              <td className="px-4 py-3 text-muted">{d.lastSeenAt ? d.lastSeenAt.toLocaleString() : "never"}</td>
              <td className="px-4 py-3 text-muted">{scanCountMap.get(d.id) ?? 0}</td>
              <td className="px-4 py-3 capitalize text-muted">{d.status}</td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-3">
              <form action={renameDevice} className="flex gap-2">
                <input type="hidden" name="deviceId" value={d.id} />
                <input
                  name="name"
                  defaultValue={d.name}
                  className="rounded-lg border border-line/70 px-3 py-2 text-sm"
                />
                <button type="submit" className="rounded-lg border border-line/70 px-3 py-2 text-sm hover:bg-cream">
                  Rename
                </button>
              </form>
              {d.status === "active" ? (
                <form action={revokeDevice}>
                  <input type="hidden" name="deviceId" value={d.id} />
                  <button
                    type="submit"
                    className="rounded-lg border border-red-200 px-3 py-2 text-sm text-red-700 hover:bg-red-50"
                  >
                    Revoke
                  </button>
                </form>
              ) : null}
                </div>
              </td>
            </tr>
        ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
