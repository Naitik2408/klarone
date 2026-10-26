import { StorefrontHeader } from "../../components/storefront/header";
import { StorefrontFooter } from "../../components/storefront/newsletter-and-footer";

export default function LaptopsLoading() {
  return (
    <div className="min-h-screen bg-[#fafaf8] font-sans text-slate-900 antialiased">
      <StorefrontHeader />

      <main className="mx-auto max-w-[1560px] px-3 pt-24 pb-16 sm:px-6 lg:px-12 sm:pt-28">
        {/* Breadcrumb skeleton */}
        <div className="flex items-center gap-2">
          <div className="h-3 w-10 rounded bg-stone-200/80 animate-pulse" />
          <span className="text-stone-300">/</span>
          <div className="h-3 w-16 rounded bg-stone-200/80 animate-pulse" />
          <span className="text-stone-300">/</span>
          <div className="h-3 w-14 rounded bg-stone-200/80 animate-pulse" />
        </div>

        {/* Categories Carousel Pill Bar Skeleton */}
        <div className="mt-6 flex items-center gap-2 overflow-hidden pb-1">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-9 w-28 shrink-0 rounded-full bg-stone-200/70 animate-pulse"
            />
          ))}
        </div>

        {/* Toolbar Skeleton (Filter toggle, count, sorting dropdown) */}
        <div className="mt-6 flex items-center justify-between border-b border-stone-200 pb-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-28 rounded-full bg-stone-200/80 animate-pulse" />
            <div className="h-4 w-20 rounded bg-stone-200/60 animate-pulse hidden sm:block" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-9 w-36 rounded-full bg-stone-200/80 animate-pulse" />
            <div className="h-9 w-16 rounded-full bg-stone-200/70 animate-pulse hidden md:block" />
          </div>
        </div>

        {/* Main Grid: Facets Sidebar Skeleton + Product Grid Skeleton */}
        <div className="mt-6 grid grid-cols-12 gap-6">
          {/* Facets Sidebar Skeleton (Desktop only) */}
          <aside className="hidden md:block md:col-span-4 lg:col-span-3 space-y-5">
            <div className="rounded-2xl border border-stone-200 bg-white/70 p-5 space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <div className="h-4 w-16 rounded bg-stone-200 animate-pulse" />
                <div className="h-3 w-10 rounded bg-stone-200 animate-pulse" />
              </div>

              {/* Group 1: Availability */}
              <div className="space-y-3">
                <div className="h-3 w-20 rounded bg-stone-300/80 animate-pulse" />
                <div className="space-y-2">
                  {[...Array(2)].map((_, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="h-4 w-24 rounded bg-stone-200/70 animate-pulse" />
                      <div className="h-3 w-4 rounded bg-stone-200/50 animate-pulse" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Group 2: Price Slider */}
              <div className="space-y-3 pt-4 border-t border-stone-100">
                <div className="h-3 w-16 rounded bg-stone-300/80 animate-pulse" />
                <div className="h-2 w-full rounded-full bg-stone-200 animate-pulse" />
                <div className="flex justify-between gap-2 pt-1">
                  <div className="h-8 w-20 rounded-lg bg-stone-100 animate-pulse" />
                  <div className="h-8 w-20 rounded-lg bg-stone-100 animate-pulse" />
                </div>
              </div>

              {/* Group 3: Brands */}
              <div className="space-y-3 pt-4 border-t border-stone-100">
                <div className="h-3 w-14 rounded bg-stone-300/80 animate-pulse" />
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="h-4 w-20 rounded bg-stone-200/70 animate-pulse" />
                      <div className="h-3 w-4 rounded bg-stone-200/50 animate-pulse" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          {/* Product Cards Grid Skeleton */}
          <div className="col-span-12 md:col-span-8 lg:col-span-9">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-4">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="flex flex-col justify-between rounded-[20px] sm:rounded-[24px] bg-[#f0f2ee] p-2.5 sm:p-4"
                >
                  {/* Image Stage Placeholder */}
                  <div className="relative aspect-[4/4.4] min-h-[120px] sm:min-h-[200px] w-full rounded-[14px] sm:rounded-[18px] bg-white/60 p-4 flex items-center justify-center overflow-hidden">
                    <div className="h-3/4 w-3/4 rounded-xl bg-stone-200/70 animate-pulse" />
                  </div>

                  {/* Brand & Name */}
                  <div className="mt-3 space-y-1.5">
                    <div className="h-2.5 w-14 rounded bg-stone-300/70 animate-pulse" />
                    <div className="h-4 w-4/5 rounded bg-stone-300/90 animate-pulse" />
                  </div>

                  {/* Spec pills */}
                  <div className="mt-2.5 flex gap-1">
                    <div className="h-4 w-14 rounded bg-stone-200 animate-pulse" />
                    <div className="h-4 w-14 rounded bg-stone-200 animate-pulse" />
                  </div>

                  {/* Price & Add button */}
                  <div className="mt-3 flex items-center justify-between pt-2 border-t border-stone-200/60">
                    <div className="h-4 w-20 rounded bg-stone-300/90 animate-pulse" />
                    <div className="hidden sm:block h-6 w-12 rounded-full bg-stone-300/80 animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      <StorefrontFooter />
    </div>
  );
}
