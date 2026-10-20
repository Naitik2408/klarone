import { StorefrontHeader } from "../../components/storefront/header";
import { StorefrontFooter } from "../../components/storefront/newsletter-and-footer";

export default function LaptopsLoading() {
  return (
    <div className="min-h-screen bg-[#07090e] font-sans text-slate-100 antialiased selection:bg-[#d6f088] selection:text-slate-950">
      <StorefrontHeader />

      <main className="mx-auto max-w-7xl px-4 pt-28 pb-16 sm:px-6 lg:px-8">
        {/* Breadcrumb skeleton */}
        <div className="flex items-center gap-2">
          <div className="h-3 w-12 rounded bg-slate-800/80 animate-pulse" />
          <span className="text-slate-700">/</span>
          <div className="h-3 w-20 rounded bg-slate-800/80 animate-pulse" />
        </div>

        {/* Page Title & Subtitle skeleton */}
        <div className="mt-6 flex flex-col gap-2">
          <div className="h-10 w-64 rounded-lg bg-slate-800/80 animate-pulse" />
          <div className="h-4 w-96 max-w-full rounded bg-slate-800/50 animate-pulse" />
        </div>

        {/* Layout Grid: Sidebar Skeleton + Product Grid Skeleton */}
        <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-4">
          {/* Facets Sidebar Skeleton (Hidden on Mobile) */}
          <aside className="hidden lg:block lg:col-span-1 space-y-6">
            <div className="rounded-2xl border border-slate-800/60 bg-slate-900/40 p-5 backdrop-blur-sm space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800/60 pb-4">
                <div className="h-4 w-16 rounded bg-slate-800 animate-pulse" />
                <div className="h-3 w-12 rounded bg-slate-800 animate-pulse" />
              </div>

              {/* Filter Group 1: Brands */}
              <div className="space-y-3">
                <div className="h-3 w-20 rounded bg-slate-700/60 animate-pulse" />
                <div className="space-y-2">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="h-4 w-28 rounded bg-slate-800/60 animate-pulse" />
                      <div className="h-3 w-6 rounded bg-slate-800/40 animate-pulse" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Filter Group 2: Price Range */}
              <div className="space-y-3 pt-4 border-t border-slate-800/40">
                <div className="h-3 w-24 rounded bg-slate-700/60 animate-pulse" />
                <div className="h-8 w-full rounded-lg bg-slate-800/50 animate-pulse" />
              </div>

              {/* Filter Group 3: RAM */}
              <div className="space-y-3 pt-4 border-t border-slate-800/40">
                <div className="h-3 w-16 rounded bg-slate-700/60 animate-pulse" />
                <div className="flex flex-wrap gap-2">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-7 w-14 rounded-full bg-slate-800/60 animate-pulse" />
                  ))}
                </div>
              </div>
            </div>
          </aside>

          {/* Product Grid Skeleton */}
          <div className="lg:col-span-3 space-y-6">
            {/* Top Toolbar skeleton (Results count + Sorting dropdown) */}
            <div className="flex items-center justify-between rounded-xl border border-slate-800/60 bg-slate-900/30 px-4 py-3">
              <div className="h-4 w-32 rounded bg-slate-800/70 animate-pulse" />
              <div className="h-8 w-36 rounded-lg bg-slate-800/70 animate-pulse" />
            </div>

            {/* 6 Grid Cards Placeholder */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-800/60 bg-slate-900/30 p-4 transition-all"
                >
                  {/* Image Placeholder */}
                  <div className="aspect-[4/3] w-full rounded-xl bg-slate-800/60 animate-pulse" />

                  {/* Badges / Brand */}
                  <div className="mt-4 flex items-center justify-between">
                    <div className="h-3 w-16 rounded bg-slate-800 animate-pulse" />
                    <div className="h-4 w-12 rounded-full bg-slate-800/50 animate-pulse" />
                  </div>

                  {/* Title */}
                  <div className="mt-3 space-y-2">
                    <div className="h-4 w-5/6 rounded bg-slate-800/80 animate-pulse" />
                    <div className="h-3 w-3/4 rounded bg-slate-800/50 animate-pulse" />
                  </div>

                  {/* Specs pill placeholder */}
                  <div className="mt-4 flex gap-2">
                    <div className="h-5 w-16 rounded bg-slate-800/50 animate-pulse" />
                    <div className="h-5 w-20 rounded bg-slate-800/50 animate-pulse" />
                  </div>

                  {/* Footer / Price & Button */}
                  <div className="mt-6 flex items-center justify-between border-t border-slate-800/50 pt-4">
                    <div className="space-y-1">
                      <div className="h-4 w-20 rounded bg-slate-800/90 animate-pulse" />
                      <div className="h-3 w-14 rounded bg-slate-800/40 animate-pulse" />
                    </div>
                    <div className="h-8 w-24 rounded-lg bg-slate-800 animate-pulse" />
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
