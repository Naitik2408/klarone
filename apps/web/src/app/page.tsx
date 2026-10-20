import type { Metadata } from "next";
import { StorefrontHeader } from "../components/storefront/header";
import { StorefrontHero } from "../components/storefront/hero";
import { StorefrontProductSection } from "../components/storefront/product-section";
import { StorefrontFormulationsSection } from "../components/storefront/formulations-section";
import { StorefrontGutHealthSection } from "../components/storefront/gut-health-section";
import { StorefrontFooter } from "../components/storefront/newsletter-and-footer";
import { SmoothScrollProvider } from "../components/storefront/smooth-scroll-provider";

import { getProducts, getCollections } from "../lib/api";

export const metadata: Metadata = {
  title: "Klarone — Laptop Ownership Ecosystem | Choose, Buy, Maintain in Kolkata",
  description:
    "Klarone helps you choose, buy, set up, repair, and upgrade the right laptop with AI recommendations and fast local support in Kolkata.",
  openGraph: {
    title: "Klarone — Laptop Ownership Ecosystem | Kolkata",
    description:
      "Tell Klarone what you need. Klarone helps you choose what actually fits, buy authentic hardware, and get lifetime local support and upgrades in Kolkata.",
  },
};

export default async function StorefrontHomePage() {
  const [topProductsResponse, collectionsData] = await Promise.all([
    getProducts({
      collectionSlug: "top-picks",
      pageSize: 6,
    }).catch(() => null),
    getCollections().catch(() => []),
  ]);

  const topProducts = topProductsResponse?.items ?? [];
  const collections = collectionsData ?? [];

  return (
    <SmoothScrollProvider>
      <div className="min-h-screen w-full overflow-x-clip bg-[#07090e] font-sans antialiased selection:bg-[#d6f088] selection:text-slate-950">
        {/* 1. Floating Capsule Header */}
        <StorefrontHeader />

        <main className="relative w-full overflow-x-clip">
          {/* 2. Hero Section: Split Dual-Tone Background & Typography */}
          <StorefrontHero />

          {/* 3. Product Catalog Section: 'Month's top products' with carousel controls */}
          <StorefrontProductSection initialProducts={topProducts} />

          {/* 4. Collections Section: Top 3 curated collections from admin panel */}
          <StorefrontFormulationsSection initialCollections={collections} />

          {/* 5. Services Section: 4 Core Klarone Services (Select, Setup, Care, Upgrade) */}
          <StorefrontGutHealthSection />
        </main>

        {/* Storefront Luxury Editorial Footer */}
        <StorefrontFooter />
      </div>
    </SmoothScrollProvider>
  );
}
