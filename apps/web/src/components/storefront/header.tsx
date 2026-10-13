"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, useScroll, useTransform, useSpring, AnimatePresence } from "motion/react";
import { useCustomerAuth } from "../auth/customer-auth-provider";
import { useCart } from "../cart/cart-provider";
import { getBrands, getCategories, getCollections } from "../../lib/api";
import type {
  CatalogueBrand,
  CatalogueCategory,
  CatalogueCollection,
} from "../../types/catalogue";

export function StorefrontHeader() {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [shopSubTab, setShopSubTab] = useState<"category" | "collection" | "brand" | "all">("category");
  const [categories, setCategories] = useState<CatalogueCategory[]>([]);
  const [collections, setCollections] = useState<CatalogueCollection[]>([]);
  const [brands, setBrands] = useState<CatalogueBrand[]>([]);
  const { customer, isAuthenticated } = useCustomerAuth();
  const { itemCount } = useCart();

  useEffect(() => {
    let mounted = true;
    Promise.allSettled([getCategories(), getCollections(), getBrands()]).then(
      ([catsRes, colsRes, brandsRes]) => {
        if (!mounted) return;
        if (catsRes.status === "fulfilled" && Array.isArray(catsRes.value)) {
          // Filter subcategories or top categories (ignore root parent if preferred, or take first 6)
          const validCats = catsRes.value.filter((c) => c.slug !== "laptops");
          setCategories(validCats.length > 0 ? validCats : catsRes.value);
        }
        if (colsRes.status === "fulfilled" && Array.isArray(colsRes.value)) {
          setCollections(colsRes.value);
        }
        if (brandsRes.status === "fulfilled" && Array.isArray(brandsRes.value)) {
          setBrands(brandsRes.value);
        }
      },
    );
    return () => {
      mounted = false;
    };
  }, []);

  // Track raw scroll distance
  const { scrollY } = useScroll();

  // Smooth out notched mouse wheel inputs with a spring dampener
  const smoothY = useSpring(scrollY, {
    stiffness: 300,
    damping: 35,
    restDelta: 0.001,
  });

  // Pure GPU transforms on layout measurements driven by spring-smoothed scroll
  const headerPaddingTop = useTransform(smoothY, [0, 140], [28, 0]);
  const headerPaddingX = useTransform(smoothY, [0, 140], [36, 0]);

  // Max width expands from 1180px pill to full 100%
  const containerMaxWidth = useTransform(smoothY, [0, 140], ["1180px", "100%"]);
  // Border radius: Smoothly goes from generous 20px pill curvature down to 0px
  const containerBorderRadius = useTransform(smoothY, [0, 140], [20, 0]);
  // Border bottom opacity appears as it pins
  const borderBottomOpacity = useTransform(smoothY, [70, 140], [0, 1]);

  const navItems = [
    { label: "Shop", key: "shop" },
  ];

  // Top 6 defaults / fallbacks in case API returns fewer items initially
  const fallbackCategories = [
    { id: 1, name: "Ultrabooks & Productivity", slug: "ultrabooks", icon: "💻", imageUrl: "/media/catalogue/categories/ultrabooks.jpg" },
    { id: 2, name: "Gaming Laptops", slug: "gaming-laptops", icon: "⚡", imageUrl: "/media/catalogue/categories/gaming-laptops.jpg" },
    { id: 3, name: "Creator Workstations", slug: "creator-workstations", icon: "🎨", imageUrl: null },
    { id: 4, name: "2-in-1 Convertibles", slug: "convertibles", icon: "🔄", imageUrl: null },
    { id: 5, name: "Business & Enterprise", slug: "business-laptops", icon: "💼", imageUrl: null },
    { id: 6, name: "Everyday Computing", slug: "everyday-computing", icon: "🌐", imageUrl: null },
  ];

  const fallbackCollections = [
    { id: 1, title: "Bestsellers & Staff Picks", slug: "bestsellers", icon: "⭐" },
    { id: 2, title: "Pure OLED & Cinema Displays", slug: "pure-oled-displays", icon: "✨" },
    { id: 3, title: "Engineered for Pro Creators", slug: "pro-creators", icon: "🚀" },
    { id: 4, title: "Best for Students & Coding", slug: "student-and-coding", icon: "🎓" },
    { id: 5, title: "Flagship Copilot+ PCs", slug: "copilot-pcs", icon: "🤖" },
    { id: 6, title: "Ultra-Light Mobility Under 1.3kg", slug: "ultra-light", icon: "🪶" },
  ];

  const fallbackBrands = [
    { id: 1, name: "Apple", slug: "apple", logoUrl: "/media/catalogue/brands/apple-logo.svg" },
    { id: 2, name: "Dell", slug: "dell", logoUrl: "/media/catalogue/brands/dell-logo.svg" },
    { id: 3, name: "Lenovo", slug: "lenovo", logoUrl: "/media/catalogue/brands/lenovo-logo.svg" },
    { id: 4, name: "HP", slug: "hp", logoUrl: "/media/catalogue/brands/hp-logo.svg" },
    { id: 5, name: "Asus", slug: "asus", logoUrl: "/media/catalogue/brands/asus-logo.svg" },
    { id: 6, name: "Acer", slug: "acer", logoUrl: "/media/catalogue/brands/acer-logo.svg" },
  ];

  // Active items computed for right-side grid (top 6)
  const displayCategories = categories.length > 0 ? categories.slice(0, 6) : fallbackCategories;
  const displayCollections = collections.length > 0 ? collections.slice(0, 6) : fallbackCollections;
  const displayBrands = brands.length > 0 ? brands.slice(0, 6) : fallbackBrands;

  const leftSubTabs = [
    { key: "category" as const, label: "Shop by Category" },
    { key: "collection" as const, label: "Shop by Collection" },
    { key: "brand" as const, label: "Shop by Brand" },
    { key: "all" as const, label: "Shop All" },
  ];

  return (
    <motion.header
      style={{
        paddingTop: headerPaddingTop,
        paddingLeft: headerPaddingX,
        paddingRight: headerPaddingX,
      }}
      className="fixed top-0 left-0 right-0 z-50 w-full will-change-transform"
      onMouseLeave={() => setActiveMenu(null)}
    >
      <motion.div
        style={{
          maxWidth: containerMaxWidth,
          borderTopLeftRadius: containerBorderRadius,
          borderTopRightRadius: containerBorderRadius,
          borderBottomLeftRadius: activeMenu ? 0 : containerBorderRadius,
          borderBottomRightRadius: activeMenu ? 0 : containerBorderRadius,
        }}
        className={`relative mx-auto w-full bg-[#0b241b] text-white shadow-2xl backdrop-blur-md will-change-transform px-6 py-3.5 md:px-8 md:py-4 transition-[border-radius] duration-200 ${
          activeMenu ? "rounded-b-none" : ""
        }`}
      >
        {/* Pinned bottom border subtle separator line */}
        <motion.div
          style={{ opacity: borderBottomOpacity }}
          className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-emerald-800/60"
        />

        {/* 3-Column Grid ensuring logo is 100% dead center */}
        <div className="grid grid-cols-3 items-center">
          {/* Left Column: Navigation buttons */}
          <div className="flex items-center justify-start">
            <nav className="flex items-center gap-2 sm:gap-3 lg:gap-3.5">
              {navItems.map((item, idx) => {
                const isActive = activeMenu === item.key;
                return (
                  <div
                    key={item.key}
                    className={`relative ${idx >= 2 ? "hidden sm:block" : ""} ${idx >= 3 ? "hidden md:block" : ""}`}
                    onMouseEnter={() => setActiveMenu(item.key)}
                  >
                    {/* Active Pill Highlight when hovering: Pale Lime pill button with black text */}
                    <button
                      type="button"
                      className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold tracking-normal transition-all duration-200 ${
                        isActive
                          ? "bg-[#d6f088] text-slate-950 shadow-sm"
                          : "text-emerald-50/90 hover:text-white"
                      }`}
                    >
                      <span>{item.label}</span>
                      <svg
                        className={`h-3.5 w-3.5 transition-transform duration-200 ${
                          isActive ? "rotate-180 opacity-90" : "opacity-70"
                        }`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="2.5"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                );
              })}
            </nav>
          </div>

          {/* Center Column: Perfectly centered Brand Logo */}
          <div className="flex items-center justify-center">
            <Link
              href="/"
              className="font-serif text-3xl font-normal tracking-tight text-white transition hover:opacity-95 md:text-4xl"
            >
              klarone
            </Link>
          </div>

          {/* Right Column: Action Icons */}
          <div className="flex items-center justify-end gap-3.5 sm:gap-5">
            {/* Search Icon */}
            <button
              type="button"
              aria-label="Search"
              className="text-emerald-100/90 transition duration-150 hover:scale-110 hover:text-white active:scale-95"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </button>

            {/* Customer Account Icon */}
            <Link
              href={isAuthenticated ? "/account" : "/login"}
              aria-label="Account"
              className="text-emerald-100/90 transition duration-150 hover:scale-110 hover:text-white active:scale-95"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </Link>

            {/* Shopping Cart Icon */}
            <Link
              href="/cart"
              aria-label="Shopping Cart"
              className="relative text-emerald-100/90 transition duration-150 hover:scale-110 hover:text-white active:scale-95"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                />
              </svg>
              {itemCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -right-2 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#d6f088] px-1 text-[10px] font-bold text-slate-950 shadow-sm"
                >
                  {itemCount}
                </motion.span>
              )}
            </Link>
          </div>
        </div>

        {/* 
          Mega Menu Card Dropdown:
          Full-width white rounded card container matching Shopify reference typography & scale
        */}
        <AnimatePresence>
          {activeMenu && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="absolute left-0 right-0 top-full mt-0 overflow-hidden rounded-t-none rounded-b-[28px] border-t border-stone-200/60 bg-white text-slate-900 shadow-[0_30px_70px_rgba(0,0,0,0.25)]"
            >
              {activeMenu === "shop" && (
                <div className="grid grid-cols-12 items-start gap-8 px-10 py-10 lg:px-14 lg:py-12">
                  {/* Column 1 (Left): Editorial Serif Links matching Reference Image 2 */}
                  <div className="col-span-3 flex flex-col items-start space-y-4 border-r border-stone-200/90 pr-8">
                    {leftSubTabs.map((tab) => {
                      const isSelected = shopSubTab === tab.key;
                      return (
                        <button
                          key={tab.key}
                          type="button"
                          onClick={() => setShopSubTab(tab.key)}
                          onMouseEnter={() => setShopSubTab(tab.key)}
                          style={{
                            fontFamily: "var(--font-serif), 'Instrument Serif', Georgia, serif",
                            fontSize: "28px",
                            lineHeight: "1.2",
                          }}
                          className={`text-left font-normal tracking-tight transition-all duration-150 ${
                            isSelected
                              ? "text-slate-950 underline underline-offset-6 decoration-1"
                              : "text-slate-800 hover:text-slate-950 hover:underline hover:underline-offset-6"
                          }`}
                        >
                          {tab.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Column 2 (Middle): 2-Column List with squircle thumbnail badges aligned to top */}
                  <div className="col-span-4 grid grid-cols-2 gap-x-6 gap-y-5 pt-1">
                    {shopSubTab === "category" &&
                      displayCategories.map((cat, idx) => {
                        const bgColors = [
                          "bg-amber-100/90",
                          "bg-slate-200/90",
                          "bg-rose-100/90",
                          "bg-orange-100/90",
                          "bg-stone-200/90",
                          "bg-emerald-100/90",
                        ];
                        const bg = bgColors[idx % bgColors.length];
                        return (
                          <Link
                            key={cat.id}
                            href={`/laptops?categorySlug=${cat.slug}`}
                            className="group flex items-center gap-3.5 transition-transform hover:translate-x-0.5"
                          >
                            <div
                              className={`relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl ${bg} shadow-2xs`}
                            >
                              {cat.imageUrl ? (
                                <Image
                                  src={cat.imageUrl}
                                  alt={cat.name}
                                  fill
                                  className="object-cover transition-transform group-hover:scale-105"
                                />
                              ) : (
                                <span className="text-2xl">
                                  {"icon" in cat && cat.icon ? (cat.icon as string) : "💻"}
                                </span>
                              )}
                            </div>
                            <span className="text-[15px] font-medium leading-snug text-slate-900 group-hover:text-emerald-950">
                              {cat.name}
                            </span>
                          </Link>
                        );
                      })}

                    {shopSubTab === "collection" &&
                      displayCollections.map((col, idx) => {
                        const bgColors = [
                          "bg-slate-200/90",
                          "bg-amber-100/90",
                          "bg-emerald-100/90",
                          "bg-blue-100/90",
                          "bg-purple-100/90",
                          "bg-rose-100/90",
                        ];
                        const bg = bgColors[idx % bgColors.length];
                        return (
                          <Link
                            key={col.id}
                            href={`/laptops?collectionSlug=${col.slug}`}
                            className="group flex items-center gap-3.5 transition-transform hover:translate-x-0.5"
                          >
                            <div
                              className={`relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl ${bg} shadow-2xs`}
                            >
                              {col.bannerImage ? (
                                <Image
                                  src={col.bannerImage}
                                  alt={col.title}
                                  fill
                                  className="object-cover transition-transform group-hover:scale-105"
                                />
                              ) : (
                                <span className="text-2xl">
                                  {"icon" in col && col.icon ? (col.icon as string) : "✨"}
                                </span>
                              )}
                            </div>
                            <span className="text-[15px] font-medium leading-snug text-slate-900 group-hover:text-emerald-950">
                              {col.title}
                            </span>
                          </Link>
                        );
                      })}

                    {shopSubTab === "brand" &&
                      displayBrands.map((brand, idx) => {
                        const bgColors = [
                          "bg-[#f6f6f6]",
                          "bg-[#eef2f6]",
                          "bg-[#fff8ea]",
                          "bg-[#f1f3f5]",
                          "bg-[#eaf5ef]",
                          "bg-[#f5f5f7]",
                        ];
                        const bg = bgColors[idx % bgColors.length];
                        return (
                          <Link
                            key={brand.id}
                            href={`/laptops?brandSlug=${brand.slug}`}
                            className="group flex items-center gap-3.5 transition-transform hover:translate-x-0.5"
                          >
                            <div
                              className={`relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl ${bg} p-2.5 shadow-2xs`}
                            >
                              {brand.logoUrl ? (
                                <Image
                                  src={brand.logoUrl}
                                  alt={brand.name}
                                  width={34}
                                  height={34}
                                  className="max-h-8 max-w-8 object-contain transition-transform group-hover:scale-110"
                                />
                              ) : (
                                <span className="font-bold text-slate-700 text-sm">
                                  {brand.name.slice(0, 2).toUpperCase()}
                                </span>
                              )}
                            </div>
                            <span className="text-[15px] font-medium leading-snug text-slate-900 group-hover:text-emerald-950">
                              {brand.name}
                            </span>
                          </Link>
                        );
                      })}

                    {shopSubTab === "all" && (
                      <div className="col-span-2 flex flex-col justify-start pt-2">
                        <p
                          style={{ fontFamily: "var(--font-serif), 'Instrument Serif', Georgia, serif" }}
                          className="text-[32px] font-normal leading-tight text-slate-900"
                        >
                          Complete Flagship Lineup
                        </p>
                        <p className="mt-2 text-sm text-stone-600">
                          Browse all 50+ laptops across every category, tier, and processor.
                        </p>
                        <Link
                          href="/laptops"
                          className="mt-4 inline-flex items-center text-sm font-semibold text-emerald-800 hover:underline"
                        >
                          View all laptops →
                        </Link>
                      </div>
                    )}
                  </div>

                  {/* Column 3 (Right): Featured Editorial Banner Card matching screenshot exactly */}
                  <div className="col-span-5 pl-4">
                    <div className="relative flex aspect-[16/9] min-h-[260px] w-full flex-col justify-between overflow-hidden rounded-[26px] bg-stone-800 p-7 text-white shadow-md lg:p-8">
                      {/* Gradient overlay on top of image background */}
                      <div className="absolute inset-0 bg-gradient-to-r from-stone-900/90 via-stone-800/75 to-transparent z-1" />
                      
                      {/* Ambient background decoration */}
                      <div className="absolute right-0 top-0 bottom-0 w-2/3 bg-stone-800">
                        <div className="absolute inset-0 bg-radial from-stone-600/30 via-transparent to-stone-950/60" />
                      </div>

                      {/* Content */}
                      <div className="relative z-10">
                        <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/80">
                          NEW IN
                        </span>
                        <h4
                          style={{ fontFamily: "var(--font-serif), 'Instrument Serif', Georgia, serif" }}
                          className="mt-2.5 text-[38px] font-normal leading-[1.08] text-white lg:text-[44px]"
                        >
                          More daily
                          <br />
                          essentials
                        </h4>
                      </div>

                      <div className="relative z-10 mt-5">
                        <Link
                          href="/laptops"
                          className="group inline-flex items-center gap-3 rounded-full bg-[#d6f088] py-2 pl-5 pr-2 text-xs font-semibold text-slate-950 shadow-md transition-all hover:scale-105 hover:bg-[#c8e678]"
                        >
                          <span>Shop Now</span>
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-950 text-white transition-transform group-hover:translate-x-0.5">
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                            </svg>
                          </span>
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.header>
  );
}
