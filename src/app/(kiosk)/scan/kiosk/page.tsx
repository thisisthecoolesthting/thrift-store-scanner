import { Scanner } from "@/components/Scanner";

export const metadata = {
  title: "Kiosk scanner — PriceScout",
  description: "Full-screen back-room scanner for thrift stores and estate sales.",
};

export default function KioskScanPage() {
  return (
    <main className="flex h-full min-h-screen flex-col p-4">
      <Scanner kiosk />
    </main>
  );
}
