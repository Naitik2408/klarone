"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import type { CatalogueProductDetail } from "@/types/catalogue";
import { useCart } from "@/components/cart/cart-provider";

interface ProductViewProps {
  product: CatalogueProductDetail;
}

function formatPrice(amount: string | number, currency = "INR"): string {
  const numeric = Number(amount);
  if (!Number.isFinite(numeric)) return `${currency} ${amount}`;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currency === "INR" ? "INR" : currency,
    maximumFractionDigits: 0,
  }).format(numeric);
}

function formatStorage(storageGb: number | null) {
  if (!storageGb) return null;
  if (storageGb >= 1024) return `${storageGb / 1024}TB`;
  return `${storageGb}GB`;
}

export function ProductExperienceView({ product }: ProductViewProps) {
  const router = useRouter();
  const { addItem } = useCart();

  // Active variant state
  const [selectedVariantId, setSelectedVariantId] = useState(
    product.variants[0]?.id ?? ""
  );
  const activeVariant =
    product.variants.find((v) => v.id === selectedVariantId) ??
    product.variants[0];

  // Quantity counter
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [addedToast, setAddedToast] = useState(false);

  // Accordion state
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    details: true,
    specs: false,
    ports: false,
    warranty: false,
  });

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Gallery items: combine product media or high-end fallback photography
  const galleryImages =
    product.media && product.media.length > 0
      ? product.media.map((m) => m.url)
      : [
          "/media/catalogue/products/macbook-pro-14-m3-space-black/1-hero-studio.jpg",
          "/media/catalogue/products/macbook-pro-14-m3-space-black/4-keyboard-ports.jpg",
          "/media/catalogue/products/macbook-pro-14-m3-space-black/2-size-comparison.jpg",
          "/media/catalogue/products/macbook-pro-14-m3-space-black/5-flagship-usp.jpg",
        ];

  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Sticky Bar visibility based on scroll threshold
  const [showStickyBar, setShowStickyBar] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Trigger sticky bar once scrolled past buy box (~650px)
      if (window.scrollY > 600) {
        setShowStickyBar(true);
      } else {
        setShowStickyBar(false);
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleAddToCart = async () => {
    if (!activeVariant || isAdding) return;
    setIsAdding(true);
    try {
      await addItem({
        product,
        variantId: activeVariant.id,
      });
      setAddedToast(true);
      setTimeout(() => setAddedToast(false), 2200);
    } finally {
      setIsAdding(false);
    }
  };

  const handleBuyNow = async () => {
    if (!activeVariant) return;
    await handleAddToCart();
    router.push("/cart");
  };

  // Specifications parser
  const spec = activeVariant?.specification || {};

  return (
    <div className="relative w-full bg-white text-slate-900 pb-28">
      {/* 1. Breadcrumbs */}
      <div className="mx-auto max-w-7xl px-4 pt-6 pb-4 sm:px-6 lg:px-8">
        <nav className="flex items-center gap-2 text-xs text-stone-500 font-sans">
          <Link href="/" className="hover:text-slate-900 transition">
            Home
          </Link>
          <span>/</span>
          <Link href="/laptops" className="hover:text-slate-900 transition">
            {product.category?.name || "Laptops"}
          </Link>
          <span>/</span>
          <span className="text-slate-900 font-medium truncate max-w-xs sm:max-w-md">
            {product.name}
          </span>
        </nav>
      </div>

      {/* 2. Main PDP 2-Column Grid */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          
          {/* LEFT COLUMN: Gallery with Thumbnails (Sticky on desktop) */}
          <div className="lg:col-span-7 flex flex-col-reverse md:flex-row gap-4 lg:sticky lg:top-28">
            {/* Vertical Thumbnail Strip */}
            <div className="flex md:flex-col gap-3 overflow-x-auto md:overflow-visible pb-2 md:pb-0 shrink-0">
              {galleryImages.map((imgSrc, idx) => {
                const isSelected = activeImageIndex === idx;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveImageIndex(idx)}
                    className={`relative h-20 w-20 md:h-24 md:w-24 rounded-2xl overflow-hidden border transition-all duration-200 bg-[#f4f5f3] shrink-0 ${
                      isSelected
                        ? "border-slate-900 ring-2 ring-slate-900/10 shadow-sm"
                        : "border-stone-200/90 hover:border-stone-400 opacity-80 hover:opacity-100"
                    }`}
                  >
                    <Image
                      src={imgSrc}
                      alt={`${product.name} shot ${idx + 1}`}
                      fill
                      className="object-cover p-1.5 rounded-2xl"
                      sizes="96px"
                    />
                  </button>
                );
              })}
            </div>

            {/* Main Stage Image / Large Preview */}
            <div className="relative flex-1 aspect-square md:aspect-[4/3.8] rounded-3xl bg-[#f4f5f3] overflow-hidden border border-stone-200/80 flex items-center justify-center p-6 sm:p-10">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeImageIndex}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className="relative w-full h-full flex items-center justify-center"
                >
                  <Image
                    src={galleryImages[activeImageIndex]}
                    alt={product.name}
                    fill
                    priority
                    className="object-contain drop-shadow-md rounded-2xl"
                    sizes="(max-width: 1024px) 100vw, 55vw"
                  />
                </motion.div>
              </AnimatePresence>

              {/* Brand Tag Pill */}
              <div className="absolute top-5 left-5 z-10">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-white/90 backdrop-blur-md border border-stone-200 text-slate-900 shadow-xs">
                  {product.brand?.name || "Klarone"}
                </span>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Buy Box & Product Narrative */}
          <div className="lg:col-span-5 flex flex-col space-y-6">
            
            {/* Title & Price */}
            <div>
              <h1
                style={{ fontFamily: "var(--font-serif), 'Instrument Serif', Georgia, serif" }}
                className="text-4xl sm:text-5xl font-normal tracking-tight text-slate-950 leading-[1.08]"
              >
                {product.name}
              </h1>

              <div className="mt-4 flex items-baseline gap-3">
                <span className="text-3xl font-semibold tracking-tight text-slate-950">
                  {formatPrice(activeVariant?.sellingPrice || 0, activeVariant?.currency)}
                </span>
                {activeVariant?.compareAtPrice &&
                  Number(activeVariant.compareAtPrice) > Number(activeVariant.sellingPrice) && (
                    <span className="text-lg text-stone-400 line-through font-normal">
                      {formatPrice(activeVariant.compareAtPrice, activeVariant.currency)}
                    </span>
                  )}
              </div>

              {product.shortDescription && (
                <p className="mt-4 text-sm leading-relaxed text-stone-600">
                  {product.shortDescription}
                </p>
              )}
            </div>

            {/* Variant Selector (Matching Pill style e.g. 24 Capsule / 32 Capsules) */}
            {product.variants.length > 0 && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold uppercase tracking-wider text-stone-500">
                    Configuration
                  </span>
                  <span className="font-medium text-slate-900">
                    {activeVariant?.ramGb ? `${activeVariant.ramGb}GB RAM` : ""}{" "}
                    {activeVariant?.storageGb ? `• ${formatStorage(activeVariant.storageGb)} SSD` : ""}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2.5">
                  {product.variants.map((v) => {
                    const isSelected = v.id === activeVariant?.id;
                    const label = v.variantName
                      ? v.variantName.split("(")[0].trim() || `${v.ramGb}GB / ${formatStorage(v.storageGb)}`
                      : `${v.ramGb}GB / ${formatStorage(v.storageGb)}`;

                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setSelectedVariantId(v.id)}
                        className={`h-10 px-5 rounded-full text-xs font-semibold transition-all duration-200 border ${
                          isSelected
                            ? "bg-slate-950 text-white border-slate-950 shadow-sm scale-[1.02]"
                            : "bg-white text-slate-900 border-stone-300 hover:border-slate-800"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* In-Stock Indicator */}
            <div className="flex items-center gap-2 text-xs font-medium text-emerald-800 pt-1">
              <svg className="w-4 h-4 text-emerald-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.4" d="M5 13l4 4L19 7" />
              </svg>
              <span>In - stock and ready to ship across India</span>
            </div>

            {/* Quantity Selector + Add to Cart Button */}
            <div className="flex items-center gap-3 pt-2">
              {/* Stepper Pill */}
              <div className="flex items-center h-12 rounded-full border border-stone-300 bg-white px-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="h-8 w-8 flex items-center justify-center text-stone-500 hover:text-slate-950 text-lg transition"
                  aria-label="Decrease quantity"
                >
                  −
                </button>
                <span className="w-8 text-center text-sm font-semibold text-slate-900">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => q + 1)}
                  className="h-8 w-8 flex items-center justify-center text-stone-500 hover:text-slate-950 text-lg transition"
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>

              {/* Add to Cart Button */}
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={isAdding}
                className="flex-1 h-12 rounded-full bg-[#e8e9ea] text-slate-900 font-semibold text-sm transition hover:bg-[#dedfe1] active:scale-[0.99] disabled:opacity-50 flex items-center justify-center"
              >
                {isAdding ? "Adding..." : addedToast ? "Added to Cart ✓" : "Add To Cart"}
              </button>
            </div>

            {/* Buy It Now (Accent Olive/Green Button matching design) */}
            <button
              type="button"
              onClick={handleBuyNow}
              className="w-full h-12 rounded-full bg-[#dcf19a] hover:bg-[#d4ed89] text-slate-950 font-semibold text-sm shadow-sm transition active:scale-[0.99] flex items-center justify-center"
            >
              Buy It Now
            </button>

            {/* Value Props Row (Free shipping, Easy return, Safe checkout) */}
            <div className="grid grid-cols-3 gap-2 border-t border-stone-200/80 pt-6 text-center text-xs text-stone-600">
              <div className="flex flex-col items-center gap-2">
                <svg className="w-5 h-5 text-slate-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <span>Free shipping</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <svg className="w-5 h-5 text-slate-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
                <span>Easy return</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <svg className="w-5 h-5 text-slate-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                <span>Safe checkout</span>
              </div>
            </div>

            {/* Store Pickup Banner (Matching Reference Card) */}
            <div className="rounded-2xl border border-stone-200/90 bg-[#fafbfa] p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-stone-200 text-slate-900">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-950">
                    Pickup available at <span className="font-bold underline">Klarone Experience Studio</span>
                  </p>
                  <p className="text-[11px] text-stone-500 mt-0.5">
                    Usually ready in 2 hours • Verified hardware check
                  </p>
                </div>
              </div>
              <span className="text-stone-400">›</span>
            </div>

            {/* Accordions (Product Details, Specifications, Ports, Warranty) */}
            <div className="border-t border-stone-200/80 pt-4 divide-y divide-stone-200/80">
              
              {/* Product Details Section */}
              <div className="py-4">
                <button
                  type="button"
                  onClick={() => toggleSection("details")}
                  className="flex w-full items-center justify-between text-left"
                >
                  <h3
                    style={{ fontFamily: "var(--font-serif), 'Instrument Serif', Georgia, serif" }}
                    className="text-2xl font-normal text-slate-950"
                  >
                    Product Details
                  </h3>
                  <span className="text-lg text-stone-500">
                    {openSections.details ? "−" : "+"}
                  </span>
                </button>
                {openSections.details && (
                  <div className="mt-3 text-sm leading-relaxed text-stone-600 space-y-3 font-sans">
                    <p>{product.description || product.shortDescription}</p>
                    {activeVariant?.features && activeVariant.features.length > 0 && (
                      <ul className="list-disc pl-5 space-y-1.5 text-stone-600">
                        {activeVariant.features.map((f, i) => (
                          <li key={i}>
                            <strong className="text-slate-900">{f.featureName}:</strong> {f.description}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>

              {/* Technical Specifications Section */}
              <div className="py-4">
                <button
                  type="button"
                  onClick={() => toggleSection("specs")}
                  className="flex w-full items-center justify-between text-left"
                >
                  <h3
                    style={{ fontFamily: "var(--font-serif), 'Instrument Serif', Georgia, serif" }}
                    className="text-2xl font-normal text-slate-950"
                  >
                    Key specifications
                  </h3>
                  <span className="text-lg text-stone-500">
                    {openSections.specs ? "−" : "+"}
                  </span>
                </button>
                {openSections.specs && (
                  <div className="mt-3 text-xs divide-y divide-stone-100">
                    {Object.entries(spec)
                      .filter(([_, v]) => Boolean(v))
                      .slice(0, 10)
                      .map(([key, val]) => (
                        <div key={key} className="flex justify-between py-2 text-stone-600">
                          <span className="capitalize">{key.replace(/([A-Z])/g, " $1")}</span>
                          <span className="font-semibold text-slate-900">{String(val)}</span>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* How to use / Care Section */}
              <div className="py-4">
                <button
                  type="button"
                  onClick={() => toggleSection("warranty")}
                  className="flex w-full items-center justify-between text-left"
                >
                  <h3
                    style={{ fontFamily: "var(--font-serif), 'Instrument Serif', Georgia, serif" }}
                    className="text-2xl font-normal text-slate-950"
                  >
                    Warranty & authenticity
                  </h3>
                  <span className="text-lg text-stone-500">
                    {openSections.warranty ? "−" : "+"}
                  </span>
                </button>
                {openSections.warranty && (
                  <div className="mt-3 text-sm text-stone-600 space-y-2">
                    <p>
                      Official manufacturer warranty:{" "}
                      <strong className="text-slate-900">
                        {activeVariant?.warrantyMonths || 12} Months
                      </strong>{" "}
                      with on-site support and genuine parts guarantee.
                    </p>
                    <p>
                      Each laptop unit is sealed from official national distribution with verified IMEI / serial records.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Social Share & Need Help */}
            <div className="flex items-center justify-between border-t border-stone-200/80 pt-6">
              <div className="flex items-center gap-3 text-xs text-stone-500">
                <span>Share:</span>
                <button type="button" className="text-slate-900 hover:text-blue-600 font-bold transition">f</button>
                <button type="button" className="text-slate-900 hover:text-red-600 font-bold transition">P</button>
                <button type="button" className="text-slate-900 hover:text-slate-950 font-bold transition">𝕏</button>
              </div>

              <Link
                href="/account"
                className="rounded-full border border-stone-300 px-4 py-1.5 text-xs font-semibold text-slate-900 hover:bg-stone-100 transition"
              >
                Need Help ?
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Floating Bottom-Right Sticky Action Card (Inspired from Reference) */}
      <AnimatePresence>
        {showStickyBar && activeVariant && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-6 right-6 z-40 flex items-center gap-3 rounded-2xl bg-white p-2.5 shadow-2xl border border-stone-200/90 max-w-sm backdrop-blur-md"
          >
            <div className="relative h-12 w-12 rounded-xl bg-stone-100 overflow-hidden shrink-0 border border-stone-200">
              <Image
                src={galleryImages[0]}
                alt={product.name}
                fill
                className="object-cover p-1"
                sizes="48px"
              />
            </div>
            <div className="min-w-0 pr-2">
              <p className="text-xs font-semibold text-slate-950 truncate max-w-[140px]">
                {product.name}
              </p>
              <p className="text-xs font-bold text-slate-900">
                {formatPrice(activeVariant.sellingPrice, activeVariant.currency)}
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddToCart}
              className="h-10 px-5 rounded-xl bg-[#dcf19a] hover:bg-[#d4ed89] text-slate-950 text-xs font-bold transition active:scale-95 shrink-0"
            >
              {addedToast ? "Added ✓" : "Add"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
