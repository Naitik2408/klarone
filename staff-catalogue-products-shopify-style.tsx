"use client";

import Link from "next/link";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import {
  clearStaffAccessToken,
  getStaffAccessToken,
} from "../../../../lib/staff-auth-api";

import {
  createStaffProduct,
  getCatalogueBrands,
  getCatalogueCategories,
  getStaffProducts,
  publishStaffProduct,
  StaffCatalogueApiError,
} from "../../../../lib/staff-catalogue-api";

import type {
  CreateStaffProductInput,
  StaffCatalogueBrand,
  StaffCatalogueCategory,
  StaffCatalogueProduct,
} from "../../../../types/staff-catalogue";

function money(value: string | null) {
  if (value === null) {
    return "—";
  }

  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return value;
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function storageLabel(value: number | null) {
  if (value === null) {
    return "—";
  }

  if (value >= 1024) {
    return `${value / 1024}TB`;
  }

  return `${value}GB`;
}

function optionalNumber(value: string) {
  if (!value.trim()) {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : null;
}

type FormState = {
  brandId: string;
  categoryId: string;
  name: string;
  modelNumber: string;
  manufacturerPartNumber: string;
  shortDescription: string;
  description: string;

  sku: string;
  variantName: string;
  color: string;
  ramGb: string;
  storageGb: string;
  operatingSystem: string;

  basePrice: string;
  sellingPrice: string;
  compareAtPrice: string;
  warrantyMonths: string;

  cpuBrand: string;
  cpuModel: string;
  cpuGeneration: string;
  cpuCores: string;
  cpuThreads: string;

  gpuBrand: string;
  gpuModel: string;
  gpuVramGb: string;

  ramType: string;
  ramSpeedMhz: string;
  maxRamGb: string;
  ramSlots: string;

  storageType: string;
  storageInterface: string;
  storageSlots: string;
  maxStorageGb: string;

  displaySizeInches: string;
  displayResolution: string;
  displayPanelType: string;
  displayRefreshRateHz: string;
  displayBrightnessNits: string;
  displayColorGamut: string;

  batteryCapacityWh: string;
  weightKg: string;
  webcamResolution: string;
  wifiVersion: string;
  bluetoothVersion: string;
  keyboardType: string;

  keyboardBacklight: boolean;
  fingerprintSensor: boolean;
};

function emptyForm(): FormState {
  return {
    brandId: "",
    categoryId: "",
    name: "",
    modelNumber: "",
    manufacturerPartNumber: "",
    shortDescription: "",
    description: "",

    sku: "",
    variantName: "",
    color: "",
    ramGb: "16",
    storageGb: "512",
    operatingSystem: "Windows 11",

    basePrice: "",
    sellingPrice: "",
    compareAtPrice: "",
    warrantyMonths: "12",

    cpuBrand: "",
    cpuModel: "",
    cpuGeneration: "",
    cpuCores: "",
    cpuThreads: "",

    gpuBrand: "",
    gpuModel: "",
    gpuVramGb: "",

    ramType: "DDR5",
    ramSpeedMhz: "",
    maxRamGb: "",
    ramSlots: "",

    storageType: "SSD",
    storageInterface: "NVMe",
    storageSlots: "",
    maxStorageGb: "",

    displaySizeInches: "",
    displayResolution: "",
    displayPanelType: "IPS",
    displayRefreshRateHz: "60",
    displayBrightnessNits: "",
    displayColorGamut: "",

    batteryCapacityWh: "",
    weightKg: "",
    webcamResolution: "",
    wifiVersion: "",
    bluetoothVersion: "",
    keyboardType: "",

    keyboardBacklight: false,
    fingerprintSensor: false,
  };
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-neutral-700">
        {label}
        {required ? (
          <span className="ml-1 text-red-500">
            *
          </span>
        ) : null}
      </span>

      <input
        type={type}
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        required={required}
        className="w-full rounded-xl border border-black/10 bg-neutral-50 px-4 py-3 text-sm outline-none focus:border-black/30"
      />
    </label>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-black/10 bg-white p-5">
      <h3 className="mb-5 text-sm font-semibold uppercase tracking-[0.12em] text-neutral-500">
        {title}
      </h3>

      {children}
    </section>
  );
}

export default function StaffCatalogueProductsPage() {
  const router = useRouter();

  const [token, setToken] = useState<string | null>(
    null,
  );

  const [products, setProducts] = useState<
    StaffCatalogueProduct[]
  >([]);

  const [brands, setBrands] = useState<
    StaffCatalogueBrand[]
  >([]);

  const [categories, setCategories] = useState<
    StaffCatalogueCategory[]
  >([]);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<FormState>(
    emptyForm(),
  );

  function updateField<K extends keyof FormState>(
    key: K,
    value: FormState[K],
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function loadProducts(
    activeToken: string,
    nextSearch = search,
    nextStatus = status,
  ) {
    setSelectedProductIds([]);
    try {
      setLoading(true);
      setError("");

      const result = await getStaffProducts(
        activeToken,
        {
          search: nextSearch,
          status: nextStatus,
        },
      );

      setProducts(result.items);
    } catch (error) {
      if (
        error instanceof StaffCatalogueApiError &&
        error.status === 401
      ) {
        clearStaffAccessToken();
        router.replace("/staff/login");
        return;
      }

      setError(
        error instanceof Error
          ? error.message
          : "Unable to load catalogue.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const activeToken =
      getStaffAccessToken();

    if (!activeToken) {
      router.replace("/staff/login");
      return;
    }

    const staffToken = activeToken;
    setToken(staffToken);

    async function load() {
      try {
        setError("");

        const [brandResult, categoryResult] =
          await Promise.all([
            getCatalogueBrands(),
            getCatalogueCategories(),
          ]);

        setBrands(brandResult);
        setCategories(categoryResult);

        await loadProducts(
          staffToken,
          "",
          "ALL",
        );
      } catch (error) {
        if (
          error instanceof StaffCatalogueApiError &&
          error.status === 401
        ) {
          clearStaffAccessToken();
          router.replace("/staff/login");
          return;
        }

        setError(
          error instanceof Error
            ? error.message
            : "Unable to load staff catalogue.",
        );

        setLoading(false);
      }
    }

    void load();
  }, [router]);

  function logout() {
    clearStaffAccessToken();
    router.replace("/staff/login");
  }

  function openCreate() {
    setForm(emptyForm());
    setError("");
    setCreateOpen(true);
  }

  async function submitCreate(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!token) {
      return;
    }

    setSaving(true);
    setError("");

    const payload: CreateStaffProductInput = {
      brandId: Number(form.brandId),
      categoryId: Number(form.categoryId),
      name: form.name.trim(),
      modelNumber:
        form.modelNumber.trim() || null,
      manufacturerPartNumber:
        form.manufacturerPartNumber.trim() ||
        null,
      shortDescription:
        form.shortDescription.trim() || null,
      description:
        form.description.trim() || null,
      productType: "LAPTOP",

      variant: {
        sku: form.sku.trim(),
        variantName:
          form.variantName.trim() || null,
        color:
          form.color.trim() || null,
        ramGb: optionalNumber(form.ramGb),
        storageGb: optionalNumber(
          form.storageGb,
        ),
        operatingSystem:
          form.operatingSystem.trim() || null,

        basePrice: Number(form.basePrice),
        sellingPrice: Number(
          form.sellingPrice,
        ),
        compareAtPrice:
          form.compareAtPrice.trim()
            ? Number(form.compareAtPrice)
            : null,

        currency: "INR",
        warrantyMonths:
          optionalNumber(
            form.warrantyMonths,
          ),

        specification: {
          cpuBrand:
            form.cpuBrand || null,
          cpuModel:
            form.cpuModel || null,
          cpuGeneration:
            form.cpuGeneration || null,
          cpuCores:
            optionalNumber(form.cpuCores),
          cpuThreads:
            optionalNumber(form.cpuThreads),

          gpuBrand:
            form.gpuBrand || null,
          gpuModel:
            form.gpuModel || null,
          gpuVramGb:
            optionalNumber(form.gpuVramGb),

          ramType:
            form.ramType || null,
          ramSpeedMhz:
            optionalNumber(form.ramSpeedMhz),
          maxRamGb:
            optionalNumber(form.maxRamGb),
          ramSlots:
            optionalNumber(form.ramSlots),

          storageType:
            form.storageType || null,
          storageInterface:
            form.storageInterface || null,
          storageSlots:
            optionalNumber(
              form.storageSlots,
            ),
          maxStorageGb:
            optionalNumber(
              form.maxStorageGb,
            ),

          displaySizeInches:
            optionalNumber(
              form.displaySizeInches,
            ),
          displayResolution:
            form.displayResolution || null,
          displayPanelType:
            form.displayPanelType || null,
          displayRefreshRateHz:
            optionalNumber(
              form.displayRefreshRateHz,
            ),
          displayBrightnessNits:
            optionalNumber(
              form.displayBrightnessNits,
            ),
          displayColorGamut:
            form.displayColorGamut || null,

          batteryCapacityWh:
            optionalNumber(
              form.batteryCapacityWh,
            ),
          weightKg:
            optionalNumber(form.weightKg),

          webcamResolution:
            form.webcamResolution || null,
          wifiVersion:
            form.wifiVersion || null,
          bluetoothVersion:
            form.bluetoothVersion || null,
          keyboardType:
            form.keyboardType || null,

          keyboardBacklight:
            form.keyboardBacklight,
          fingerprintSensor:
            form.fingerprintSensor,
        },
      },
    };

    try {
      await createStaffProduct(
        token,
        payload,
      );

      setCreateOpen(false);
      setForm(emptyForm());

      await loadProducts(
        token,
        search,
        status,
      );
    } catch (error) {
      if (
        error instanceof StaffCatalogueApiError &&
        error.status === 401
      ) {
        clearStaffAccessToken();
        router.replace("/staff/login");
        return;
      }

      setError(
        error instanceof Error
          ? error.message
          : "Unable to create product.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function publishProduct(
    productId: string,
  ) {
    if (!token) {
      return;
    }

    setSaving(true);
    setError("");

    try {
      await publishStaffProduct(
        token,
        productId,
      );

      await loadProducts(
        token,
        search,
        status,
      );
    } catch (error) {
      if (
        error instanceof StaffCatalogueApiError &&
        error.status === 401
      ) {
        clearStaffAccessToken();
        router.replace("/staff/login");
        return;
      }

      setError(
        error instanceof Error
          ? error.message
          : "Unable to publish product.",
      );
    } finally {
      setSaving(      {/* Shopify-inspired products workspace */}
      <div className="border-b border-black/[0.08] bg-white px-5 py-4 sm:px-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-100 text-neutral-700">
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
                <path d="M5 7.5h14M5 12h14M5 16.5h14" strokeLinecap="round" />
                <rect x="3" y="3.5" width="18" height="17" rx="3" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-neutral-900">Products</h1>
              <p className="mt-0.5 text-xs text-neutral-500">Manage your catalogue and product availability</p>
            </div>
          </div>
          <button
            type="button"
            id="add-product-btn"
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-lg bg-[#1a1a1a] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:ring-offset-2"
          >
            <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
              <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            Add product
          </button>
        </div>
      </div>

      <div className="px-4 py-5 sm:px-7">
        {error ? (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
            <svg viewBox="0 0 20 20" fill="currentColor" className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true">
              <path fillRule="evenodd" d="M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16ZM9 5.75a1 1 0 0 1 2 0v4.5a1 1 0 0 1-2 0v-4.5Zm1 8.5a1.125 1.125 0 1 0 0-2.25 1.125 1.125 0 0 0 0 2.25Z" clipRule="evenodd" />
            </svg>
            <span>{error}</span>
          </div>
        ) : null}

        <div className="overflow-hidden rounded-xl border border-black/[0.09] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          {/* Search and filters */}
          <div className="flex flex-col gap-3 border-b border-black/[0.07] p-3 sm:flex-row sm:items-center">
            <label className="relative min-w-0 flex-1">
              <span className="sr-only">Search products</span>
              <svg viewBox="0 0 20 20" fill="none" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" aria-hidden="true">
                <circle cx="8.8" cy="8.8" r="5.8" stroke="currentColor" strokeWidth="1.6" />
                <path d="m13.2 13.2 4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && token) void loadProducts(token, search, status);
                }}
                placeholder="Search products by name, brand, model..."
                className="w-full rounded-lg border border-black/[0.12] bg-white py-2.5 pl-9 pr-3 text-sm text-neutral-800 outline-none transition placeholder:text-neutral-400 hover:border-black/20 focus:border-neutral-500 focus:ring-2 focus:ring-neutral-200"
              />
            </label>
            <div className="flex items-center gap-2">
              <label className="sr-only" htmlFor="product-status-filter">Filter by status</label>
              <select
                id="product-status-filter"
                value={status}
                onChange={(event) => {
                  const nextStatus = event.target.value;
                  setStatus(nextStatus);
                  if (token) void loadProducts(token, search, nextStatus);
                }}
                className="min-w-[130px] rounded-lg border border-black/[0.12] bg-white px-3 py-2.5 text-sm text-neutral-700 outline-none hover:border-black/20 focus:border-neutral-500 focus:ring-2 focus:ring-neutral-200"
              >
                <option value="ALL">All products</option>
                <option value="PUBLISHED">Active</option>
                <option value="DRAFT">Draft</option>
              </select>
              <button
                type="button"
                onClick={() => {
                  if (token) void loadProducts(token, search, status);
                }}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-lg border border-black/[0.12] px-3 py-2.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:cursor-wait disabled:opacity-50"
              >
                <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
                  <path d="M3 5h14M5.5 10h9M8 15h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>

          {/* Product table */}
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-neutral-800">All products</span>
              <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium tabular-nums text-neutral-600">{products.length}</span>
            </div>
            {selectedProductIds.length > 0 ? (
              <span className="text-xs font-medium text-neutral-600">{selectedProductIds.length} selected</span>
            ) : (
              <span className="text-xs text-neutral-500">Select a product to perform an action</span>
            )}
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[1050px]">
              <div className="grid grid-cols-[42px_minmax(260px,2.5fr)_minmax(110px,0.9fr)_minmax(130px,1fr)_minmax(130px,1fr)_minmax(100px,0.8fr)_minmax(120px,0.9fr)_minmax(120px,0.9fr)] items-center gap-3 border-y border-black/[0.07] bg-neutral-50/80 px-4 py-3 text-xs font-medium text-neutral-600">
                <div className="flex justify-center">
                  <input
                    type="checkbox"
                    aria-label="Select all products"
                    checked={products.length > 0 && selectedProductIds.length === products.length}
                    ref={(element) => {
                      if (element) element.indeterminate = selectedProductIds.length > 0 && selectedProductIds.length < products.length;
                    }}
                    onChange={(event) => setSelectedProductIds(event.target.checked ? products.map((product) => product.id) : [])}
                    className="h-4 w-4 rounded border-neutral-300 accent-neutral-800"
                  />
                </div>
                <div>Product</div>
                <div>Status</div>
                <div>Inventory</div>
                <div>Category</div>
                <div>Variants</div>
                <div>Price from</div>
                <div>Brand</div>
              </div>

              {loading ? (
                <div className="flex items-center justify-center gap-2 py-16 text-sm text-neutral-500">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-800" />
                  Loading products...
                </div>
              ) : products.length === 0 ? (
                <div className="px-5 py-16 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-100 text-neutral-500">
                    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                      <path d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5v-9Z" strokeLinejoin="round" />
                      <path d="m4.5 7.8 7.5 4.4 7.5-4.4M12 12.2V21" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <p className="text-sm font-semibold text-neutral-800">No products found</p>
                  <p className="mx-auto mt-1 max-w-sm text-sm text-neutral-500">
                    {search || status !== "ALL" ? "Try changing your search or status filter." : "Add your first product to start building your catalogue."}
                  </p>
                  {!search && status === "ALL" ? (
                    <button type="button" onClick={openCreate} className="mt-4 rounded-lg bg-[#1a1a1a] px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700">Add product</button>
                  ) : null}
                </div>
              ) : (
                products.map((product) => (
                  <div
                    key={product.id}
                    role="link"
                    tabIndex={0}
                    aria-label={`Open ${product.name} product editor`}
                    onClick={() => router.push(`/staff/catalogue/products/${product.id}`)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        router.push(`/staff/catalogue/products/${product.id}`);
                      }
                    }}
                    className="grid cursor-pointer grid-cols-[42px_minmax(260px,2.5fr)_minmax(110px,0.9fr)_minmax(130px,1fr)_minmax(130px,1fr)_minmax(100px,0.8fr)_minmax(120px,0.9fr)_minmax(120px,0.9fr)] items-center gap-3 border-b border-black/[0.06] px-4 py-3 transition-colors last:border-b-0 hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-neutral-400"
                  >
                    <div className="flex justify-center" onClick={(event) => event.stopPropagation()}>
                      <input
                        type="checkbox"
                        aria-label={`Select ${product.name}`}
                        checked={selectedProductIds.includes(product.id)}
                        onChange={(event) => setSelectedProductIds((current) => event.target.checked ? [...current, product.id] : current.filter((id) => id !== product.id))}
                        className="h-4 w-4 rounded border-neutral-300 accent-neutral-800"
                      />
                    </div>
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-black/[0.08] bg-neutral-100 text-xs font-semibold text-neutral-500">
                        {product.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <Link
                          href={`/staff/catalogue/products/${product.id}`}
                          onClick={(event) => event.stopPropagation()}
                          className="block truncate text-sm font-medium text-neutral-900 hover:underline"
                        >
                          {product.name}
                        </Link>
                        <p className="mt-0.5 truncate text-xs text-neutral-500">
                          {product.modelNumber || product.manufacturerPartNumber || `ID: ${product.id}`}
                        </p>
                      </div>
                    </div>
                    <div>
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${product.status === "PUBLISHED" ? "bg-[#e3f5ef] text-[#087653]" : "bg-neutral-100 text-neutral-600"}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${product.status === "PUBLISHED" ? "bg-[#008060]" : "bg-neutral-400"}`} />
                        {product.status === "PUBLISHED" ? "Active" : product.status === "DRAFT" ? "Draft" : product.status}
                      </span>
                    </div>
                    <div>
                      <p className={`text-sm ${product.quantityAvailable > 0 ? "text-neutral-800" : "text-red-600"}`}>
                        {product.quantityAvailable > 0 ? `${product.quantityAvailable} in stock` : "Out of stock"}
                      </p>
                      {product.quantityReserved > 0 ? <p className="mt-0.5 text-xs text-neutral-500">{product.quantityReserved} reserved</p> : null}
                    </div>
                    <div className="truncate text-sm text-neutral-700">{product.category?.name ?? "—"}</div>
                    <div>
                      <p className="text-sm text-neutral-800">{product.variantCount}</p>
                      {product.activeVariantCount !== product.variantCount ? <p className="mt-0.5 text-xs text-neutral-500">{product.activeVariantCount} active</p> : null}
                    </div>
                    <div className="text-sm font-medium tabular-nums text-neutral-800">{money(product.lowestSellingPrice)}</div>
                    <div className="flex min-w-0 items-center justify-between gap-2">
                      <span className="truncate text-sm text-neutral-700">{product.brand?.name ?? "—"}</span>
                      {product.status !== "PUBLISHED" ? (
                        <button
                          type="button"
                          disabled={saving}
                          onClick={(event) => {
                            event.stopPropagation();
                            void publishProduct(product.id);
                          }}
                          className="shrink-0 rounded-md border border-black/[0.12] bg-white px-2 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-100 disabled:opacity-50"
                        >
                          Publish
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-black/[0.07] bg-white px-4 py-3 text-xs text-neutral-500">
            <span>Showing {products.length} {products.length === 1 ? "product" : "products"}</span>
            <span>Click a product to view or edit its details</span>
          </div>
        </div>
      </div>

              </div>
            ))
          )}
        </div>
      </div>

      {/* Create product modal */}
      {createOpen ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 p-4">
          <form
            onSubmit={submitCreate}
            className="mx-auto my-8 w-full max-w-5xl space-y-5 rounded-2xl bg-[#f1f1f1] p-5 shadow-2xl"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between rounded-xl border border-black/10 bg-white px-5 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400">Products</p>
                <h3 className="mt-0.5 text-[18px] font-semibold">Add product</h3>
              </div>
              <button type="button" onClick={() => setCreateOpen(false)} className="rounded-lg border border-black/10 px-3 py-2 text-sm hover:bg-neutral-50">
                Discard
              </button>
            </div>

            <Section title="Product details">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-neutral-700">Brand *</span>
                  <select value={form.brandId} onChange={(e) => updateField("brandId", e.target.value)} required className="w-full rounded-xl border border-black/10 bg-neutral-50 px-4 py-3 text-sm">
                    <option value="">Select brand</option>
                    {brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-neutral-700">Category *</span>
                  <select value={form.categoryId} onChange={(e) => updateField("categoryId", e.target.value)} required className="w-full rounded-xl border border-black/10 bg-neutral-50 px-4 py-3 text-sm">
                    <option value="">Select category</option>
                    {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                  </select>
                </label>
                <Field label="Product name" value={form.name} onChange={(v) => updateField("name", v)} required />
                <Field label="Model number" value={form.modelNumber} onChange={(v) => updateField("modelNumber", v)} />
                <Field label="Manufacturer part number" value={form.manufacturerPartNumber} onChange={(v) => updateField("manufacturerPartNumber", v)} />
                <Field label="Short description" value={form.shortDescription} onChange={(v) => updateField("shortDescription", v)} />
                <div className="md:col-span-2">
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-neutral-700">Description</span>
                    <textarea value={form.description} onChange={(e) => updateField("description", e.target.value)} rows={4} className="w-full rounded-xl border border-black/10 bg-neutral-50 px-4 py-3 text-sm" />
                  </label>
                </div>
              </div>
            </Section>

            <Section title="Pricing">
              <div className="grid gap-4 md:grid-cols-3">
                <Field label="Selling price" type="number" value={form.sellingPrice} onChange={(v) => updateField("sellingPrice", v)} required />
                <Field label="Compare-at price" type="number" value={form.compareAtPrice} onChange={(v) => updateField("compareAtPrice", v)} />
                <Field label="Base price (cost)" type="number" value={form.basePrice} onChange={(v) => updateField("basePrice", v)} required />
              </div>
            </Section>

            <Section title="Variant">
              <div className="grid gap-4 md:grid-cols-3">
                <Field label="SKU" value={form.sku} onChange={(v) => updateField("sku", v)} required />
                <Field label="Variant name" value={form.variantName} onChange={(v) => updateField("variantName", v)} />
                <Field label="Color" value={form.color} onChange={(v) => updateField("color", v)} />
                <Field label="RAM (GB)" type="number" value={form.ramGb} onChange={(v) => updateField("ramGb", v)} />
                <Field label="Storage (GB)" type="number" value={form.storageGb} onChange={(v) => updateField("storageGb", v)} />
                <Field label="Operating system" value={form.operatingSystem} onChange={(v) => updateField("operatingSystem", v)} />
                <Field label="Warranty (months)" type="number" value={form.warrantyMonths} onChange={(v) => updateField("warrantyMonths", v)} />
              </div>
            </Section>

            <Section title="Processor and graphics">
              <div className="grid gap-4 md:grid-cols-3">
                <Field label="CPU brand" value={form.cpuBrand} onChange={(v) => updateField("cpuBrand", v)} />
                <Field label="CPU model" value={form.cpuModel} onChange={(v) => updateField("cpuModel", v)} />
                <Field label="CPU generation" value={form.cpuGeneration} onChange={(v) => updateField("cpuGeneration", v)} />
                <Field label="CPU cores" type="number" value={form.cpuCores} onChange={(v) => updateField("cpuCores", v)} />
                <Field label="CPU threads" type="number" value={form.cpuThreads} onChange={(v) => updateField("cpuThreads", v)} />
                <Field label="GPU brand" value={form.gpuBrand} onChange={(v) => updateField("gpuBrand", v)} />
                <Field label="GPU model" value={form.gpuModel} onChange={(v) => updateField("gpuModel", v)} />
                <Field label="GPU VRAM (GB)" type="number" value={form.gpuVramGb} onChange={(v) => updateField("gpuVramGb", v)} />
              </div>
            </Section>

            <Section title="Memory and storage">
              <div className="grid gap-4 md:grid-cols-4">
                <Field label="RAM type" value={form.ramType} onChange={(v) => updateField("ramType", v)} />
                <Field label="RAM speed (MHz)" type="number" value={form.ramSpeedMhz} onChange={(v) => updateField("ramSpeedMhz", v)} />
                <Field label="Max RAM (GB)" type="number" value={form.maxRamGb} onChange={(v) => updateField("maxRamGb", v)} />
                <Field label="RAM slots" type="number" value={form.ramSlots} onChange={(v) => updateField("ramSlots", v)} />
                <Field label="Storage type" value={form.storageType} onChange={(v) => updateField("storageType", v)} />
                <Field label="Storage interface" value={form.storageInterface} onChange={(v) => updateField("storageInterface", v)} />
                <Field label="Storage slots" type="number" value={form.storageSlots} onChange={(v) => updateField("storageSlots", v)} />
                <Field label="Max storage (GB)" type="number" value={form.maxStorageGb} onChange={(v) => updateField("maxStorageGb", v)} />
              </div>
            </Section>

            <Section title="Display and battery">
              <div className="grid gap-4 md:grid-cols-3">
                <Field label="Display size (inches)" type="number" value={form.displaySizeInches} onChange={(v) => updateField("displaySizeInches", v)} />
                <Field label="Display resolution" value={form.displayResolution} onChange={(v) => updateField("displayResolution", v)} />
                <Field label="Panel type" value={form.displayPanelType} onChange={(v) => updateField("displayPanelType", v)} />
                <Field label="Refresh rate (Hz)" type="number" value={form.displayRefreshRateHz} onChange={(v) => updateField("displayRefreshRateHz", v)} />
                <Field label="Brightness (nits)" type="number" value={form.displayBrightnessNits} onChange={(v) => updateField("displayBrightnessNits", v)} />
                <Field label="Color gamut" value={form.displayColorGamut} onChange={(v) => updateField("displayColorGamut", v)} />
                <Field label="Battery capacity (Wh)" type="number" value={form.batteryCapacityWh} onChange={(v) => updateField("batteryCapacityWh", v)} />
                <Field label="Weight (kg)" type="number" value={form.weightKg} onChange={(v) => updateField("weightKg", v)} />
              </div>
            </Section>

            <Section title="Connectivity and input">
              <div className="grid gap-4 md:grid-cols-3">
                <Field label="Webcam" value={form.webcamResolution} onChange={(v) => updateField("webcamResolution", v)} />
                <Field label="Wi-Fi" value={form.wifiVersion} onChange={(v) => updateField("wifiVersion", v)} />
                <Field label="Bluetooth" value={form.bluetoothVersion} onChange={(v) => updateField("bluetoothVersion", v)} />
                <Field label="Keyboard type" value={form.keyboardType} onChange={(v) => updateField("keyboardType", v)} />
                <label className="flex items-center gap-3 rounded-xl border border-black/10 bg-neutral-50 px-4 py-3">
                  <input type="checkbox" checked={form.keyboardBacklight} onChange={(e) => updateField("keyboardBacklight", e.target.checked)} />
                  <span className="text-sm">Keyboard backlight</span>
                </label>
                <label className="flex items-center gap-3 rounded-xl border border-black/10 bg-neutral-50 px-4 py-3">
                  <input type="checkbox" checked={form.fingerprintSensor} onChange={(e) => updateField("fingerprintSensor", e.target.checked)} />
                  <span className="text-sm">Fingerprint sensor</span>
                </label>
              </div>
            </Section>

            <div className="sticky bottom-0 flex items-center justify-between rounded-xl border border-black/10 bg-white px-5 py-4 shadow-lg">
              <p className="text-sm text-neutral-500">New products start as drafts.</p>
              <div className="flex gap-3">
                <button type="button" onClick={() => setCreateOpen(false)} className="rounded-lg border border-black/10 px-4 py-2.5 text-sm font-medium hover:bg-neutral-50">
                  Discard
                </button>
                <button type="submit" disabled={saving} className="rounded-lg bg-[#1a1a1a] px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50">
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
