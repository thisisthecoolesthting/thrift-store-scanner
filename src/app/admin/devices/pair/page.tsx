import { CreatePairTokenCard } from "../pair-token-card";

export const dynamic = "force-dynamic";

export default function AdminDevicesPairPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-ink">Pair a device</h1>
        <p className="mt-2 text-muted">
          Open this page on your admin station, generate a token, and scan it with the phone you want to pair.
        </p>
      </div>
      <CreatePairTokenCard />
    </div>
  );
}

