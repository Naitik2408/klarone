"use client";

import React, { useState } from "react";
import Link from "next/link";

export function StorefrontNewsletterSection() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSubmitted(true);
  };

  return (
    <section className="relative z-10 w-full overflow-hidden bg-[#acc5b6] py-16 sm:py-20 lg:py-24 text-slate-900">
      {/* Subtle organic topographic contour curves */}
      <div className="pointer-events-none absolute inset-0 opacity-40">
        <svg
          viewBox="0 0 1440 360"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="h-full w-full object-cover"
        >
          <path
            d="M-100 80 C 250 200, 450 -40, 850 120 C 1150 240, 1350 40, 1600 160"
            stroke="#92b19e"
            strokeWidth="1.2"
          />
          <path
            d="M-80 180 C 280 320, 500 80, 920 220 C 1220 320, 1400 120, 1650 240"
            stroke="#92b19e"
            strokeWidth="1"
          />
          <path
            d="M-50 20 C 350 160, 600 -20, 1050 90 C 1300 170, 1500 30, 1700 130"
            stroke="#9cb9a8"
            strokeWidth="0.8"
          />
        </svg>
      </div>

      <div className="relative z-10 mx-auto max-w-4xl px-4 text-center sm:px-8">
        {/* Editorial Serif Heading */}
        <h2
          style={{ fontFamily: "var(--font-serif), 'Instrument Serif', Georgia, serif" }}
          className="text-2xl font-normal tracking-tight text-slate-900 sm:text-4xl md:text-5xl lg:text-[54px] leading-tight"
        >
          Subscribe for hardware launches, price drops & drops
        </h2>

        {/* Pill Newsletter Input Bar */}
        <form
          onSubmit={handleSubmit}
          className="mx-auto mt-6 sm:mt-8 flex max-w-xl items-center rounded-full bg-white p-1 sm:p-1.5 shadow-md shadow-stone-900/5 ring-1 ring-black/5"
        >
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email address"
            required
            className="w-full min-w-0 flex-1 bg-transparent px-4 sm:px-6 text-xs sm:text-base text-slate-900 placeholder:text-stone-400 focus:outline-none"
          />
          <button
            type="submit"
            aria-label="Submit newsletter subscription"
            className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-full bg-slate-950 text-white transition-transform duration-200 hover:scale-105 active:scale-95"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
            >
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
        </form>

        {submitted && (
          <p className="mt-4 text-xs font-medium text-emerald-800">
            Thank you for subscribing! Check your inbox soon.
          </p>
        )}

        {/* Disclaimer Link text */}
        <p className="mt-5 sm:mt-6 text-xs text-stone-600 sm:text-[13px]">
          By subscribing you agree to the{" "}
          <Link
            href="/terms"
            className="underline underline-offset-2 hover:text-slate-950"
          >
            Terms of Use
          </Link>{" "}
          &{" "}
          <Link
            href="/privacy"
            className="underline underline-offset-2 hover:text-slate-950"
          >
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </section>
  );
}

export function StorefrontFooter() {
  return (
    <footer className="relative z-10 bg-[#0b281d] text-white pt-14 pb-12 sm:pt-20 sm:pb-16 lg:pt-20">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-10 lg:px-14">
        {/* Top Footer Section: Brand Headline + Navigation Columns */}
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-14">
          {/* Brand Left Column (col-span-5) */}
          <div className="lg:col-span-5 flex flex-col justify-start">
            <Link
              href="/"
              style={{ fontFamily: "var(--font-serif), 'Instrument Serif', Georgia, serif" }}
              className="text-4xl sm:text-5xl font-normal tracking-tight text-white hover:opacity-95 transition"
            >
              klarone
            </Link>
            <p
              style={{ fontFamily: "var(--font-serif), 'Instrument Serif', Georgia, serif" }}
              className="mt-6 text-3xl sm:text-4xl md:text-5xl lg:text-[44px] font-normal leading-[1.14] tracking-tight text-white max-w-sm"
            >
              Curated performance computing, delivered across India.
            </p>
            <p className="mt-4 text-xs leading-relaxed text-stone-400 max-w-sm">
              Authentic manufacturer warranties, verified IMEI / serial hardware checks, and seamless express dispatch from our Kolkata flagship warehouse.
            </p>
          </div>

          {/* Links Columns (col-span-7) */}
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-10">
            {/* Laptops & Catalogue Column */}
            <div className="flex flex-col space-y-4">
              <h4
                style={{ fontFamily: "var(--font-serif), 'Instrument Serif', Georgia, serif" }}
                className="text-2xl font-normal text-white tracking-tight"
              >
                Catalogue
              </h4>
              <ul className="space-y-3 text-sm text-stone-300">
                <li>
                  <Link href="/laptops" className="transition-colors hover:text-white">
                    All Laptops
                  </Link>
                </li>
                <li>
                  <Link href="/laptops?categorySlug=ultrabooks" className="transition-colors hover:text-white">
                    Ultrabooks
                  </Link>
                </li>
                <li>
                  <Link href="/laptops?categorySlug=gaming-laptops" className="transition-colors hover:text-white">
                    Gaming Rigs
                  </Link>
                </li>
                <li>
                  <Link href="/laptops?collectionSlug=copilot-pcs" className="transition-colors hover:text-white">
                    Copilot+ AI PCs
                  </Link>
                </li>
                <li>
                  <Link href="/select" className="transition-colors hover:text-white flex items-center gap-1.5">
                    <span>AI Laptop Advisor</span>
                    <span className="h-1.5 w-1.5 rounded-full bg-[#d6f088]" />
                  </Link>
                </li>
              </ul>
            </div>

            {/* Customer Care Column */}
            <div className="flex flex-col space-y-4">
              <h4
                style={{ fontFamily: "var(--font-serif), 'Instrument Serif', Georgia, serif" }}
                className="text-2xl font-normal text-white tracking-tight"
              >
                Customer Care
              </h4>
              <ul className="space-y-3 text-sm text-stone-300">
                <li>
                  <Link href="/account" className="transition-colors hover:text-white">
                    My Account
                  </Link>
                </li>
                <li>
                  <Link href="/account/orders" className="transition-colors hover:text-white">
                    Track Orders
                  </Link>
                </li>
                <li>
                  <Link href="/cart" className="transition-colors hover:text-white">
                    Shopping Cart
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="transition-colors hover:text-white">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/staff/login" className="transition-colors hover:text-white">
                    Staff Portal
                  </Link>
                </li>
              </ul>
            </div>

            {/* Studio & Contact Column */}
            <div className="flex flex-col space-y-3.5">
              <h4
                style={{ fontFamily: "var(--font-serif), 'Instrument Serif', Georgia, serif" }}
                className="text-2xl font-normal text-white tracking-tight"
              >
                Experience Studio
              </h4>
              <p className="text-sm leading-relaxed text-stone-300">
                Park Street, Central Kolkata, West Bengal 700016
              </p>
              <p className="text-sm text-stone-300 underline underline-offset-2">
                <a href="mailto:support@klarone.in" className="hover:text-white">
                  support@klarone.in
                </a>
              </p>
              <p className="text-sm text-stone-300">
                +91 90605 57296 (Toll-Free Support)
              </p>
              <p className="text-xs text-stone-400 pt-1">
                Mon – Sat: 10:00 AM – 8:00 PM IST
              </p>
            </div>
          </div>
        </div>

        {/* Social Icons Pill Buttons + Policy Links */}
        <div className="mt-16 pt-8 border-t border-white/10 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          {/* Social Icons row in rounded dark green squares */}
          <div className="flex items-center gap-2.5">
            {/* X / Twitter */}
            <a
              href="https://twitter.com"
              target="_blank"
              rel="noreferrer"
              aria-label="X (Twitter)"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 border border-white/10 text-stone-300 transition-colors hover:bg-white/10 hover:text-white"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
            {/* LinkedIn */}
            <a
              href="https://linkedin.com"
              target="_blank"
              rel="noreferrer"
              aria-label="LinkedIn"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 border border-white/10 text-stone-300 transition-colors hover:bg-white/10 hover:text-white"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
              </svg>
            </a>
            {/* YouTube */}
            <a
              href="https://youtube.com"
              target="_blank"
              rel="noreferrer"
              aria-label="YouTube"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 border border-white/10 text-stone-300 transition-colors hover:bg-white/10 hover:text-white"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
              </svg>
            </a>
          </div>

          {/* Legal Links */}
          <div className="flex items-center gap-6 text-xs text-stone-300">
            <Link href="/privacy" className="hover:text-white transition">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-white transition">
              Terms of Service
            </Link>
            <Link href="/staff/login" className="hover:text-white transition">
              Staff Access
            </Link>
          </div>
        </div>

        {/* Bottom Bar: Copyright + Currency Selector + Payment Icons */}
        <div className="mt-8 pt-6 border-t border-white/10 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between text-xs text-stone-400">
          <div>
            © {new Date().getFullYear()} Klarone Retail Pvt. Ltd. All rights reserved.
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {/* Country / Currency Pill */}
            <div className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white">
              <span className="text-sm">🇮🇳</span>
              <span>INR (₹) / India</span>
            </div>

            {/* Payment Method Badges */}
            <div className="flex items-center gap-1.5">
              <div className="flex h-5 px-2 items-center justify-center rounded bg-[#1a1f71] text-[8px] font-bold text-white tracking-wider">
                UPI
              </div>
              <div className="flex h-5 px-2 items-center justify-center rounded bg-[#eb001b] text-[8px] font-bold text-white tracking-wider">
                CARD
              </div>
              <div className="flex h-5 px-2 items-center justify-center rounded bg-[#006fcf] text-[8px] font-bold text-white tracking-wider">
                NET BANKING
              </div>
              <div className="flex h-5 px-2 items-center justify-center rounded bg-[#0b241b] border border-white/20 text-[8px] font-bold text-[#d6f088] tracking-wider">
                EMI
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
