"use client";

import { useId, useMemo, useState } from "react";
import type { StaffCatalogueCategory } from "../../types/staff-catalogue";
import { suggestCategoryFromText } from "../../lib/taxonomy-suggestions";

export interface ShopifyCategoryPickerProps {
  categories: StaffCatalogueCategory[];
  selectedCategoryId: number | string | null;
  onSelectCategory: (categoryId: number | string) => void;
  productTitle?: string;
  disabled?: boolean;
  error?: string;
  token?: string;
  onCategoryCreated?: (newCategory: StaffCatalogueCategory) => void;
}

export function ShopifyCategoryPicker({
  categories,
  selectedCategoryId,
  onSelectCategory,
  productTitle = "",
  disabled = false,
  error,
  token,
  onCategoryCreated,
}: ShopifyCategoryPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [autoSuggestEnabled, setAutoSuggestEnabled] = useState(true);
  const [activeParentId, setActiveParentId] = useState<number | null>(null);

  // New Custom Category Modal
  const [isCreatingCustom, setIsCreatingCustom] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customParentId, setCustomParentId] = useState<number | "">("");
  const [customSubmitting, setCustomSubmitting] = useState(false);
  const [customError, setCustomError] = useState("");

  const searchInputId = useId();

  // Find currently selected category
  const selectedCategory = useMemo(() => {
    if (!selectedCategoryId) return null;
    return categories.find((c) => String(c.id) === String(selectedCategoryId)) ?? null;
  }, [categories, selectedCategoryId]);

  // Compute breadcrumbs for a category
  function getBreadcrumbs(cat: StaffCatalogueCategory | null): StaffCatalogueCategory[] {
    if (!cat) return [];
    const trail: StaffCatalogueCategory[] = [cat];
    let curr = cat;
    while (curr.parentId) {
      const parent = categories.find((c) => c.id === curr.parentId);
      if (!parent) break;
      trail.unshift(parent);
      curr = parent;
    }
    return trail;
  }

  const selectedBreadcrumbs = useMemo(
    () => getBreadcrumbs(selectedCategory),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedCategory, categories],
  );

  // AI / Rule Auto-suggestion (Shopify purple suggestion)
  const suggestion = useMemo(() => {
    if (!autoSuggestEnabled || !productTitle || selectedCategoryId) return null;
    const match = suggestCategoryFromText(productTitle);
    if (!match) return null;
    const cat = categories.find((c) => c.slug === match.categorySlug);
    if (!cat) return null;
    return {
      category: cat,
      keyword: match.matchedKeyword,
      confidence: match.confidence,
    };
  }, [autoSuggestEnabled, productTitle, selectedCategoryId, categories]);

  // Filtered categories for search or drill-down
  const searchResults = useMemo(() => {
    if (!search.trim()) return null;
    const query = search.toLowerCase().trim();
    return categories.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        (c.description && c.description.toLowerCase().includes(query)),
    );
  }, [categories, search]);

  // Current level categories in hierarchy drill-down
  const currentLevelCategories = useMemo(() => {
    return categories.filter((c) => (c.parentId ?? null) === activeParentId);
  }, [categories, activeParentId]);

  // Parent trail in hierarchy navigation
  const currentHierarchyTrail = useMemo(() => {
    if (!activeParentId) return [];
    const parent = categories.find((c) => c.id === activeParentId);
    return getBreadcrumbs(parent ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeParentId, categories]);

  async function handleCreateCustomCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!customName.trim()) {
      setCustomError("Category name is required.");
      return;
    }
    if (!token) {
      setCustomError("Staff authentication token missing.");
      return;
    }

    setCustomSubmitting(true);
    setCustomError("");

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3000"}/staff/catalogue/categories`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: customName.trim(),
            parentId: customParentId ? Number(customParentId) : null,
          }),
        },
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? "Failed to create category");
      }

      const createdCat = (await res.json()) as StaffCatalogueCategory;
      if (onCategoryCreated) {
        onCategoryCreated(createdCat);
      }
      onSelectCategory(createdCat.id);
      setIsCreatingCustom(false);
      setCustomName("");
      setCustomParentId("");
      setIsOpen(false);
    } catch (err) {
      setCustomError(err instanceof Error ? err.message : "Error creating category");
    } finally {
      setCustomSubmitting(false);
    }
  }

  return (
    <div className="space-y-2">
      {/* Auto Suggestion Banner (Shopify Purple Style) */}
      {suggestion && !selectedCategoryId && (
        <div className="flex items-center justify-between rounded-lg border border-purple-200 bg-purple-50/70 p-3 text-[12px] text-purple-900 transition-all">
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-purple-200 text-purple-700">
              <svg viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3">
                <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm0 1.2a5.8 5.8 0 1 1 0 11.6A5.8 5.8 0 0 1 8 2.2zm0 2.3a.9.9 0 0 0-.9.9v3.4c0 .5.4.9.9.9s.9-.4.9-.9V5.4a.9.9 0 0 0-.9-.9zm0 6.4a.9.9 0 1 0 0 1.8.9.9 0 0 0 0-1.8z" />
              </svg>
            </span>
            <div>
              <p className="font-semibold text-purple-950">
                Suggested category: <span className="underline">{suggestion.category.name}</span>
              </p>
              <p className="text-[11px] text-purple-700">
                Matched &ldquo;{suggestion.keyword}&rdquo; from product title
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onSelectCategory(suggestion.category.id)}
              className="rounded-md bg-purple-600 px-2.5 py-1 text-[11.5px] font-medium text-white shadow-sm hover:bg-purple-700 transition"
            >
              Accept
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(true)}
              className="text-[11.5px] text-purple-700 hover:text-purple-900 underline"
            >
              Change
            </button>
          </div>
        </div>
      )}

      {/* Main Category Display Card */}
      <div className="relative">
        <div
          onClick={() => !disabled && setIsOpen((prev) => !prev)}
          className={`flex min-h-[44px] cursor-pointer items-center justify-between rounded-lg border bg-white px-3 py-2 text-[13px] transition ${
            error
              ? "border-red-300 bg-red-50/20"
              : "border-neutral-200 hover:border-neutral-300"
          } ${disabled ? "pointer-events-none opacity-60" : ""}`}
        >
          <div className="min-w-0 flex-1">
            {selectedCategory ? (
              <div>
                <div className="flex items-center gap-1.5 font-medium text-neutral-900">
                  <span>{selectedCategory.name}</span>
                  <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
                    Confirmed
                  </span>
                </div>
                {selectedBreadcrumbs.length > 1 && (
                  <p className="truncate text-[11px] text-neutral-500">
                    {selectedBreadcrumbs.map((c) => c.name).join(" > ")}
                  </p>
                )}
                {selectedCategory.description && (
                  <p className="truncate text-[10.5px] text-neutral-400">
                    {selectedCategory.description}
                  </p>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-neutral-400">
                <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-neutral-600">
                  Uncategorized
                </span>
                <span>Select a product category...</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 pl-2 text-neutral-400">
            {selectedCategory && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectCategory("");
                }}
                className="rounded p-1 hover:bg-neutral-100 hover:text-neutral-700"
                title="Clear category"
              >
                <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                  <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.75.75 0 1 1 1.06 1.06L9.06 8l3.22 3.22a.75.75 0 1 1-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 0 1-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06z" />
                </svg>
              </button>
            )}
            <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4">
              <path
                d="m4 6 4 4 4-4"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        {/* Dropdown / Drill-down Popover */}
        {isOpen && (
          <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-80 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-xl flex flex-col">
            {/* Search header & Auto-suggest toggle */}
            <div className="border-b border-neutral-100 bg-neutral-50/50 p-2.5 space-y-2">
              <div className="relative">
                <input
                  id={searchInputId}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search categories (e.g. Laptops, RAM, Battery)..."
                  className="w-full rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 pl-8 text-[12.5px] outline-none placeholder:text-neutral-400 focus:border-neutral-400 focus:ring-1 focus:ring-neutral-400"
                  autoFocus
                />
                <svg
                  viewBox="0 0 16 16"
                  fill="none"
                  className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-neutral-400"
                >
                  <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
                  <path d="m11 11 3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>

              {/* Hierarchy navigation trail if inside folder */}
              {!search && activeParentId && (
                <div className="flex items-center gap-1 text-[11px] text-neutral-600 overflow-x-auto py-0.5">
                  <button
                    type="button"
                    onClick={() => setActiveParentId(null)}
                    className="font-medium text-neutral-900 hover:underline"
                  >
                    All Categories
                  </button>
                  {currentHierarchyTrail.map((crumb, idx) => (
                    <span key={crumb.id} className="flex items-center gap-1">
                      <span>/</span>
                      <button
                        type="button"
                        onClick={() =>
                          idx === currentHierarchyTrail.length - 1
                            ? null
                            : setActiveParentId(crumb.id)
                        }
                        className={`hover:underline ${
                          idx === currentHierarchyTrail.length - 1
                            ? "font-semibold text-neutral-900"
                            : "text-neutral-600"
                        }`}
                      >
                        {crumb.name}
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* List View */}
            <div className="flex-1 overflow-y-auto divide-y divide-neutral-100 max-h-56">
              {searchResults ? (
                // Search Results View
                searchResults.length === 0 ? (
                  <div className="p-4 text-center text-[12px] text-neutral-500">
                    No matching categories found.
                  </div>
                ) : (
                  searchResults.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        onSelectCategory(cat.id);
                        setIsOpen(false);
                        setSearch("");
                      }}
                      className="w-full text-left px-3 py-2 text-[12px] hover:bg-neutral-50 flex items-center justify-between group"
                    >
                      <div>
                        <div className="font-medium text-neutral-800 group-hover:text-neutral-950">
                          {cat.name}
                        </div>
                        <div className="text-[10.5px] text-neutral-500">
                          {getBreadcrumbs(cat).map((c) => c.name).join(" > ")}
                        </div>
                      </div>
                      <span className="text-[11px] text-neutral-400 group-hover:text-neutral-700">
                        Select →
                      </span>
                    </button>
                  ))
                )
              ) : (
                // Hierarchical drill-down View
                currentLevelCategories.map((cat) => {
                  const hasChildren = categories.some((c) => c.parentId === cat.id);
                  return (
                    <div
                      key={cat.id}
                      className="flex items-center justify-between px-3 py-2 hover:bg-neutral-50 text-[12.5px]"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          onSelectCategory(cat.id);
                          setIsOpen(false);
                        }}
                        className="flex-1 text-left font-medium text-neutral-800 hover:text-neutral-950"
                      >
                        {cat.name}
                        {cat.description && (
                          <span className="block text-[10.5px] font-normal text-neutral-500">
                            {cat.description}
                          </span>
                        )}
                      </button>

                      {hasChildren ? (
                        <button
                          type="button"
                          onClick={() => setActiveParentId(cat.id)}
                          className="rounded px-2 py-1 text-[11px] text-neutral-500 hover:bg-neutral-200/60 hover:text-neutral-800 flex items-center gap-1"
                        >
                          <span>Explore</span>
                          <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3">
                            <path d="m6 4 4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                          </svg>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            onSelectCategory(cat.id);
                            setIsOpen(false);
                          }}
                          className="text-[11px] text-neutral-400 hover:text-neutral-700"
                        >
                          Select
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer with Custom Category Creation and Toggle */}
            <div className="border-t border-neutral-100 bg-neutral-50/70 p-2 flex items-center justify-between text-[11px]">
              <label className="flex items-center gap-1.5 text-neutral-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={autoSuggestEnabled}
                  onChange={(e) => setAutoSuggestEnabled(e.target.checked)}
                  className="rounded border-neutral-300 text-neutral-800 focus:ring-0"
                />
                Auto-suggestions
              </label>

              <button
                type="button"
                onClick={() => setIsCreatingCustom(true)}
                className="font-medium text-neutral-800 hover:underline flex items-center gap-1"
              >
                <span>+ Custom Category</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Custom Category Creation Modal */}
      {isCreatingCustom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl border border-neutral-200 bg-white p-5 shadow-2xl">
            <h3 className="text-[14px] font-semibold text-neutral-900 mb-3">
              Create Custom Category
            </h3>
            {customError && (
              <p className="mb-3 rounded bg-red-50 p-2 text-[11.5px] text-red-600 border border-red-200">
                {customError}
              </p>
            )}
            <form onSubmit={handleCreateCustomCategory} className="space-y-3">
              <div>
                <label className="block text-[11.5px] font-medium text-neutral-700 mb-1">
                  Category Name
                </label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="e.g. Laptop Cooling Pads"
                  className="w-full rounded-md border border-neutral-200 p-2 text-[12.5px] outline-none focus:border-neutral-400"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-[11.5px] font-medium text-neutral-700 mb-1">
                  Parent Category (Optional)
                </label>
                <select
                  value={customParentId}
                  onChange={(e) =>
                    setCustomParentId(e.target.value === "" ? "" : Number(e.target.value))
                  }
                  className="w-full rounded-md border border-neutral-200 p-2 text-[12.5px] outline-none focus:border-neutral-400"
                >
                  <option value="">None (Top-Level Category)</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setIsCreatingCustom(false)}
                  className="rounded-md border border-neutral-200 px-3 py-1.5 text-[12px] font-medium text-neutral-600 hover:bg-neutral-50"
                  disabled={customSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={customSubmitting}
                  className="rounded-md bg-neutral-900 px-3.5 py-1.5 text-[12px] font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
                >
                  {customSubmitting ? "Creating..." : "Save Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
