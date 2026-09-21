"use client";

import {
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import { useState } from "react";
import type {
  CatalogueBrand,
  CatalogueCategory,
} from "../../types/catalogue";

interface CatalogueFiltersProps {
  brands: CatalogueBrand[];
  categories: CatalogueCategory[];
}

export function CatalogueFilters({
  brands,
  categories,
}: CatalogueFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentSearch = searchParams.get("search") ?? "";
  const currentBrand = searchParams.get("brandSlug") ?? "";
  const currentCategory =
    searchParams.get("categorySlug") ?? "";

  const [search, setSearch] = useState(currentSearch);

  function updateFilters(
    updates: Record<string, string>,
  ) {
    const params = new URLSearchParams(
      searchParams.toString(),
    );

    for (const [key, value] of Object.entries(updates)) {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    }

    params.delete("page");

    const query = params.toString();

    router.push(
      query ? `${pathname}?${query}` : pathname,
    );
  }

  function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    updateFilters({
      search: search.trim(),
    });
  }

  function clearFilters() {
    setSearch("");

    router.push(pathname);
  }

  const hasFilters =
    Boolean(currentSearch) ||
    Boolean(currentBrand) ||
    Boolean(currentCategory);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_190px_190px_auto]">
        <form
          onSubmit={submitSearch}
          className="flex min-w-0"
        >
          <label
            htmlFor="catalogue-search"
            className="sr-only"
          >
            Search laptops
          </label>

          <input
            id="catalogue-search"
            type="search"
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="Search laptops, brands or use cases"
            className="h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          />

          <button
            type="submit"
            className="ml-2 h-11 shrink-0 rounded-xl bg-slate-950 px-5 text-sm font-medium text-white transition-colors hover:bg-blue-600"
          >
            Search
          </button>
        </form>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium uppercase tracking-[0.12em] text-slate-400">
            Brand
          </span>

          <select
            value={currentBrand}
            onChange={(event) =>
              updateFilters({
                brandSlug: event.target.value,
              })
            }
            className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          >
            <option value="">All brands</option>

            {brands.map((brand) => (
              <option
                key={brand.id}
                value={brand.slug}
              >
                {brand.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium uppercase tracking-[0.12em] text-slate-400">
            Category
          </span>

          <select
            value={currentCategory}
            onChange={(event) =>
              updateFilters({
                categorySlug: event.target.value,
              })
            }
            className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          >
            <option value="">
              All categories
            </option>

            {categories.map((category) => (
              <option
                key={category.id}
                value={category.slug}
              >
                {category.name}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-end">
          <button
            type="button"
            onClick={clearFilters}
            disabled={!hasFilters}
            className="h-11 w-full rounded-xl border border-slate-300 px-4 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 lg:w-auto"
          >
            Clear
          </button>
        </div>
      </div>

      {hasFilters ? (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
          <span className="text-xs font-medium uppercase tracking-[0.12em] text-slate-400">
            Active filters
          </span>

          {currentSearch ? (
            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700">
              Search: {currentSearch}
            </span>
          ) : null}

          {currentBrand ? (
            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700">
              Brand: {currentBrand}
            </span>
          ) : null}

          {currentCategory ? (
            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700">
              Category: {currentCategory}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}