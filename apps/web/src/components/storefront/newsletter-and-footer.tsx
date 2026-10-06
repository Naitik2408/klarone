"use client";

import React, { useState } from "react";
import Link from "next/link";

/* 6 Curated Instagram Grid Photos */
const INSTAGRAM_POSTS = [
  { id: 1, src: "/insta-leaf.jpg", alt: "Fresh botanicals" },
  { id: 2, src: "/skin-health-woman.jpg", alt: "Active wellness stretch" },
  { id: 3, src: "/insta-gel.jpg", alt: "Active serum essence" },
  { id: 4, src: "/insta-pouch.jpg", alt: "Eco conscious packaging" },
  { id: 5, src: "/insta-face.jpg", alt: "Glowing healthy skin" },
  { id: 6, src: "/insta-sachet.jpg", alt: "Daily supplement ritual" },
];

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

      <div className="relative z-10 mx-auto max-w-4xl px-6 text-center sm:px-8">
        {/* Editorial Serif Heading */}
        <h2 className="font-serif text-3xl font-normal tracking-tight text-slate-900 sm:text-4xl md:text-5xl lg:text-[54px] leading-tight">
          Subscribe for updates, tips & exclusive offers
        </h2>

        {/* Pill Newsletter Input Bar */}
        <form
          onSubmit={handleSubmit}
          className="mx-auto mt-9 sm:mt-11 flex max-w-xl items-center rounded-full bg-white p-2 sm:p-2.5 shadow-md ring-1 ring-black/5"
        >
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            required
            className="w-full flex-1 bg-transparent px-5 sm:px-6 text-sm sm:text-base text-slate-900 placeholder:text-stone-400 focus:outline-none"
          />
          <button
            type="submit"
            aria-label="Submit newsletter subscription"
            className="flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-full bg-slate-950 text-white transition-transform duration-200 hover:scale-105 active:scale-95"
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
        <p className="mt-6 text-xs text-stone-600 sm:text-[13px]">
          By subscribing you agree to the{" "}
          <Link
            href="#terms"
            className="underline underline-offset-2 hover:text-slate-950"
          >
            Terms of Use
          </Link>{" "}
          &{" "}
          <Link
            href="#privacy"
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
    <footer className="relative z-10 bg-[#0b281d] text-white pt-16 pb-12 sm:pt-20 sm:pb-16 lg:pt-24">
      <div className="mx-auto max-w-[1440px] px-6 sm:px-10 lg:px-14">
        {/* Top Footer Section: Brand Headline + Navigation Columns */}
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-14">
          {/* Brand Left Column (col-span-5) */}
          <div className="lg:col-span-5 flex flex-col justify-start">
            <span className="font-serif text-3xl sm:text-4xl font-normal tracking-tight text-white">
              wellina
            </span>
            <p className="mt-6 font-serif text-3xl sm:text-4xl md:text-5xl lg:text-[46px] font-normal leading-[1.12] tracking-tight text-white max-w-sm">
              We’re obsessed with building the best.
            </p>
          </div>

          {/* Links Columns (col-span-7) */}
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-10">
            {/* Company Column */}
            <div className="flex flex-col space-y-4">
              <h4 className="font-serif text-2xl font-normal text-white tracking-tight">
                Company
              </h4>
              <ul className="space-y-3 text-sm text-stone-300">
                <li>
                  <Link href="#story" className="transition-colors hover:text-white">
                    Our Story
                  </Link>
                </li>
                <li>
                  <Link href="#contact" className="transition-colors hover:text-white">
                    Contact
                  </Link>
                </li>
                <li>
                  <Link href="#faqs" className="transition-colors hover:text-white">
                    FAQs
                  </Link>
                </li>
                <li>
                  <Link href="#blog" className="transition-colors hover:text-white">
                    Blog
                  </Link>
                </li>
                <li>
                  <Link href="#stores" className="transition-colors hover:text-white">
                    Find a Store
                  </Link>
                </li>
              </ul>
            </div>

            {/* Get Help Column */}
            <div className="flex flex-col space-y-4">
              <h4 className="font-serif text-2xl font-normal text-white tracking-tight">
                Get Help
              </h4>
              <ul className="space-y-3 text-sm text-stone-300">
                <li>
                  <Link href="#help" className="transition-colors hover:text-white">
                    Help Center
                  </Link>
                </li>
                <li>
                  <Link href="#chat" className="transition-colors hover:text-white">
                    Live Chat
                  </Link>
                </li>
                <li>
                  <Link href="#returns" className="transition-colors hover:text-white">
                    Return Policy
                  </Link>
                </li>
                <li>
                  <Link href="#shipping" className="transition-colors hover:text-white">
                    Shipping Info
                  </Link>
                </li>
                <li>
                  <Link href="#bulk" className="transition-colors hover:text-white">
                    Bulk Orders
                  </Link>
                </li>
              </ul>
            </div>

            {/* Information Column */}
            <div className="flex flex-col space-y-3.5">
              <h4 className="font-serif text-2xl font-normal text-white tracking-tight">
                Information
              </h4>
              <p className="text-sm leading-relaxed text-stone-300">
                3772 Village View Drive, Immokalee, Florida
              </p>
              <p className="text-sm text-stone-300 underline underline-offset-2">
                <a href="mailto:littlepebble@gmail.com" className="hover:text-white">
                  littlepebble@gmail.com
                </a>
              </p>
              <p className="text-sm text-stone-300">
                +1 888-234-1234 (tool-free)
              </p>
            </div>
          </div>
        </div>

        {/* Middle Footer Section: "Follow Us on Instagram" Strip */}
        <div className="mt-16 sm:mt-20 pt-10 border-t border-white/10">
          <div className="flex items-center justify-between pb-6">
            <h3 className="font-serif text-2xl sm:text-3xl font-normal tracking-tight text-white">
              Follow Us on Instagram
            </h3>
            <span className="text-sm text-stone-400">@littlepebble.co</span>
          </div>

          {/* 6 Square Rounded Cards Grid - scaled down for compact editorial elegance */}
          <div className="grid grid-cols-3 gap-3 sm:gap-4 md:grid-cols-6 max-w-full">
            {INSTAGRAM_POSTS.map((post) => (
              <div
                key={post.id}
                className="group relative h-28 sm:h-32 md:h-36 lg:h-40 w-full overflow-hidden rounded-[20px] bg-stone-900 shadow-sm"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={post.src}
                  alt={post.alt}
                  className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/20 opacity-0 transition-opacity duration-300 group-hover:opacity-100 flex items-center justify-center">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    className="h-5 w-5 text-white"
                  >
                    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
                  </svg>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Social Icons Pill Buttons + Policy Links */}
        <div className="mt-12 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          {/* Social Icons row in rounded dark green squares */}
          <div className="flex items-center gap-2.5">
            {/* X / Twitter */}
            <a
              href="#twitter"
              aria-label="X"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 border border-white/10 text-stone-300 transition-colors hover:bg-white/10 hover:text-white"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
            {/* Instagram */}
            <a
              href="#instagram"
              aria-label="Instagram"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 border border-white/10 text-stone-300 transition-colors hover:bg-white/10 hover:text-white"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
              </svg>
            </a>
            {/* TikTok */}
            <a
              href="#tiktok"
              aria-label="TikTok"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 border border-white/10 text-stone-300 transition-colors hover:bg-white/10 hover:text-white"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.29 0 .58.04.85.12V9.32a6.37 6.37 0 0 0-1-.07A6.34 6.34 0 0 0 3 15.59a6.34 6.34 0 0 0 6.34 6.34c3.48 0 6.34-2.83 6.34-6.34V8.71a8.21 8.21 0 0 0 4.91 1.63V6.89a4.88 4.88 0 0 1-1-.2z" />
              </svg>
            </a>
            {/* Pinterest */}
            <a
              href="#pinterest"
              aria-label="Pinterest"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 border border-white/10 text-stone-300 transition-colors hover:bg-white/10 hover:text-white"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                <path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12 0-6.627-5.373-12-12-12z" />
              </svg>
            </a>
          </div>

          {/* Legal Links */}
          <div className="flex items-center gap-6 text-xs text-stone-300">
            <Link href="#accessibility" className="hover:text-white">
              Accessibility
            </Link>
            <Link href="#terms" className="hover:text-white">
              Terms of Service
            </Link>
            <Link href="#privacy" className="hover:text-white">
              Privacy Policy
            </Link>
          </div>
        </div>

        {/* Bottom Bar: Copyright + Currency Selector + Payment Icons */}
        <div className="mt-10 pt-8 border-t border-white/10 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between text-xs text-stone-400">
          <div>
            © 2026 Pebble Wellina, Powered by Shopify
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {/* Country / Currency Pill */}
            <div className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white">
              <span className="text-sm">🇺🇸</span>
              <span>USD/ EN</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3 w-3">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </div>

            {/* Payment Method Badges */}
            <div className="flex items-center gap-1.5">
              {/* Visa */}
              <div className="flex h-5 w-8 items-center justify-center rounded bg-[#1a1f71] text-[8px] font-bold text-white tracking-wider">
                VISA
              </div>
              {/* Mastercard */}
              <div className="flex h-5 w-8 items-center justify-center rounded bg-[#eb001b] text-[8px] font-bold text-white tracking-wider">
                MC
              </div>
              {/* Amex */}
              <div className="flex h-5 w-8 items-center justify-center rounded bg-[#006fcf] text-[8px] font-bold text-white tracking-wider">
                AMEX
              </div>
              {/* PayPal */}
              <div className="flex h-5 w-8 items-center justify-center rounded bg-[#003087] text-[8px] font-bold text-white tracking-wider">
                PAYPAL
              </div>
              {/* Discover */}
              <div className="flex h-5 w-8 items-center justify-center rounded bg-[#f47216] text-[8px] font-bold text-white tracking-wider">
                DISC
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
