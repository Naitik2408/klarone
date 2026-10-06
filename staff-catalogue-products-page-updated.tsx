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
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f6f6f3] text-neutral-950">

      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              Products
            </h2>

            <p className="mt-1 text-sm text-neutral-500">
              Create, review, and publish the
              Klarone catalogue.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreate}
            className="rounded-xl bg-neutral-950 px-5 py-3 text-sm font-medium text-white hover:bg-neutral-800"
          >
            Create product
          </button>
        </div>

        <div className="mb-6 rounded-2xl border border-black/10 bg-white p-4">
          <div className="flex flex-col gap-3 lg:flex-row">
            <input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              onKeyDown={(event) => {
                if (
                  event.key === "Enter" &&
                  token
                ) {
                  void loadProducts(
                    token,
                    search,
                    status,
                  );
                }
              }}
              placeholder="Search product, SKU, model, brand..."
              className="flex-1 rounded-xl border border-black/10 bg-neutral-50 px-4 py-3 text-sm outline-none focus:border-black/30"
            />

            <select
              value={status}
              onChange={(event) => {
                const nextStatus =
                  event.target.value;

                setStatus(nextStatus);

                if (token) {
                  void loadProducts(
                    token,
                    search,
                    nextStatus,
                  );
                }
              }}
              className="rounded-xl border border-black/10 bg-white px-4 py-3 text-sm outline-none"
            >
              <option value="ALL">
                All statuses
              </option>

              <option value="DRAFT">
                Draft
              </option>

              <option value="PUBLISHED">
                Published
              </option>
            </select>

            <button
              type="button"
              onClick={() =>
                token
                  ? void loadProducts(
                    token,
                    search,
                    status,
                  )
                  : undefined
              }
              className="rounded-xl border border-black/10 px-5 py-3 text-sm font-medium hover:bg-neutral-50"
            >
              Search
            </button>
          </div>
        </div>

        {error ? (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="overflow-hidden rounded-2xl border border-black/10 bg-white">
          <div className="hidden grid-cols-[2.1fr_1fr_1fr_.8fr_.9fr_1.1fr_1fr] gap-4 border-b border-black/10 bg-neutral-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-neutral-400 lg:grid">
            <div>Product</div>
            <div>Brand</div>
            <div>Category</div>
            <div>Variants</div>
            <div>Inventory</div>
            <div>Price</div>
            <div>Status</div>
          </div>

          {loading ? (
            <div className="px-5 py-16 text-center text-sm text-neutral-500">
              Loading catalogue...
            </div>
          ) : products.length === 0 ? (
            <div className="px-5 py-16 text-center text-sm text-neutral-500">
              No products found.
            </div>
          ) : (
            products.map((product) => (
              <div
                key={product.id}
                className="grid gap-4 border-b border-black/5 px-5 py-4 last:border-b-0 lg:grid-cols-[2.1fr_1fr_1fr_.8fr_.9fr_1.1fr_1fr] lg:items-center"
              >
                <div className="min-w-0">
                  <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-neutral-400 lg:hidden">
                    Product
                  </span>
                  <Link
                    href={`/staff/catalogue/products/${product.id}`}
                    className="font-medium text-neutral-950 hover:underline"
                  >
                    {product.name}
                  </Link>
                  <div className="mt-1 text-xs text-neutral-500">
                    {product.modelNumber || "No model number"}
                  </div>
                  <div className="mt-1 truncate text-xs text-neutral-400">
                    {product.slug}
                  </div>
                  <Link
                    href={`/staff/catalogue/products/${product.id}`}
                    className="mt-2 inline-flex rounded-lg border border-black/10 px-2.5 py-1.5 text-xs font-medium hover:bg-neutral-50"
                  >
                    Edit product
                  </Link>
                </div>

                <div className="min-w-0">
                  <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-neutral-400 lg:hidden">
                    Brand
                  </span>
                  <div className="text-sm text-neutral-700">
                    {product.brand?.name || "—"}
                  </div>
                </div>

                <div className="min-w-0">
                  <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-neutral-400 lg:hidden">
                    Category
                  </span>
                  <div className="text-sm text-neutral-700">
                    {product.category?.name || "—"}
                  </div>
                </div>

                <div>
                  <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-neutral-400 lg:hidden">
                    Variants
                  </span>
                  <div className="text-sm font-medium tabular-nums text-neutral-800">
                    {product.variantCount}
                  </div>
                  <div className="mt-1 text-xs text-neutral-400">
                    {product.activeVariantCount} active
                  </div>
                </div>

                <div>
                  <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-neutral-400 lg:hidden">
                    Inventory
                  </span>
                  <div className="text-sm font-medium tabular-nums text-neutral-800">
                    {product.quantityAvailable}
                  </div>
                  <div className="mt-1 text-xs text-neutral-400">
                    {product.quantityReserved} reserved
                  </div>
                </div>

                <div>
                  <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-neutral-400 lg:hidden">
                    Price
                  </span>
                  <div className="text-sm font-medium tabular-nums text-neutral-900">
                    {money(product.lowestSellingPrice)}
                  </div>
                  <div className="mt-1 text-xs text-neutral-400">
                    Lowest selling price
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 lg:items-start">
                  <span className="mb-1 block w-full text-[10px] font-semibold uppercase tracking-wide text-neutral-400 lg:hidden">
                    Status
                  </span>
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                      product.status === "PUBLISHED"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {product.status}
                  </span>
                  {product.status !== "PUBLISHED" ? (
                    <button
                      type="button"
                      onClick={() => void publishProduct(product.id)}
                      disabled={saving}
                      className="rounded-lg border border-black/10 px-2.5 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
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

      {createOpen ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 p-4">
          <form
            onSubmit={submitCreate}
            className="mx-auto my-8 w-full max-w-6xl space-y-5 rounded-3xl bg-[#f6f6f3] p-5 shadow-2xl"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between rounded-2xl border border-black/10 bg-white px-5 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400">
                  Catalogue
                </p>

                <h3 className="mt-1 text-xl font-semibold">
                  Create laptop product
                </h3>
              </div>

              <button
                type="button"
                onClick={() =>
                  setCreateOpen(false)
                }
                className="rounded-lg border border-black/10 px-3 py-2 text-sm hover:bg-neutral-50"
              >
                Close
              </button>
            </div>

            <Section title="Product">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-neutral-700">
                    Brand *
                  </span>

                  <select
                    value={form.brandId}
                    onChange={(event) =>
                      updateField(
                        "brandId",
                        event.target.value,
                      )
                    }
                    required
                    className="w-full rounded-xl border border-black/10 bg-neutral-50 px-4 py-3 text-sm"
                  >
                    <option value="">
                      Select brand
                    </option>

                    {brands.map((brand) => (
                      <option
                        key={brand.id}
                        value={brand.id}
                      >
                        {brand.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-neutral-700">
                    Category *
                  </span>

                  <select
                    value={form.categoryId}
                    onChange={(event) =>
                      updateField(
                        "categoryId",
                        event.target.value,
                      )
                    }
                    required
                    className="w-full rounded-xl border border-black/10 bg-neutral-50 px-4 py-3 text-sm"
                  >
                    <option value="">
                      Select category
                    </option>

                    {categories.map(
                      (category) => (
                        <option
                          key={category.id}
                          value={category.id}
                        >
                          {category.name}
                        </option>
                      ),
                    )}
                  </select>
                </label>

                <Field
                  label="Product name"
                  value={form.name}
                  onChange={(value) =>
                    updateField(
                      "name",
                      value,
                    )
                  }
                  required
                />

                <Field
                  label="Model number"
                  value={form.modelNumber}
                  onChange={(value) =>
                    updateField(
                      "modelNumber",
                      value,
                    )
                  }
                />

                <Field
                  label="Manufacturer part number"
                  value={
                    form.manufacturerPartNumber
                  }
                  onChange={(value) =>
                    updateField(
                      "manufacturerPartNumber",
                      value,
                    )
                  }
                />

                <Field
                  label="Short description"
                  value={
                    form.shortDescription
                  }
                  onChange={(value) =>
                    updateField(
                      "shortDescription",
                      value,
                    )
                  }
                />

                <div className="md:col-span-2">
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-neutral-700">
                      Description
                    </span>

                    <textarea
                      value={form.description}
                      onChange={(event) =>
                        updateField(
                          "description",
                          event.target.value,
                        )
                      }
                      rows={4}
                      className="w-full rounded-xl border border-black/10 bg-neutral-50 px-4 py-3 text-sm"
                    />
                  </label>
                </div>
              </div>
            </Section>

            <Section title="Variant and pricing">
              <div className="grid gap-4 md:grid-cols-3">
                <Field
                  label="SKU"
                  value={form.sku}
                  onChange={(value) =>
                    updateField(
                      "sku",
                      value,
                    )
                  }
                  required
                />

                <Field
                  label="Variant name"
                  value={form.variantName}
                  onChange={(value) =>
                    updateField(
                      "variantName",
                      value,
                    )
                  }
                />

                <Field
                  label="Color"
                  value={form.color}
                  onChange={(value) =>
                    updateField(
                      "color",
                      value,
                    )
                  }
                />

                <Field
                  label="RAM (GB)"
                  type="number"
                  value={form.ramGb}
                  onChange={(value) =>
                    updateField(
                      "ramGb",
                      value,
                    )
                  }
                />

                <Field
                  label="Storage (GB)"
                  type="number"
                  value={form.storageGb}
                  onChange={(value) =>
                    updateField(
                      "storageGb",
                      value,
                    )
                  }
                />

                <Field
                  label="Operating system"
                  value={form.operatingSystem}
                  onChange={(value) =>
                    updateField(
                      "operatingSystem",
                      value,
                    )
                  }
                />

                <Field
                  label="Base price"
                  type="number"
                  value={form.basePrice}
                  onChange={(value) =>
                    updateField(
                      "basePrice",
                      value,
                    )
                  }
                  required
                />

                <Field
                  label="Selling price"
                  type="number"
                  value={form.sellingPrice}
                  onChange={(value) =>
                    updateField(
                      "sellingPrice",
                      value,
                    )
                  }
                  required
                />

                <Field
                  label="Compare-at price"
                  type="number"
                  value={form.compareAtPrice}
                  onChange={(value) =>
                    updateField(
                      "compareAtPrice",
                      value,
                    )
                  }
                />

                <Field
                  label="Warranty (months)"
                  type="number"
                  value={form.warrantyMonths}
                  onChange={(value) =>
                    updateField(
                      "warrantyMonths",
                      value,
                    )
                  }
                />
              </div>
            </Section>

            <Section title="Processor and graphics">
              <div className="grid gap-4 md:grid-cols-3">
                <Field
                  label="CPU brand"
                  value={form.cpuBrand}
                  onChange={(value) =>
                    updateField(
                      "cpuBrand",
                      value,
                    )
                  }
                />

                <Field
                  label="CPU model"
                  value={form.cpuModel}
                  onChange={(value) =>
                    updateField(
                      "cpuModel",
                      value,
                    )
                  }
                />

                <Field
                  label="CPU generation"
                  value={form.cpuGeneration}
                  onChange={(value) =>
                    updateField(
                      "cpuGeneration",
                      value,
                    )
                  }
                />

                <Field
                  label="CPU cores"
                  type="number"
                  value={form.cpuCores}
                  onChange={(value) =>
                    updateField(
                      "cpuCores",
                      value,
                    )
                  }
                />

                <Field
                  label="CPU threads"
                  type="number"
                  value={form.cpuThreads}
                  onChange={(value) =>
                    updateField(
                      "cpuThreads",
                      value,
                    )
                  }
                />

                <Field
                  label="GPU brand"
                  value={form.gpuBrand}
                  onChange={(value) =>
                    updateField(
                      "gpuBrand",
                      value,
                    )
                  }
                />

                <Field
                  label="GPU model"
                  value={form.gpuModel}
                  onChange={(value) =>
                    updateField(
                      "gpuModel",
                      value,
                    )
                  }
                />

                <Field
                  label="GPU VRAM (GB)"
                  type="number"
                  value={form.gpuVramGb}
                  onChange={(value) =>
                    updateField(
                      "gpuVramGb",
                      value,
                    )
                  }
                />
              </div>
            </Section>

            <Section title="Memory and storage">
              <div className="grid gap-4 md:grid-cols-4">
                <Field
                  label="RAM type"
                  value={form.ramType}
                  onChange={(value) =>
                    updateField(
                      "ramType",
                      value,
                    )
                  }
                />

                <Field
                  label="RAM speed (MHz)"
                  type="number"
                  value={form.ramSpeedMhz}
                  onChange={(value) =>
                    updateField(
                      "ramSpeedMhz",
                      value,
                    )
                  }
                />

                <Field
                  label="Max RAM (GB)"
                  type="number"
                  value={form.maxRamGb}
                  onChange={(value) =>
                    updateField(
                      "maxRamGb",
                      value,
                    )
                  }
                />

                <Field
                  label="RAM slots"
                  type="number"
                  value={form.ramSlots}
                  onChange={(value) =>
                    updateField(
                      "ramSlots",
                      value,
                    )
                  }
                />

                <Field
                  label="Storage type"
                  value={form.storageType}
                  onChange={(value) =>
                    updateField(
                      "storageType",
                      value,
                    )
                  }
                />

                <Field
                  label="Storage interface"
                  value={
                    form.storageInterface
                  }
                  onChange={(value) =>
                    updateField(
                      "storageInterface",
                      value,
                    )
                  }
                />

                <Field
                  label="Storage slots"
                  type="number"
                  value={form.storageSlots}
                  onChange={(value) =>
                    updateField(
                      "storageSlots",
                      value,
                    )
                  }
                />

                <Field
                  label="Max storage (GB)"
                  type="number"
                  value={form.maxStorageGb}
                  onChange={(value) =>
                    updateField(
                      "maxStorageGb",
                      value,
                    )
                  }
                />
              </div>
            </Section>

            <Section title="Display and battery">
              <div className="grid gap-4 md:grid-cols-3">
                <Field
                  label="Display size (inches)"
                  type="number"
                  value={
                    form.displaySizeInches
                  }
                  onChange={(value) =>
                    updateField(
                      "displaySizeInches",
                      value,
                    )
                  }
                />

                <Field
                  label="Display resolution"
                  value={
                    form.displayResolution
                  }
                  onChange={(value) =>
                    updateField(
                      "displayResolution",
                      value,
                    )
                  }
                />

                <Field
                  label="Panel type"
                  value={
                    form.displayPanelType
                  }
                  onChange={(value) =>
                    updateField(
                      "displayPanelType",
                      value,
                    )
                  }
                />

                <Field
                  label="Refresh rate (Hz)"
                  type="number"
                  value={
                    form.displayRefreshRateHz
                  }
                  onChange={(value) =>
                    updateField(
                      "displayRefreshRateHz",
                      value,
                    )
                  }
                />

                <Field
                  label="Brightness (nits)"
                  type="number"
                  value={
                    form.displayBrightnessNits
                  }
                  onChange={(value) =>
                    updateField(
                      "displayBrightnessNits",
                      value,
                    )
                  }
                />

                <Field
                  label="Color gamut"
                  value={
                    form.displayColorGamut
                  }
                  onChange={(value) =>
                    updateField(
                      "displayColorGamut",
                      value,
                    )
                  }
                />

                <Field
                  label="Battery capacity (Wh)"
                  type="number"
                  value={
                    form.batteryCapacityWh
                  }
                  onChange={(value) =>
                    updateField(
                      "batteryCapacityWh",
                      value,
                    )
                  }
                />

                <Field
                  label="Weight (kg)"
                  type="number"
                  value={form.weightKg}
                  onChange={(value) =>
                    updateField(
                      "weightKg",
                      value,
                    )
                  }
                />
              </div>
            </Section>

            <Section title="Connectivity and input">
              <div className="grid gap-4 md:grid-cols-3">
                <Field
                  label="Webcam"
                  value={
                    form.webcamResolution
                  }
                  onChange={(value) =>
                    updateField(
                      "webcamResolution",
                      value,
                    )
                  }
                />

                <Field
                  label="Wi-Fi"
                  value={form.wifiVersion}
                  onChange={(value) =>
                    updateField(
                      "wifiVersion",
                      value,
                    )
                  }
                />

                <Field
                  label="Bluetooth"
                  value={
                    form.bluetoothVersion
                  }
                  onChange={(value) =>
                    updateField(
                      "bluetoothVersion",
                      value,
                    )
                  }
                />

                <Field
                  label="Keyboard type"
                  value={form.keyboardType}
                  onChange={(value) =>
                    updateField(
                      "keyboardType",
                      value,
                    )
                  }
                />

                <label className="flex items-center gap-3 rounded-xl border border-black/10 bg-neutral-50 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={
                      form.keyboardBacklight
                    }
                    onChange={(event) =>
                      updateField(
                        "keyboardBacklight",
                        event.target.checked,
                      )
                    }
                  />
                  <span className="text-sm">
                    Keyboard backlight
                  </span>
                </label>

                <label className="flex items-center gap-3 rounded-xl border border-black/10 bg-neutral-50 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={
                      form.fingerprintSensor
                    }
                    onChange={(event) =>
                      updateField(
                        "fingerprintSensor",
                        event.target.checked,
                      )
                    }
                  />
                  <span className="text-sm">
                    Fingerprint sensor
                  </span>
                </label>
              </div>
            </Section>

            <div className="sticky bottom-0 flex items-center justify-between rounded-2xl border border-black/10 bg-white px-5 py-4 shadow-lg">
              <p className="text-sm text-neutral-500">
                New products start as drafts.
              </p>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setCreateOpen(false)
                  }
                  className="rounded-xl border border-black/10 px-5 py-3 text-sm font-medium hover:bg-neutral-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-neutral-950 px-5 py-3 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
                >
                  {saving
                    ? "Creating..."
                    : "Create draft"}
                </button>
              </div>
            </div>
          </form>
        </div>
      ) : null}
    </main>
  );
}