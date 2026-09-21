import type { Metadata } from "next";
import { Header } from "../components/site/header";
import { HomeHero } from "../components/home/hero";
import { FeaturedLaptops } from "../components/home/featured-laptops";
import { WhyKlarone } from "../components/home/why-klarone";
import { KlaroneSelect } from "../components/home/klarone-select";
import { KolkataSupport } from "../components/home/support";

export const metadata: Metadata = {
  title: "Klarone — Buy the right laptop, not just a laptop.",
};

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <Header />

      <main>
        <HomeHero />

        <FeaturedLaptops />

        <WhyKlarone />

        <KlaroneSelect />

        <KolkataSupport />
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-8 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div>
            <p className="font-semibold tracking-tight text-slate-950">
              Klarone
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Laptops, recommendations and ownership support.
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