"use client";

import { useEffect } from "react";
import Link from "next/link";
import { StorefrontHeader } from "@/components/storefront/header";
import { StorefrontFooter } from "@/components/storefront/newsletter-and-footer";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log unexpected runtime errors for debugging
    console.error("Global application error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-[#07090e] font-sans text-slate-100 antialiased selection:bg-[#d6f088] selection:text-slate-950">
        <StorefrontHeader />

        <main className="mx-auto flex min-h-[70vh] max-w-3xl flex-col items-center justify-center px-4 pt-28 pb-16 text-center sm:px-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-rose-500/30 bg-rose-500/10 px-3.5 py-1 text-xs font-medium text-rose-400 backdrop-blur-sm">
            <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
            System Notice
          </div>

          <h1 className="mt-6 font-serif text-3xl font-normal tracking-tight text-white sm:text-5xl">
            Something went unexpectedly wrong
          </h1>

          <p className="mt-4 max-w-lg text-sm text-slate-400 sm:text-base leading-relaxed">
            Our systems encountered a temporary issue while processing this view. You can try refreshing the action, or return to our verified laptop catalog.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={() => reset()}
              className="inline-flex h-11 items-center justify-center rounded-full bg-[#d6f088] px-6 text-sm font-semibold text-slate-950 transition hover:bg-[#c8e573] active:scale-95"
            >
              Try Again
            </button>
            <Link
              href="/laptops"
              className="inline-flex h-11 items-center justify-center rounded-full border border-slate-700 bg-slate-800/80 px-6 text-sm font-medium text-slate-200 transition hover:bg-slate-700 hover:text-white"
            >
              Explore Verified Laptops
            </Link>
          </div>
        </main>

        <StorefrontFooter />
      </body>
    </html>
  );
}
