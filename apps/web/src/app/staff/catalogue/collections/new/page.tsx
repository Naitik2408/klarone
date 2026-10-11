"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getStaffAccessToken } from "@/lib/staff-auth-api";
import {
  createStaffCollection,
  getStaffProducts,
  type StaffCatalogueProduct,
} from "@/lib/staff-catalogue-api";
import { ProductVariantPickerModal } from "@/components/staff/product-variant-picker-modal";

export interface ConditionRule {
  id: string;
  field: "Category" | "Brand" | "Price";
  operator: "is equal to" | "is less than" | "is greater than";
  value: string;
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

export default function CreateStaffCollectionPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [token, setToken] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [bannerImage, setBannerImage] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Variant selection modal
  const [allProducts, setAllProducts] = useState<StaffCatalogueProduct[]>([]);
  const [selectedVariantIds, setSelectedVariantIds] = useState<string[]>([]);
  const [isProductPickerOpen, setIsProductPickerOpen] = useState(false);

  // Dynamic conditions (Smart automated rules)
  const [conditions, setConditions] = useState<ConditionRule[]>([]);

  useEffect(() => {
    const t = getStaffAccessToken();
    if (!t) {
      router.replace("/staff/login");
      return;
    }
    setToken(t);

    void getStaffProducts(t, { search: "" })
      .then((res) => setAllProducts(res.items))
      .catch(() => {});
  }, [router]);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const src = event.target?.result as string;
      if (!src) return;

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 800;
        const scale = Math.min(1, MAX_WIDTH / img.width);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        // Compress to high quality WebP/JPEG under ~80KB
        const compressed = canvas.toDataURL("image/jpeg", 0.85);
        setBannerImage(compressed);
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  }

  function addCondition() {
    setConditions((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).slice(2, 7),
        field: "Category",
        operator: "is equal to",
        value: "Laptops",
      },
    ]);
  }

  function removeCondition(id: string) {
    setConditions((prev) => prev.filter((c) => c.id !== id));
  }

  function updateCondition(id: string, updates: Partial<ConditionRule>) {
    setConditions((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    );
  }

  async function handleSave() {
    if (!title.trim()) {
      setError("Please enter a collection title.");
      return;
    }
    if (!token) return;

    setSaving(true);
    setError("");

    try {
      await createStaffCollection(token, {
        title: title.trim(),
        description: description.trim() || undefined,
        bannerImage: bannerImage.trim() || undefined,
        rules: conditions.length > 0 ? conditions : undefined,
        variantIds: selectedVariantIds,
      });

      router.push("/staff/catalogue/collections");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create collection.");
      setSaving(false);
    }
  }

  // Gather all selected variant objects for preview
  const selectedVariantsList = allProducts.flatMap((p) => {
    const vars = p.variants || [];
    return vars
      .filter((v) => selectedVariantIds.includes(v.id))
      .map((v) => ({
        ...v,
        productName: p.name,
        brandName: p.brand?.name,
        categoryName: p.productType,
        imageUrl: p.imageUrl,
      }));
  });

  return (
    <div className="min-h-screen bg-[#f1f1f1] text-[13px] text-[#303030] pb-16">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Sticky Header */}
      <div className="border-b border-neutral-200 bg-white px-6 py-3 sticky top-0 z-40">
        <div className="mx-auto max-w-[1240px] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/staff/catalogue/collections"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 hover:bg-neutral-50 text-neutral-600 transition"
              title="Back to collections"
            >
              <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4">
                <path
                  d="m10 4-4 4 4 4"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
            <div className="flex items-center gap-2 text-[13px] text-neutral-600">
              <Link
                href="/staff/catalogue/collections"
                className="hover:underline text-neutral-500"
              >
                Collections
              </Link>
              <span className="text-neutral-400">/</span>
              <span className="font-semibold text-neutral-900 truncate">
                {title.trim() || "Add collection"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => router.push("/staff/catalogue/collections")}
              className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-[12.5px] font-medium text-neutral-700 hover:bg-neutral-50 transition"
            >
              Discard
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-neutral-900 px-4 py-1.5 text-[12.5px] font-medium text-white shadow-sm hover:bg-neutral-800 disabled:opacity-50 transition"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="mx-auto max-w-[1240px] px-6 pt-6 space-y-6">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-[13px] text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Info Card */}
          <div className="lg:col-span-8 rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row gap-5 items-start">
              {/* Image Upload Box */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-36 h-36 shrink-0 rounded-2xl border-2 border-dashed border-neutral-300 bg-neutral-50 flex flex-col items-center justify-center p-2 text-center group relative overflow-hidden cursor-pointer hover:border-neutral-400 hover:bg-neutral-100/50 transition"
                title="Click to upload banner image"
              >
                {bannerImage ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={bannerImage}
                      alt="Banner"
                      className="h-full w-full object-cover rounded-xl"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[11px] font-medium">
                      Change image
                    </div>
                  </>
                ) : (
                  <>
                    <svg
                      viewBox="0 0 20 20"
                      fill="none"
                      className="h-6 w-6 text-neutral-400 group-hover:text-neutral-600 mb-1"
                    >
                      <path
                        d="M10 14V6M6 10l4-4 4 4"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <span className="text-[11.5px] text-neutral-600 font-medium">
                      Upload image
                    </span>
                    <span className="text-[10px] text-neutral-400 mt-0.5">
                      JPG, PNG, WebP
                    </span>
                  </>
                )}
              </div>

              {/* Title & Description Fields */}
              <div className="flex-1 w-full space-y-3">
                <div>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Add title (e.g. Gaming Laptops Under ₹50,000)"
                    className="w-full text-[20px] font-medium text-neutral-900 placeholder:text-neutral-400 outline-none border-b border-transparent focus:border-neutral-300 pb-1"
                    autoFocus
                  />
                </div>

                <div>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Add description..."
                    rows={2}
                    className="w-full text-[13px] text-neutral-700 placeholder:text-neutral-400 outline-none resize-none border-b border-transparent focus:border-neutral-300 pb-1"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Products / Conditions Card */}
          <div className="lg:col-span-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5 text-[13px] font-semibold text-neutral-900">
                  <svg
                    viewBox="0 0 16 16"
                    fill="none"
                    className="h-4 w-4 text-neutral-700"
                  >
                    <path
                      d="M2.5 4.5h11M4.5 8h7M6.5 11.5h3"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                    />
                  </svg>
                  <span>Variants</span>
                </div>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  Select exact variants or configure conditions
                </p>
              </div>
              <span className="rounded bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-600">
                {selectedVariantIds.length}
              </span>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={addCondition}
                className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-[12px] font-medium text-neutral-800 hover:bg-neutral-50 transition shadow-xs"
              >
                <span>+</span> Add condition
              </button>

              <button
                type="button"
                onClick={() => setIsProductPickerOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-[12px] font-medium text-neutral-800 hover:bg-neutral-50 transition shadow-xs"
              >
                <span>+</span> Add products
              </button>
            </div>

            {/* Render Conditions */}
            {conditions.length > 0 && (
              <div className="space-y-2.5 pt-2 border-t border-neutral-100">
                <div className="text-[11.5px] font-medium text-neutral-600">
                  Automatic Inclusion Rules:
                </div>
                {conditions.map((cond) => (
                  <div
                    key={cond.id}
                    className="p-2.5 rounded-lg border border-neutral-200 bg-neutral-50/70 space-y-2 text-[12px]"
                  >
                    <div className="flex items-center justify-between">
                      <select
                        value={cond.field}
                        onChange={(e) =>
                          updateCondition(cond.id, {
                            field: e.target.value as any,
                          })
                        }
                        className="rounded border border-neutral-200 bg-white px-2 py-1 text-[11.5px] font-medium outline-none"
                      >
                        <option value="Category">Category</option>
                        <option value="Brand">Brand</option>
                        <option value="Price">Price (₹)</option>
                      </select>

                      <button
                        type="button"
                        onClick={() => removeCondition(cond.id)}
                        className="text-neutral-400 hover:text-red-600 text-[13px] px-1"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={cond.operator}
                        onChange={(e) =>
                          updateCondition(cond.id, {
                            operator: e.target.value as any,
                          })
                        }
                        className="rounded border border-neutral-200 bg-white px-2 py-1 text-[11.5px] outline-none"
                      >
                        <option value="is equal to">is equal to</option>
                        <option value="is less than">is less than</option>
                        <option value="is greater than">is greater than</option>
                      </select>

                      <input
                        type="text"
                        value={cond.value}
                        onChange={(e) =>
                          updateCondition(cond.id, { value: e.target.value })
                        }
                        className="flex-1 rounded border border-neutral-200 bg-white px-2 py-1 text-[11.5px] outline-none"
                        placeholder="Value"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Bottom Section: Collection items (Specific variants) */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[14px] font-semibold text-neutral-900 flex items-center gap-1.5">
              <span>Collection items (Variants)</span>
              <span className="rounded bg-neutral-100 px-2 py-0.5 text-[11.5px] font-medium text-neutral-600">
                {selectedVariantIds.length}
              </span>
            </h2>

            {selectedVariantIds.length > 0 && (
              <button
                type="button"
                onClick={() => setIsProductPickerOpen(true)}
                className="text-[12px] font-medium text-neutral-700 hover:underline"
              >
                + Add more variants
              </button>
            )}
          </div>

          {selectedVariantsList.length === 0 ? (
            <div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                {[1, 2, 3, 4].map((idx) => (
                  <div
                    key={idx}
                    className="aspect-square rounded-2xl bg-neutral-100/70 border border-neutral-200/50 flex items-center justify-center cursor-pointer hover:bg-neutral-100 transition"
                    onClick={() => setIsProductPickerOpen(true)}
                  >
                    <span className="text-[20px] text-neutral-300 font-light">+</span>
                  </div>
                ))}
              </div>
              <div className="text-center py-4 text-[12.5px] text-neutral-500">
                Click &ldquo;+ Add products&rdquo; to select exact variants for this collection
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 pt-2">
              {selectedVariantsList.map((v) => (
                <div
                  key={v.id}
                  className="group rounded-2xl border border-neutral-200 bg-white overflow-hidden shadow-xs relative"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedVariantIds((prev) =>
                        prev.filter((id) => id !== v.id),
                      )
                    }
                    className="absolute top-2 right-2 h-6 w-6 rounded-full bg-white/90 shadow text-neutral-500 hover:text-red-600 flex items-center justify-center text-[12px] z-10"
                    title="Remove variant from collection"
                  >
                    ✕
                  </button>

                  <div className="aspect-square w-full bg-neutral-50 overflow-hidden flex items-center justify-center p-2">
                    {v.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={v.imageUrl}
                        alt={v.productName}
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <svg
                        viewBox="0 0 20 20"
                        fill="none"
                        className="h-8 w-8 text-neutral-400"
                      >
                        <rect
                          x="3"
                          y="3"
                          width="14"
                          height="14"
                          rx="2"
                          stroke="currentColor"
                          strokeWidth="1.5"
                        />
                      </svg>
                    )}
                  </div>
                  <div className="p-3 border-t border-neutral-100">
                    <div className="font-semibold text-[12.5px] text-neutral-900 truncate">
                      {v.productName}
                    </div>
                    <div className="text-[11.5px] font-medium text-neutral-700 truncate mt-0.5">
                      {v.variantName || "Standard"}
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[11px] text-neutral-500">
                      <span className="font-mono text-[10px]">{v.sku}</span>
                      <span className="font-semibold text-neutral-900">
                        {money(v.sellingPrice)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Product Variant Picker Modal (Strict Variant Level) */}
      <ProductVariantPickerModal
        isOpen={isProductPickerOpen}
        onClose={() => setIsProductPickerOpen(false)}
        products={allProducts}
        selectedVariantIds={selectedVariantIds}
        onConfirm={(ids) => setSelectedVariantIds(ids)}
      />
    </div>
  );
}
