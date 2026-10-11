"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform, useSpring, AnimatePresence } from "motion/react";
import { useCustomerAuth } from "../auth/customer-auth-provider";
import { useCart } from "../cart/cart-provider";

export function StorefrontHeader() {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const { customer, isAuthenticated } = useCustomerAuth();
  const { itemCount } = useCart();

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
    { label: "Collections", key: "collections" },
    { label: "Pages", key: "pages" },
    { label: "Features", key: "features" },
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
              wellina
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
              className="absolute left-0 right-0 top-full mt-0 overflow-hidden rounded-t-none rounded-b-[24px] border-t border-stone-100 bg-white text-slate-900 shadow-[0_30px_70px_rgba(0,0,0,0.25)]"
            >
              {/* SHOP MEGA MENU */}
              {activeMenu === "shop" && (
                <div className="grid grid-cols-12 p-8 lg:p-10">
                  {/* Left Column: Large Editorial Serif Categories matching Shopify */}
                  <div className="col-span-3 flex flex-col justify-center space-y-4 border-r border-stone-200/80 pr-8">
                    <Link
                      href="/#featured-products"
                      className="font-serif text-[28px] font-normal leading-tight text-slate-900 transition-colors hover:text-emerald-800 lg:text-[32px]"
                    >
                      Shop Daily Health
                    </Link>
                    <Link
                      href="/#featured-products"
                      className="font-serif text-[28px] font-normal leading-tight text-slate-900 underline underline-offset-4 transition-colors hover:text-emerald-800 lg:text-[32px]"
                    >
                      Shop Pregnancy
                    </Link>
                    <Link
                      href="/#featured-products"
                      className="font-serif text-[28px] font-normal leading-tight text-slate-900 transition-colors hover:text-emerald-800 lg:text-[32px]"
                    >
                      Shop Bestsellers
                    </Link>
                    <Link
                      href="/#featured-products"
                      className="font-serif text-[28px] font-normal leading-tight text-slate-900 transition-colors hover:text-emerald-800 lg:text-[32px]"
                    >
                      Shop All
                    </Link>
                  </div>

                  {/* Middle Column: 2x4 Subcategories with thumbnails */}
                  <div className="col-span-5 grid grid-cols-2 gap-x-6 gap-y-4 px-8">
                    {[
                      { title: "Prenatal & Postnatal", bg: "bg-amber-100", icon: "💊" },
                      { title: "Best Sellers", bg: "bg-slate-200", icon: "✨" },
                      { title: "Mom Support", bg: "bg-rose-100", icon: "🌿" },
                      { title: "New Arrivals", bg: "bg-orange-100", icon: "🌱" },
                      { title: "Proteins", bg: "bg-stone-300", icon: "🥄" },
                      { title: "Shop All", bg: "bg-emerald-200", icon: "🌴" },
                      { title: "Skin", bg: "bg-lime-200", icon: "✨" },
                    ].map((item, idx) => (
                      <Link
                        key={idx}
                        href="/#featured-products"
                        className="group flex items-center gap-3.5 rounded-xl p-1.5 transition-colors hover:bg-stone-50"
                      >
                        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${item.bg} text-lg shadow-2xs transition-transform group-hover:scale-105`}>
                          {item.icon}
                        </div>
                        <span className="text-sm font-semibold text-slate-800 transition-colors group-hover:text-slate-950">
                          {item.title}
                        </span>
                      </Link>
                    ))}
                  </div>

                  {/* Right Column: Promotional Editorial Card */}
                  <div className="col-span-4 pl-4">
                    <div className="relative flex h-full min-h-[280px] flex-col justify-end overflow-hidden rounded-[22px] bg-stone-800 p-7 text-white shadow-md">
                      <div className="absolute inset-0 bg-gradient-to-tr from-stone-900 via-stone-800/90 to-emerald-950/40" />
                      
                      <div className="relative z-10">
                        <span className="text-xs font-bold uppercase tracking-[0.2em] text-white/80">
                          NEW IN
                        </span>
                        <h4 className="mt-2 font-serif text-[34px] font-normal leading-[1.1] text-white lg:text-[38px]">
                          More daily
                          <br />
                          essentials
                        </h4>

                        <div className="mt-6">
                          <Link
                            href="/#featured-products"
                            className="group inline-flex items-center gap-3 rounded-full bg-[#d6f088] py-2.5 pl-5 pr-2 text-xs font-semibold text-slate-950 shadow-md transition-all hover:scale-105 hover:bg-[#c8e678]"
                          >
                            <span>Shop Now</span>
                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-950 text-white transition-transform group-hover:translate-x-0.5">
                              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                              </svg>
                            </span>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* COLLECTIONS MEGA MENU */}
              {activeMenu === "collections" && (
                <div className="grid grid-cols-12 p-8 lg:p-10">
                  {/* Left 3 Columns: Category link groups */}
                  <div className="col-span-6 grid grid-cols-3 gap-6 border-r border-stone-200/80 pr-8">
                    <div>
                      <h4 className="font-serif text-[26px] font-normal text-slate-900">Daily Health</h4>
                      <div className="mt-4 space-y-2.5 text-sm text-stone-600">
                        <p className="cursor-pointer transition-colors hover:text-slate-950">Multivitamin</p>
                        <p className="cursor-pointer transition-colors hover:text-slate-950">Nutrients</p>
                        <p className="cursor-pointer transition-colors hover:text-slate-950">Skin</p>
                        <p className="cursor-pointer transition-colors hover:text-slate-950">Relaxions</p>
                        <p className="cursor-pointer transition-colors hover:text-slate-950">Recovery</p>
                        <p className="cursor-pointer font-medium text-slate-900 hover:text-emerald-800">Shop All</p>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-serif text-[26px] font-normal text-slate-900">Bestsellers</h4>
                      <div className="mt-4 space-y-2.5 text-sm text-stone-600">
                        <p className="cursor-pointer transition-colors hover:text-slate-950">Proteins</p>
                        <p className="cursor-pointer transition-colors hover:text-slate-950">Gut Health</p>
                        <p className="cursor-pointer transition-colors hover:text-slate-950">Nutrients</p>
                        <p className="cursor-pointer transition-colors hover:text-slate-950">Vitamins</p>
                        <p className="cursor-pointer transition-colors hover:text-slate-950">Fertility Support</p>
                        <p className="cursor-pointer font-medium text-slate-900 hover:text-emerald-800">Shop All</p>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-serif text-[26px] font-normal text-slate-900">Pregnancy</h4>
                      <div className="mt-4 space-y-2.5 text-sm text-stone-600">
                        <p className="cursor-pointer transition-colors hover:text-slate-950">Prenatal & Postnatal</p>
                        <p className="cursor-pointer transition-colors hover:text-slate-950">Mom Support</p>
                        <p className="cursor-pointer transition-colors hover:text-slate-950">Proteins</p>
                        <p className="cursor-pointer transition-colors hover:text-slate-950">Skin</p>
                        <p className="cursor-pointer font-medium text-slate-900 hover:text-emerald-800">Shop All</p>
                      </div>
                    </div>
                  </div>

                  {/* Right 2 Feature Cards with bold serif headers */}
                  <div className="col-span-6 grid grid-cols-2 gap-6 pl-8">
                    {/* Card 1: Proteins */}
                    <div className="relative flex aspect-square flex-col justify-between overflow-hidden rounded-[22px] bg-stone-700 p-6 text-white shadow-sm">
                      <div className="absolute inset-0 bg-gradient-to-b from-stone-900/40 via-stone-800/70 to-stone-900/90" />
                      <div className="relative z-10">
                        <span className="rounded-full bg-stone-600/70 px-3.5 py-1 text-xs font-semibold text-white backdrop-blur">
                          Proteins
                        </span>
                      </div>
                      <div className="relative z-10 flex items-end justify-between">
                        <h4 className="font-serif text-[32px] font-normal leading-[1.08] text-white lg:text-[36px]">
                          Backed
                          <br />
                          by
                          <br />
                          science
                        </h4>
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#d6f088] text-slate-950 shadow-md transition-transform hover:scale-105">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </div>

                    {/* Card 2: Formulations */}
                    <div className="relative flex aspect-square flex-col justify-between overflow-hidden rounded-[22px] bg-[#895d36] p-6 text-white shadow-sm">
                      <div className="absolute inset-0 bg-gradient-to-b from-amber-950/30 via-amber-900/60 to-stone-950/90" />
                      <div className="relative z-10">
                        <span className="rounded-full bg-stone-800/60 px-3.5 py-1 text-xs font-semibold text-white backdrop-blur">
                          Formulations
                        </span>
                      </div>
                      <div className="relative z-10 flex items-end justify-between">
                        <h4 className="font-serif text-[32px] font-normal leading-[1.08] text-white lg:text-[36px]">
                          Here are
                          <br />
                          some of
                          <br />
                          yours
                        </h4>
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#d6f088] text-slate-950 shadow-md transition-transform hover:scale-105">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* PAGES MEGA MENU */}
              {activeMenu === "pages" && (
                <div className="grid grid-cols-12 items-center p-8 lg:p-10">
                  {/* Left Column: Big Editorial Serif Intro Headline matching screenshot */}
                  <div className="col-span-4 pr-6">
                    <h3 className="font-serif text-[32px] font-normal leading-[1.18] tracking-tight text-slate-900 lg:text-[36px]">
                      Our most popular
                      <br />
                      essential supplements
                      <br />
                      —and for good
                      <br />
                      reason.
                    </h3>
                  </div>

                  {/* Middle Column: 3 rounded visual thumbnail cards */}
                  <div className="col-span-5 grid grid-cols-3 gap-4 px-3">
                    {[
                      { title: "Our Story", bg: "bg-emerald-800/80", icon: "💊" },
                      { title: "Our Journal", bg: "bg-sky-100", icon: "💧" },
                      { title: "Our Services", bg: "bg-amber-100", icon: "🌿" },
                    ].map((item, idx) => (
                      <Link
                        key={idx}
                        href="/#featured-products"
                        className="group flex flex-col items-center"
                      >
                        <div className={`relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-[20px] ${item.bg} text-3xl shadow-sm transition-transform duration-200 group-hover:scale-105`}>
                          <span>{item.icon}</span>
                        </div>
                        <div className="mt-3 flex w-full items-center justify-between px-1">
                          <span className="font-serif text-[17px] font-normal text-slate-900 group-hover:underline">
                            {item.title}
                          </span>
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-stone-100 text-slate-800">
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                            </svg>
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>

                  {/* Right Column: Text Quicklinks */}
                  <div className="col-span-3 border-l border-stone-200/80 pl-8 space-y-3 text-sm text-stone-600">
                    <p className="cursor-pointer transition-colors hover:text-slate-950">Our Story</p>
                    <p className="cursor-pointer transition-colors hover:text-slate-950">FAQs</p>
                    <p className="cursor-pointer transition-colors hover:text-slate-950">Contact Us</p>
                    <p className="cursor-pointer transition-colors hover:text-slate-950">Find A Store</p>
                    <p className="cursor-pointer transition-colors hover:text-slate-950">Our Journal</p>
                    <p className="cursor-pointer transition-colors hover:text-slate-950">Help Center</p>
                  </div>
                </div>
              )}

              {/* FEATURES MEGA MENU */}
              {activeMenu === "features" && (
                <div className="grid grid-cols-3 gap-6 p-8 lg:p-10">
                  <div className="rounded-2xl bg-stone-50 p-6">
                    <span className="font-serif text-[24px] font-normal text-slate-900">Custom Subscriptions</span>
                    <p className="mt-2 text-sm text-stone-500">Flexible monthly deliveries with exclusive member perks and savings.</p>
                  </div>
                  <div className="rounded-2xl bg-stone-50 p-6">
                    <span className="font-serif text-[24px] font-normal text-slate-900">Lab Certificates</span>
                    <p className="mt-2 text-sm text-stone-500">Third-party purity and potency validation for every single batch.</p>
                  </div>
                  <div className="rounded-2xl bg-stone-50 p-6">
                    <span className="font-serif text-[24px] font-normal text-slate-900">Practitioner Network</span>
                    <p className="mt-2 text-sm text-stone-500">Consult with licensed naturopaths and certified nutritionists.</p>
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
