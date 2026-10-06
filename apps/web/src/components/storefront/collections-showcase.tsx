"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";

/* 1. TOP TICKER MARQUEE: "Fresh & Light [Shop] Vitamins & Minerals [Shop] Prebiotics [Shop] Antioxidants [Shop]" */
const TICKER_ITEMS = [
  { text: "Fresh & Light", link: "#featured-products" },
  { text: "Vitamins & Minerals", link: "#featured-products" },
  { text: "Prebiotics", link: "#featured-products" },
  { text: "Antioxidants", link: "#featured-products" },
  { text: "Immunity Blends", link: "#featured-products" },
  { text: "Gut Restoration", link: "#featured-products" },
];

/* 2. STATS CARDS */
const STATS = [
  {
    percentage: "86%",
    text: "of users report falling asleep faster within first few weeks.",
  },
  {
    percentage: "67%",
    text: "noticed better well-being and reduced daily stress.",
  },
  {
    percentage: "80%",
    text: "experienced better, more regular digestion.*",
  },
  {
    percentage: "75%",
    text: "wake up feeling more refreshed and energized.",
  },
];

/* 3. COLLECTIONS TABS & DATA */
type CollectionTab = "strength" | "probiotic" | "bioavailability";

interface CollectionData {
  id: CollectionTab;
  tabTitle: string;
  subheading: string;
  description: string;
  bgImage: string;
  product: {
    name: string;
    description: string;
    bullet1: string;
    bullet2: string;
    link: string;
    bottleType: "pouch" | "jar";
  };
}

const COLLECTIONS: Record<CollectionTab, CollectionData> = {
  strength: {
    id: "strength",
    tabTitle: "Strength",
    subheading: "OUR COLLECTIONS",
    description:
      "The prebiotics are designed to target undesirable bacteria in the gut and support the growth of vital restorative flora.",
    bgImage: "/collection-cyclist-1.jpg",
    product: {
      name: "Plant Protein",
      description:
        "Advanced multi-strain formula to restore balance gut performance.",
      bullet1: "Balances microbiome",
      bullet2: "Supports immune health",
      link: "#featured-products",
      bottleType: "pouch",
    },
  },
  probiotic: {
    id: "probiotic",
    tabTitle: "Probiotic",
    subheading: "OUR COLLECTIONS",
    description:
      "Targeted probiotic strains formulated to recondition digestive rhythm and enhance everyday gut resilience.",
    bgImage: "/collection-cyclist-2.jpg",
    product: {
      name: "Enduro Fuel",
      description:
        "24-strain probiotic formula designed to support gut balance.",
      bullet1: "Promotes healthy digestion",
      bullet2: "Supports immune defense",
      link: "#featured-products",
      bottleType: "jar",
    },
  },
  bioavailability: {
    id: "bioavailability",
    tabTitle: "Bioavailability",
    subheading: "OUR COLLECTIONS",
    description:
      "Engineered nutrient matrix that bypasses harsh stomach acids to deliver pure active nourishment directly to cells.",
    bgImage: "/collection-cyclist-side.jpg",
    product: {
      name: "Synbiotic Max",
      description:
        "High-potency cellular absorption blend for peak nutrient uptake.",
      bullet1: "95% target bio-delivery",
      bullet2: "Accelerated recovery",
      link: "#featured-products",
      bottleType: "pouch",
    },
  },
};

export function StorefrontCollectionsShowcase() {
  const [activeTab, setActiveTab] = useState<CollectionTab>("strength");
  const activeData = COLLECTIONS[activeTab];

  return (
    <section className="relative z-10 w-full overflow-hidden">
      {/* =========================================================================
          PART 1: TICKER BANNER (Pale Sage Ribbon) - height matching header with larger shop buttons
          ========================================================================= */}
      <div className="relative w-full overflow-hidden border-y border-stone-200/40 bg-[#bfd4c6] py-5 sm:py-6 md:py-6.5">
        <div className="flex w-max animate-[marquee_26s_linear_infinite] items-center gap-12 whitespace-nowrap">
          {[...TICKER_ITEMS, ...TICKER_ITEMS, ...TICKER_ITEMS].map((item, idx) => (
            <div key={idx} className="flex items-center gap-6 sm:gap-8">
              <span className="font-serif text-3xl font-normal tracking-tight text-slate-900 sm:text-4xl md:text-[38px]">
                {item.text}
              </span>
              <Link
                href={item.link}
                style={{ color: "#000000" }}
                className="group/btn inline-flex items-center justify-center rounded-full bg-white px-6 py-2.5 text-sm font-semibold tracking-tight text-black !text-black shadow-sm transition-all duration-200 hover:scale-105 hover:bg-stone-50 active:scale-95"
              >
                <span style={{ color: "#000000" }} className="text-black !text-black font-semibold">
                  Shop
                </span>
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* =========================================================================
          PART 2: FORMULATED TO REALLY WORK & 4 STATS CARDS (Pale Olive Tint Surface)
          ========================================================================= */}
      <div className="bg-[#e4ebdb] pt-20 pb-24 sm:pt-24 sm:pb-28">
        <div className="mx-auto max-w-[1440px] px-6 sm:px-10 lg:px-14">
          {/* Header */}
          <div className="text-center">
            <span className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-600 sm:text-sm">
              SNACKABLE, PACKABLE
            </span>
            <h2 className="mt-3 font-serif text-4xl font-normal tracking-tight text-slate-900 sm:text-5xl lg:text-[58px]">
              Formulated to really work
            </h2>
          </div>

          {/* 4 Stats Cards */}
          <div className="mt-14 sm:mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STATS.map((stat, i) => (
              <div
                key={i}
                className="flex flex-col items-center justify-between rounded-[28px] bg-white p-8 text-center shadow-xs transition-all duration-300 hover:-translate-y-1 hover:shadow-md min-h-[220px]"
              >
                {/* Big Serif Percentage */}
                <span className="font-serif text-6xl font-normal tracking-tight text-slate-950 sm:text-7xl">
                  {stat.percentage}
                </span>

                {/* Subtitle description */}
                <p className="mt-4 text-sm leading-relaxed text-stone-600 sm:text-[15px]">
                  {stat.text}
                </p>
              </div>
            ))}
          </div>

          {/* Research disclaimer */}
          <p className="mt-12 text-center text-xs leading-relaxed text-stone-600 sm:text-sm max-w-3xl mx-auto">
            *Following over 15 years of research, groundbreaking discoveries and numerous clinical trials, we have developed a powerful ingredient.
          </p>
        </div>
      </div>

      {/* =========================================================================
          PART 3: OUR COLLECTIONS CINEMATIC HERO SLIDER
          ========================================================================= */}
      <div className="relative min-h-[640px] sm:min-h-[700px] lg:min-h-[760px] xl:min-h-[820px] w-full overflow-hidden bg-black text-white">
        {/* Dynamic Background Image crossfade with smooth scale & position */}
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={activeData.bgImage}
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7, ease: [0.25, 1, 0.5, 1] }}
            className="absolute inset-0 h-full w-full"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={activeData.bgImage}
              alt={activeData.tabTitle}
              className="h-full w-full object-cover object-[center_28%]"
            />
          </motion.div>
        </AnimatePresence>

        {/* Ambient Dark Gradient Vignette for crisp text contrast */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/50 to-black/30 pointer-events-none" />

        <div className="relative z-10 mx-auto flex h-full min-h-[640px] sm:min-h-[700px] lg:min-h-[760px] xl:min-h-[820px] max-w-[1520px] flex-col justify-center px-6 py-14 sm:px-10 sm:py-20 lg:px-14">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-14 items-center">
            {/* LEFT SIDE: Interactive Tabs + Description + CTA */}
            <div className="lg:col-span-7 flex flex-col justify-center">
              <span className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-300 sm:text-sm">
                OUR COLLECTIONS
              </span>

              {/* 3 Interactive Tab Headlines with smooth color transitions and spring underline */}
              <div className="mt-6 flex flex-col items-start space-y-3 sm:space-y-4">
                {(["strength", "probiotic", "bioavailability"] as CollectionTab[]).map(
                  (tabKey) => {
                    const isSelected = activeTab === tabKey;
                    return (
                      <div key={tabKey} className="relative inline-block">
                        <button
                          type="button"
                          onMouseEnter={() => setActiveTab(tabKey)}
                          onClick={() => setActiveTab(tabKey)}
                          style={{
                            fontFamily: "var(--font-serif), 'Instrument Serif', Georgia, serif",
                            fontSize: "clamp(3.75rem, 8vw, 6.25rem)",
                            lineHeight: "1.05",
                          }}
                          className={`relative block text-left tracking-tight transition-opacity duration-300 ease-out cursor-pointer ${
                            isSelected
                              ? "text-white opacity-100"
                              : "text-white opacity-40 hover:opacity-80"
                          }`}
                        >
                          <span
                            style={{
                              fontFamily: "var(--font-serif), 'Instrument Serif', Georgia, serif",
                              fontSize: "clamp(3.75rem, 8vw, 6.25rem)",
                              lineHeight: "1.05",
                              fontStyle: isSelected ? "italic" : "normal",
                            }}
                            className="inline-block transition-[font-style,opacity] duration-300"
                          >
                            {COLLECTIONS[tabKey].tabTitle}
                          </span>
                        </button>

                        {/* Smooth floating underline with Framer Motion spring layoutId */}
                        {isSelected && (
                          <motion.div
                            layoutId="activeCollectionUnderline"
                            className="mt-2 h-[2px] w-full bg-white/90"
                            transition={{
                              type: "spring",
                              stiffness: 400,
                              damping: 32,
                            }}
                          />
                        )}
                        {!isSelected && (
                          <div className="mt-2 h-[2px] w-full bg-transparent" />
                        )}
                      </div>
                    );
                  }
                )}
              </div>

              {/* Constant Description: same for all 3 collections, does not change */}
              <p className="mt-9 max-w-xl text-base sm:text-lg md:text-[19px] leading-relaxed text-stone-200">
                The prebiotics are designed to target undesirable bacteria in the
                gut and support the growth of vital restorative flora.
              </p>

              {/* Shop Now Hero Button with Circle Arrow */}
              <div className="mt-8 sm:mt-10">
                <Link
                  href={activeData.product.link}
                  className="group inline-flex items-center gap-3.5 rounded-full bg-[#d6f088] py-2.5 pl-6 pr-2.5 text-sm font-semibold tracking-tight text-slate-900 shadow-md transition-all duration-200 hover:scale-105 hover:bg-[#c8e678] active:scale-95"
                >
                  <span style={{ color: "#000000" }} className="text-black !text-black font-semibold">
                    Shop Now
                  </span>
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-950 text-white transition-transform duration-200 group-hover:translate-x-0.5">
                    <svg
                      className="h-3.5 w-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
                </Link>
              </div>
            </div>

            {/* RIGHT SIDE: White Floating Product Feature Card */}
            <div className="lg:col-span-5 flex justify-end">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeData.id}
                  initial={{ opacity: 0, y: 12, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -12, scale: 0.98 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="w-full max-w-[360px] rounded-[32px] bg-white p-6 text-slate-900 shadow-2xl ring-1 ring-black/5"
                >
                  {/* Product Image Tile inside card */}
                  <div className="flex h-64 w-full items-center justify-center rounded-[24px] bg-[#f2f4f1] p-4">
                    {activeData.product.bottleType === "pouch" ? (
                      /* Minimalist Green Wellness Pouch Graphic */
                      <div className="flex h-44 w-36 flex-col items-center justify-center rounded-[14px] bg-[#274f2e] p-4 shadow-lg border border-[#1b3b21] transition-transform duration-300 hover:scale-105">
                        <span className="font-serif text-2xl font-bold text-lime-200 tracking-tight">wellina</span>
                        <span className="mt-3 text-[9px] uppercase tracking-widest text-emerald-100 font-semibold">ESSENTIAL PROTEIN</span>
                        <div className="mt-6 h-1 w-10 rounded-full bg-lime-300/50" />
                      </div>
                    ) : (
                      /* Minimalist Green Wellness Jar Graphic */
                      <div className="flex flex-col items-center transition-transform duration-300 hover:scale-105">
                        <div className="h-3.5 w-24 rounded-t-sm bg-stone-300 shadow-inner" />
                        <div className="flex h-36 w-28 flex-col items-center justify-center rounded-b-md bg-[#3e683e] shadow-lg border border-[#2b4c2b]">
                          <span className="font-serif text-lg font-bold text-white tracking-tight">wellina</span>
                          <span className="mt-2 text-[8px] uppercase tracking-wider text-emerald-100 font-semibold">MICROBIOME</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Product Title */}
                  <h3 className="mt-6 font-serif text-[28px] font-normal tracking-tight text-slate-900 leading-tight">
                    {activeData.product.name}
                  </h3>

                  {/* Product Description */}
                  <p className="mt-2.5 text-xs sm:text-[13px] leading-relaxed text-stone-500">
                    {activeData.product.description}
                  </p>

                  {/* Bullets with checkmarks */}
                  <div className="mt-5 space-y-2.5 text-xs sm:text-[13px] text-stone-700">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-stone-100 text-stone-900">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="h-2.5 w-2.5">
                          <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                      <span className="font-medium text-stone-800">{activeData.product.bullet1}</span>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-stone-100 text-stone-900">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="h-2.5 w-2.5">
                          <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                      <span className="font-medium text-stone-800">{activeData.product.bullet2}</span>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
