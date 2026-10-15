"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
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

  const pathname = usePathname();
  const isHomePage = pathname === "/";

  const [isMobile, setIsMobile] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [mobileSection, setMobileSection] = useState<"main" | "shop">("main");
  const [openShopSub, setOpenShopSub] = useState<string | null>(null);

  useEffect(() => {
    function checkMobile() {
      setIsMobile(window.innerWidth < 1024);
    }
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // When drawer is open, prevent body scroll
  useEffect(() => {
    if (mobileDrawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileDrawerOpen]);

  // Pure GPU transforms on layout measurements driven by spring-smoothed scroll (DESKTOP HOME ONLY)
  const homePaddingTop = useTransform(smoothY, [0, 140], [28, 0]);
  const homePaddingX = useTransform(smoothY, [0, 140], [36, 0]);
  const homeMaxWidth = useTransform(smoothY, [0, 140], ["1180px", "100%"]);
  const homeBorderRadius = useTransform(smoothY, [0, 140], [20, 0]);
  const homeBorderBottomOpacity = useTransform(smoothY, [70, 140], [0, 1]);

  const navItems = [
    { label: "Shop", key: "shop", isMenu: true },
    { label: "AI Advisor", key: "select", href: "/select" },
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
    <>
      {/* 
        ================================================================
        1. MOBILE & TABLET HEADER (< 1024px): 
        Completely static, native HTML (no motion transforms, no spring scroll bindings).
        Stays 100% full-width, 0 padding, attached to top at all times.
        ================================================================
      */}
      <header className="fixed top-0 left-0 right-0 z-50 w-full lg:hidden">
        <div className="relative w-full bg-[#0b241b] text-white shadow-xl px-4 py-3 sm:px-6">
          {/* Bottom border separator */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-emerald-800/60" />

          {/* 3-Column Grid ensuring logo is 100% dead center */}
          <div className="grid grid-cols-3 items-center">
            {/* Left Column: Hamburger Button */}
            <div className="flex items-center justify-start">
              <button
                type="button"
                onClick={() => {
                  setMobileSection("main");
                  setMobileDrawerOpen(true);
                }}
                aria-label="Open mobile menu"
                className="flex h-10 w-10 items-center justify-center rounded-lg text-emerald-100/95 transition-colors hover:bg-emerald-900/60 hover:text-white active:scale-95"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                </svg>
              </button>
            </div>

            {/* Center Column: Perfectly centered Brand Logo */}
            <div className="flex items-center justify-center">
              <Link
                href="/"
                className="font-serif text-2xl font-normal tracking-tight text-white transition hover:opacity-95 sm:text-3xl"
              >
                klarone
              </Link>
            </div>

            {/* Right Column: Account, Cart */}
            <div className="flex items-center justify-end gap-2.5 sm:gap-4">

              {/* Account Icon on small screens */}
              <Link
                href={isAuthenticated ? "/account" : "/login"}
                aria-label="Account"
                className="hidden h-9 w-9 items-center justify-center rounded-lg text-emerald-100/90 transition hover:text-white active:scale-95 sm:flex"
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
                className="relative flex h-9 w-9 items-center justify-center rounded-lg text-emerald-100/90 transition hover:text-white active:scale-95"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                  />
                </svg>
                {itemCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#d6f088] px-1 text-[10px] font-bold text-slate-950 shadow-sm">
                    {itemCount}
                  </span>
                )}
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* 
        ================================================================
        2. DESKTOP HEADER (>= 1024px): 
        Smooth spring-smoothed dynamic floating dock for desktop screens.
        ================================================================
      */}
      <motion.header
        style={{
          paddingTop: isHomePage ? homePaddingTop : 0,
          paddingLeft: isHomePage ? homePaddingX : 0,
          paddingRight: isHomePage ? homePaddingX : 0,
        }}
        className="fixed top-0 left-0 right-0 z-50 hidden w-full will-change-transform lg:block"
        onMouseLeave={() => setActiveMenu(null)}
      >
        <motion.div
          style={{
            maxWidth: isHomePage ? homeMaxWidth : "100%",
            borderTopLeftRadius: isHomePage ? homeBorderRadius : 0,
            borderTopRightRadius: isHomePage ? homeBorderRadius : 0,
            borderBottomLeftRadius: activeMenu ? 0 : isHomePage ? homeBorderRadius : 0,
            borderBottomRightRadius: activeMenu ? 0 : isHomePage ? homeBorderRadius : 0,
          }}
          className={`relative mx-auto w-full bg-[#0b241b] text-white shadow-2xl backdrop-blur-md px-8 py-4 transition-[border-radius] duration-200 ${
            activeMenu ? "rounded-b-none" : ""
          }`}
        >
          {/* Pinned bottom border subtle separator line */}
          <motion.div
            style={{ opacity: isHomePage ? homeBorderBottomOpacity : 1 }}
            className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-emerald-800/60"
          />

          {/* 3-Column Grid ensuring logo is 100% dead center */}
          <div className="grid grid-cols-3 items-center">
            {/* Left Column: Desktop Navigation buttons */}
            <div className="flex items-center justify-start">
              <nav className="flex items-center gap-3.5">
                {navItems.map((item, idx) => {
                  const isActive = activeMenu === item.key;
                  if (item.href) {
                    return (
                      <Link
                        key={item.key}
                        href={item.href}
                        className="flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold tracking-normal text-emerald-50/90 transition-all duration-200 hover:bg-[#d6f088] hover:text-slate-950 hover:shadow-sm"
                      >
                        <span className="flex h-2 w-2 rounded-full bg-[#d6f088] animate-pulse" />
                        <span>{item.label}</span>
                      </Link>
                    );
                  }

                  return (
                    <div
                      key={item.key}
                      className={`relative ${idx >= 2 ? "hidden sm:block" : ""} ${idx >= 3 ? "hidden md:block" : ""}`}
                      onMouseEnter={() => setActiveMenu(item.key)}
                    >
                      {/* Active Pill Highlight when hovering */}
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
                className="font-serif text-4xl font-normal tracking-tight text-white transition hover:opacity-95"
              >
                klarone
              </Link>
            </div>

            {/* Right Column: Action Icons */}
            <div className="flex items-center justify-end gap-5">

              {/* Customer Account Icon */}
              <Link
                href={isAuthenticated ? "/account" : "/login"}
                aria-label="Account"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-emerald-100/90 transition duration-150 hover:scale-110 hover:text-white active:scale-95"
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
                className="relative flex h-9 w-9 items-center justify-center rounded-lg text-emerald-100/90 transition duration-150 hover:scale-110 hover:text-white active:scale-95"
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
                    className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#d6f088] px-1 text-[10px] font-bold text-slate-950 shadow-sm"
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
          {!isMobile && activeMenu && (
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
                              {"bannerImage" in col && col.bannerImage ? (
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

    {/* Mobile Slide-over Drawer matching reference screenshots */}
    <AnimatePresence>
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-[100] lg:hidden">
          {/* Backdrop overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={() => setMobileDrawerOpen(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Drawer container: slides in from left or sits flush */}
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="absolute inset-y-0 left-0 flex w-full max-w-[340px] sm:max-w-sm flex-col bg-white text-slate-900 shadow-2xl"
          >
            {/* Drawer Header: Brand logo + Close ✕ button with divider */}
            <div className="flex h-16 items-center justify-between border-b border-stone-200/80 px-6">
              <Link
                href="/"
                onClick={() => setMobileDrawerOpen(false)}
                className="font-serif text-3xl font-normal tracking-tight text-slate-900"
              >
                klarone
              </Link>
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(false)}
                aria-label="Close menu"
                className="flex h-10 w-10 items-center justify-center rounded-full text-slate-500 hover:bg-stone-100 hover:text-slate-900 active:scale-95"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Drawer Body: Navigation Items */}
            <div className="flex-1 overflow-y-auto px-6 py-6">
              {mobileSection === "main" ? (
                /* Primary Navigation List */
                <div className="flex flex-col space-y-4">
                  {/* Shop with right chevron leading to sub-view */}
                  <button
                    type="button"
                    onClick={() => setMobileSection("shop")}
                    className="flex w-full items-center justify-between text-left font-serif text-[20px] font-normal tracking-tight text-slate-900 transition-colors hover:text-emerald-900 active:opacity-70"
                  >
                    <span>Shop</span>
                    <svg className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>

                  {/* AI Advisor */}
                  <Link
                    href="/select"
                    onClick={() => setMobileDrawerOpen(false)}
                    className="flex w-full items-center justify-between text-left font-serif text-[20px] font-normal tracking-tight text-slate-900 transition-colors hover:text-emerald-900 active:opacity-70"
                  >
                    <span className="flex items-center gap-2.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span>AI Advisor</span>
                    </span>
                    <svg className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>

                  {/* Catalogue */}
                  <Link
                    href="/laptops"
                    onClick={() => setMobileDrawerOpen(false)}
                    className="flex w-full items-center justify-between text-left font-serif text-[20px] font-normal tracking-tight text-slate-900 transition-colors hover:text-emerald-900 active:opacity-70"
                  >
                    <span>All Laptops</span>
                    <svg className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>

                  {/* Cart Link in list */}
                  <Link
                    href="/cart"
                    onClick={() => setMobileDrawerOpen(false)}
                    className="flex w-full items-center justify-between text-left font-serif text-[20px] font-normal tracking-tight text-slate-900 transition-colors hover:text-emerald-900 active:opacity-70"
                  >
                    <span>Cart ({itemCount})</span>
                    <svg className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              ) : (
                /* Sub-Navigation: Shop drilldown matching Image 3 */
                <div className="space-y-4">
                  {/* Back to main menu header button */}
                  <button
                    type="button"
                    onClick={() => setMobileSection("main")}
                    className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 mb-2"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                    <span>Shop</span>
                  </button>

                  {/* Accordion Categories */}
                  <div className="divide-y divide-stone-100">
                    {/* Category Accordion */}
                    <div>
                      <button
                        type="button"
                        onClick={() => setOpenShopSub(openShopSub === "category" ? null : "category")}
                        className="flex w-full items-center justify-between py-2.5 text-left font-serif text-[18px] font-normal text-slate-900"
                      >
                        <span>Shop by Category</span>
                        <svg
                          className={`h-4 w-4 text-slate-400 transition-transform ${openShopSub === "category" ? "rotate-180" : ""}`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {openShopSub === "category" && (
                        <div className="space-y-1.5 pb-2.5 pl-2">
                          {displayCategories.map((c) => (
                            <Link
                              key={c.id}
                              href={`/laptops?categorySlug=${c.slug}`}
                              onClick={() => setMobileDrawerOpen(false)}
                              className="block py-1 text-sm text-slate-600 hover:text-emerald-800"
                            >
                              {c.name}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Collection Accordion */}
                    <div>
                      <button
                        type="button"
                        onClick={() => setOpenShopSub(openShopSub === "collection" ? null : "collection")}
                        className="flex w-full items-center justify-between py-2.5 text-left font-serif text-[18px] font-normal text-slate-900"
                      >
                        <span>Shop by Collection</span>
                        <svg
                          className={`h-4 w-4 text-slate-400 transition-transform ${openShopSub === "collection" ? "rotate-180" : ""}`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {openShopSub === "collection" && (
                        <div className="space-y-1.5 pb-2.5 pl-2">
                          {displayCollections.map((col) => (
                            <Link
                              key={col.id}
                              href={`/laptops?collectionSlug=${col.slug}`}
                              onClick={() => setMobileDrawerOpen(false)}
                              className="block py-1 text-sm text-slate-600 hover:text-emerald-800"
                            >
                              {col.title}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Brand Accordion */}
                    <div>
                      <button
                        type="button"
                        onClick={() => setOpenShopSub(openShopSub === "brand" ? null : "brand")}
                        className="flex w-full items-center justify-between py-2.5 text-left font-serif text-[18px] font-normal text-slate-900"
                      >
                        <span>Shop by Brand</span>
                        <svg
                          className={`h-4 w-4 text-slate-400 transition-transform ${openShopSub === "brand" ? "rotate-180" : ""}`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {openShopSub === "brand" && (
                        <div className="space-y-1.5 pb-2.5 pl-2">
                          {displayBrands.map((b) => (
                            <Link
                              key={b.id}
                              href={`/laptops?brandSlug=${b.slug}`}
                              onClick={() => setMobileDrawerOpen(false)}
                              className="block py-1 text-sm text-slate-600 hover:text-emerald-800"
                            >
                              {b.name}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* View All Laptops Direct Link */}
                    <div>
                      <Link
                        href="/laptops"
                        onClick={() => setMobileDrawerOpen(false)}
                        className="flex w-full items-center justify-between py-2.5 text-left font-serif text-[18px] font-normal text-slate-900"
                      >
                        <span>Shop All</span>
                        <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    </div>
                  </div>

                  {/* Featured Card matching Image 3 */}
                  <div className="relative mt-4 flex flex-col justify-between overflow-hidden rounded-2xl bg-stone-900 p-5 text-white">
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/80">
                      NEW IN
                    </span>
                    <h4 className="mt-2 font-serif text-2xl font-normal leading-tight text-white">
                      More daily
                      <br />
                      essentials
                    </h4>
                    <div className="mt-4">
                      <Link
                        href="/laptops"
                        onClick={() => setMobileDrawerOpen(false)}
                        className="group inline-flex items-center gap-2 rounded-full bg-[#d6f088] py-1.5 pl-4 pr-1.5 text-xs font-semibold text-slate-950 transition-transform active:scale-95"
                      >
                        <span>Shop Now</span>
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-950 text-white">
                          <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                          </svg>
                        </span>
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Drawer Bottom: Sign In / Register Pill button + Country/Currency picker */}
            <div className="border-t border-stone-200/80 p-6 space-y-4">
              <Link
                href={isAuthenticated ? "/account" : "/login"}
                onClick={() => setMobileDrawerOpen(false)}
                className="flex w-full items-center justify-center rounded-full bg-[#e3f49c] py-3.5 text-sm font-semibold tracking-tight text-slate-900 shadow-sm transition-transform active:scale-95 hover:bg-[#d6f088]"
              >
                {isAuthenticated ? (customer?.firstName ? `Hi, ${customer.firstName}` : "My Account") : "Sign In/ Register"}
              </Link>

              {/* Currency / Country Indicator */}
              <div className="flex items-center justify-center gap-2 text-xs font-medium text-slate-700">
                <span>🇮🇳</span>
                <span>INR / India</span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  </>
  );
}
