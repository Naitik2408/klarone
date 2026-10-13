"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
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
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [showFilters, setShowFilters] = useState(true);
  const [viewColumns, setViewColumns] = useState<3 | 4>(3);

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
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* 1. BREADCRUMBS */}
      <nav className="mb-5 flex items-center gap-2.5 text-[14px] font-medium text-stone-500">
        {breadcrumbs.map((crumb, idx) => (
          <span key={idx} className="flex items-center gap-2.5">
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

      {/* 2. EDITORIAL SERIF HERO TITLE */}
      <div className="mb-8">
        <h1
          style={{ fontFamily: "var(--font-serif), 'Instrument Serif', Georgia, serif" }}
          className="text-4xl font-normal tracking-tight text-slate-950 sm:text-5xl"
        >
          {title}
        </h1>
      </div>

      {/* 3. TOOLBAR (FILTERS BUTTON, COUNT, SORT BY, VIEW AS TOGGLE) */}
      <div className="mb-8">
        <CatalogueToolbar
          total={total}
          viewColumns={viewColumns}
          onToggleView={setViewColumns}
          showFilters={showFilters}
          onToggleFilters={() => setShowFilters((prev) => !prev)}
        />
      </div>

      {/* 5. MAIN CONTENT (LEFT ACCORDION SIDEBAR + RIGHT GRID) */}
      <div className="grid grid-cols-12 gap-8 lg:gap-10">
        {/* Left Filters Accordion Sidebar */}
        {showFilters && (
          <div className="col-span-12 md:col-span-4 lg:col-span-3">
            <div className="sticky top-28">
              <FacetSidebar
                facets={facets}
                highestPrice={facets.priceRange.max || 350000}
              />
            </div>
          </div>
        )}

        {/* Right Products Grid */}
        <div className={showFilters ? "col-span-12 md:col-span-8 lg:col-span-9" : "col-span-12"}>
          {products.length > 0 ? (
            <div
              className={`grid gap-2.5 sm:gap-3 ${
                viewColumns === 4
                  ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
                  : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
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

          {/* 6. NUMBERED PILL PAGINATION (IMAGE 3) */}
          {totalPages > 1 && (
            <nav className="mt-14 flex items-center justify-center gap-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
                const isCurrent = p === page;
                return (
                  <Link
                    key={p}
                    href={getPageUrl(p)}
                    className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold transition-all ${
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
                  className="flex items-center gap-1 pl-3 text-xs font-medium text-slate-800 hover:text-emerald-900"
                >
                  <span>Next</span>
                  <span>&gt;</span>
                </Link>
              )}
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}
