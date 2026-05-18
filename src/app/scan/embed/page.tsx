import Link from "next/link";
import { brand } from "@/lib/brand";

export const metadata = {
  title: `Embedded scanner — ${brand.name}`,
  description: "Embedded scanner route placeholder for partner integrations.",
};

export default function ScanEmbedPage() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-16 text-center">
      <h1 className="text-3xl font-semibold text-ink">Embedded scanner</h1>
      <p className="mt-3 text-base text-soft">
        Coming soon - contact{" "}
        <a className="font-medium text-mint-600 hover:underline" href="mailto:partnerships@pricescout.pro">
          partnerships@pricescout.pro
        </a>
        .
      </p>
      <p className="mt-6">
        <Link href="/scan" className="btn-primary">
          Back to scanner
        </Link>
      </p>
    </section>
  );
}

