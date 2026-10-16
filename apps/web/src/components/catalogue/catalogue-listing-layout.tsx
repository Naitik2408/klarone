"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ProductCard } from "./product-card";
import { FacetSidebar } from "./facet-sidebar";
import { CatalogueToolbar } from "./catalogue-toolbar";
import { CategoryCarousel } from "./category-carousel";
import type {
  CatalogueCategory,
  CatalogueFacets,
  CatalogueProduct,
} from "../../types/catalogue";

interface CatalogueListingLayoutProps {
  products: CatalogueProduct[];
  facets: CatalogueFacets;
  categories: CatalogueCategory[];
  total: number;
  page: number;
  totalPages: number;
  title: string;
  breadcrumbs: Array<{ label: string; href?: string }>;
  activeCategorySlug?: string;
}

export function CatalogueListingLayout({
  products,
  facets,
  categories,
  total,
  page,
  totalPages,
  title,
  breadcrumbs,
  activeCategorySlug,
}: CatalogueListingLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(true);
  const [viewColumns, setViewColumns] = useState<3 | 4>(3);

  const currentSort = searchParams.get("sortBy") ?? "featured";

  const handleSortChange = (newSort: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (newSort && newSort !== "featured") {
      params.set("sortBy", newSort);
    } else {
      params.delete("sortBy");
    }
    params.delete("page");
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const getPageUrl = (targetPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (targetPage > 1) {
      params.set("page", String(targetPage));
    } else {
      params.delete("page");
    }
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  };

  return (
    <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
      {/* 1. BREADCRUMBS */}
      <nav className="mb-4 sm:mb-5 flex items-center gap-2 text-xs sm:text-[14px] font-medium text-stone-500">
        {breadcrumbs.map((crumb, idx) => (
          <span key={idx} className="flex items-center gap-2">
            {crumb.href ? (
              <Link href={crumb.href} className="hover:text-slate-950 transition-colors">
                {crumb.label}
              </Link>
            ) : (
              <span className="font-semibold text-slate-900">{crumb.label}</span>
            )}
            {idx < breadcrumbs.length - 1 && <span className="text-stone-300 font-normal">/</span>}
          </span>
        ))}
      </nav>

      {/* 2. EDITORIAL HERO TITLE / BANNER */}
      <div className="relative mb-6 sm:mb-8 overflow-hidden rounded-2xl sm:rounded-3xl bg-[#0b241b] text-white p-6 sm:p-10 shadow-sm">
        <div className="relative z-10 max-w-xl">
          <span className="inline-block text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-emerald-400 mb-1 sm:mb-2">
            Curated Catalogue
          </span>
          <h1
            style={{ fontFamily: "var(--font-serif), 'Instrument Serif', Georgia, serif" }}
            className="text-3xl font-normal tracking-tight text-white sm:text-5xl"
          >
            {title}
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-stone-300 leading-relaxed font-light">
            Engineered workstations, ultrabooks, and gaming powerhouses tuned for extreme performance.
          </p>
        </div>
        {/* Subtle decorative glow */}
        <div className="pointer-events-none absolute -right-10 -bottom-10 h-44 w-44 rounded-full bg-emerald-500/20 blur-3xl" />
      </div>

      {/* 3. TOOLBAR (FILTERS BUTTON, COUNT, SORT BY, VIEW AS TOGGLE) */}
      <div className="mb-6 sm:mb-8">
        <CatalogueToolbar
          total={total}
          viewColumns={viewColumns}
          onToggleView={setViewColumns}
          showFilters={showFilters}
          onToggleFilters={() => {
            // On mobile screen, toggle drawer; on desktop toggle sidebar
            if (typeof window !== "undefined" && window.innerWidth < 768) {
              setIsMobileDrawerOpen(true);
            } else {
              setShowFilters((prev) => !prev);
            }
          }}
        />
      </div>

      {/* 4. MAIN CONTENT (LEFT ACCORDION SIDEBAR ON DESKTOP + RIGHT 2-COL / 3-COL GRID) */}
      <div className="grid grid-cols-12 gap-6 lg:gap-10">
        {/* Desktop Left Filters Accordion Sidebar */}
        {showFilters && (
          <div className="hidden md:block col-span-12 md:col-span-4 lg:col-span-3">
            <div className="sticky top-28">
              <FacetSidebar
                facets={facets}
                highestPrice={facets.priceRange.max || 350000}
              />
            </div>
          </div>
        )}

        {/* Right Products Grid: 2 columns on mobile, 3 or 4 on desktop */}
        <div className={showFilters ? "col-span-12 md:col-span-8 lg:col-span-9" : "col-span-12"}>
          {products.length > 0 ? (
            <div
              className={`grid gap-2.5 sm:gap-4 ${
                viewColumns === 4
                  ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
                  : "grid-cols-2 md:grid-cols-3 lg:grid-cols-3"
              }`}
            >
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-stone-300 bg-stone-50 px-6 py-20 text-center">
              <h3
                style={{ fontFamily: "var(--font-serif), 'Instrument Serif', Georgia, serif" }}
                className="text-3xl font-normal text-slate-950"
              >
                No laptops match your selection
              </h3>
              <p className="mx-auto mt-2 max-w-sm text-sm text-stone-500">
                Try clearing one of your active filters or adjusting the price range.
              </p>
              <Link
                href="/laptops"
                className="mt-6 inline-flex rounded-full bg-slate-950 px-6 py-2.5 text-xs font-semibold text-white transition hover:bg-stone-800"
              >
                Reset All Filters
              </Link>
            </div>
          )}

          {/* 5. NUMBERED PILL PAGINATION */}
          {totalPages > 1 && (
            <nav className="mt-10 sm:mt-14 flex items-center justify-center gap-1.5 sm:gap-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
                const isCurrent = p === page;
                return (
                  <Link
                    key={p}
                    href={getPageUrl(p)}
                    className={`flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full text-xs font-semibold transition-all ${
                      isCurrent
                        ? "bg-slate-950 text-white shadow-sm"
                        : "bg-stone-100 text-stone-700 hover:bg-stone-200"
                    }`}
                  >
                    {p}
                  </Link>
                );
              })}

              {page < totalPages && (
                <Link
                  href={getPageUrl(page + 1)}
                  className="flex items-center gap-1 pl-2 sm:pl-3 text-xs font-medium text-slate-800 hover:text-emerald-900"
                >
                  <span>Next</span>
                  <span>&gt;</span>
                </Link>
              )}
            </nav>
          )}
        </div>
      </div>

      {/* 6. MOBILE FILTER & SORT SLIDE-OUT DRAWER */}
      {isMobileDrawerOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity duration-300"
            onClick={() => setIsMobileDrawerOpen(false)}
          />

          {/* Drawer content sliding from right */}
          <div className="relative ml-auto flex h-full w-[88vw] max-w-md flex-col bg-white shadow-2xl animate-in slide-in-from-right duration-300">
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-stone-200 px-5 py-4">
              <h2
                style={{ fontFamily: "var(--font-serif), 'Instrument Serif', Georgia, serif" }}
                className="text-2xl font-normal text-slate-950"
              >
                Filter &amp; sort
              </h2>
              <button
                type="button"
                onClick={() => setIsMobileDrawerOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-stone-100 text-stone-600 hover:bg-stone-200 hover:text-slate-950"
                aria-label="Close filters drawer"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Scrollable Filters & Sort Options Body */}
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
              {/* Sort By section inside drawer */}
              <div className="border-b border-stone-200 pb-5">
                <span
                  style={{ fontFamily: "var(--font-serif), 'Instrument Serif', Georgia, serif" }}
                  className="text-xl font-normal text-slate-950 block mb-3"
                >
                  Sort by
                </span>
                <div className="space-y-2.5">
                  {[
                    { label: "Best selling", value: "featured" },
                    { label: "Price: Low to high", value: "price-asc" },
                    { label: "Price: High to low", value: "price-desc" },
                    { label: "Newest arrivals", value: "newest" },
                  ].map((option) => (
                    <label
                      key={option.value}
                      className="flex items-center gap-3 text-sm text-stone-700 cursor-pointer"
                    >
                      <input
                        type="radio"
                        name="mobileSort"
                        value={option.value}
                        checked={currentSort === option.value}
                        onChange={() => handleSortChange(option.value)}
                        className="h-4 w-4 text-slate-950 focus:ring-0 accent-slate-950 cursor-pointer"
                      />
                      <span className={currentSort === option.value ? "font-semibold text-slate-950" : "font-normal"}>
                        {option.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Facet Sidebar filters */}
              <FacetSidebar
                facets={facets}
                highestPrice={facets.priceRange.max || 350000}
                isMobileDrawer={true}
              />
            </div>

            {/* Sticky Bottom Pill CTA */}
            <div className="border-t border-stone-200 bg-white p-4">
              <button
                type="button"
                onClick={() => setIsMobileDrawerOpen(false)}
                className="w-full rounded-full bg-[#1e3a2b] py-3.5 text-center text-sm font-semibold text-white shadow-md transition hover:bg-[#15291e] active:scale-[0.99]"
              >
                See {total} {total === 1 ? "Product" : "Products"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
