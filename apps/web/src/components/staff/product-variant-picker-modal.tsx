"use client";

import { useMemo, useState } from "react";
import type { StaffCatalogueProduct } from "@/types/staff-catalogue";

export interface ProductVariantPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: StaffCatalogueProduct[];
  selectedVariantIds: string[];
  onConfirm: (selectedVariantIds: string[]) => void;
}

function money(amount: number | string | null | undefined) {
  const num = Number(amount);
  if (!Number.isFinite(num) || num === 0) return `—`;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(num);
}

export function ProductVariantPickerModal({
  isOpen,
  onClose,
  products,
  selectedVariantIds,
  onConfirm,
}: ProductVariantPickerModalProps) {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [selectedIds, setSelectedIds] = useState<string[]>(selectedVariantIds);

  // Sync selected IDs whenever modal opens
  useMemo(() => {
    if (isOpen) {
      setSelectedIds(selectedVariantIds);
    }
  }, [isOpen, selectedVariantIds]);

  if (!isOpen) return null;

  // Filter products by search and type
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.brand?.name && p.brand.name.toLowerCase().includes(search.toLowerCase())) ||
      (p.modelNumber && p.modelNumber.toLowerCase().includes(search.toLowerCase()));

    if (!matchesSearch) return false;

    if (filterType === "laptop") return p.productType?.toUpperCase() === "LAPTOP";
    if (filterType === "desktop") return p.productType?.toUpperCase() === "DESKTOP";
    if (filterType === "accessory")
      return p.productType?.toUpperCase() !== "LAPTOP" && p.productType?.toUpperCase() !== "DESKTOP";

    return true;
  });

  // Toggle ONLY this specific variant
  function toggleVariant(variantId: string) {
    setSelectedIds((prev) =>
      prev.includes(variantId)
        ? prev.filter((id) => id !== variantId)
        : [...prev, variantId],
    );
  }

  // Toggle all variants of a product as a convenience shortcut
  function toggleAllVariantsOfProduct(prod: StaffCatalogueProduct) {
    const vIds = (prod.variants || []).map((v) => v.id);
    if (vIds.length === 0) {
      // Fallback if product has no separate variants array
      toggleVariant(prod.id);
      return;
    }

    const allSelected = vIds.every((id) => selectedIds.includes(id));
    if (allSelected) {
      // Uncheck all of them
      setSelectedIds((prev) => prev.filter((id) => !vIds.includes(id)));
    } else {
      // Check all of them
      setSelectedIds((prev) => Array.from(new Set([...prev, ...vIds])));
    }
  }

  function handleDone() {
    onConfirm(selectedIds);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-neutral-200 bg-white shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-neutral-100 px-6 py-4">
          <h3 className="text-[16px] font-semibold text-neutral-900">
            Select products
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
          >
            <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4">
              <path
                d="m4 4 8 8M12 4l-8 8"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {/* Search & Filter Bar */}
        <div className="border-b border-neutral-100 px-6 py-3 bg-white">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <svg
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-neutral-400"
              >
                <circle cx="9" cy="9" r="6" />
                <path d="m13.5 13.5 4 4" strokeLinecap="round" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products"
                autoFocus
                className="w-full rounded-lg border border-neutral-200 bg-white py-2 pr-3 pl-9 text-[13px] text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200"
              />
            </div>

            <div className="relative shrink-0">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="h-[38px] rounded-lg border border-neutral-200 bg-white px-3 pr-8 text-[12.5px] text-neutral-700 outline-none hover:border-neutral-300 focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200"
              >
                <option value="all">Search by All</option>
                <option value="laptop">Laptops</option>
                <option value="desktop">Desktops</option>
                <option value="accessory">Accessories / Parts</option>
              </select>
            </div>
          </div>

          <div className="mt-2.5 flex items-center gap-1.5">
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-md border border-neutral-200 bg-white px-2.5 py-1 text-[11.5px] font-medium text-neutral-600 hover:bg-neutral-50"
            >
              <span>Add filter</span>
              <span className="text-[12px]">+</span>
            </button>
          </div>
        </div>

        {/* Table Header */}
        <div className="grid grid-cols-[minmax(0,1fr)_100px_140px] items-center border-b border-neutral-100 bg-neutral-50/70 px-6 py-2 text-[11px] font-medium text-neutral-500 uppercase tracking-wider">
          <div>Product / Variant</div>
          <div className="text-right">Available</div>
          <div className="text-right">Price</div>
        </div>

        {/* Product & Variant List */}
        <div className="flex-1 overflow-y-auto divide-y divide-neutral-100 max-h-[460px]">
          {filteredProducts.length === 0 ? (
            <div className="py-16 text-center text-[13px] text-neutral-500">
              No products found matching your search.
            </div>
          ) : (
            filteredProducts.map((prod) => {
              const vars = prod.variants && prod.variants.length > 0 ? prod.variants : [];
              const vIds = vars.map((v) => v.id);
              const allVarsSelected = vIds.length > 0 && vIds.every((id) => selectedIds.includes(id));
              const someVarsSelected = vIds.length > 0 && vIds.some((id) => selectedIds.includes(id)) && !allVarsSelected;

              return (
                <div key={prod.id} className="transition-colors hover:bg-neutral-50/40">
                  {/* Product Header Row (Allows selecting all variants of this product) */}
                  <div className="grid grid-cols-[minmax(0,1fr)_100px_140px] items-center px-6 py-2.5 bg-neutral-50/20 border-b border-neutral-100/50">
                    <div className="flex min-w-0 items-center gap-3">
                      <input
                        type="checkbox"
                        checked={allVarsSelected}
                        ref={(el) => {
                          if (el) el.indeterminate = someVarsSelected;
                        }}
                        onChange={() => toggleAllVariantsOfProduct(prod)}
                        className="h-4 w-4 cursor-pointer rounded border-neutral-300 accent-neutral-900"
                        title="Select all variants of this product"
                      />

                      <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100">
                        {prod.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={prod.imageUrl}
                            alt={prod.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <svg
                            viewBox="0 0 20 20"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            className="h-4 w-4 text-neutral-400"
                          >
                            <rect x="3" y="3" width="14" height="14" rx="2" />
                            <circle cx="8" cy="8" r="1.5" />
                            <path d="m17 13-4-4-6 6" />
                          </svg>
                        )}
                      </div>

                      <div className="min-w-0">
                        <span className="truncate text-[13px] font-semibold text-neutral-900 block">
                          {prod.name}
                        </span>
                        <span className="text-[11px] text-neutral-500 truncate block">
                          {prod.brand?.name} • {prod.productType}
                        </span>
                      </div>
                    </div>

                    <div className="text-right text-[12px] text-neutral-500">
                      {prod.quantityAvailable ?? 0}
                    </div>

                    <div className="text-right text-[12.5px] font-medium text-neutral-900">
                      {prod.lowestSellingPrice ? money(prod.lowestSellingPrice) : "—"}
                    </div>
                  </div>

                  {/* Individual Variant Rows (Strict Variant-Level Selection) */}
                  {vars.length > 0 && (
                    <div className="divide-y divide-neutral-50 bg-white">
                      {vars.map((v) => {
                        const isVarChecked = selectedIds.includes(v.id);
                        return (
                          <div
                            key={v.id}
                            onClick={() => toggleVariant(v.id)}
                            className={`grid grid-cols-[minmax(0,1fr)_100px_140px] items-center px-6 py-2.5 text-[12.5px] cursor-pointer transition-colors ${
                              isVarChecked ? "bg-neutral-100/60" : "hover:bg-neutral-50/70"
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0 pl-6">
                              <input
                                type="checkbox"
                                checked={isVarChecked}
                                onChange={() => toggleVariant(v.id)}
                                onClick={(e) => e.stopPropagation()}
                                className="h-4 w-4 rounded border-neutral-300 accent-neutral-900 cursor-pointer"
                              />
                              <div className="min-w-0">
                                <span className="font-medium text-neutral-800">
                                  {v.variantName || "Default Variant"}
                                </span>
                                <div className="text-[11px] text-neutral-500 font-mono">
                                  {v.sku}
                                </div>
                              </div>
                            </div>

                            <div className="text-right text-neutral-500 flex items-center justify-end gap-1">
                              {Number(v.quantityAvailable ?? 0) <= 0 && (
                                <span className="text-amber-600 text-[11px]" title="Out of stock">
                                  ⚠
                                </span>
                              )}
                              <span>{v.quantityAvailable ?? 0}</span>
                            </div>

                            <div className="text-right font-medium text-neutral-900">
                              {money(v.sellingPrice)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-neutral-100 bg-neutral-50/50 px-6 py-3">
          <span className="text-[12px] text-neutral-500 font-medium">
            {selectedIds.length} {selectedIds.length === 1 ? "variant" : "variants"} selected
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-neutral-200 bg-white px-3.5 py-1.5 text-[12.5px] font-medium text-neutral-700 hover:bg-neutral-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDone}
              className="rounded-lg bg-neutral-900 px-4 py-1.5 text-[12.5px] font-medium text-white hover:bg-neutral-800"
            >
              Add
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
