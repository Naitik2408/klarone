import type { Metadata } from "next";
import { StorefrontHeader } from "../components/storefront/header";
import { StorefrontHero } from "../components/storefront/hero";
import { StorefrontProductSection } from "../components/storefront/product-section";
import { StorefrontFormulationsSection } from "../components/storefront/formulations-section";
import { StorefrontGutHealthSection } from "../components/storefront/gut-health-section";
import { StorefrontTestimonialSection } from "../components/storefront/testimonial-section";
import { StorefrontSkinHealthSection } from "../components/storefront/skin-health-section";
import { StorefrontCollectionsShowcase } from "../components/storefront/collections-showcase";
import {
  StorefrontNewsletterSection,
  StorefrontFooter,
} from "../components/storefront/newsletter-and-footer";
import { SmoothScrollProvider } from "../components/storefront/smooth-scroll-provider";

import { getProducts } from "../lib/api";

export const metadata: Metadata = {
  title: "Wellina — Whole Body Health Starts in the Gut",
  description:
    "Clinically formulated wellness supplements engineered for vital balance and pure nourishment.",
};

export default async function StorefrontHomePage() {
  const topProductsResponse = await getProducts({
    collectionSlug: "top-picks",
    pageSize: 6,
  }).catch(() => null);

  const topProducts = topProductsResponse?.items ?? [];

  return (
    <SmoothScrollProvider>
      <div className="min-h-screen bg-[#8b9e76] font-sans antialiased selection:bg-[#d6f088] selection:text-slate-950">
        {/* 1. Floating Capsule Header */}
        <StorefrontHeader />

        <main className="relative">
          {/* 2. Hero Section: Split Dual-Tone Background & Typography */}
          <StorefrontHero />

          {/* 3. Product Catalog Section: 'Month's top products' with carousel controls */}
          <StorefrontProductSection initialProducts={topProducts} />

          {/* 4. Formulations Section: 'Science-backed formulations' with 3 feature cards */}
          <StorefrontFormulationsSection />

          {/* 5. Gut Health Section: 'The future of gut health' with 4 icon columns */}
          <StorefrontGutHealthSection />

          {/* 6. Testimonial Section: Split lifestyle photo & editorial quote slider */}
          <StorefrontTestimonialSection />

          {/* 7. Skin Health Section: Left timeline with right sticky stacked photography */}
          <StorefrontSkinHealthSection />

          {/* 8. Collections Showcase: Top ticker + Stats cards + Interactive collections tabs */}
          <StorefrontCollectionsShowcase />

          {/* 9. Newsletter Section: 'Subscribe for updates, tips & exclusive offers' */}
          <StorefrontNewsletterSection />
        </main>

        {/* 10. Storefront Luxury Editorial Footer */}
        <StorefrontFooter />
      </div>
    </SmoothScrollProvider>
  );
}
