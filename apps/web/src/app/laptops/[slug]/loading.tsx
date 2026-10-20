import { StorefrontHeader } from "@/components/storefront/header";
import { StorefrontFooter } from "@/components/storefront/newsletter-and-footer";

export default function ProductLoading() {
  return (
    <div className="min-h-screen bg-white">
      <StorefrontHeader />

      <main className="pt-[76px] sm:pt-20 md:pt-24">
        <div className="mx-auto max-w-[1560px] px-4 py-8 sm:px-6 sm:py-12 lg:px-12">
          {/* Breadcrumb Skeleton */}
          <div className="mb-6 flex items-center gap-2">
            <div className="h-3 w-12 rounded bg-slate-200 animate-pulse" />
            <span className="text-slate-300">/</span>
            <div className="h-3 w-16 rounded bg-slate-200 animate-pulse" />
            <span className="text-slate-300">/</span>
            <div className="h-3 w-32 rounded bg-slate-200 animate-pulse" />
          </div>

          {/* Main 2-Column Product Experience Layout */}
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-14">
            {/* Left Column: Gallery Skeleton (7 cols on lg) */}
            <div className="lg:col-span-7 flex flex-col-reverse gap-4 sm:flex-row">
              {/* Vertical thumbnail strip */}
              <div className="flex sm:flex-col gap-3 overflow-hidden">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="h-16 w-16 sm:h-20 sm:w-20 rounded-xl bg-slate-100 border border-slate-200/60 animate-pulse shrink-0"
                  />
                ))}
              </div>

              {/* Main Stage Image */}
              <div className="flex-1 aspect-[4/3] rounded-2xl bg-slate-100 border border-slate-200/70 p-8 flex items-center justify-center animate-pulse">
                <div className="h-3/4 w-3/4 rounded-xl bg-slate-200/60" />
              </div>
            </div>

            {/* Right Column: Buy Box Skeleton (5 cols on lg) */}
            <div className="lg:col-span-5 space-y-6">
              {/* Brand and Title */}
              <div className="space-y-3">
                <div className="h-3 w-20 rounded bg-slate-200 animate-pulse" />
                <div className="h-8 w-4/5 rounded-lg bg-slate-200 animate-pulse" />
                <div className="h-4 w-3/5 rounded bg-slate-100 animate-pulse" />
              </div>

              {/* Pricing & Warranty Badge */}
              <div className="flex items-baseline gap-3 pt-2">
                <div className="h-9 w-36 rounded-lg bg-slate-200 animate-pulse" />
                <div className="h-4 w-24 rounded bg-slate-100 animate-pulse" />
              </div>

              {/* Verified Trust Pill */}
              <div className="h-8 w-full rounded-xl bg-emerald-50/60 border border-emerald-100 animate-pulse" />

              {/* Option Selectors: Color */}
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <div className="h-4 w-24 rounded bg-slate-200 animate-pulse" />
                <div className="flex gap-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-9 w-9 rounded-full bg-slate-200 animate-pulse" />
                  ))}
                </div>
              </div>

              {/* Option Selectors: RAM & Storage */}
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <div className="h-4 w-28 rounded bg-slate-200 animate-pulse" />
                <div className="grid grid-cols-2 gap-3">
                  <div className="h-14 rounded-xl bg-slate-100 border border-slate-200/80 animate-pulse" />
                  <div className="h-14 rounded-xl bg-slate-100 border border-slate-200/80 animate-pulse" />
                </div>
              </div>

              {/* Action Buttons: Add to Cart + Instant Buy */}
              <div className="space-y-3 pt-6">
                <div className="h-13 w-full rounded-full bg-slate-900/80 animate-pulse" />
                <div className="h-13 w-full rounded-full bg-slate-100 border border-slate-200 animate-pulse" />
              </div>

              {/* Kolkata Delivery & Warranty perks */}
              <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-4 space-y-3">
                <div className="h-4 w-48 rounded bg-slate-200 animate-pulse" />
                <div className="h-3 w-64 rounded bg-slate-200/60 animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </main>

      <StorefrontFooter />
    </div>
  );
}
