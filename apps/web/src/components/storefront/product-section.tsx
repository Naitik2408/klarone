"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { useCart } from "../cart/cart-provider";

interface ProductItem {
  id: string;
  category: string;
  name: string;
  price: number;
  originalPrice?: number;
  badge?: {
    text: string;
    type: "sale" | "best_seller";
  };
  bottleType: "jar_clear" | "tin_green" | "bottle_white" | "tin_white" | "pouch_green" | "jar_amber";
}

const PRODUCTS: ProductItem[] = [
  {
    id: "prod-1",
    category: "Vitamin",
    name: "Skin Synbiotic",
    price: 50.0,
    originalPrice: 110.0,
    badge: {
      text: "Sale",
      type: "sale",
    },
    bottleType: "jar_clear",
  },
  {
    id: "prod-2",
    category: "Vitamin",
    name: "Enduro Fuel",
    price: 54.0,
    badge: undefined,
    bottleType: "tin_green",
  },
  {
    id: "prod-3",
    category: "Vitamin",
    name: "Pure Balance",
    price: 48.0,
    badge: {
      text: "Best Sellers",
      type: "best_seller",
    },
    bottleType: "bottle_white",
  },
  {
    id: "prod-4",
    category: "Vitamin",
    name: "Omega Complex",
    price: 49.0,
    badge: undefined,
    bottleType: "tin_white",
  },
  {
    id: "prod-5",
    category: "Vitamin",
    name: "Daily Nourish",
    price: 45.0,
    badge: undefined,
    bottleType: "pouch_green",
  },
  {
    id: "prod-6",
    category: "Vitamin",
    name: "Cellular Longevity",
    price: 68.0,
    originalPrice: 85.0,
    badge: {
      text: "Sale",
      type: "sale",
    },
    bottleType: "jar_clear",
  },
];

/* Helper to render the realistic packaging shapes matching the reference screenshot */
function BottleMockup({ type }: { type: ProductItem["bottleType"] }) {
  if (type === "jar_clear") {
    // 1. Clear glass jar with metallic cap & green capsules inside
    return (
      <div className="relative flex flex-col items-center justify-center">
        {/* Silver metallic rib cap */}
        <div className="h-4 w-20 rounded-t-sm bg-gradient-to-r from-stone-400 via-stone-200 to-stone-400 shadow-xs" />
        <div className="h-1.5 w-18 bg-stone-500" />
        {/* Glass jar body */}
        <div className="relative flex h-48 w-36 flex-col items-center justify-end overflow-hidden rounded-b-2xl border border-stone-200/60 bg-white/40 shadow-xs">
          {/* Glass glare highlight */}
          <div className="absolute inset-y-0 left-1 w-2.5 bg-gradient-to-r from-white/80 to-transparent" />
          {/* Green capsules floating in bottom half */}
          <div className="absolute top-4 inset-x-2 flex flex-wrap justify-center gap-1.5 opacity-90">
            {[...Array(12)].map((_, i) => (
              <div
                key={i}
                className="h-4 w-8 rounded-full bg-gradient-to-r from-[#608753] via-[#7ba36c] to-[#4e7441] shadow-2xs"
                style={{ transform: `rotate(${((i % 5) - 2) * 16}deg)` }}
              />
            ))}
          </div>
          {/* Label printed on front */}
          <div className="relative z-10 mb-4 flex w-[86%] flex-col items-center rounded-sm bg-[#52794c] py-2.5 px-1 text-white shadow-xs">
            <span className="font-serif text-[17px] font-normal tracking-wide">wellina</span>
            <span className="text-[8px] uppercase tracking-widest opacity-80">SKIN GLOW</span>
          </div>
        </div>
        {/* Grounding shadow underneath */}
        <div className="mt-1 h-2.5 w-30 rounded-full bg-stone-300/40 blur-xs" />
      </div>
    );
  }

  if (type === "tin_green") {
    // 2. Matte green supplement canister with ribbed dark green cap
    return (
      <div className="relative flex flex-col items-center justify-center">
        {/* Dark forest cap */}
        <div className="h-4 w-30 rounded-t-sm bg-[#2b4b2e] shadow-xs" />
        {/* Gradient green cylinder */}
        <div className="relative flex h-48 w-30 flex-col items-center justify-center rounded-b-lg border border-black/5 bg-gradient-to-b from-[#e3ede0] via-[#85a87b] to-[#486b40] shadow-xs">
          <span className="font-serif text-[22px] font-normal tracking-tight text-white drop-shadow-xs">wellina</span>
          <span className="mt-1.5 text-[8px] uppercase tracking-wider text-white/90">MICROBIOME GUT POST</span>
          <span className="mt-5 rounded-full border border-white/40 px-2.5 py-0.5 text-[7px] tracking-wider text-white/90">DIETARY SUPPLEMENT</span>
        </div>
        <div className="mt-1 h-2.5 w-28 rounded-full bg-stone-300/40 blur-xs" />
      </div>
    );
  }

  if (type === "bottle_white") {
    // 3. Matte ceramic ivory bottle with grooved vertical white cap
    return (
      <div className="relative flex flex-col items-center justify-center">
        {/* White grooved cap */}
        <div className="h-4.5 w-12 rounded-t-sm bg-gradient-to-r from-stone-200 via-white to-stone-200 border-x border-t border-stone-300 shadow-2xs" />
        {/* Sloped neck & shoulders */}
        <div className="h-3 w-16 rounded-t-lg bg-[#eef3ec]" />
        {/* Bottle body */}
        <div className="relative flex h-44 w-28 flex-col items-center justify-center rounded-b-xl border border-stone-200/80 bg-gradient-to-b from-[#f5f8f3] to-[#e1eae0] shadow-xs">
          <span className="font-serif text-[20px] font-normal tracking-tight text-[#1e341b]">wellina</span>
          <span className="mt-1 text-[8px] uppercase tracking-wider text-[#3d5939]">GUT RESET ELIXIR</span>
          <span className="mt-5 rounded-full border border-stone-300/80 px-2.5 py-0.5 text-[7px] tracking-wider text-stone-600">DIETARY SUPPLEMENT</span>
        </div>
        <div className="mt-1 h-2.5 w-26 rounded-full bg-stone-300/40 blur-xs" />
      </div>
    );
  }

  if (type === "tin_white") {
    // 4. Tall soft mint cylinder with deep green ribbed lid
    return (
      <div className="relative flex flex-col items-center justify-center">
        {/* Dark teal/green cap */}
        <div className="h-4 w-30 rounded-t-sm bg-[#1e4438] shadow-xs" />
        {/* Soft mint cylinder */}
        <div className="relative flex h-48 w-30 flex-col items-center justify-center rounded-b-lg border border-black/5 bg-gradient-to-b from-[#f3f9f6] via-[#d6eae1] to-[#b3d7c7] shadow-xs">
          <span className="font-serif text-[22px] font-normal tracking-tight text-[#164132]">wellina</span>
          <span className="mt-1.5 text-[8px] uppercase tracking-wider text-[#245844]">SKIN HYDRATOR</span>
          <span className="mt-5 rounded-full border border-[#245844]/30 px-2.5 py-0.5 text-[7px] tracking-wider text-[#164132]">DIETARY SUPPLEMENT</span>
        </div>
        <div className="mt-1 h-2.5 w-28 rounded-full bg-stone-300/40 blur-xs" />
      </div>
    );
  }

  // 5. Minimalist deep green matte stand-up sachet pouch
  return (
    <div className="relative flex flex-col items-center justify-center">
      {/* Pouch top heat-seal with tear notch */}
      <div className="h-2.5 w-20 rounded-t-xs bg-[#1f3721] border-b border-black/20" />
      {/* Matte olive green sachet */}
      <div className="relative flex h-48 w-20 flex-col items-center justify-center rounded-b-sm bg-gradient-to-b from-[#2a4d2c] to-[#18301a] shadow-xs">
        <span className="font-serif text-[17px] font-normal tracking-tight text-[#e2f0dc]">wellina</span>
        <span className="mt-1.5 text-[7px] uppercase tracking-widest text-emerald-200/80">DAILY PACK</span>
      </div>
      <div className="mt-1 h-2.5 w-18 rounded-full bg-stone-300/40 blur-xs" />
    </div>
  );
}

export function StorefrontProductSection() {
  const [activeTab, setActiveTab] = useState<"best_sellers" | "new_arrivals">("best_sellers");
  const [addingId, setAddingId] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const { addItem } = useCart();

  const maxIndex = Math.max(0, PRODUCTS.length - 4);

  async function handleAddToCart(product: ProductItem) {
    try {
      setAddingId(product.id);
      await addItem({
        productId: product.id,
        variantId: `${product.id}-default`,
        quantity: 1,
        title: product.name,
        price: product.price,
      });
    } catch {
      // Cart fallback
    } finally {
      setTimeout(() => setAddingId(null), 500);
    }
  }

  function handlePrev() {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  }

  function handleNext() {
    setCurrentIndex((prev) => Math.min(maxIndex, prev + 1));
  }

  return (
    <section
      id="featured-products"
      /* Generous top white space: pt-24 md:pt-32 */
      className="relative z-10 min-h-screen rounded-t-[44px] bg-white pt-24 pb-28 shadow-[0_-25px_70px_rgba(0,0,0,0.18)] md:rounded-t-[56px] md:pt-32"
    >
      {/* Header Container: Inset aligned with the first product card */}
      <div className="mx-auto max-w-[1560px] px-6 sm:px-10 lg:px-14">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-serif text-4xl font-normal tracking-tight text-slate-900 sm:text-5xl lg:text-[56px]">
            Find your supplement
          </h2>

          {/* Minimalist Tab Switcher */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("best_sellers")}
              className={`rounded-full px-5 py-2 text-xs font-semibold tracking-wide transition-all duration-200 ${
                activeTab === "best_sellers"
                  ? "bg-[#e8ece6] text-slate-900"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Best Sellers
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("new_arrivals")}
              className={`rounded-full px-5 py-2 text-xs font-semibold tracking-wide transition-all duration-200 ${
                activeTab === "new_arrivals"
                  ? "bg-[#e8ece6] text-slate-900"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              New Arrivals
            </button>
          </div>
        </div>
      </div>

      {/* 
        Full-bleed right overflow slider:
        - Left padding aligns the 1st card with the header (px-6 sm:px-10 lg:px-14)
        - Right side flows naturally to the edge of the screen
        - Exactly 4 cards fill the main viewport, and the 5th card peeks in by ~10% at the right edge
      */}
      <div className="mt-14 w-full overflow-hidden">
        <div className="mx-auto max-w-[1560px] pl-6 sm:pl-10 lg:pl-14 pr-0">
          <motion.div
            className="flex gap-6 pr-6"
            animate={{
              x: `-${currentIndex * (22.8 + 1.5)}%`,
            }}
            transition={{
              type: "spring",
              stiffness: 280,
              damping: 32,
              mass: 0.8,
            }}
          >
            {PRODUCTS.map((prod) => (
              <div
                key={prod.id}
                /* Sized so 4 full cards occupy the width, and the 5th card peeks ~10-15% into view */
                className="group relative flex flex-col justify-between flex-[0_0_84%] sm:flex-[0_0_45%] lg:flex-[0_0_22.8%] rounded-[24px] bg-[#f0f2ee] p-4 transition-transform duration-200"
              >
                {/* Badge (Sale / Best Sellers) - larger with soft, lighter organic background colors */}
                {prod.badge && (
                  <div className="absolute left-4 top-4 z-20">
                    <span
                      className={`inline-block rounded-full px-3.5 py-1.5 text-[12px] font-medium tracking-wide text-white shadow-2xs ${
                        prod.badge.type === "sale" ? "bg-[#c64f3d]" : "bg-[#6c8868]"
                      }`}
                    >
                      {prod.badge.text}
                    </span>
                  </div>
                )}

                {/* 
                  Clean Unified Product Stage:
                  Slightly reduced vertical height (aspect-[1/1] to aspect-[4/4.5]) so the card is compact
                */}
                <div className="relative flex aspect-[4/4.4] min-h-[250px] w-full items-center justify-center overflow-hidden rounded-[18px]">
                  <BottleMockup type={prod.bottleType} />
                </div>

                {/* Card Meta & Circular Cart Button (h-11 w-11 / 44px) */}
                <div className="mt-4 flex items-end justify-between px-1 pb-1">
                  <div className="flex flex-col">
                    <span className="text-xs font-normal text-stone-500">{prod.category}</span>
                    <h3 className="mt-1 text-[16px] font-semibold tracking-tight text-slate-900">
                      {prod.name}
                    </h3>
                    <div className="mt-1.5 flex items-baseline gap-2">
                      <span className="text-sm font-semibold text-slate-900">
                        ${prod.price.toFixed(2)}
                      </span>
                      {prod.originalPrice && (
                        <span className="text-xs text-stone-400 line-through">
                          ${prod.originalPrice.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Circular Add to Cart Button (44px) */}
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    type="button"
                    onClick={() => handleAddToCart(prod)}
                    disabled={addingId === prod.id}
                    aria-label={`Add ${prod.name} to cart`}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-950 text-white shadow-sm transition-all duration-200 hover:scale-105 hover:bg-slate-800 disabled:opacity-50"
                  >
                    {addingId === prod.id ? (
                      <span className="text-xs font-bold text-lime-300">✓</span>
                    ) : (
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="2.2"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                        />
                      </svg>
                    )}
                  </motion.button>
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Carousel Bottom Row: Dynamic Progress Track & Circular Arrow Controls */}
      <div className="mx-auto mt-12 max-w-[1560px] px-6 sm:px-10 lg:px-14">
        <div className="flex items-center justify-between pt-2">
          {/* Progress bar line matching card width (22.8% of the grid track) and slightly increased thickness */}
          <div className="relative h-[3.5px] w-[84%] sm:w-[45%] lg:w-[22.8%] overflow-hidden rounded-full bg-stone-200/90">
            <motion.div
              className="h-full rounded-full bg-slate-950"
              animate={{
                width: `${((currentIndex + 1) / (maxIndex + 1)) * 100}%`,
              }}
              transition={{ duration: 0.35, ease: "easeOut" }}
            />
          </div>

          {/* Previous / Next buttons: h-12 w-12 (48px) - slightly larger than the 44px cart circle */}
          <div className="flex items-center gap-3">
            <motion.button
              whileTap={{ scale: 0.92 }}
              type="button"
              onClick={handlePrev}
              disabled={currentIndex === 0}
              aria-label="Previous products"
              className="flex h-12 w-12 items-center justify-center rounded-full border border-stone-300/80 bg-white text-stone-800 shadow-xs transition-all hover:border-slate-950 hover:text-slate-950 disabled:opacity-30 disabled:pointer-events-none"
            >
              <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.92 }}
              type="button"
              onClick={handleNext}
              disabled={currentIndex >= maxIndex}
              aria-label="Next products"
              className="flex h-12 w-12 items-center justify-center rounded-full border border-stone-300/80 bg-white text-stone-800 shadow-xs transition-all hover:border-slate-950 hover:text-slate-950 disabled:opacity-30 disabled:pointer-events-none"
            >
              <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </motion.button>
          </div>
        </div>
      </div>
    </section>
  );
}
