"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  clearStaffAccessToken,
  getStaffAccessToken,
} from "../../../../../../../lib/staff-auth-api";
import {
  getStaffProduct,
  StaffCatalogueApiError,
  updateStaffProduct,
} from "../../../../../../../lib/staff-catalogue-api";
import type {
  StaffFeature,
  StaffPort,
  StaffProductDetail,
  StaffVariant,
  StaffVariantSpecification,
} from "../../../../../../../types/staff-catalogue";
import VariantImagePickerModal from "@/components/staff/variants/variant-image-picker-modal";
import VariantInventoryEditor from "@/components/staff/variants/variant-inventory-editor";
import VariantDetailsSections from "@/components/staff/variants/variant-details-sections";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const inputClass =
  "w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-[13px] text-neutral-900 outline-none transition placeholder:text-neutral-400 hover:border-neutral-300 focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200";

export function getVariantDisplayName(
  v:
    | {
        sku?: string | null;
        variantName?: string | null;
        optionValues?: Array<{
          value?: string;
          productOptionValue?: { value?: string } | null;
        }>;
      }
    | null
    | undefined,
): string {
  if (!v) return "";
  if (v.optionValues && v.optionValues.length > 0) {
    const vals = v.optionValues
      .map((ov) => ov.value || ov.productOptionValue?.value || "")
      .filter(Boolean);
    if (vals.length > 0) {
      return vals.join(" / ");
    }
  }
  return v.variantName || v.sku || "Variant";
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function VariantDetailPage() {
  const params = useParams<{ id: string; variantId: string }>();
  const router = useRouter();
  const productId = String(params.id);
  const variantId = String(params.variantId);

  const [token, setToken] = useState<string | null>(null);
  const [product, setProduct] = useState<StaffProductDetail | null>(null);
  const [variant, setVariant] = useState<StaffVariant | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [imageModalOpen, setImageModalOpen] = useState(false);

  // Draft state
  const [sellingPrice, setSellingPrice] = useState("");
  const [compareAtPrice, setCompareAtPrice] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [sku, setSku] = useState("");
  const [barcode, setBarcode] = useState("");
  const [specification, setSpecification] =
    useState<StaffVariantSpecification | null>(null);
  const [ports, setPorts] = useState<StaffPort[]>([]);
  const [features, setFeatures] = useState<StaffFeature[]>([]);
  const [tags, setTags] = useState<string[]>([]);

  /* ------------------ Load ------------------ */

  useEffect(() => {
    const activeToken = getStaffAccessToken();
    if (!activeToken) {
      router.replace("/staff/login");
      return;
    }
    setToken(activeToken);
    void load(activeToken);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, variantId, router]);

  async function load(activeToken: string) {
    setLoading(true);
    setError("");
    try {
      const result = await getStaffProduct(activeToken, productId);
      setProduct(result);

      const found = (result.variants ?? []).find(
        (v) => String(v.id) === variantId,
      );
      if (!found) {
        setError("Variant not found on this product.");
        setVariant(null);
        return;
      }

      setVariant(found);
      setSellingPrice(String(found.sellingPrice ?? ""));
      setCompareAtPrice(
        found.compareAtPrice == null ? "" : String(found.compareAtPrice),
      );
      setCostPrice(String(found.basePrice ?? ""));
      setSku(found.sku ?? "");
      setSpecification(found.specification ?? {});
      setPorts(found.ports ?? []);
      setFeatures(found.features ?? []);
      setTags((found.tags ?? []).map((t) => t.tag.name));
    } catch (caught) {
      if (
        caught instanceof StaffCatalogueApiError &&
        caught.status === 401
      ) {
        clearStaffAccessToken();
        router.replace("/staff/login");
        return;
      }
      setError(
        caught instanceof Error ? caught.message : "Unable to load variant.",
      );
    } finally {
      setLoading(false);
    }
  }

  /* ------------------ Dirty check ------------------ */

  const isDirty = useMemo(() => {
    if (!variant) return false;
    const origTags = (variant.tags ?? [])
      .map((t) => t.tag.name)
      .sort()
      .join("|");
    const draftTags = [...tags].sort().join("|");
    return (
      sku !== (variant.sku ?? "") ||
      costPrice !== String(variant.basePrice ?? "") ||
      sellingPrice !== String(variant.sellingPrice ?? "") ||
      compareAtPrice !==
        (variant.compareAtPrice == null
          ? ""
          : String(variant.compareAtPrice)) ||
      JSON.stringify(specification ?? {}) !==
        JSON.stringify(variant.specification ?? {}) ||
      JSON.stringify(ports) !== JSON.stringify(variant.ports ?? []) ||
      JSON.stringify(features) !== JSON.stringify(variant.features ?? []) ||
      origTags !== draftTags
    );
  }, [
    variant,
    sku,
    costPrice,
    sellingPrice,
    compareAtPrice,
    specification,
    ports,
    features,
    tags,
  ]);

  function discard() {
    if (!variant) return;
    setSku(variant.sku ?? "");
    setCostPrice(String(variant.basePrice ?? ""));
    setSellingPrice(String(variant.sellingPrice ?? ""));
    setCompareAtPrice(
      variant.compareAtPrice == null
        ? ""
        : String(variant.compareAtPrice),
    );
    setSpecification(variant.specification ?? {});
    setPorts(variant.ports ?? []);
    setFeatures(variant.features ?? []);
    setTags((variant.tags ?? []).map((t) => t.tag.name));
  }

  /* ------------------ Save ------------------ */

  async function save() {
    if (!token || !product || !variant) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await updateStaffProduct(token, productId, {
        variantId: variant.id,
        variant: {
          sku,
          sellingPrice: Number(sellingPrice),
          basePrice: costPrice.trim() === "" ? 0 : Number(costPrice),
          compareAtPrice:
            compareAtPrice.trim() === "" ? null : Number(compareAtPrice),
          specification: specification ?? {},
          ports: ports.map((p) => ({
            portType: p.portType,
            quantity: p.quantity,
            version: p.version ?? null,
            supportsCharging: p.supportsCharging ?? false,
            supportsDisplay: p.supportsDisplay ?? false,
          })),
          features: features.map((f) => ({
            featureType: f.featureType,
            featureName: f.featureName,
            description: f.description ?? null,
            score:
              f.score == null || f.score === ""
                ? null
                : Number(f.score),
          })),
          tags,
        },
      });

      await load(token);
      setSuccess("Variant saved.");
      window.setTimeout(() => setSuccess(""), 2500);
    } catch (caught) {
      if (
        caught instanceof StaffCatalogueApiError &&
        caught.status === 401
      ) {
        clearStaffAccessToken();
        router.replace("/staff/login");
        return;
      }
      setError(caught instanceof Error ? caught.message : "Unable to save.");
    } finally {
      setSaving(false);
    }
  }

  /* ------------------ Derived ------------------ */

  const variantsList = useMemo(() => {
    if (!product) return [];
    let list = product.variants ?? [];
    // If the product has options defined and there are variants linked to those options,
    // filter out orphaned legacy "Default" variants (which have no option values).
    const hasLinkedVariants = list.some(
      (v) => ((v as any).optionValues ?? []).length > 0,
    );
    if (hasLinkedVariants) {
      list = list.filter((v) => ((v as any).optionValues ?? []).length > 0);
    }
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (v) =>
        v.sku.toLowerCase().includes(q) ||
        (v.variantName ?? "").toLowerCase().includes(q) ||
        getVariantDisplayName(v).toLowerCase().includes(q),
    );
  }, [product, search]);

  const currentImageUrl = useMemo(() => {
    const first = ((variant as any)?.media ?? [])[0];
    if (!first) return null;
    if (first.url) return first.url;
    if (first.storageKey) {
      return `https://res.cloudinary.com/klarone/image/upload/${first.storageKey}`;
    }
    return null;
  }, [variant]);

  const inventoryRows = useMemo(() => {
    const inv = ((variant as any)?.inventories ?? []) as Array<{
      id: string;
      quantityAvailable: number;
      quantityReserved: number;
      warehouse: { id: number; name: string; code: string } | null;
    }>;
    return inv
      .filter((row) => row.warehouse !== null)
      .map((row) => ({
        warehouseId: row.warehouse!.id,
        warehouseName: row.warehouse!.name,
        warehouseCode: row.warehouse!.code,
        quantityAvailable: row.quantityAvailable,
        quantityReserved: row.quantityReserved,
      }));
  }, [variant]);

  const totalAvailable = inventoryRows.reduce(
    (sum, r) => sum + r.quantityAvailable,
    0,
  );

  /* ------------------ Render ------------------ */

  if (loading) {
    return (
      <div className="px-6 py-6">
        <div className="rounded-xl border border-neutral-200 bg-white px-4 py-8 text-[13px] text-neutral-500">
          Loading variant…
        </div>
      </div>
    );
  }

  if (!product || !variant) {
    return (
      <div className="px-6 py-6">
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-[13px] text-red-700">
          {error || "Variant not found."}
        </div>
      </div>
    );
  }

  return (
    <div className="text-[13px] text-neutral-800">
      {/* Header / breadcrumb */}
      <div className="border-b border-neutral-200 bg-white px-6 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <Link
              href={`/staff/catalogue/products/${productId}`}
              aria-label="Back to product"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-neutral-200 text-neutral-600 hover:bg-neutral-50"
            >
              <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
                <path
                  d="m10 4-4 4 4 4"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
            <nav className="flex min-w-0 items-center gap-1.5 text-[13px]">
              <span className="text-neutral-500">Products</span>
              <span className="text-neutral-300">/</span>
              <Link
                href={`/staff/catalogue/products/${productId}`}
                className="truncate text-neutral-500 hover:text-neutral-800"
              >
                {product.name}
              </Link>
              <span className="text-neutral-300">/</span>
              <span className="truncate font-medium text-neutral-800">
                {variant.sku}
              </span>
            </nav>
          </div>

          <div className="flex items-center gap-2">
            {isDirty ? (
              <div className="flex items-center gap-2 rounded-full bg-neutral-900 px-1 py-1 pl-3 text-[12px] text-white">
                <span className="pr-1">Unsaved changes</span>
                <button
                  type="button"
                  onClick={discard}
                  disabled={saving}
                  className="rounded-full bg-white/10 px-2.5 py-1 text-[12px] font-medium hover:bg-white/20 disabled:opacity-50"
                >
                  Discard
                </button>
                <button
                  type="button"
                  onClick={() => void save()}
                  disabled={saving}
                  className="rounded-full bg-white px-2.5 py-1 text-[12px] font-medium text-neutral-900 hover:bg-neutral-100 disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => void save()}
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 px-3.5 py-1.5 text-[13px] font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="px-6 py-5">
        {error ? (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-[13px] text-red-700">
            {error}
          </div>
        ) : null}
        {success ? (
          <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-[13px] text-emerald-700">
            {success}
          </div>
        ) : null}

        <h1 className="mb-5 text-[20px] font-semibold text-neutral-900">
          {getVariantDisplayName(variant)}
        </h1>

        <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          {/* LEFT RAIL */}
          <aside className="space-y-4">
            <div className="rounded-xl border border-neutral-200 bg-white p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md border border-neutral-200 bg-neutral-50">
                  {currentImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={currentImageUrl}
                      alt={product.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-[11px] font-medium text-neutral-500">
                      {(product.brand?.name ?? product.name)
                        .charAt(0)
                        .toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-[13px] font-medium text-neutral-800">
                      {product.name}
                    </span>
                    <span
                      className={`rounded-md px-1.5 py-0.5 text-[10.5px] font-medium ${
                        product.status === "PUBLISHED"
                          ? "bg-[#a6e8b1] text-[#0b5c2a]"
                          : "bg-[#ffe9a8] text-[#6b4d00]"
                      }`}
                    >
                      {product.status === "PUBLISHED" ? "Active" : "Draft"}
                    </span>
                  </div>
                  <div className="text-[11.5px] text-neutral-500">
                    {(() => {
                      const hasLinkedVariants = (product.variants ?? []).some(
                        (v) => ((v as any).optionValues ?? []).length > 0,
                      );
                      const count = hasLinkedVariants
                        ? (product.variants ?? []).filter(
                            (v) => ((v as any).optionValues ?? []).length > 0,
                          ).length
                        : (product.variants ?? []).length;
                      return `${count} variant${count === 1 ? "" : "s"}`;
                    })()}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 focus-within:border-neutral-400 focus-within:ring-2 focus-within:ring-neutral-200">
              <svg
                viewBox="0 0 16 16"
                fill="none"
                className="h-3.5 w-3.5 text-neutral-400"
              >
                <circle
                  cx="7"
                  cy="7"
                  r="4.5"
                  stroke="currentColor"
                  strokeWidth="1.4"
                />
                <path
                  d="m10.5 10.5 2 2"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                />
              </svg>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search variants"
                className="w-full border-0 bg-transparent text-[12.5px] outline-none placeholder:text-neutral-400"
              />
            </div>

            <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
              <div className="divide-y divide-neutral-100">
                {variantsList.length === 0 ? (
                  <div className="px-3 py-3 text-[12.5px] text-neutral-500">
                    No matching variants.
                  </div>
                ) : (
                  variantsList.map((v) => {
                    const active = String(v.id) === variantId;
                    return (
                      <Link
                        key={v.id}
                        href={`/staff/catalogue/products/${productId}/variants/${v.id}`}
                        className={`flex items-center gap-3 px-3 py-2.5 transition ${
                          active ? "bg-neutral-100" : "hover:bg-neutral-50"
                        }`}
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[12.5px] font-medium text-neutral-800">
                            {getVariantDisplayName(v)}
                          </span>
                        </span>
                      </Link>
                    );
                  })
                )}
              </div>
            </div>
          </aside>

          {/* RIGHT PANE */}
          <section className="space-y-5">
            {/* Image & Variant Header */}
            <div className="rounded-xl border border-neutral-200 bg-white p-4">
              <div className="flex items-start gap-4">
                <button
                  type="button"
                  onClick={() => setImageModalOpen(true)}
                  className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-neutral-300 bg-neutral-50 hover:bg-neutral-100"
                >
                  {currentImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={currentImageUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <svg
                      viewBox="0 0 20 20"
                      fill="none"
                      className="h-5 w-5 text-neutral-400"
                    >
                      <path
                        d="M10 5v10M5 10h10"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                      />
                    </svg>
                  )}
                </button>

                <div className="space-y-2">
                  <div className="text-[14px] font-semibold text-neutral-900">
                    {getVariantDisplayName(variant)}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-[12.5px] text-neutral-700">
                    <span className="inline-flex items-center gap-1.5">
                      <svg
                        viewBox="0 0 16 16"
                        fill="none"
                        className="h-3.5 w-3.5 text-neutral-500"
                      >
                        <circle
                          cx="4"
                          cy="8"
                          r="1.6"
                          stroke="currentColor"
                          strokeWidth="1.3"
                        />
                        <circle
                          cx="12"
                          cy="4"
                          r="1.6"
                          stroke="currentColor"
                          strokeWidth="1.3"
                        />
                        <circle
                          cx="12"
                          cy="12"
                          r="1.6"
                          stroke="currentColor"
                          strokeWidth="1.3"
                        />
                        <path
                          d="M5.5 8 10.5 4.6M5.5 8l5 3.4"
                          stroke="currentColor"
                          strokeWidth="1.3"
                        />
                      </svg>
                      All channels
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <svg
                        viewBox="0 0 16 16"
                        fill="none"
                        className="h-3.5 w-3.5 text-neutral-500"
                      >
                        <rect
                          x="3"
                          y="3"
                          width="10"
                          height="10"
                          rx="1"
                          stroke="currentColor"
                          strokeWidth="1.3"
                        />
                      </svg>
                      None
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Option pills */}
            {(variant as any).optionValues &&
            (variant as any).optionValues.length > 0 ? (
              <div className="space-y-4 rounded-xl border border-neutral-200 bg-white p-4">
                {(variant as any).optionValues.map((link: any) => {
                  const val = link.productOptionValue?.value ?? "";
                  const metaFields = link.productOptionValue?.metaobjectEntry?.fields;
                  const hex =
                    metaFields && typeof metaFields === "object"
                      ? (metaFields.hex?.value ??
                        metaFields.color?.value ??
                        metaFields.code?.value ??
                        null)
                      : null;

                  return (
                    <div
                      key={`${link.productOptionId}-${link.productOptionValueId}`}
                      className="space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-[12.5px] font-medium text-neutral-700">
                        <span>{link.productOption?.name ?? "Option"}</span>
                      </div>
                      <div className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white px-3 py-2 text-[13px] text-neutral-800">
                        <span className="inline-flex items-center gap-2 rounded-md bg-neutral-100 px-2.5 py-1 text-[12px] font-medium text-neutral-800">
                          {hex ? (
                            <span
                              className="h-3.5 w-3.5 rounded-full border border-black/10 shadow-inner"
                              style={{ backgroundColor: hex }}
                            />
                          ) : null}
                          {val}
                        </span>
                        <svg
                          viewBox="0 0 16 16"
                          fill="none"
                          className="h-3.5 w-3.5 text-neutral-400"
                        >
                          <circle cx="8" cy="8" r="5" stroke="currentColor" strokeWidth="1.4" />
                          <circle cx="8" cy="8" r="1.5" fill="currentColor" />
                        </svg>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}

            {/* Price */}
            <div className="rounded-xl border border-neutral-200 bg-white p-4">
              <h2 className="mb-3 text-[13px] font-medium text-neutral-800">
                Price
              </h2>
              <div className="grid gap-3 md:grid-cols-3">
                <div>
                  <label className="mb-1.5 block text-[12px] font-medium text-neutral-700">
                    Selling price
                  </label>
                  <div className="flex items-center rounded-lg border border-neutral-200 bg-white focus-within:border-neutral-400 focus-within:ring-2 focus-within:ring-neutral-200">
                    <span className="pl-3 text-[13px] text-neutral-500">₹</span>
                    <input
                      type="number"
                      value={sellingPrice}
                      onChange={(e) => setSellingPrice(e.target.value)}
                      placeholder="0.00"
                      className="w-full border-0 bg-transparent px-2 py-2 text-[13px] outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-[12px] font-medium text-neutral-700">
                    Compare-at price
                  </label>
                  <div className="flex items-center rounded-lg border border-neutral-200 bg-white focus-within:border-neutral-400 focus-within:ring-2 focus-within:ring-neutral-200">
                    <span className="pl-3 text-[13px] text-neutral-500">₹</span>
                    <input
                      type="number"
                      value={compareAtPrice}
                      onChange={(e) => setCompareAtPrice(e.target.value)}
                      placeholder="—"
                      className="w-full border-0 bg-transparent px-2 py-2 text-[13px] outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-[12px] font-medium text-neutral-700">
                    Cost per item
                  </label>
                  <div className="flex items-center rounded-lg border border-neutral-200 bg-white focus-within:border-neutral-400 focus-within:ring-2 focus-within:ring-neutral-200">
                    <span className="pl-3 text-[13px] text-neutral-500">₹</span>
                    <input
                      type="number"
                      value={costPrice}
                      onChange={(e) => setCostPrice(e.target.value)}
                      placeholder="—"
                      className="w-full border-0 bg-transparent px-2 py-2 text-[13px] outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Inventory */}
            <div className="rounded-xl border border-neutral-200 bg-white p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-[13px] font-medium text-neutral-800">
                  Inventory
                </h2>
                <span className="text-[11.5px] text-neutral-500">
                  {totalAvailable} available
                </span>
              </div>
              {token ? (
                <VariantInventoryEditor
                  token={token}
                  variantId={variantId}
                  rows={inventoryRows}
                  onAdjusted={() => void load(token)}
                />
              ) : null}
            </div>

            {/* SKU + Barcode */}
            <div className="space-y-3 rounded-xl border border-neutral-200 bg-white p-4">
              <div>
                <label className="mb-1.5 block text-[12px] font-medium text-neutral-700">
                  SKU
                </label>
                <input
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[12px] font-medium text-neutral-700">
                  Barcode
                </label>
                <input
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  className={inputClass}
                  placeholder="ISBN, UPC, GTIN, etc."
                />
              </div>
            </div>

            {/* Specs / Ports / Features / Tags */}
            <VariantDetailsSections
              specification={specification}
              ports={ports}
              features={features}
              tags={tags}
              onSpecificationChange={setSpecification}
              onPortsChange={setPorts}
              onFeaturesChange={setFeatures}
              onTagsChange={setTags}
            />
          </section>
        </div>
      </div>

      {token ? (
        <VariantImagePickerModal
          open={imageModalOpen}
          token={token}
          productId={productId}
          variantId={variantId}
          currentImageUrl={currentImageUrl}
          onAttached={() => void load(token)}
          onClose={() => setImageModalOpen(false)}
        />
      ) : null}

      {/* Bottom bar */}
      <div className="sticky bottom-0 z-20 flex justify-end gap-2 border-t border-neutral-200 bg-white/95 px-6 py-3 backdrop-blur">
        <Link
          href={`/staff/catalogue/products/${productId}`}
          className="rounded-lg border border-neutral-200 bg-white px-4 py-2 text-[13px] font-medium text-neutral-700 hover:bg-neutral-50"
        >
          Cancel
        </Link>
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          className="rounded-lg bg-neutral-900 px-4 py-2 text-[13px] font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </div>
  );
}