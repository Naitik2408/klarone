"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import type { CatalogueFacets } from "../../types/catalogue";

interface FacetSidebarProps {
  facets: CatalogueFacets;
  highestPrice: number;
  onApply?: () => void;
  isMobileDrawer?: boolean;
}

export function FacetSidebar({ facets, highestPrice, onApply, isMobileDrawer }: FacetSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Accordion open/close state
  const [openSections, setOpenSections] = useState({
    availability: true,
    collection: true,
    price: true,
    ram: true,
    storage: true,
    brand: true,
  });

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // Extract current query params
  const currentCollectionSlug = searchParams.get("collectionSlug") ?? "";

  const currentBrandSlugs = searchParams.get("brandSlugs")
    ? searchParams.get("brandSlugs")!.split(",")
    : searchParams.get("brandSlug")
    ? [searchParams.get("brandSlug")!]
    : [];

  const currentRamGbs = searchParams.get("ramGb")
    ? searchParams.get("ramGb")!.split(",").map(Number)
    : [];

  const currentStorageGbs = searchParams.get("storageGb")
    ? searchParams.get("storageGb")!.split(",").map(Number)
    : [];

  const currentInStockOnly = searchParams.get("inStockOnly") === "true";
  const currentMinPrice = searchParams.get("minPrice") ?? "0";
  const currentMaxPrice = searchParams.get("maxPrice") ?? String(highestPrice || 350000);

  const [minPriceInput, setMinPriceInput] = useState(currentMinPrice);
  const [maxPriceInput, setMaxPriceInput] = useState(currentMaxPrice);

  function updateParams(updates: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined && value !== "") {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    }
    params.delete("page");
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  const toggleCollection = (slug: string) => {
    updateParams({
      collectionSlug: currentCollectionSlug === slug ? undefined : slug,
    });
  };

  const toggleBrand = (slug: string) => {
    const exists = currentBrandSlugs.includes(slug);
    const updated = exists
      ? currentBrandSlugs.filter((s) => s !== slug)
      : [...currentBrandSlugs, slug];
    updateParams({
      brandSlugs: updated.length > 0 ? updated.join(",") : undefined,
      brandSlug: undefined, // Clear single brandSlug in favor of multi
    });
  };

  const toggleRam = (ram: number) => {
    const exists = currentRamGbs.includes(ram);
    const updated = exists
      ? currentRamGbs.filter((r) => r !== ram)
      : [...currentRamGbs, ram];
    updateParams({
      ramGb: updated.length > 0 ? updated.join(",") : undefined,
    });
  };

  const toggleStorage = (storage: number) => {
    const exists = currentStorageGbs.includes(storage);
    const updated = exists
      ? currentStorageGbs.filter((s) => s !== storage)
      : [...currentStorageGbs, storage];
    updateParams({
      storageGb: updated.length > 0 ? updated.join(",") : undefined,
    });
  };

  const toggleAvailability = (inStock: boolean) => {
    if (inStock) {
      updateParams({ inStockOnly: currentInStockOnly ? undefined : "true" });
    } else {
      updateParams({ inStockOnly: undefined });
    }
  };

  const applyPrice = () => {
    updateParams({
      minPrice: Number(minPriceInput) > 0 ? minPriceInput : undefined,
      maxPrice: Number(maxPriceInput) < highestPrice ? maxPriceInput : undefined,
    });
  };

  return (
    <aside className="w-full space-y-6">
      {/* 1. AVAILABILITY ACCORDION */}
      <div className="border-b border-stone-200/80 pb-6">
        <button
          type="button"
          onClick={() => toggleSection("availability")}
          style={{
            fontFamily: "var(--font-serif), 'Instrument Serif', Georgia, serif",
            fontSize: "23px",
            lineHeight: "1.25",
          }}
          className="flex w-full items-center justify-between text-left font-normal tracking-tight text-slate-950"
        >
          <span>Availability</span>
          <span className="text-2xl font-light leading-none text-slate-900 font-sans">
            {openSections.availability ? "−" : "+"}
          </span>
        </button>

        {openSections.availability && (
          <div className="mt-4 space-y-3.5">
            <label className="group flex items-center justify-between text-[15px] text-stone-700 cursor-pointer hover:text-slate-950 transition-colors">
              <span className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={currentInStockOnly}
                  onChange={() => toggleAvailability(true)}
                  className="h-5 w-5 rounded-[4px] border-stone-400 text-slate-950 focus:ring-0 accent-slate-950 cursor-pointer"
                />
                <span className="font-normal text-slate-800">In stock</span>
              </span>
              <span className="text-[14px] text-stone-400 font-light">{facets.availability.inStockCount}</span>
            </label>

            <label className="group flex items-center justify-between text-[15px] text-stone-700 cursor-pointer hover:text-slate-950 transition-colors">
              <span className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={!currentInStockOnly}
                  onChange={() => toggleAvailability(false)}
                  className="h-5 w-5 rounded-[4px] border-stone-400 text-slate-950 focus:ring-0 accent-slate-950 cursor-pointer"
                />
                <span className="font-normal text-slate-800">All items</span>
              </span>
              <span className="text-[14px] text-stone-400 font-light">
                {facets.availability.inStockCount + facets.availability.outOfStockCount}
              </span>
            </label>
          </div>
        )}
      </div>

      {/* 2. COLLECTION ACCORDION */}
      {facets.collections && facets.collections.length > 0 && (
        <div className="border-b border-stone-200/80 pb-6">
          <button
            type="button"
            onClick={() => toggleSection("collection")}
            style={{
              fontFamily: "var(--font-serif), 'Instrument Serif', Georgia, serif",
              fontSize: "23px",
              lineHeight: "1.25",
            }}
            className="flex w-full items-center justify-between text-left font-normal tracking-tight text-slate-950"
          >
            <span>Collection</span>
            <span className="text-2xl font-light leading-none text-slate-900 font-sans">
              {openSections.collection ? "−" : "+"}
            </span>
          </button>

          {openSections.collection && (
            <div className="mt-4 space-y-3.5">
              {facets.collections.map((col) => (
                <label
                  key={col.slug}
                  className="group flex items-center justify-between text-[15px] text-stone-700 cursor-pointer hover:text-slate-950 transition-colors"
                >
                  <span className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={currentCollectionSlug === col.slug}
                      onChange={() => toggleCollection(col.slug)}
                      className="h-5 w-5 rounded-[4px] border-stone-400 text-slate-950 focus:ring-0 accent-slate-950 cursor-pointer"
                    />
                    <span className="font-normal text-slate-800">{col.title}</span>
                  </span>
                  <span className="text-[14px] text-stone-400 font-light">{col.count}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 3. PRICE ACCORDION & SLIDER */}
      <div className="border-b border-stone-200/80 pb-6">
        <button
          type="button"
          onClick={() => toggleSection("price")}
          style={{
            fontFamily: "var(--font-serif), 'Instrument Serif', Georgia, serif",
            fontSize: "23px",
            lineHeight: "1.25",
          }}
          className="flex w-full items-center justify-between text-left font-normal tracking-tight text-slate-950"
        >
          <span>Price</span>
          <span className="text-2xl font-light leading-none text-slate-900 font-sans">
            {openSections.price ? "−" : "+"}
          </span>
        </button>

        {openSections.price && (
          <div className="mt-4 space-y-4">
            <p className="text-[14px] text-stone-500 font-normal">
              The highest price is ₹{highestPrice.toLocaleString("en-IN")}
            </p>

            {/* Slider track visualization */}
            <div className="relative flex items-center py-1.5">
              <div className="h-1.5 w-full rounded-full bg-stone-200">
                <div className="h-1.5 rounded-full bg-slate-900" style={{ width: "100%" }} />
              </div>
              <div className="absolute left-0 h-4 w-4 rounded-full border-2 border-slate-900 bg-white shadow-sm" />
              <div className="absolute right-0 h-4 w-4 rounded-full border-2 border-slate-900 bg-white shadow-sm" />
            </div>

            <div className="flex items-center gap-3 pt-1">
              <div className="flex flex-1 items-center rounded-2xl bg-[#f0f2ee] px-4 py-3">
                <span className="text-[14px] text-stone-500 mr-2 font-normal">₹</span>
                <input
                  type="number"
                  value={minPriceInput}
                  onChange={(e) => setMinPriceInput(e.target.value)}
                  onBlur={applyPrice}
                  onKeyDown={(e) => e.key === "Enter" && applyPrice()}
                  className="w-full bg-transparent text-[14px] text-slate-900 outline-none"
                  placeholder="0"
                />
              </div>

              <div className="flex flex-1 items-center rounded-2xl bg-[#f0f2ee] px-4 py-3">
                <span className="text-[14px] text-stone-500 mr-2 font-normal">₹</span>
                <input
                  type="number"
                  value={maxPriceInput}
                  onChange={(e) => setMaxPriceInput(e.target.value)}
                  onBlur={applyPrice}
                  onKeyDown={(e) => e.key === "Enter" && applyPrice()}
                  className="w-full bg-transparent text-[14px] text-slate-900 outline-none"
                  placeholder={String(highestPrice)}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. HARDWARE SPEC: RAM */}
      {facets.ramOptions.length > 0 && (
        <div className="border-b border-stone-200/80 pb-6">
          <button
            type="button"
            onClick={() => toggleSection("ram")}
            style={{
              fontFamily: "var(--font-serif), 'Instrument Serif', Georgia, serif",
              fontSize: "23px",
              lineHeight: "1.25",
            }}
            className="flex w-full items-center justify-between text-left font-normal tracking-tight text-slate-950"
          >
            <span>Size (RAM)</span>
            <span className="text-2xl font-light leading-none text-slate-900 font-sans">
              {openSections.ram ? "−" : "+"}
            </span>
          </button>

          {openSections.ram && (
            <div className="mt-4 space-y-3.5">
              {facets.ramOptions.map((opt) => (
                <label
                  key={opt.ramGb}
                  className="group flex items-center justify-between text-[15px] text-stone-700 cursor-pointer hover:text-slate-950 transition-colors"
                >
                  <span className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={currentRamGbs.includes(opt.ramGb)}
                      onChange={() => toggleRam(opt.ramGb)}
                      className="h-5 w-5 rounded-[4px] border-stone-400 text-slate-950 focus:ring-0 accent-slate-950 cursor-pointer"
                    />
                    <span className="font-normal text-slate-800">{opt.ramGb}GB RAM</span>
                  </span>
                  <span className="text-[14px] text-stone-400 font-light">{opt.count}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 4. HARDWARE SPEC: STORAGE */}
      {facets.storageOptions.length > 0 && (
        <div className="border-b border-stone-200/80 pb-6">
          <button
            type="button"
            onClick={() => toggleSection("storage")}
            style={{
              fontFamily: "var(--font-serif), 'Instrument Serif', Georgia, serif",
              fontSize: "23px",
              lineHeight: "1.25",
            }}
            className="flex w-full items-center justify-between text-left font-normal tracking-tight text-slate-950"
          >
            <span>Storage</span>
            <span className="text-2xl font-light leading-none text-slate-900 font-sans">
              {openSections.storage ? "−" : "+"}
            </span>
          </button>

          {openSections.storage && (
            <div className="mt-4 space-y-3.5">
              {facets.storageOptions.map((opt) => (
                <label
                  key={opt.storageGb}
                  className="group flex items-center justify-between text-[15px] text-stone-700 cursor-pointer hover:text-slate-950 transition-colors"
                >
                  <span className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={currentStorageGbs.includes(opt.storageGb)}
                      onChange={() => toggleStorage(opt.storageGb)}
                      className="h-5 w-5 rounded-[4px] border-stone-400 text-slate-950 focus:ring-0 accent-slate-950 cursor-pointer"
                    />
                    <span className="font-normal text-slate-800">
                      {opt.storageGb >= 1024
                        ? `${opt.storageGb / 1024}TB SSD`
                        : `${opt.storageGb}GB SSD`}
                    </span>
                  </span>
                  <span className="text-[14px] text-stone-400 font-light">{opt.count}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 5. BRAND ACCORDION */}
      {facets.brands.length > 0 && (
        <div className="border-b border-stone-200/80 pb-6">
          <button
            type="button"
            onClick={() => toggleSection("brand")}
            style={{
              fontFamily: "var(--font-serif), 'Instrument Serif', Georgia, serif",
              fontSize: "23px",
              lineHeight: "1.25",
            }}
            className="flex w-full items-center justify-between text-left font-normal tracking-tight text-slate-950"
          >
            <span>Brand</span>
            <span className="text-2xl font-light leading-none text-slate-900 font-sans">
              {openSections.brand ? "−" : "+"}
            </span>
          </button>

          {openSections.brand && (
            <div className="mt-4 space-y-3.5">
              {facets.brands.map((b) => (
                <label
                  key={b.slug}
                  className="group flex items-center justify-between text-[15px] text-stone-700 cursor-pointer hover:text-slate-950 transition-colors"
                >
                  <span className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={currentBrandSlugs.includes(b.slug)}
                      onChange={() => toggleBrand(b.slug)}
                      className="h-5 w-5 rounded-[4px] border-stone-400 text-slate-950 focus:ring-0 accent-slate-950 cursor-pointer"
                    />
                    <span className="font-normal text-slate-800">{b.name}</span>
                  </span>
                  <span className="text-[14px] text-stone-400 font-light">{b.count}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
