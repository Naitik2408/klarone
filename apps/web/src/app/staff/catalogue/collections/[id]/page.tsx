"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { getStaffAccessToken } from "@/lib/staff-auth-api";
import {
  addVariantsToStaffCollection,
  deleteStaffCollection,
  getStaffCollection,
  getStaffProducts,
  removeVariantFromStaffCollection,
  updateStaffCollection,
  type StaffCatalogueProduct,
  type StaffCollectionDetail,
} from "@/lib/staff-catalogue-api";
import { ProductVariantPickerModal } from "@/components/staff/product-variant-picker-modal";

function money(amount: number | string | null | undefined) {
  const num = Number(amount);
  if (!Number.isFinite(num) || num === 0) return `—`;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(num);
}

export default function StaffCollectionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const collectionId = params?.id as string;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [token, setToken] = useState<string | null>(null);
  const [collection, setCollection] = useState<StaffCollectionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [bannerImage, setBannerImage] = useState("");

  // Product / Variant picker modal
  const [allProducts, setAllProducts] = useState<StaffCatalogueProduct[]>([]);
  const [isProductPickerOpen, setIsProductPickerOpen] = useState(false);

  useEffect(() => {
    const t = getStaffAccessToken();
    if (!t) {
      router.replace("/staff/login");
      return;
    }
    setToken(t);
    void loadData(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionId, router]);

  async function loadData(activeToken: string) {
    setLoading(true);
    setError("");
    try {
      const [colData, prodsData] = await Promise.all([
        getStaffCollection(activeToken, collectionId),
        getStaffProducts(activeToken, { search: "" }),
      ]);

      setCollection(colData);
      setTitle(colData.title);
      setDescription(colData.description ?? "");
      setBannerImage(colData.bannerImage ?? "");
      setAllProducts(prodsData.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load collection.");
    } finally {
      setLoading(false);
    }
  }

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

  async function handleSave() {
    if (!title.trim() || !token) return;
    setSaving(true);
    setError("");
    try {
      const updated = await updateStaffCollection(token, collectionId, {
        title: title.trim(),
        description: description.trim() || undefined,
        bannerImage: bannerImage.trim() || undefined,
      });
      setCollection(updated);
      alert("Collection saved successfully!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update collection.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!token) return;
    if (!confirm("Are you sure you want to delete this collection?")) return;
    try {
      await deleteStaffCollection(token, collectionId);
      router.push("/staff/catalogue/collections");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete collection.");
    }
  }

  async function handleRemoveVariant(variantId: string) {
    if (!token) return;
    try {
      const updated = await removeVariantFromStaffCollection(token, collectionId, variantId);
      setCollection(updated);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to remove variant.");
    }
  }

  async function handleConfirmAddVariants(selectedVariantIds: string[]) {
    if (!token) return;
    const existingIds = collection?.variants.map((v) => v.id) ?? [];
    const newIds = selectedVariantIds.filter((id) => !existingIds.includes(id));

    if (newIds.length === 0) return;

    try {
      const updated = await addVariantsToStaffCollection(token, collectionId, newIds);
      setCollection(updated);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to add variants.");
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f1f1f1] flex items-center justify-center p-8 text-[13px] text-neutral-500">
        Loading collection...
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="min-h-screen bg-[#f1f1f1] p-8 text-center text-neutral-600">
        <p className="mb-4">Collection not found.</p>
        <Link href="/staff/catalogue/collections" className="underline font-medium">
          ← Back to collections
        </Link>
      </div>
    );
  }

  const currentVariantIds = collection.variants.map((v) => v.id);

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

      {/* Top Header Bar */}
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
                {title || collection.title}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDelete}
              className="rounded-lg border border-red-200 bg-red-50/40 px-3 py-1.5 text-[12.5px] font-medium text-red-600 hover:bg-red-50 transition"
            >
              Delete
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
              {/* Image Box */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-36 h-36 shrink-0 rounded-2xl border border-neutral-200 bg-neutral-50 overflow-hidden flex items-center justify-center relative cursor-pointer group"
                title="Click to change collection image"
              >
                {bannerImage ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={bannerImage}
                      alt={title}
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[11px] font-medium">
                      Change image
                    </div>
                  </>
                ) : (
                  <div className="text-center p-2">
                    <svg
                      viewBox="0 0 20 20"
                      fill="none"
                      className="h-6 w-6 text-neutral-400 mx-auto mb-1"
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
                    <span className="text-[11px] text-neutral-500 font-medium block">
                      Upload image
                    </span>
                  </div>
                )}
              </div>

              {/* Title & Description Fields */}
              <div className="flex-1 w-full space-y-3">
                <div>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Collection title"
                    className="w-full text-[20px] font-medium text-neutral-900 outline-none border-b border-transparent focus:border-neutral-300 pb-1"
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

          {/* Right Organization Card */}
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
                  <span>Variants in collection</span>
                </div>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  Specific variants included
                </p>
              </div>
              <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-[11.5px] font-medium text-neutral-600">
                {collection.variants.length}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setIsProductPickerOpen(true)}
              className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-[12.5px] font-medium text-neutral-800 hover:bg-neutral-50 transition shadow-xs"
            >
              <span>+</span> Add variants
            </button>
          </div>
        </div>

        {/* Bottom Section: Collection items (Variants) */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[14px] font-semibold text-neutral-900 flex items-center gap-1.5">
              <span>Collection items (Variants)</span>
              <span className="rounded bg-neutral-100 px-2 py-0.5 text-[11.5px] font-medium text-neutral-600">
                {collection.variants.length}
              </span>
            </h2>

            <button
              type="button"
              onClick={() => setIsProductPickerOpen(true)}
              className="text-[12px] font-medium text-neutral-700 hover:underline"
            >
              + Add variants
            </button>
          </div>

          {collection.variants.length === 0 ? (
            <div className="py-12 text-center text-neutral-500">
              No variants in this collection yet. Click &ldquo;+ Add variants&rdquo; to add specific items.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 pt-2">
              {collection.variants.map((v) => (
                <div
                  key={v.id}
                  className="group rounded-2xl border border-neutral-200 bg-white overflow-hidden shadow-xs relative"
                >
                  <button
                    type="button"
                    onClick={() => handleRemoveVariant(v.id)}
                    className="absolute top-2 right-2 h-6 w-6 rounded-full bg-white/90 shadow text-neutral-400 hover:text-red-600 flex items-center justify-center text-[12px] z-10"
                    title="Remove variant"
                  >
                    ✕
                  </button>

                  <div
                    onClick={() => router.push(`/staff/catalogue/products/${v.productId}`)}
                    className="cursor-pointer"
                  >
                    <div className="aspect-square w-full bg-neutral-50 overflow-hidden flex items-center justify-center p-2">
                      {v.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={v.imageUrl}
                          alt={v.productName}
                          className="h-full w-full object-contain group-hover:scale-105 transition-transform"
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
                      <div className="font-semibold text-[12.5px] text-neutral-900 group-hover:underline line-clamp-1">
                        {v.productName}
                      </div>
                      <div className="text-[11.5px] font-medium text-neutral-700 truncate mt-0.5">
                        {v.variantName}
                      </div>
                      <div className="mt-1 flex items-center justify-between text-[11px] text-neutral-500">
                        <span className="font-mono text-[10px]">{v.sku}</span>
                        <span className="font-semibold text-neutral-900">
                          {money(v.sellingPrice)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Product Variant Picker Modal */}
      <ProductVariantPickerModal
        isOpen={isProductPickerOpen}
        onClose={() => setIsProductPickerOpen(false)}
        products={allProducts}
        selectedVariantIds={currentVariantIds}
        onConfirm={handleConfirmAddVariants}
      />
    </div>
  );
}
