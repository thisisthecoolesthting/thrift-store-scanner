import Link from "next/link";
import { Camera } from "lucide-react";
import { brand } from "@/lib/brand";

export const metadata = {
  title: `Watch a 90-second tour — ${brand.name}`,
  description: `Watch ${brand.name} in action: snap an item, get the resale price and tag price, save to a shared crew tag list. About 90 seconds.`,
};

export default function WatchPage() {
  return (
    <>
      {/* HERO ------------------------------------------------------------ */}
      <section className="hero-bg hero-grain relative overflow-hidden pt-28 pb-16 sm:pt-32">
        <div className="container-pricescout relative">
          <div className="mx-auto max-w-3xl text-center">
            <span className="pill bg-mint-500/10 text-mint-600">90-second tour</span>
            <h1 className="gradient-text mb-4 mt-4 text-3xl font-bold leading-[1.1] tracking-tight sm:text-5xl">
              See the scanner in action
            </h1>
            <p className="text-lg text-muted">
              Watch the back-room flow: snap an item, get the resale price, agree on a tag price, sticker goes on. Whole crew scanning at once.
            </p>
          </div>
        </div>
      </section>

      {/* VIDEO PANEL ----------------------------------------------------- */}
      <section className="bg-white pb-20">
        <div className="container-pricescout">
          <div className="mx-auto max-w-4xl">
            <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-line bg-ink shadow-[0_30px_60px_-20px_rgba(17,203,157,0.25)]">
              {process.env.NEXT_PUBLIC_VIMEO_WALKTHROUGH_ID ? (
                <iframe
                  src={`https://player.vimeo.com/video/${process.env.NEXT_PUBLIC_VIMEO_WALKTHROUGH_ID}?autoplay=0&loop=0&muted=1&title=0&byline=0&portrait=0`}
                  className="h-full w-full"
                  allow="autoplay; fullscreen; picture-in-picture"
                  allowFullScreen
                  title="PriceScout walkthrough"
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center p-8 text-center">
                  <p className="text-soft">
                    Walkthrough video coming soon &mdash; in the meantime, <Link href="/scan" className="text-mint-600 underline">try the scanner</Link>.
                  </p>
                  <video className="mt-6 hidden h-full w-full max-w-2xl rounded-xl object-cover sm:block" controls playsInline muted poster="/images/app-interface.jpg" preload="metadata">
                    <source src="/videos/walkthrough.webm" type="video/webm" />
                  </video>
                </div>
              )}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/60 via-transparent to-transparent" aria-hidden />
              <div className="pointer-events-none absolute bottom-6 left-0 right-0 flex justify-center">
                <Link
                  href="/scan"
                  className="pointer-events-auto btn-primary btn-large shadow-lg"
                >
                  <Camera aria-hidden className="mr-2 h-5 w-5" />
                  Try the scanner now
                </Link>
              </div>
            </div>
            <p className="mt-4 text-center text-xs text-soft">
              About 90 seconds &middot; covers scan &rarr; comp &rarr; tag suggestion &rarr; tag price &rarr; save to crew tag list.
            </p>
          </div>
        </div>
      </section>

      {/* SECONDARY CTA --------------------------------------------------- */}
      <section className="section-cream py-14">
        <div className="container-pricescout">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="section-title">Like what you see?</h2>
            <p className="section-subtitle">
              Try the scanner free, then pick a tier when your crew&rsquo;s ready. Up to 4 scanner installs on every plan.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link href="/scan" className="btn-primary btn-large">
                Try the scanner
              </Link>
              <Link href="/pricing" className="btn-secondary btn-large">
                See pricing
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
