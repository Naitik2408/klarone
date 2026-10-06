import type { Metadata } from "next";
import { Header } from "../components/site/header";
import { HomeHero } from "../components/home/hero";
import { FeaturedLaptops } from "../components/home/featured-laptops";
import { WhyKlarone } from "../components/home/why-klarone";
import { KlaroneSelect } from "../components/home/klarone-select";
import { KolkataSupport } from "../components/home/support";

export const metadata: Metadata = {
  title: "Klarone — Buy the right laptop, not just a laptop.",
  description:
    "Find the right laptop with Klarone Select, shop curated laptops, and get local support for setup, repairs and upgrades.",
};

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-slate-950">
      <Header />

      <main className="overflow-hidden">
        <HomeHero />

        <FeaturedLaptops />

        <WhyKlarone />

        <KlaroneSelect />

        <KolkataSupport />
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-end md:justify-between lg:px-8">
          <div>
            <p className="text-lg font-semibold tracking-tight text-slate-950">
              Klarone
            </p>

            <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
              Laptops, recommendations and ownership support — built around
              helping you make a better laptop decision.
            </p>
          </div>

          <p className="text-sm text-slate-400">
            © {new Date().getFullYear()} Klarone
          </p>
        </div>
      </footer>
    </div>
  );
}
