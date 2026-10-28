"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

interface CatalogueToolbarProps {
  total: number;
  viewColumns: 3 | 4;
  onToggleView: (cols: 3 | 4) => void;
  showFilters: boolean;
  onToggleFilters: () => void;
}

export function CatalogueToolbar({
  total,
  viewColumns,
  onToggleView,
  showFilters,
  onToggleFilters,
}: CatalogueToolbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentSort = searchParams.get("sortBy") ?? "featured";

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const params = new URLSearchParams(searchParams.toString());
    const val = e.target.value;
    if (val && val !== "featured") {
      params.set("sortBy", val);
    } else {
      params.delete("sortBy");
    }
    params.delete("page");
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  return (
    <div className="flex items-center justify-between border-b border-stone-200/80 pb-4 sm:pb-6">
      {/* Left: Filters Pill Button matching user reference */}
      <div className="flex items-center gap-3 sm:gap-5">
        <button
          type="button"
          onClick={onToggleFilters}
          className="inline-flex h-11 items-center gap-2 rounded-full border border-stone-300 bg-white px-5 sm:px-6 text-xs sm:text-sm font-semibold tracking-tight text-slate-900 shadow-2xs transition-all duration-200 hover:border-slate-950 hover:bg-stone-50 active:scale-95"
        >
          <svg
            className="h-4 w-4 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
            />
          </svg>
          <span>Filter &amp; Sort</span>
        </button>

        {/* Desktop Product Count */}
        <span className="hidden sm:inline text-sm font-medium text-stone-500">
          {total} {total === 1 ? "product" : "products"}
        </span>
      </div>

      {/* Right on mobile: Product count like in the reference image ("18 products") */}
      <span className="sm:hidden text-xs sm:text-sm font-medium text-stone-600">
        {total} {total === 1 ? "product" : "products"}
      </span>

            {/* Right on desktop: Sort By */}
      <div className="hidden sm:flex items-center gap-6">
        <div className="flex items-center gap-2.5">
          <span className="text-stone-500 text-sm font-medium">Sort by</span>
          <div className="relative">
            <select
              value={currentSort}
              onChange={handleSortChange}
              className="h-11 appearance-none rounded-full border border-stone-300 bg-white px-5 pr-11 text-sm font-semibold text-slate-900 outline-none hover:border-slate-800 focus:border-slate-950 shadow-2xs"
            >
              <option value="featured">Best selling</option>
              <option value="price-asc">Price: Low to high</option>
              <option value="price-desc">Price: High to low</option>
              <option value="newest">Newest arrivals</option>
            </select>
            <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-stone-600">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
