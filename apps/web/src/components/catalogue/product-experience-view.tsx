"use client";

import { useState, useEffect, useMemo, useRef } from "react";
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
  return `Rs. ${numeric.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

const COLOR_HEX_FALLBACKS: Record<string, string> = {
  blue: "#1e60d5",
  black: "#111111",
  "obsidian black": "#151618",
  "space black": "#1d1d1f",
  "abyssal black": "#18181b",
  "nightfall black": "#1a1a1c",
  "shadow black": "#1f1f23",
  "deep black": "#121212",
  "jet black": "#0a0a0a",
  white: "#f8f9fa",
  "ceramic white": "#fafafa",
  "quantum white": "#f5f6f8",
  "platinum white": "#f4f5f7",
  silver: "#c5c8cc",
  "pure silver": "#d6d9dc",
  "platinum silver": "#d2d5d9",
  "natural silver": "#cfd2d6",
  "cool silver": "#d4d8dd",
  grey: "#6b7280",
  gray: "#6b7280",
  "space grey": "#535458",
  "space gray": "#535458",
  "arctic grey": "#7c828a",
  "luna grey": "#6c727a",
  "onyx grey": "#3e4249",
  "eclipse gray": "#4b4f56",
  "mecha gray": "#555960",
  "dark shadow gray": "#33373d",
  "cosmos gray": "#494d54",
  "titan gray": "#585b62",
  navy: "#0a1931",
  midnight: "#18202f",
  "cosmic blue": "#1d3557",
  "ice blue": "#8ecae6",
  "ponder blue": "#2b4c6f",
  "slate blue": "#475569",
  starlight: "#e5e0d8",
  gold: "#d4af37",
  dune: "#c2b280",
  platinum: "#e5e4e2",
};

function resolveColorHex(colorName: string, metaHex?: string | null): string {
  if (metaHex && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(metaHex)) {
    return metaHex;
  }
  const clean = colorName.toLowerCase().trim();
  if (COLOR_HEX_FALLBACKS[clean]) return COLOR_HEX_FALLBACKS[clean];
  for (const [key, hex] of Object.entries(COLOR_HEX_FALLBACKS)) {
    if (clean.includes(key)) return hex;
  }
  return "#222222";
}

interface OptionDescriptor {
  id: string | number;
  name: string;
  isColor: boolean;
  values: Array<{
    value: string;
    hex?: string | null;
  }>;
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
    warranty: false,
  });

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Gallery items: combine product media or high-end fallback photography
  const galleryImages = useMemo(() => {
    if (product.media && product.media.length > 0) {
      return product.media.map((m) => m.url);
    }
    return [
      "/media/catalogue/products/macbook-pro-14-m3-space-black/1-hero-studio.jpg",
      "/media/catalogue/products/macbook-pro-14-m3-space-black/4-keyboard-ports.jpg",
      "/media/catalogue/products/macbook-pro-14-m3-space-black/2-size-comparison.jpg",
      "/media/catalogue/products/macbook-pro-14-m3-space-black/5-flagship-usp.jpg",
    ];
  }, [product.media]);

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const imageRefs = useRef<(HTMLDivElement | null)[]>([]);

  const scrollToImage = (index: number) => {
    setActiveImageIndex(index);
    const target = imageRefs.current[index];
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  };

  // Sticky Bar visibility based on scroll threshold
  const [showStickyBar, setShowStickyBar] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
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

  // Helper to extract a variant's value for a given option name
  const getVariantValueForOption = (
    variant: any,
    optionName: string
  ): string | null => {
    if (!variant) return null;
    const norm = optionName.toLowerCase().trim();

    // 1. Check explicit optionValues relation
    if (variant.optionValues && variant.optionValues.length > 0) {
      const match = variant.optionValues.find(
        (ov: any) =>
          ov.productOption?.name?.toLowerCase()?.trim() === norm ||
          ov.productOptionName?.toLowerCase()?.trim() === norm
      );
      if (match) {
        return match.productOptionValue?.value ?? match.value ?? null;
      }
    }

    // 2. Fallbacks based on variant attributes
    if (norm === "color") return variant.color || null;
    if (
      norm.includes("processor") ||
      norm.includes("cpu") ||
      norm === "processor family"
    ) {
      return (
        variant.specification?.cpuModel ||
        (variant.variantName ? variant.variantName.split("(")[0].trim() : null)
      );
    }
    if (norm === "ram" || norm === "memory") {
      return variant.ramGb ? `${variant.ramGb}GB` : null;
    }
    if (norm === "storage") {
      if (!variant.storageGb) return null;
      return `${
        variant.storageGb >= 1000
          ? variant.storageGb / 1000 + "TB"
          : variant.storageGb + "GB"
      } SSD`;
    }
    if (norm.includes("graphics") || norm.includes("gpu")) {
      return variant.specification?.gpuModel || null;
    }
    if (norm.includes("display")) {
      const panel = variant.specification?.displayPanelType || "";
      const res = variant.specification?.displayResolution || "";
      if (panel.includes("OLED")) return res.includes("2.8K") ? "2.8K OLED" : "OLED";
      if (panel.includes("IPS")) return res.includes("WUXGA") ? "WUXGA IPS" : "IPS";
      return panel || res || null;
    }
    return null;
  };

  // Compute unified product options list
  const productOptions: OptionDescriptor[] = useMemo(() => {
    if (product.options && product.options.length > 0) {
      return product.options.map((opt) => ({
        id: opt.id,
        name: opt.name,
        isColor: opt.name.toLowerCase() === "color",
        values: opt.values.map((v) => ({
          value: v.value,
          hex: (v.metaobjectEntry?.fields as any)?.hex ?? null,
        })),
      }));
    }

    // Dynamic derivation fallback from variants
    const opts: OptionDescriptor[] = [];

    const colors = [
      ...new Set(product.variants.map((v) => v.color).filter(Boolean)),
    ] as string[];
    if (colors.length > 0) {
      opts.push({
        id: "color",
        name: "Color",
        isColor: true,
        values: colors.map((c) => ({ value: c })),
      });
    }

    const cpus = [
      ...new Set(
        product.variants
          .map((v) => (v.specification as any)?.cpuModel?.trim())
          .filter(Boolean)
      ),
    ] as string[];
    if (cpus.length > 0) {
      opts.push({
        id: "processor_family",
        name: "Processor Family",
        isColor: false,
        values: cpus.map((c) => ({ value: c })),
      });
    }

    const rams = [
      ...new Set(
        product.variants
          .map((v) => (v.ramGb ? `${v.ramGb}GB` : null))
          .filter(Boolean)
      ),
    ] as string[];
    if (rams.length > 0) {
      opts.push({
        id: "ram",
        name: "RAM",
        isColor: false,
        values: rams.map((r) => ({ value: r })),
      });
    }

    const storages = [
      ...new Set(
        product.variants
          .map((v) =>
            v.storageGb
              ? `${
                  v.storageGb >= 1000
                    ? v.storageGb / 1000 + "TB"
                    : v.storageGb + "GB"
                } SSD`
              : null
          )
          .filter(Boolean)
      ),
    ] as string[];
    if (storages.length > 0) {
      opts.push({
        id: "storage",
        name: "Storage",
        isColor: false,
        values: storages.map((s) => ({ value: s })),
      });
    }

    const gpus = [
      ...new Set(
        product.variants
          .map((v) => (v.specification as any)?.gpuModel?.trim())
          .filter(Boolean)
      ),
    ] as string[];
    if (gpus.length > 1) {
      opts.push({
        id: "graphics",
        name: "Graphics",
        isColor: false,
        values: gpus.map((g) => ({ value: g })),
      });
    }

    return opts;
  }, [product.options, product.variants]);

  // Check if a specific option value is available given other selected attributes
  const isOptionValueAvailable = (optName: string, value: string): boolean => {
    const currentVal = getVariantValueForOption(activeVariant, optName);
    if (currentVal === value) return true;

    // Filter down variants that match this specific candidate value
    let matching = product.variants.filter((v) => {
      const vVal = getVariantValueForOption(v, optName);
      return vVal === value;
    });

    if (matching.length === 0) return false;

    // Check against the current selections of other options
    // Priority order for narrowing down compatibility: Color, Processor family, RAM, Storage, Graphics, Display
    // An option value is considered available if there exists a variant matching it alongside
    // the user's primary/higher-level selections, or all other selections.
    const otherSelectedOptions = productOptions.filter((opt) => opt.name !== optName);

    // 1. First, check if there's an exact match with ALL currently selected attributes
    const exactMatches = matching.filter((v) => {
      return otherSelectedOptions.every((opt) => {
        const selectedVal = getVariantValueForOption(activeVariant, opt.name);
        if (!selectedVal) return true;
        const vVal = getVariantValueForOption(v, opt.name);
        return vVal === selectedVal;
      });
    });

    if (exactMatches.length > 0) return true;

    // 2. If not an exact match across ALL attributes, check hierarchical compatibility:
    // Determine the position of this option in the hierarchy.
    // If selecting an attribute further down (e.g. Graphics), it MUST be compatible with
    // higher-order selections made so far (Color, Processor family, RAM, Storage).
    const optIndex = productOptions.findIndex((opt) => opt.name === optName);
    
    // Higher options that come before this option in the list
    const priorOptions = productOptions.slice(0, optIndex > 0 ? optIndex : 0);
    
    if (priorOptions.length > 0) {
      const matchesPrior = matching.some((v) => {
        return priorOptions.every((opt) => {
          const selectedVal = getVariantValueForOption(activeVariant, opt.name);
          if (!selectedVal) return true;
          const vVal = getVariantValueForOption(v, opt.name);
          return vVal === selectedVal;
        });
      });
      return matchesPrior;
    }

    // For top-level option (e.g., Color), it's available if variants exist for it
    return true;
  };

  // Handle selecting an option value with smart closest-variant matching
  const handleSelectOption = (optionName: string, value: string) => {
    // 1. Find variants matching this specific option
    const matchingVariants = product.variants.filter((v) => {
      const val = getVariantValueForOption(v, optionName);
      return val === value;
    });

    if (matchingVariants.length === 0) return;

    // 2. Pick the variant that has highest agreement with currently active variant
    // Weight earlier options (like Color, Processor) slightly higher for intuitive transitions
    let bestVariant = matchingVariants[0];
    let bestScore = -1;

    for (const v of matchingVariants) {
      let score = 0;
      productOptions.forEach((opt, idx) => {
        if (opt.name === optionName) return;
        const currentVal = getVariantValueForOption(activeVariant, opt.name);
        const vVal = getVariantValueForOption(v, opt.name);
        if (currentVal && vVal && currentVal === vVal) {
          // Weight prior options higher
          const weight = Math.max(1, productOptions.length - idx);
          score += weight;
        }
      });
      if (score > bestScore) {
        bestScore = score;
        bestVariant = v;
      }
    }

    setSelectedVariantId(bestVariant.id);
  };

  const spec = activeVariant?.specification || {};

  return (
    <div className="relative w-full bg-white text-neutral-900 pb-28">
      {/* Main PDP 2-Column Grid (Aligned to the same horizontal top line) */}
      <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-start">
          
          {/* LEFT COLUMN: Modern Gallery (Mobile: Single Hero + Horizontal Thumbnails; Desktop: Vertical Thumbnails + Full Cards, Sticky) */}
          <div className="lg:col-span-7 flex flex-col md:flex-row gap-4 lg:sticky lg:top-28 lg:self-start">
            
            {/* Desktop Vertical Thumbnail Strip (hidden on mobile) */}
            <div className="hidden md:flex flex-col gap-3 shrink-0">
              {galleryImages.map((imgSrc, idx) => {
                const isSelected = activeImageIndex === idx;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => scrollToImage(idx)}
                    className={`relative h-20 w-20 rounded-xl overflow-hidden border transition-all duration-150 bg-[#f4f5f3] shrink-0 p-0 ${
                      isSelected
                        ? "border-2 border-neutral-900 ring-2 ring-neutral-900/10 shadow-xs"
                        : "border-neutral-200/90 hover:border-neutral-400 opacity-80 hover:opacity-100"
                    }`}
                  >
                    <Image
                      src={imgSrc}
                      alt={`${product.name} thumbnail ${idx + 1}`}
                      fill
                      className="object-cover w-full h-full p-0"
                      sizes="80px"
                    />
                  </button>
                );
              })}
            </div>

            {/* Mobile View: Single Featured Hero Image + Horizontal Thumbnails directly below (matching reference) */}
            <div className="flex md:hidden flex-col gap-3 w-full">
              {/* Featured Large Hero Image with Zoom Search Icon */}
              <div className="relative aspect-[4/3] w-full rounded-2xl bg-[#f8f9fa] overflow-hidden border border-neutral-200/80 p-0 shadow-xs">
                <Image
                  src={galleryImages[activeImageIndex] || galleryImages[0]}
                  alt={`${product.name} active preview`}
                  fill
                  priority
                  className="object-cover w-full h-full p-0"
                  sizes="100vw"
                />
                
                {/* Floating Search/Zoom Icon pill in top-right */}
                <button
                  type="button"
                  aria-label="Zoom image"
                  className="absolute top-3.5 right-3.5 h-9 w-9 rounded-full bg-white/95 backdrop-blur-xs shadow-md border border-black/5 flex items-center justify-center text-neutral-800 transition active:scale-95"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
              </div>

              {/* Horizontal Thumbnails Row */}
              <div className="flex items-center gap-2.5 overflow-x-auto pb-1 pt-0.5 no-scrollbar">
                {galleryImages.map((imgSrc, idx) => {
                  const isSelected = activeImageIndex === idx;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveImageIndex(idx)}
                      className={`relative h-14 w-14 sm:h-16 sm:w-16 rounded-xl overflow-hidden border transition-all duration-150 bg-[#f4f5f3] shrink-0 p-0 ${
                        isSelected
                          ? "border-2 border-neutral-900 ring-2 ring-neutral-900/10 shadow-xs"
                          : "border-neutral-200/90 hover:border-neutral-400 opacity-80"
                      }`}
                    >
                      <Image
                        src={imgSrc}
                        alt={`${product.name} mobile thumb ${idx + 1}`}
                        fill
                        className="object-cover w-full h-full p-0"
                        sizes="64px"
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Desktop View: Stacked Large Gallery Images */}
            <div className="hidden md:flex flex-1 flex-col space-y-4">
              {galleryImages.map((imgSrc, idx) => {
                return (
                  <div
                    key={idx}
                    ref={(el) => {
                      imageRefs.current[idx] = el;
                    }}
                    onClick={() => setActiveImageIndex(idx)}
                    className={`relative aspect-[4/3] rounded-2xl md:rounded-3xl bg-[#f8f9fa] overflow-hidden border border-neutral-200/80 transition-shadow p-0 ${
                      activeImageIndex === idx ? "ring-1 ring-neutral-300" : ""
                    }`}
                  >
                    <Image
                      src={imgSrc}
                      alt={`${product.name} view ${idx + 1}`}
                      fill
                      priority={idx === 0}
                      className="object-cover w-full h-full p-0"
                      sizes="(max-width: 1024px) 100vw, 55vw"
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT COLUMN: Breadcrumbs & Buy Box (Part of Right Content, Sticky, Aligned with Left Top) */}
          <div className="lg:col-span-5 flex flex-col space-y-5 lg:sticky lg:top-28 lg:self-start">
            
            {/* 1. Breadcrumbs (Directly above product name on the right side - single line strictly) */}
            <nav className="flex items-center gap-1.5 text-xs sm:text-[13px] text-neutral-500 font-sans whitespace-nowrap overflow-hidden max-w-full">
              <Link href="/" className="hover:text-black transition shrink-0">
                Home
              </Link>
              <span className="text-neutral-300 shrink-0 select-none">/</span>
              <Link href="/laptops" className="hover:text-black transition shrink-0 max-w-[130px] sm:max-w-[180px] truncate" title={product.category?.name || "Laptops"}>
                {product.category?.name || "Laptops"}
              </Link>
              <span className="text-neutral-300 shrink-0 select-none">/</span>
              <span
                title={product.name}
                className="text-neutral-900 font-medium truncate min-w-0 flex-1"
              >
                {product.name}
              </span>
            </nav>

            {/* 2. Title & Price */}
            <div>
              <h1
                style={{ fontFamily: "var(--font-serif), 'Instrument Serif', Georgia, serif" }}
                className="text-3xl sm:text-4xl lg:text-[42px] font-normal tracking-tight text-neutral-950 leading-[1.15] break-words"
              >
                {product.name}
              </h1>

              <div className="mt-3 flex items-baseline gap-3">
                <span className="text-2xl sm:text-3xl font-normal tracking-tight text-neutral-900">
                  {formatPrice(activeVariant?.sellingPrice || 0, activeVariant?.currency)}
                </span>
                {activeVariant?.compareAtPrice &&
                  Number(activeVariant.compareAtPrice) > Number(activeVariant.sellingPrice) && (
                    <span className="text-base text-neutral-400 line-through font-normal">
                      {formatPrice(activeVariant.compareAtPrice, activeVariant.currency)}
                    </span>
                  )}
              </div>

              {product.shortDescription && (
                <p className="mt-3 text-sm leading-relaxed text-neutral-600">
                  {product.shortDescription}
                </p>
              )}
            </div>

            {/* 3. DYNAMIC VARIANT OPTIONS (Color Swatches & Pill Buttons with Diagonal Disabled Cross) */}
            <div className="space-y-4 pt-1">
              {productOptions.map((opt) => {
                const activeVal = getVariantValueForOption(activeVariant, opt.name);

                // A. Color option -> Circle swatches with active outer ring & diagonal cross if unavailable
                if (opt.isColor) {
                  return (
                    <div key={opt.id} className="space-y-2">
                      <div className="text-[13px] text-neutral-800">
                        <span className="font-normal text-neutral-900">Color:</span>{" "}
                        <span className="font-normal text-neutral-700">
                          {activeVal || opt.values[0]?.value}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2.5 pt-0.5">
                        {opt.values.map((item) => {
                          const isSelected = activeVal === item.value;
                          const isAvailable = isOptionValueAvailable(opt.name, item.value);
                          const hex = resolveColorHex(item.value, item.hex);

                          return (
                            <button
                              key={item.value}
                              type="button"
                              onClick={() => handleSelectOption(opt.name, item.value)}
                              title={`${item.value}${!isAvailable ? " (Unavailable)" : ""}`}
                              aria-label={`Select color ${item.value}`}
                              className={`relative h-9 w-9 rounded-full transition-all flex items-center justify-center overflow-hidden ${
                                isSelected
                                  ? "ring-2 ring-neutral-900 ring-offset-2 ring-offset-white scale-105"
                                  : isAvailable
                                    ? "ring-1 ring-neutral-300 hover:ring-neutral-500 hover:scale-105"
                                    : "ring-1 ring-neutral-200 opacity-60"
                              }`}
                            >
                              <span
                                className="h-full w-full rounded-full shadow-inner border border-black/10"
                                style={{ backgroundColor: hex }}
                              />
                              {!isAvailable && (
                                <svg
                                  className="absolute inset-0 w-full h-full pointer-events-none text-neutral-500"
                                  preserveAspectRatio="none"
                                  viewBox="0 0 100 100"
                                  fill="none"
                                >
                                  <line
                                    x1="0"
                                    y1="100"
                                    x2="100"
                                    y2="0"
                                    stroke="currentColor"
                                    strokeWidth="2.5"
                                    vectorEffect="non-scaling-stroke"
                                  />
                                </svg>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                }

                // B. All other options -> Pill buttons (with diagonal cross and gray box when unavailable)
                return (
                  <div key={opt.id} className="space-y-2">
                    <div className="text-[13px] text-neutral-800">
                      <span className="font-normal text-neutral-900">{opt.name}:</span>{" "}
                      <span className="font-normal text-neutral-700">
                        {activeVal || opt.values[0]?.value}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {opt.values.map((item) => {
                        const isSelected = activeVal === item.value;
                        const isAvailable = isOptionValueAvailable(opt.name, item.value);

                        return (
                          <button
                            key={item.value}
                            type="button"
                            onClick={() => handleSelectOption(opt.name, item.value)}
                            title={`${item.value}${!isAvailable ? " (Unavailable)" : ""}`}
                            className={`relative h-9 px-4 rounded-full text-xs font-medium transition-all duration-150 border overflow-hidden flex items-center justify-center ${
                              isSelected
                                ? "bg-black text-white border-black shadow-xs"
                                : isAvailable
                                  ? "bg-white text-neutral-800 border-neutral-300 hover:border-black"
                                  : "bg-neutral-100 text-neutral-400 border-neutral-200 cursor-not-allowed"
                            }`}
                          >
                            <span className="relative z-10">{item.value}</span>
                            {!isAvailable && (
                              <svg
                                className="absolute inset-0 w-full h-full pointer-events-none text-neutral-400"
                                preserveAspectRatio="none"
                                viewBox="0 0 100 100"
                                fill="none"
                              >
                                <line
                                  x1="0"
                                  y1="100"
                                  x2="100"
                                  y2="0"
                                  stroke="currentColor"
                                  strokeWidth="1.5"
                                  vectorEffect="non-scaling-stroke"
                                />
                              </svg>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 4. In-Stock Indicator */}
            <div className="flex items-center gap-2 text-[13px] font-medium text-emerald-700 pt-1">
              <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.4" d="M5 13l4 4L19 7" />
              </svg>
              <span>In - stock and ready to ship</span>
            </div>

            {/* 5. Quantity Stepper + Add to Cart Button */}
            <div className="flex items-center gap-3 pt-2">
              {/* Stepper Pill */}
              <div className="flex items-center h-12 rounded-full border border-neutral-300 bg-white px-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="h-8 w-8 flex items-center justify-center text-neutral-600 hover:text-black text-lg transition font-medium"
                  aria-label="Decrease quantity"
                >
                  −
                </button>
                <span className="w-8 text-center text-sm font-semibold text-neutral-900">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => q + 1)}
                  className="h-8 w-8 flex items-center justify-center text-neutral-600 hover:text-black text-lg transition font-medium"
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
                className="flex-1 h-12 rounded-full bg-[#e9ecef] hover:bg-[#dee2e6] text-neutral-900 font-medium text-sm transition-colors active:scale-[0.99] disabled:opacity-50 flex items-center justify-center"
              >
                {isAdding ? "Adding..." : addedToast ? "Added to Cart ✓" : "Add To Cart"}
              </button>
            </div>

            {/* Buy It Now Accent Button */}
            <button
              type="button"
              onClick={handleBuyNow}
              className="w-full h-12 rounded-full bg-[#dcf19a] hover:bg-[#d4ed89] text-neutral-950 font-semibold text-sm shadow-xs transition active:scale-[0.99] flex items-center justify-center"
            >
              Buy It Now
            </button>

            {/* Value Props Row (Free shipping, Easy return, Safe checkout) */}
            <div className="grid grid-cols-3 gap-2 border-t border-neutral-200/80 pt-5 text-center text-xs text-neutral-600">
              <div className="flex flex-col items-center gap-1.5">
                <svg className="w-5 h-5 text-neutral-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <span>Free shipping</span>
              </div>
              <div className="flex flex-col items-center gap-1.5">
                <svg className="w-5 h-5 text-neutral-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
                <span>Easy return</span>
              </div>
              <div className="flex flex-col items-center gap-1.5">
                <svg className="w-5 h-5 text-neutral-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                <span>Safe checkout</span>
              </div>
            </div>

            {/* Accordions (Product Details, Specifications, Warranty) */}
            <div className="border-t border-neutral-200/80 pt-3 divide-y divide-neutral-200/80">
              
              {/* Product Details Section */}
              <div className="py-4">
                <button
                  type="button"
                  onClick={() => toggleSection("details")}
                  className="flex w-full items-center justify-between text-left"
                >
                  <h3
                    style={{ fontFamily: "var(--font-serif), 'Instrument Serif', Georgia, serif" }}
                    className="text-2xl font-normal text-neutral-950"
                  >
                    Product Details
                  </h3>
                  <span className="text-lg text-neutral-500">
                    {openSections.details ? "−" : "+"}
                  </span>
                </button>
                {openSections.details && (
                  <div className="mt-3 text-sm leading-relaxed text-neutral-600 space-y-3 font-sans">
                    <p>{product.description || product.shortDescription}</p>
                    {activeVariant?.features && activeVariant.features.length > 0 && (
                      <ul className="list-disc pl-5 space-y-1.5 text-neutral-600">
                        {activeVariant.features.map((f, i) => (
                          <li key={i}>
                            <strong className="text-neutral-900">{f.featureName}:</strong> {f.description}
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
                    className="text-2xl font-normal text-neutral-950"
                  >
                    Key specifications
                  </h3>
                  <span className="text-lg text-neutral-500">
                    {openSections.specs ? "−" : "+"}
                  </span>
                </button>
                {openSections.specs && (
                  <div className="mt-3 text-xs divide-y divide-neutral-100">
                    {Object.entries(spec)
                      .filter(([_, v]) => Boolean(v))
                      .slice(0, 10)
                      .map(([key, val]) => (
                        <div key={key} className="flex justify-between py-2 text-neutral-600">
                          <span className="capitalize">{key.replace(/([A-Z])/g, " $1")}</span>
                          <span className="font-semibold text-neutral-900">{String(val)}</span>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* Warranty & Authenticity Section */}
              <div className="py-4">
                <button
                  type="button"
                  onClick={() => toggleSection("warranty")}
                  className="flex w-full items-center justify-between text-left"
                >
                  <h3
                    style={{ fontFamily: "var(--font-serif), 'Instrument Serif', Georgia, serif" }}
                    className="text-2xl font-normal text-neutral-950"
                  >
                    Warranty & authenticity
                  </h3>
                  <span className="text-lg text-neutral-500">
                    {openSections.warranty ? "−" : "+"}
                  </span>
                </button>
                {openSections.warranty && (
                  <div className="mt-3 text-sm text-neutral-600 space-y-2">
                    <p>
                      Official manufacturer warranty:{" "}
                      <strong className="text-neutral-900">
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
            <div className="flex items-center justify-between border-t border-neutral-200/80 pt-5">
              <div className="flex items-center gap-3 text-xs text-neutral-500">
                <span>Share:</span>
                <button type="button" className="text-neutral-900 hover:text-blue-600 font-bold transition">f</button>
                <button type="button" className="text-neutral-900 hover:text-red-600 font-bold transition">P</button>
                <button type="button" className="text-neutral-900 hover:text-neutral-950 font-bold transition">𝕏</button>
              </div>

              <Link
                href="/account"
                className="rounded-full border border-neutral-300 px-4 py-1.5 text-xs font-medium text-neutral-900 hover:bg-neutral-100 transition"
              >
                Need Help ?
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Bottom-Right Sticky Action Card */}
      <AnimatePresence>
        {showStickyBar && activeVariant && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-6 right-6 z-40 flex items-center gap-3 rounded-2xl bg-white p-2.5 shadow-2xl border border-neutral-200/90 max-w-sm backdrop-blur-md"
          >
            <div className="relative h-12 w-12 rounded-xl bg-neutral-100 overflow-hidden shrink-0 border border-neutral-200">
              <Image
                src={galleryImages[0]}
                alt={product.name}
                fill
                className="object-cover p-0"
                sizes="48px"
              />
            </div>
            <div className="min-w-0 pr-2">
              <p className="text-xs font-semibold text-neutral-950 truncate max-w-[140px]">
                {product.name}
              </p>
              <p className="text-xs font-bold text-neutral-900">
                {formatPrice(activeVariant.sellingPrice, activeVariant.currency)}
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddToCart}
              className="h-10 px-5 rounded-xl bg-[#dcf19a] hover:bg-[#d4ed89] text-neutral-950 text-xs font-bold transition active:scale-95 shrink-0"
            >
              {addedToast ? "Added ✓" : "Add"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
