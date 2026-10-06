"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  clearStaffAccessToken,
  getStaffAccessToken,
} from "../../../../../lib/staff-auth-api";
import {
  activateStaffVariant,
  deactivateStaffVariant,
  deleteStaffVariant,
  getStaffProduct,
  getStaffProductOptions,
  publishStaffProduct,
  StaffCatalogueApiError,
  syncStaffVariantMatrix,
  updateStaffProduct,
} from "../../../../../lib/staff-catalogue-api";
import StaffProductMediaManager from "@/components/staff/staff-product-media-manager";
import CategoryMetafieldsPanel from "@/components/staff/metaobjects/category-metafields-panel";
import ProductOptionsEditor from "@/components/staff/variants/product-options-editor";
import VariantMatrixTable from "@/components/staff/variants/variant-matrix-table";
import type {
  StaffCatalogueBrand,
  StaffCatalogueCategory,
  StaffMatrixVariant,
  StaffProductDetail,
  StaffProductOption,
  StaffVariant,
} from "../../../../../types/staff-catalogue";
import {
  getCatalogueBrands,
  getCatalogueCategories,
} from "../../../../../lib/staff-catalogue-api";

/* --------------------------------------------------------------- */

const inputClass =
  "w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-[13px] text-neutral-900 outline-none transition placeholder:text-neutral-400 hover:border-neutral-300 focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200";

function money(value: string | number | null | undefined): string {
  const amount = Number(value);
  if (!Number.isFinite(amount)) {
    return value == null ? "—" : String(value);
  }
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

/* --------------------------------------------------------------- */

export default function StaffCatalogueProductEditor() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const productId = String(params.id);

  const [token, setToken] = useState<string | null>(null);
  const [product, setProduct] = useState<StaffProductDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [variantSavingId, setVariantSavingId] = useState<string | null>(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Product-level fields (editable)
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [modelNumber, setModelNumber] = useState("");
  const [manufacturerPartNumber, setManufacturerPartNumber] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [brandId, setBrandId] = useState<number | null>(null);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [productType, setProductType] = useState("LAPTOP");

  // Lists for the dropdowns
  const [brands, setBrands] = useState<StaffCatalogueBrand[]>([]);
  const [categories, setCategories] = useState<StaffCatalogueCategory[]>([]);

  // Primary variant price (editable)
  const [primarySellingPrice, setPrimarySellingPrice] = useState("");
  const [primaryCompareAtPrice, setPrimaryCompareAtPrice] = useState("");
  const [primaryCostPrice, setPrimaryCostPrice] = useState("");
  const [primaryChargeTax, setPrimaryChargeTax] = useState(true);

  const [variants, setVariants] = useState<StaffVariant[]>([]);

  const [productOptions, setProductOptions] = useState<StaffProductOption[]>([]);
  const [matrixVariants, setMatrixVariants] = useState<StaffMatrixVariant[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");

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
  }, [productId, router]);

  async function load(activeToken: string) {
    setLoading(true);
    setError("");
    try {
      const [result, brandList, categoryList] = await Promise.all([
        getStaffProduct(activeToken, productId),
        getCatalogueBrands(),
        getCatalogueCategories(),
      ]);

      setBrands(brandList);
      setCategories(categoryList);

      setProduct(result);
      setName(result.name ?? "");
      setDescription(result.description ?? "");
      setModelNumber(result.modelNumber ?? "");
      setManufacturerPartNumber(result.manufacturerPartNumber ?? "");
      setShortDescription(result.shortDescription ?? "");
      setBrandId(result.brandId ?? null);
      setCategoryId(result.categoryId ?? null);
      setProductType(result.productType ?? "LAPTOP");
      setVariants(result.variants ?? []);

      const firstVariant = (result.variants ?? [])[0];
      if (firstVariant) {
        setPrimarySellingPrice(String(firstVariant.sellingPrice ?? ""));
        setPrimaryCompareAtPrice(
          firstVariant.compareAtPrice == null
            ? ""
            : String(firstVariant.compareAtPrice),
        );
        setPrimaryCostPrice(String(firstVariant.basePrice ?? ""));
      }

      try {
        const opts = await getStaffProductOptions(activeToken, productId);
        setProductOptions(opts);

        const mapped: StaffMatrixVariant[] = (result.variants ?? []).map(
          (v: any) => ({
            id: v.id,
            sku: v.sku,
            variantName: v.variantName,
            sellingPrice: v.sellingPrice,
            compareAtPrice: v.compareAtPrice,
            currency: v.currency,
            status: v.status,
            imageUrl:
              v.media?.[0]?.url ??
              (v.media?.[0]?.storageKey
                ? `https://res.cloudinary.com/klarone/image/upload/${v.media[0].storageKey}`
                : null),
            quantityAvailable: 0,
            optionValues: (v.optionValues ?? []).map((link: any) => ({
              productOptionId: String(link.productOptionId),
              productOptionValueId: String(link.productOptionValueId),
              productOptionName: link.productOption?.name ?? "",
              value: link.productOptionValue?.value ?? "",
              metaobjectEntryId: link.productOptionValue?.metaobjectEntryId
                ? String(link.productOptionValue.metaobjectEntryId)
                : null,
              metaobjectEntry: link.productOptionValue?.metaobjectEntry
                ? {
                    id: String(link.productOptionValue.metaobjectEntry.id),
                    handle: link.productOptionValue.metaobjectEntry.handle,
                    displayName:
                      link.productOptionValue.metaobjectEntry.displayName,
                    fields:
                      link.productOptionValue.metaobjectEntry.fields ?? {},
                  }
                : null,
            })),
          }),
        );
        setMatrixVariants(mapped);
      } catch {
        // non-fatal
      }
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
        caught instanceof Error ? caught.message : "Unable to load product.",
      );
    } finally {
      setLoading(false);
    }
  }

  /* ------------------ Sync matrix ------------------ */

  async function syncMatrix() {
    if (!token) return;
    setSyncing(true);
    setSyncMessage("");
    setError("");
    try {
      const result = await syncStaffVariantMatrix(token, productId);
      setProductOptions(result.options);
      setMatrixVariants(result.variants);
      const parts: string[] = [];
      if (result.created) parts.push(`${result.created} created`);
      if (result.removed) parts.push(`${result.removed} removed`);
      if (result.deactivated) parts.push(`${result.deactivated} deactivated`);
      if (result.skipped) parts.push(`${result.skipped} skipped`);
      setSyncMessage(
        parts.length > 0
          ? `Matrix synced: ${parts.join(", ")}.`
          : "Matrix already up to date.",
      );
      window.setTimeout(() => setSyncMessage(""), 3000);
      await load(token);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to sync matrix.",
      );
    } finally {
      setSyncing(false);
    }
  }

  /* ------------------ Options change callback ------------------ */

  const handleOptionsChange = useCallback(
    (next: StaffProductOption[]) => {
      setProductOptions(next);
    },
    [],
  );

  /* ------------------ Save product + primary variant ------------------ */

  async function saveAll() {
    if (!token || !product) return;
    if (variants.length === 0) return;

    const primaryVariant = variants[0];

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      await updateStaffProduct(token, productId, {
        name,
        description: description.trim() === "" ? null : description.trim(),
        modelNumber: modelNumber.trim() === "" ? null : modelNumber.trim(),
        manufacturerPartNumber:
          manufacturerPartNumber.trim() === ""
            ? null
            : manufacturerPartNumber.trim(),
        shortDescription:
          shortDescription.trim() === "" ? null : shortDescription.trim(),
        brandId: brandId ?? undefined,
        categoryId: categoryId ?? undefined,
        productType,

        variantId: primaryVariant.id,
        variant: {
          sku: primaryVariant.sku.trim(),
          basePrice: Number(primaryCostPrice) || 0,
          sellingPrice: Number(primarySellingPrice) || 0,
          compareAtPrice:
            primaryCompareAtPrice.trim() === ""
              ? null
              : Number(primaryCompareAtPrice),
        },
      });

      await load(token);
      setSuccess("Product saved.");
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
      setError(
        caught instanceof Error ? caught.message : "Unable to save product.",
      );
    } finally {
      setSaving(false);
    }
  }

  /* ------------------ Publish ------------------ */

  async function publishProduct() {
    if (!token) return;
    if (variants.filter((v) => v.status === "ACTIVE").length === 0) {
      setError("Add at least one active variant before publishing.");
      return;
    }
    const confirmed = window.confirm(
      "Publish this product? It will become visible on the storefront.",
    );
    if (!confirmed) return;

    setPublishing(true);
    setError("");
    setSuccess("");
    try {
      await publishStaffProduct(token, productId);
      await load(token);
      setSuccess("Product published.");
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
      setError(
        caught instanceof Error ? caught.message : "Unable to publish.",
      );
    } finally {
      setPublishing(false);
    }
  }

  /* ------------------ Variant lifecycle ------------------ */

  async function removeMatrixVariant(variant: StaffMatrixVariant) {
    if (!token) return;
    const confirmed = window.confirm(
      `Delete variant ${variant.sku}? If referenced by orders, carts, or inventory it will be refused.`,
    );
    if (!confirmed) return;

    setError("");
    setSuccess("");
    try {
      await deleteStaffVariant(
        token,
        productId,
        variant.id,
        "Deleted from matrix",
      );
      await load(token);
      setSuccess(`Variant ${variant.sku} deleted.`);
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
        caught instanceof Error ? caught.message : "Unable to delete variant.",
      );
    }
  }

  async function toggleVariantStatus(variant: StaffVariant) {
    if (!token) return;
    const nextStatus = variant.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    const confirmed = window.confirm(
      `${nextStatus === "ACTIVE" ? "Activate" : "Deactivate"} variant ${variant.sku}?`,
    );
    if (!confirmed) return;

    setVariantSavingId(variant.id);
    setError("");
    setSuccess("");
    try {
      if (nextStatus === "ACTIVE") {
        await activateStaffVariant(token, productId, variant.id);
      } else {
        await deactivateStaffVariant(token, productId, variant.id);
      }
      await load(token);
      setSuccess(`Variant ${variant.sku} ${nextStatus.toLowerCase()}.`);
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
        caught instanceof Error ? caught.message : "Unable to update variant.",
      );
    } finally {
      setVariantSavingId(null);
    }
  }

  /* ------------------ Derived ------------------ */

  const activeVariantsCount = useMemo(
    () => variants.filter((v) => v.status === "ACTIVE").length,
    [variants],
  );

  const primaryVariant = variants[0];

  /* ------------------ Render ------------------ */

  if (loading) {
    return (
      <div className="px-6 py-6">
        <div className="rounded-xl border border-neutral-200 bg-white px-4 py-8 text-[13px] text-neutral-500">
          Loading product…
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="px-6 py-6">
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-[13px] text-red-700">
          {error || "Product not found."}
        </div>
      </div>
    );
  }

  const isPublished = product.status === "PUBLISHED";
  const canPublish =
    !isPublished && activeVariantsCount > 0 && product.status !== "ARCHIVED";

  return (
    <div className="text-[13px] text-neutral-800">
      {/* Header */}
      <div className="border-b border-neutral-200 bg-white px-6 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <Link
              href="/staff/catalogue/products"
              aria-label="Back to products"
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
              <span className="truncate font-medium text-neutral-800">
                {product.name}
              </span>
            </nav>
          </div>

          <button
            type="button"
            onClick={() => void saveAll()}
            disabled={saving || variants.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 px-3.5 py-1.5 text-[13px] font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
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

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          {/* LEFT */}
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="truncate text-[20px] font-semibold text-neutral-900">
                {product.name}
              </h1>
              <span
                className={`inline-flex items-center rounded-md px-2 py-0.5 text-[12px] font-medium ${
                  isPublished
                    ? "bg-[#a6e8b1] text-[#0b5c2a]"
                    : "bg-[#ffe9a8] text-[#6b4d00]"
                }`}
              >
                {isPublished
                  ? "Active"
                  : product.status === "DRAFT"
                    ? "Draft"
                    : product.status}
              </span>
            </div>

            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-neutral-700">
                Title
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Product name"
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-neutral-700">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={6}
                placeholder="Enter a longer description…"
                className={inputClass}
              />
            </div>

            {token ? (
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-[12px] font-medium text-neutral-700">
                    Media
                  </span>
                </div>
                <StaffProductMediaManager productId={productId} token={token} />
              </div>
            ) : null}

            {/* Price — real editor for the primary variant */}
            <div className="rounded-xl border border-neutral-200 bg-white">
              <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
                <h2 className="text-[13px] font-medium text-neutral-800">
                  Price
                </h2>
                {variants.length > 1 ? (
                  <span className="text-[11.5px] text-neutral-500">
                    Editing base variant. Others from the matrix.
                  </span>
                ) : null}
              </div>

              <div className="space-y-3 px-4 py-4">
                <div className="grid gap-3 md:grid-cols-3">
                  <div>
                    <label className="mb-1.5 block text-[12px] font-medium text-neutral-700">
                      Selling price
                    </label>
                    <div className="flex items-center rounded-lg border border-neutral-200 bg-white focus-within:border-neutral-400 focus-within:ring-2 focus-within:ring-neutral-200">
                      <span className="pl-3 text-[13px] text-neutral-500">₹</span>
                      <input
                        type="number"
                        value={primarySellingPrice}
                        onChange={(e) =>
                          setPrimarySellingPrice(e.target.value)
                        }
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
                        value={primaryCompareAtPrice}
                        onChange={(e) =>
                          setPrimaryCompareAtPrice(e.target.value)
                        }
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
                        value={primaryCostPrice}
                        onChange={(e) => setPrimaryCostPrice(e.target.value)}
                        placeholder="—"
                        className="w-full border-0 bg-transparent px-2 py-2 text-[13px] outline-none"
                      />
                    </div>
                  </div>
                </div>

                <label className="flex items-center gap-2 pt-1 text-[12px] text-neutral-700">
                  <input
                    type="checkbox"
                    checked={primaryChargeTax}
                    onChange={(e) => setPrimaryChargeTax(e.target.checked)}
                    className="h-4 w-4 rounded border-neutral-300"
                  />
                  Charge tax on this product
                </label>
              </div>
            </div>

            {/* Variants */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-[14px] font-medium text-neutral-900">
                  Variants
                </h2>
                <div className="flex items-center gap-2">
                  {syncMessage ? (
                    <span className="text-[11.5px] text-emerald-600">
                      {syncMessage}
                    </span>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => void syncMatrix()}
                    disabled={syncing || productOptions.length === 0}
                    className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-[12px] font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
                  >
                    {syncing ? "Generating…" : "Generate variants"}
                  </button>
                </div>
              </div>

              {token ? (
                <ProductOptionsEditor
                  token={token}
                  productId={productId}
                  categoryId={product.categoryId}
                  onChange={handleOptionsChange}
                />
              ) : null}

              <VariantMatrixTable
                options={productOptions}
                variants={matrixVariants}
                onOpenVariant={(id) => {
                  router.push(
                    `/staff/catalogue/products/${productId}/variants/${id}`,
                  );
                }}
                onDeleteVariant={(variant) => void removeMatrixVariant(variant)}
              />
            </div>

            {/* Category metafields */}
            {token ? (
              <CategoryMetafieldsPanel
                token={token}
                productId={productId}
                categoryLabel={product.category?.name ?? null}
                variantOptions={productOptions}
              />
            ) : null}
          </div>

          {/* RIGHT RAIL */}
          <aside className="space-y-5 lg:sticky lg:top-4 lg:self-start">
            {/* Status */}
            <div className="rounded-xl border border-neutral-200 bg-white">
              <div className="border-b border-neutral-100 px-4 py-3">
                <h2 className="text-[13px] font-medium text-neutral-800">
                  Status
                </h2>
              </div>
              <div className="space-y-3 px-4 py-4">
                <div className="flex h-9 items-center rounded-lg border border-neutral-200 bg-neutral-50 px-3 text-[13px] text-neutral-700">
                  {isPublished
                    ? "Active"
                    : product.status === "DRAFT"
                      ? "Draft"
                      : product.status}
                </div>

                {canPublish ? (
                  <button
                    type="button"
                    onClick={() => void publishProduct()}
                    disabled={publishing}
                    className="w-full rounded-lg bg-neutral-900 px-4 py-2 text-[13px] font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
                  >
                    {publishing ? "Publishing…" : "Publish product"}
                  </button>
                ) : null}

                {!isPublished && activeVariantsCount === 0 ? (
                  <p className="text-[11.5px] text-neutral-500">
                    Add at least one active variant to publish.
                  </p>
                ) : null}
              </div>
            </div>

            {/* Product organization */}
            <div className="rounded-xl border border-neutral-200 bg-white">
              <div className="border-b border-neutral-100 px-4 py-3">
                <h2 className="text-[13px] font-medium text-neutral-800">
                  Product organization
                </h2>
              </div>
              <div className="space-y-4 px-4 py-4">
                <div>
                  <label className="mb-1.5 block text-[12px] font-medium text-neutral-700">
                    Type
                  </label>
                  <select
                    value={productType}
                    onChange={(e) => setProductType(e.target.value)}
                    className={inputClass}
                  >
                    <option value="LAPTOP">Laptop</option>
                    <option value="DESKTOP">Desktop</option>
                    <option value="MONITOR">Monitor</option>
                    <option value="ACCESSORY">Accessory</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-[12px] font-medium text-neutral-700">
                    Brand
                  </label>
                  <select
                    value={brandId ?? ""}
                    onChange={(e) =>
                      setBrandId(
                        e.target.value === "" ? null : Number(e.target.value),
                      )
                    }
                    className={inputClass}
                  >
                    <option value="">Choose a brand</option>
                    {brands.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-[12px] font-medium text-neutral-700">
                    Category
                  </label>
                  <select
                    value={categoryId ?? ""}
                    onChange={(e) =>
                      setCategoryId(
                        e.target.value === "" ? null : Number(e.target.value),
                      )
                    }
                    className={inputClass}
                  >
                    <option value="">Choose a category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-[12px] font-medium text-neutral-700">
                    Model number
                  </label>
                  <input
                    value={modelNumber}
                    onChange={(e) => setModelNumber(e.target.value)}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-[12px] font-medium text-neutral-700">
                    Manufacturer part number
                  </label>
                  <input
                    value={manufacturerPartNumber}
                    onChange={(e) =>
                      setManufacturerPartNumber(e.target.value)
                    }
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-[12px] font-medium text-neutral-700">
                    Short description
                  </label>
                  <textarea
                    value={shortDescription}
                    onChange={(e) => setShortDescription(e.target.value)}
                    rows={3}
                    className={inputClass}
                  />
                </div>
              </div>
            </div>

            {/* Variants summary */}
            <div className="rounded-xl border border-neutral-200 bg-white">
              <div className="border-b border-neutral-100 px-4 py-3">
                <h2 className="text-[13px] font-medium text-neutral-800">
                  Variants summary
                </h2>
              </div>
              <div className="divide-y divide-neutral-100">
                <div className="flex items-center justify-between px-4 py-2.5 text-[12.5px]">
                  <span className="text-neutral-600">Total variants</span>
                  <span className="font-medium text-neutral-900">
                    {variants.length}
                  </span>
                </div>
                <div className="flex items-center justify-between px-4 py-2.5 text-[12.5px]">
                  <span className="text-neutral-600">Active variants</span>
                  <span className="font-medium text-neutral-900">
                    {activeVariantsCount}
                  </span>
                </div>
                <div className="flex items-center justify-between px-4 py-2.5 text-[12.5px]">
                  <span className="text-neutral-600">Lowest price</span>
                  <span className="font-medium text-neutral-900">
                    {primaryVariant ? money(primaryVariant.sellingPrice) : "—"}
                  </span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="sticky bottom-0 z-20 flex justify-end gap-2 border-t border-neutral-200 bg-white/95 px-6 py-3 backdrop-blur">
        <Link
          href="/staff/catalogue/products"
          className="rounded-lg border border-neutral-200 bg-white px-4 py-2 text-[13px] font-medium text-neutral-700 hover:bg-neutral-50"
        >
          Cancel
        </Link>
        <button
          type="button"
          onClick={() => void saveAll()}
          disabled={saving || variants.length === 0}
          className="rounded-lg bg-neutral-900 px-4 py-2 text-[13px] font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </div>
  );
}