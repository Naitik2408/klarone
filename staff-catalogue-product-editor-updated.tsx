"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  clearStaffAccessToken,
  getStaffAccessToken,
} from "../../../../../lib/staff-auth-api";
import StaffProductMediaManager from "@/components/staff/staff-product-media-manager";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:3000";

type Specification = {
  [key: string]: string | number | boolean | null | undefined;
};

type Variant = {
  id: string;
  sku: string;
  variantName: string | null;
  color: string | null;
  ramGb: number | null;
  storageGb: number | null;
  operatingSystem: string | null;
  basePrice: string | number;
  sellingPrice: string | number;
  compareAtPrice: string | number | null;
  currency: string;
  warrantyMonths: number | null;
  status: string;
  specification: Specification | null;
};

type Product = {
  id: string;
  name: string;
  slug: string;
  modelNumber: string | null;
  manufacturerPartNumber: string | null;
  shortDescription: string | null;
  description: string | null;
  productType: string;
  status: string;
  brand?: { id: number; name: string };
  category?: { id: number; name: string };
  variants: Variant[];
};

type Warehouse = {
  id: number;
  name: string;
  code: string;
  city: string;
  state: string;
  status: string;
};

type InventoryItem = {
  id: string;
  warehouseId: number;
  productVariantId: string;
  quantityAvailable: number;
  quantityReserved: number;
  reorderLevel: number | null;
  warehouse: Warehouse;
  productVariant: {
    id: string;
    sku: string;
    variantName: string | null;
    ramGb: number | null;
    storageGb: number | null;
    sellingPrice: string;
    status: string;
    product: {
      id: string;
      name: string;
      slug: string;
      status: string;
      brand?: { id: number; name: string; slug?: string };
    };
  };
};

type StaffApiError = Error & {
  status?: number;
};

const SPEC_FIELDS: Array<{
  key: string;
  label: string;
  type?: "text" | "number" | "boolean";
  min?: number;
  max?: number;
  step?: number;
  hint?: string;
}> = [
    { key: "cpuBrand", label: "CPU brand" },
    { key: "cpuModel", label: "CPU model" },
    { key: "cpuGeneration", label: "CPU generation" },
    { key: "cpuCores", label: "CPU cores", type: "number", min: 1, max: 128 },
    { key: "cpuThreads", label: "CPU threads", type: "number", min: 1, max: 256 },
    { key: "gpuBrand", label: "GPU brand" },
    { key: "gpuModel", label: "GPU model" },
    { key: "gpuVramGb", label: "GPU VRAM (GB)", type: "number", min: 0, max: 128 },
    { key: "ramType", label: "RAM type" },
    { key: "ramSpeedMhz", label: "RAM speed (MHz)", type: "number", min: 1, max: 10000 },
    { key: "maxRamGb", label: "Max RAM (GB)", type: "number", min: 1, max: 2048 },
    { key: "ramSlots", label: "RAM slots", type: "number", min: 1, max: 8 },
    { key: "storageType", label: "Storage type" },
    { key: "storageInterface", label: "Storage interface" },
    { key: "storageSlots", label: "Storage slots", type: "number", min: 1, max: 8 },
    { key: "maxStorageGb", label: "Max storage (GB)", type: "number", min: 1, max: 100000 },
    { key: "displaySizeInches", label: "Display size (in)", type: "number", min: 7, max: 30, step: 0.1 },
    { key: "displayResolution", label: "Display resolution" },
    { key: "displayPanelType", label: "Panel type" },
    {
      key: "displayRefreshRateHz",
      label: "Refresh rate (Hz)",
      type: "number",
      min: 24,
      max: 1000,
    },
    {
      key: "displayBrightnessNits",
      label: "Brightness (nits)",
      type: "number",
      min: 50,
      max: 5000,
    },
    { key: "displayColorGamut", label: "Color gamut" },
    { key: "batteryCapacityWh", label: "Battery (Wh)", type: "number", min: 10, max: 200, step: 0.1 },
    { key: "weightKg", label: "Weight (kg)", type: "number", min: 0.2, max: 10, step: 0.1 },
    { key: "widthMm", label: "Width (mm)", type: "number", min: 100, max: 500, step: 0.1 },
    { key: "depthMm", label: "Depth (mm)", type: "number", min: 80, max: 400, step: 0.1 },
    { key: "heightMm", label: "Height (mm)", type: "number", min: 5, max: 50, step: 0.1 },
    { key: "webcamResolution", label: "Webcam" },
    { key: "wifiVersion", label: "Wi-Fi" },
    { key: "bluetoothVersion", label: "Bluetooth" },
    { key: "keyboardType", label: "Keyboard type" },
    {
      key: "keyboardBacklight",
      label: "Keyboard backlight",
      type: "boolean",
    },
    {
      key: "fingerprintSensor",
      label: "Fingerprint sensor",
      type: "boolean",
    },
  ];

function emptyToNull(value: string) {
  return value.trim() === "" ? null : value.trim();
}

const SPEC_FIELD_RANGES: Record<string, { min: number; max: number; unit?: string }> = {
  cpuCores: { min: 1, max: 128 },
  cpuThreads: { min: 1, max: 256 },
  gpuVramGb: { min: 0, max: 128, unit: "GB" },
  ramSpeedMhz: { min: 1, max: 10000, unit: "MHz" },
  maxRamGb: { min: 1, max: 2048, unit: "GB" },
  ramSlots: { min: 1, max: 8 },
  storageSlots: { min: 1, max: 8 },
  maxStorageGb: { min: 1, max: 100000, unit: "GB" },
  displaySizeInches: { min: 7, max: 30, unit: "in" },
  displayRefreshRateHz: { min: 24, max: 1000, unit: "Hz" },
  displayBrightnessNits: { min: 50, max: 5000, unit: "nits" },
  batteryCapacityWh: { min: 10, max: 200, unit: "Wh" },
  weightKg: { min: 0.2, max: 10, unit: "kg" },
  widthMm: { min: 100, max: 500, unit: "mm" },
  depthMm: { min: 80, max: 400, unit: "mm" },
  heightMm: { min: 5, max: 50, unit: "mm" },
};

function validateVariantSpecifications(variant: Variant) {
  const specification = variant.specification ?? {};

  for (const [key, range] of Object.entries(SPEC_FIELD_RANGES)) {
    const raw = specification[key];
    if (raw === null || raw === undefined || raw === "") continue;

    const value = Number(raw);
    const label = SPEC_FIELDS.find((field) => field.key === key)?.label ?? key;

    if (!Number.isFinite(value)) {
      return `${label} must be a valid number.`;
    }

    if (value < range.min || value > range.max) {
      const unit = range.unit ? ` ${range.unit}` : "";
      return `${label} must be between ${range.min} and ${range.max}${unit}.`;
    }
  }

  const ramGb = variant.ramGb == null ? null : Number(variant.ramGb);
  const maxRamGb = specification.maxRamGb == null ? null : Number(specification.maxRamGb);
  if (ramGb !== null && maxRamGb !== null && maxRamGb < ramGb) {
    return `Max RAM cannot be lower than the variant RAM (${ramGb} GB).`;
  }

  const storageGb = variant.storageGb == null ? null : Number(variant.storageGb);
  const maxStorageGb = specification.maxStorageGb == null ? null : Number(specification.maxStorageGb);
  if (storageGb !== null && maxStorageGb !== null && maxStorageGb < storageGb) {
    return `Max storage cannot be lower than the variant storage (${storageGb} GB).`;
  }

  return null;
}

function numberOrNull(value: string) {
  const trimmed = value.trim();

  if (trimmed === "") {
    return null;
  }

  const number = Number(trimmed);

  return Number.isFinite(number) ? number : null;
}

function money(value: string | number | null | undefined) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return value == null ? "â€”" : String(value);
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

async function staffFetch(
  path: string,
  token: string,
  init?: RequestInit,
) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const raw = await response.text();
  let data: unknown = null;

  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = raw;
  }

  if (!response.ok) {
    const message =
      typeof data === "object" &&
        data !== null &&
        "message" in data
        ? String((data as { message?: unknown }).message)
        : typeof data === "string"
          ? data
          : `Request failed with status ${response.status}.`;

    const error = new Error(message) as StaffApiError;
    error.status = response.status;
    throw error;
  }

  return data;
}

export default function StaffCatalogueProductEditor() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const productId = String(params.id);

  const [token, setToken] = useState<string | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [inventorySavingId, setInventorySavingId] =
    useState<string | null>(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [name, setName] = useState("");
  const [modelNumber, setModelNumber] = useState("");
  const [manufacturerPartNumber, setManufacturerPartNumber] =
    useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [description, setDescription] = useState("");

  const [variants, setVariants] = useState<Variant[]>([]);
  const [openVariantId, setOpenVariantId] =
    useState<string | null>(null);
  const [inventoryDeltas, setInventoryDeltas] = useState<
    Record<string, string>
  >({});

  const [createVariantOpen, setCreateVariantOpen] =
    useState(false);
  const [createVariantSaving, setCreateVariantSaving] =
    useState(false);
  const [createVariantError, setCreateVariantError] =
    useState("");

  const [newSku, setNewSku] = useState("");
  const [newVariantName, setNewVariantName] = useState("");
  const [newColor, setNewColor] = useState("");
  const [newRamGb, setNewRamGb] = useState("");
  const [newStorageGb, setNewStorageGb] = useState("");
  const [newOperatingSystem, setNewOperatingSystem] =
    useState("");
  const [newBasePrice, setNewBasePrice] = useState("");
  const [newSellingPrice, setNewSellingPrice] = useState("");
  const [newCompareAtPrice, setNewCompareAtPrice] =
    useState("");
  const [newWarrantyMonths, setNewWarrantyMonths] =
    useState("");

  const variantCountLabel = useMemo(() => {
    const activeCount = variants.filter(
      (variant) => variant.status === "ACTIVE",
    ).length;

    const inactiveCount = variants.filter(
      (variant) => variant.status === "INACTIVE",
    ).length;

    if (!variants.length) {
      return "No variants";
    }

    return `${activeCount} active${inactiveCount > 0 ? ` · ${inactiveCount} inactive` : ""
      }`;
  }, [variants]);

  async function loadAll(activeToken: string) {
    setLoading(true);
    setError("");

    try {
      const [productResult, inventoryResult] =
        await Promise.all([
          staffFetch(
            `/staff/catalogue/products/${productId}`,
            activeToken,
          ) as Promise<Product>,
          staffFetch(
            `/staff/inventory?pageSize=100`,
            activeToken,
          ) as Promise<{
            items: InventoryItem[];
          }>,
        ]);

      setProduct(productResult);
      setName(productResult.name ?? "");
      setModelNumber(productResult.modelNumber ?? "");
      setManufacturerPartNumber(
        productResult.manufacturerPartNumber ?? "",
      );
      setShortDescription(productResult.shortDescription ?? "");
      setDescription(productResult.description ?? "");
      setVariants(
        (productResult.variants ?? []).map((variant) => ({
          ...variant,
          specification: variant.specification ?? {},
        })),
      );

      const matchingInventory =
        inventoryResult.items.filter(
          (item) =>
            item.productVariant.product.id === productId,
        );

      setInventory(matchingInventory);

      if (productResult.variants?.length) {
        setOpenVariantId(productResult.variants[0].id);
      }
    } catch (caught) {
      if (
        caught instanceof Error &&
        "status" in caught &&
        (caught as StaffApiError).status === 401
      ) {
        clearStaffAccessToken();
        router.replace("/staff/login");
        return;
      }

      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to load product.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const activeToken = getStaffAccessToken();

    if (!activeToken) {
      router.replace("/staff/login");
      return;
    }

    setToken(activeToken);
    void loadAll(activeToken);
  }, [productId, router]);

  function updateVariant(
    variantId: string,
    patch: Partial<Variant>,
  ) {
    setVariants((current) =>
      current.map((variant) =>
        variant.id === variantId
          ? { ...variant, ...patch }
          : variant,
      ),
    );
  }

  function updateVariantSpec(
    variantId: string,
    key: string,
    value: string,
    type: "text" | "number" | "boolean" = "text",
  ) {
    setVariants((current) =>
      current.map((variant) => {
        if (variant.id !== variantId) {
          return variant;
        }

        const specification = {
          ...(variant.specification ?? {}),
          [key]:
            type === "number"
              ? numberOrNull(value)
              : type === "boolean"
                ? value === ""
                  ? null
                  : value === "true"
                : emptyToNull(value),
        };

        return {
          ...variant,
          specification,
        };
      }),
    );
  }

  function variantInputValue(
    variant: Variant,
    key: string,
  ) {
    const value = variant.specification?.[key];

    return value == null ? "" : String(value);
  }

  async function saveProduct() {
    if (!token || !product || variants.length === 0) {
      return;
    }

    const specificationErrors = variants
      .map((variant, index) => ({
        index,
        error: validateVariantSpecifications(variant),
      }))
      .filter((item) => item.error);

    if (specificationErrors.length > 0) {
      const first = specificationErrors[0];
      setError(`Variant ${first.index + 1}: ${first.error}`);
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      for (let index = 0; index < variants.length; index += 1) {
        const variant = variants[index];

        const payload = {
          ...(index === 0
            ? {
              name,
              modelNumber: emptyToNull(modelNumber),
              manufacturerPartNumber:
                emptyToNull(manufacturerPartNumber),
              shortDescription:
                emptyToNull(shortDescription),
              description: emptyToNull(description),
            }
            : {}),
          variantId: variant.id,
          variant: {
            sku: variant.sku.trim(),
            variantName: emptyToNull(
              variant.variantName ?? "",
            ),
            color: emptyToNull(variant.color ?? ""),
            ramGb: numberOrNull(
              variant.ramGb == null
                ? ""
                : String(variant.ramGb),
            ),
            storageGb: numberOrNull(
              variant.storageGb == null
                ? ""
                : String(variant.storageGb),
            ),
            operatingSystem: emptyToNull(
              variant.operatingSystem ?? "",
            ),
            basePrice: Number(variant.basePrice),
            sellingPrice: Number(variant.sellingPrice),
            compareAtPrice:
              variant.compareAtPrice == null
                ? null
                : Number(variant.compareAtPrice),
            currency: variant.currency || "INR",
            warrantyMonths:
              variant.warrantyMonths == null
                ? null
                : Number(variant.warrantyMonths),
            specification: variant.specification ?? {},
          },
        };

        if (
          !payload.variant.sku ||
          !Number.isFinite(payload.variant.basePrice) ||
          !Number.isFinite(payload.variant.sellingPrice)
        ) {
          throw new Error(
            `Variant ${index + 1
            } has an invalid SKU or price.`,
          );
        }

        await staffFetch(
          `/staff/catalogue/products/${productId}/update`,
          token,
          {
            method: "POST",
            body: JSON.stringify(payload),
          },
        );
      }

      await loadAll(token);
      setSuccess(
        `${variants.length} variant${variants.length === 1 ? "" : "s"
        } saved successfully.`,
      );
    } catch (caught) {
      if (
        caught instanceof Error &&
        "status" in caught &&
        (caught as StaffApiError).status === 401
      ) {
        clearStaffAccessToken();
        router.replace("/staff/login");
        return;
      }

      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to save product.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function adjustInventory(item: InventoryItem) {
    if (!token) {
      return;
    }

    const deltaText =
      inventoryDeltas[item.id]?.trim() ?? "";
    const delta = Number.parseInt(deltaText, 10);

    if (
      !Number.isInteger(delta) ||
      delta === 0
    ) {
      setError(
        "Enter a non-zero whole number for the inventory adjustment.",
      );
      return;
    }

    setInventorySavingId(item.id);
    setError("");
    setSuccess("");

    try {
      await staffFetch("/staff/inventory/adjust", token, {
        method: "POST",
        body: JSON.stringify({
          productVariantId: item.productVariantId,
          warehouseId: item.warehouseId,
          quantityDelta: delta,
          notes: `Adjusted from catalogue editor for ${item.productVariant.sku}.`,
        }),
      });

      setInventoryDeltas((current) => ({
        ...current,
        [item.id]: "",
      }));

      await loadAll(token);
      setSuccess(
        `Inventory adjusted for ${item.productVariant.sku}.`,
      );
    } catch (caught) {
      if (
        caught instanceof Error &&
        "status" in caught &&
        (caught as StaffApiError).status === 401
      ) {
        clearStaffAccessToken();
        router.replace("/staff/login");
        return;
      }

      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to adjust inventory.",
      );
    } finally {
      setInventorySavingId(null);
    }
  }

  async function createVariant() {
    if (!token) {
      return;
    }

    const sku = newSku.trim();
    const basePrice = Number(newBasePrice);
    const sellingPrice = Number(newSellingPrice);

    if (!sku) {
      setCreateVariantError("SKU is required.");
      return;
    }

    if (
      !Number.isFinite(basePrice) ||
      basePrice < 0 ||
      !Number.isFinite(sellingPrice) ||
      sellingPrice < 0
    ) {
      setCreateVariantError(
        "Enter valid non-negative base and selling prices.",
      );
      return;
    }

    setCreateVariantSaving(true);
    setCreateVariantError("");
    setError("");
    setSuccess("");

    try {
      await staffFetch(
        `/staff/catalogue/products/${productId}/variants`,
        token,
        {
          method: "POST",
          body: JSON.stringify({
            sku,
            variantName:
              newVariantName.trim() || null,
            color: newColor.trim() || null,
            ramGb:
              newRamGb.trim()
                ? Number(newRamGb)
                : null,
            storageGb:
              newStorageGb.trim()
                ? Number(newStorageGb)
                : null,
            operatingSystem:
              newOperatingSystem.trim() || null,
            basePrice,
            sellingPrice,
            compareAtPrice:
              newCompareAtPrice.trim()
                ? Number(newCompareAtPrice)
                : null,
            currency: "INR",
            warrantyMonths:
              newWarrantyMonths.trim()
                ? Number(newWarrantyMonths)
                : null,
          }),
        },
      );

      setCreateVariantOpen(false);
      setNewSku("");
      setNewVariantName("");
      setNewColor("");
      setNewRamGb("");
      setNewStorageGb("");
      setNewOperatingSystem("");
      setNewBasePrice("");
      setNewSellingPrice("");
      setNewCompareAtPrice("");
      setNewWarrantyMonths("");

      await loadAll(token);
      setSuccess(
        `Variant ${sku} created successfully.`,
      );
    } catch (caught) {
      if (
        caught instanceof Error &&
        "status" in caught &&
        (caught as StaffApiError).status === 401
      ) {
        clearStaffAccessToken();
        router.replace("/staff/login");
        return;
      }

      setCreateVariantError(
        caught instanceof Error
          ? caught.message
          : "Unable to create variant.",
      );
    } finally {
      setCreateVariantSaving(false);
    }
  }

  async function deactivateVariant(
    variantId: string,
    sku: string,
  ) {
    if (!token) {
      return;
    }

    const confirmed = window.confirm(
      `Deactivate variant ${sku}? It will no longer be active or sellable.`,
    );

    if (!confirmed) {
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      await staffFetch(
        `/staff/catalogue/products/${productId}/variants/${variantId}/deactivate`,
        token,
        {
          method: "POST",
        },
      );

      await loadAll(token);
      setSuccess(
        `Variant ${sku} deactivated successfully.`,
      );
    } catch (caught) {
      if (
        caught instanceof Error &&
        "status" in caught &&
        (caught as StaffApiError).status === 401
      ) {
        clearStaffAccessToken();
        router.replace("/staff/login");
        return;
      }

      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to deactivate variant.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function activateVariant(
    variantId: string,
    sku: string,
  ) {
    if (!token) {
      return;
    }

    const confirmed = window.confirm(
      `Activate variant ${sku}? It will become active and sellable again.`,
    );

    if (!confirmed) {
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      await staffFetch(
        `/staff/catalogue/products/${productId}/variants/${variantId}/activate`,
        token,
        {
          method: "POST",
        },
      );

      await loadAll(token);
      setSuccess(
        `Variant ${sku} activated successfully.`,
      );
    } catch (caught) {
      if (
        caught instanceof Error &&
        "status" in caught &&
        (caught as StaffApiError).status === 401
      ) {
        clearStaffAccessToken();
        router.replace("/staff/login");
        return;
      }

      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to activate variant.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f6f6f3] p-8">
        <div className="mx-auto max-w-7xl rounded-2xl border border-black/10 bg-white p-8">
          Loading product…
        </div>
      </main>
    );
  }

  if (!product) {
    return (
      <main className="min-h-screen bg-[#f6f6f3] p-8">
        <div className="mx-auto max-w-3xl rounded-2xl border border-red-200 bg-red-50 p-8 text-red-800">
          {error || "Product not found."}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f6f6f3] text-neutral-950">

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {error ? (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {success}
          </div>
        ) : null}

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <section className="rounded-2xl border border-black/10 bg-white p-6">
            <div className="mb-6">
              <h2 className="text-lg font-semibold">
                Product detailssss
              </h2>
              <p className="mt-1 text-sm text-neutral-500">
                Shared information used across all variants.
              </p>
            </div>

          <div className="grid gap-5 md:grid-cols-2">
            <label className="text-sm font-medium">
              Product name
              <input
                value={name}
                onChange={(event) =>
                  setName(event.target.value)
                }
                className="mt-2 w-full rounded-xl border border-black/10 px-3 py-2.5 font-normal outline-none focus:border-black"
              />
            </label>

            <label className="text-sm font-medium">
              Model number
              <input
                value={modelNumber}
                onChange={(event) =>
                  setModelNumber(event.target.value)
                }
                className="mt-2 w-full rounded-xl border border-black/10 px-3 py-2.5 font-normal outline-none focus:border-black"
              />
            </label>

            <label className="text-sm font-medium">
              Manufacturer part number
              <input
                value={manufacturerPartNumber}
                onChange={(event) =>
                  setManufacturerPartNumber(
                    event.target.value,
                  )
                }
                className="mt-2 w-full rounded-xl border border-black/10 px-3 py-2.5 font-normal outline-none focus:border-black"
              />
            </label>

            <div className="rounded-xl bg-neutral-50 p-4 text-sm">
              <div className="font-medium">
                Brand / category
              </div>
              <div className="mt-2 text-neutral-600">
                {product.brand?.name ?? "â€”"} ·{" "}
                {product.category?.name ?? "â€”"}
              </div>
            </div>

            <label className="text-sm font-medium md:col-span-2">
              Short description
              <textarea
                value={shortDescription}
                onChange={(event) =>
                  setShortDescription(
                    event.target.value,
                  )
                }
                rows={3}
                className="mt-2 w-full rounded-xl border border-black/10 px-3 py-2.5 font-normal outline-none focus:border-black"
              />
            </label>

            <label className="text-sm font-medium md:col-span-2">
              Description
              <textarea
                value={description}
                onChange={(event) =>
                  setDescription(event.target.value)
                }
                rows={6}
                className="mt-2 w-full rounded-xl border border-black/10 px-3 py-2.5 font-normal outline-none focus:border-black"
              />
            </label>
            </div>
          </section>

          <aside className="space-y-6">
            <section className="rounded-2xl border border-black/10 bg-white p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-semibold">Product status</h2>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  product.status === "ACTIVE"
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-neutral-100 text-neutral-700"
                }`}>
                  {product.status}
                </span>
              </div>
              <p className="text-sm leading-6 text-neutral-500">
                Status is managed by the catalogue workflow. This panel shows the current publishing state.
              </p>
              <div className="mt-5 space-y-4 border-t border-black/10 pt-4 text-sm">
                <div className="flex items-start justify-between gap-4">
                  <span className="text-neutral-500">Brand</span>
                  <span className="text-right font-medium">{product.brand?.name ?? "—"}</span>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <span className="text-neutral-500">Category</span>
                  <span className="text-right font-medium">{product.category?.name ?? "—"}</span>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <span className="text-neutral-500">Product type</span>
                  <span className="text-right font-medium">{product.productType || "—"}</span>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <span className="text-neutral-500">Variants</span>
                  <span className="text-right font-medium">{variants.length}</span>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <span className="text-neutral-500">Active variants</span>
                  <span className="text-right font-medium">
                    {variants.filter((variant) => variant.status === "ACTIVE").length}
                  </span>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-black/10 bg-white p-6">
              <h2 className="text-base font-semibold">Catalogue summary</h2>
              <p className="mt-2 text-sm leading-6 text-neutral-500">
                {variantCountLabel}. Product information is shared by every variant listed below.
              </p>
              <div className="mt-4 rounded-xl bg-neutral-50 p-4">
                <div className="text-xs font-medium uppercase tracking-wide text-neutral-400">Product identifier</div>
                <div className="mt-1 break-all text-sm font-semibold">{product.id}</div>
              </div>
            </section>
          </aside>
        </div>

        {token ? (
          <StaffProductMediaManager
            productId={productId}
            token={token}
          />
        ) : null}

        <section className="mt-6 rounded-2xl border border-black/10 bg-white p-6">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">
                Variants
              </h2>
              <p className="mt-1 text-sm text-neutral-500">
                Manage all variants on this product. Active variants are
                sellable; inactive variants are kept for history and can be
                activated again.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setCreateVariantError("");
                setCreateVariantOpen((current) => !current);
              }}
              className="rounded-xl bg-black px-4 py-2.5 text-sm font-semibold text-white"
            >
              {createVariantOpen
                ? "Close"
                : "Add variant"}
            </button>
          </div>

          {createVariantOpen ? (
            <div className="mb-6 rounded-2xl border border-black/10 bg-neutral-50 p-5">
              <div className="mb-4">
                <h3 className="font-semibold">
                  Create variant
                </h3>
                <p className="mt-1 text-sm text-neutral-500">
                  Create the commercial variant first. You can add detailed
                  specifications after it is created.
                </p>
              </div>

              {createVariantError ? (
                <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                  {createVariantError}
                </div>
              ) : null}

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <label className="text-sm font-medium">
                  SKU
                  <input
                    value={newSku}
                    onChange={(event) =>
                      setNewSku(event.target.value)
                    }
                    placeholder="HP-16-1TB"
                    className="mt-2 w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 font-normal outline-none focus:border-black"
                  />
                </label>

                <label className="text-sm font-medium">
                  Variant name
                  <input
                    value={newVariantName}
                    onChange={(event) =>
                      setNewVariantName(event.target.value)
                    }
                    placeholder="16GB / 1TB"
                    className="mt-2 w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 font-normal outline-none focus:border-black"
                  />
                </label>

                <label className="text-sm font-medium">
                  Color
                  <input
                    value={newColor}
                    onChange={(event) =>
                      setNewColor(event.target.value)
                    }
                    className="mt-2 w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 font-normal outline-none focus:border-black"
                  />
                </label>

                <label className="text-sm font-medium">
                  RAM (GB)
                  <input
                    type="number"
                    value={newRamGb}
                    onChange={(event) =>
                      setNewRamGb(event.target.value)
                    }
                    className="mt-2 w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 font-normal outline-none focus:border-black"
                  />
                </label>

                <label className="text-sm font-medium">
                  Storage (GB)
                  <input
                    type="number"
                    value={newStorageGb}
                    onChange={(event) =>
                      setNewStorageGb(event.target.value)
                    }
                    className="mt-2 w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 font-normal outline-none focus:border-black"
                  />
                </label>

                <label className="text-sm font-medium">
                  Operating system
                  <input
                    value={newOperatingSystem}
                    onChange={(event) =>
                      setNewOperatingSystem(
                        event.target.value,
                      )
                    }
                    className="mt-2 w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 font-normal outline-none focus:border-black"
                  />
                </label>

                <label className="text-sm font-medium">
                  Base price
                  <input
                    type="number"
                    value={newBasePrice}
                    onChange={(event) =>
                      setNewBasePrice(event.target.value)
                    }
                    className="mt-2 w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 font-normal outline-none focus:border-black"
                  />
                </label>

                <label className="text-sm font-medium">
                  Selling price
                  <input
                    type="number"
                    value={newSellingPrice}
                    onChange={(event) =>
                      setNewSellingPrice(
                        event.target.value,
                      )
                    }
                    className="mt-2 w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 font-normal outline-none focus:border-black"
                  />
                </label>

                <label className="text-sm font-medium">
                  Compare-at price
                  <input
                    type="number"
                    value={newCompareAtPrice}
                    onChange={(event) =>
                      setNewCompareAtPrice(
                        event.target.value,
                      )
                    }
                    className="mt-2 w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 font-normal outline-none focus:border-black"
                  />
                </label>

                <label className="text-sm font-medium">
                  Warranty (months)
                  <input
                    type="number"
                    value={newWarrantyMonths}
                    onChange={(event) =>
                      setNewWarrantyMonths(
                        event.target.value,
                      )
                    }
                    className="mt-2 w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 font-normal outline-none focus:border-black"
                  />
                </label>
              </div>

              <div className="mt-5 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setCreateVariantOpen(false)
                  }
                  className="rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-medium"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={() => void createVariant()}
                  disabled={createVariantSaving}
                  className="rounded-xl bg-black px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {createVariantSaving
                    ? "Creating..."
                    : "Create variant"}
                </button>
              </div>
            </div>
          ) : null}

          <div className="space-y-4">
            {variants.map((variant, index) => {
              const open =
                openVariantId === variant.id;

              return (
                <div
                  key={variant.id}
                  className="overflow-hidden rounded-2xl border border-black/10"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setOpenVariantId(
                        open ? null : variant.id,
                      )
                    }
                    className="flex w-full items-center justify-between gap-4 bg-neutral-50 px-5 py-4 text-left hover:bg-neutral-100"
                  >
                    <div>
                      <div className="font-semibold">
                        Variant {index + 1}:{" "}
                        {variant.variantName ||
                          "Unnamed variant"}
                      </div>
                      <div className="mt-1 text-sm text-neutral-500">
                        {variant.sku} ·{" "}
                        {variant.ramGb ?? "â€”"}GB RAM ·{" "}
                        {variant.storageGb ?? "â€”"}GB ·{" "}
                        {money(variant.sellingPrice)}
                      </div>
                    </div>

                    <span className="text-sm font-medium">
                      {open ? "Hide" : "Edit"}
                    </span>
                  </button>

                  {open ? (
                    <div className="space-y-6 p-5">
                      {variant.status === "INACTIVE" ? (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                          This variant is inactive. Activate it before editing
                          its commercial details or technical specifications.
                        </div>
                      ) : null}
                      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                        <label className="text-sm font-medium">
                          SKU
                          <input
                            value={variant.sku}
                            onChange={(event) =>
                              updateVariant(
                                variant.id,
                                {
                                  sku: event.target
                                    .value,
                                },
                              )
                            }
                            disabled={variant.status === "INACTIVE"}
                            className="mt-2 w-full rounded-xl border border-black/10 px-3 py-2.5 font-normal outline-none focus:border-black"
                          />
                        </label>

                        <label className="text-sm font-medium">
                          Variant name
                          <input
                            value={
                              variant.variantName ?? ""
                            }
                            onChange={(event) =>
                              updateVariant(
                                variant.id,
                                {
                                  variantName:
                                    event.target
                                      .value,
                                },
                              )
                            }
                            disabled={variant.status === "INACTIVE"}
                            className="mt-2 w-full rounded-xl border border-black/10 px-3 py-2.5 font-normal outline-none focus:border-black"
                          />
                        </label>

                        <label className="text-sm font-medium">
                          Color
                          <input
                            value={variant.color ?? ""}
                            onChange={(event) =>
                              updateVariant(
                                variant.id,
                                {
                                  color:
                                    event.target.value,
                                },
                              )
                            }
                            disabled={variant.status === "INACTIVE"}
                            className="mt-2 w-full rounded-xl border border-black/10 px-3 py-2.5 font-normal outline-none focus:border-black"
                          />
                        </label>

                        <label className="text-sm font-medium">
                          RAM (GB)
                          <input
                            type="number"
                            value={
                              variant.ramGb ?? ""
                            }
                            onChange={(event) =>
                              updateVariant(
                                variant.id,
                                {
                                  ramGb:
                                    numberOrNull(
                                      event.target
                                        .value,
                                    ),
                                },
                              )
                            }
                            disabled={variant.status === "INACTIVE"}
                            className="mt-2 w-full rounded-xl border border-black/10 px-3 py-2.5 font-normal outline-none focus:border-black"
                          />
                        </label>

                        <label className="text-sm font-medium">
                          Storage (GB)
                          <input
                            type="number"
                            value={
                              variant.storageGb ?? ""
                            }
                            onChange={(event) =>
                              updateVariant(
                                variant.id,
                                {
                                  storageGb:
                                    numberOrNull(
                                      event.target
                                        .value,
                                    ),
                                },
                              )
                            }
                            disabled={variant.status === "INACTIVE"}
                            className="mt-2 w-full rounded-xl border border-black/10 px-3 py-2.5 font-normal outline-none focus:border-black"
                          />
                        </label>

                        <label className="text-sm font-medium">
                          Operating system
                          <input
                            value={
                              variant.operatingSystem ??
                              ""
                            }
                            onChange={(event) =>
                              updateVariant(
                                variant.id,
                                {
                                  operatingSystem:
                                    event.target.value,
                                },
                              )
                            }
                            disabled={variant.status === "INACTIVE"}
                            className="mt-2 w-full rounded-xl border border-black/10 px-3 py-2.5 font-normal outline-none focus:border-black"
                          />
                        </label>

                        <label className="text-sm font-medium">
                          Base price
                          <input
                            type="number"
                            value={
                              variant.basePrice
                            }
                            onChange={(event) =>
                              updateVariant(
                                variant.id,
                                {
                                  basePrice:
                                    event.target.value,
                                },
                              )
                            }
                            disabled={variant.status === "INACTIVE"}
                            className="mt-2 w-full rounded-xl border border-black/10 px-3 py-2.5 font-normal outline-none focus:border-black"
                          />
                        </label>

                        <label className="text-sm font-medium">
                          Selling price
                          <input
                            type="number"
                            value={
                              variant.sellingPrice
                            }
                            onChange={(event) =>
                              updateVariant(
                                variant.id,
                                {
                                  sellingPrice:
                                    event.target.value,
                                },
                              )
                            }
                            disabled={variant.status === "INACTIVE"}
                            className="mt-2 w-full rounded-xl border border-black/10 px-3 py-2.5 font-normal outline-none focus:border-black"
                          />
                        </label>

                        <label className="text-sm font-medium">
                          Compare-at price
                          <input
                            type="number"
                            value={
                              variant.compareAtPrice ??
                              ""
                            }
                            onChange={(event) =>
                              updateVariant(
                                variant.id,
                                {
                                  compareAtPrice:
                                    event.target.value,
                                },
                              )
                            }
                            disabled={variant.status === "INACTIVE"}
                            className="mt-2 w-full rounded-xl border border-black/10 px-3 py-2.5 font-normal outline-none focus:border-black"
                          />
                        </label>

                        <label className="text-sm font-medium">
                          Warranty (months)
                          <input
                            type="number"
                            value={
                              variant.warrantyMonths ??
                              ""
                            }
                            onChange={(event) =>
                              updateVariant(
                                variant.id,
                                {
                                  warrantyMonths:
                                    numberOrNull(
                                      event.target
                                        .value,
                                    ),
                                },
                              )
                            }
                            disabled={variant.status === "INACTIVE"}
                            className="mt-2 w-full rounded-xl border border-black/10 px-3 py-2.5 font-normal outline-none focus:border-black"
                          />
                        </label>

                        <label className="text-sm font-medium">
                          Currency
                          <input
                            value={
                              variant.currency || "INR"
                            }
                            onChange={(event) =>
                              updateVariant(
                                variant.id,
                                {
                                  currency:
                                    event.target.value
                                      .toUpperCase(),
                                },
                              )
                            }
                            disabled={variant.status === "INACTIVE"}
                            className="mt-2 w-full rounded-xl border border-black/10 px-3 py-2.5 font-normal outline-none focus:border-black"
                          />
                        </label>
                      </div>

                      <div className="mb-4 flex items-center justify-between gap-3">
                        <div>
                          <div className="font-semibold">
                            Variant lifecycle
                          </div>
                          <div className="mt-1 text-sm text-neutral-500">
                            {variant.status === "ACTIVE"
                              ? "This variant is active and available in the catalogue and selling flows."
                              : "This variant is inactive. It is kept for history and can be activated again."}
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${variant.status === "ACTIVE"
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-neutral-200 text-neutral-700"
                              }`}
                          >
                            {variant.status}
                          </span>

                          {variant.status === "ACTIVE" ? (
                            <button
                              type="button"
                              onClick={() =>
                                void deactivateVariant(
                                  variant.id,
                                  variant.sku,
                                )
                              }
                              disabled={saving}
                              className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 disabled:opacity-50"
                            >
                              Deactivate variant
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                void activateVariant(
                                  variant.id,
                                  variant.sku,
                                )
                              }
                              disabled={saving}
                              className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 disabled:opacity-50"
                            >
                              Activate variant
                            </button>
                          )}
                        </div>
                      </div>

                      <div>
                        <div className="mb-3 font-semibold">
                          Technical specifications
                        </div>

                        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                          {SPEC_FIELDS.map((field) => (
                            <label
                              key={field.key}
                              className="text-sm font-medium"
                            >
                              {field.label}
                              {field.type === "boolean" ? (
                                <select
                                  value={variantInputValue(
                                    variant,
                                    field.key,
                                  )}
                                  onChange={(event) =>
                                    updateVariantSpec(
                                      variant.id,
                                      field.key,
                                      event.target.value,
                                      "boolean",
                                    )
                                  }
                                  disabled={variant.status === "INACTIVE"}
                                  className="mt-2 w-full rounded-xl border border-black/10 px-3 py-2.5 font-normal outline-none focus:border-black"
                                >
                                  <option value="">Not specified</option>
                                  <option value="true">Yes</option>
                                  <option value="false">No</option>
                                </select>
                              ) : (
                                <input
                                  type={
                                    field.type === "number"
                                      ? "number"
                                      : "text"
                                  }
                                  value={variantInputValue(
                                    variant,
                                    field.key,
                                  )}
                                  onChange={(event) =>
                                    updateVariantSpec(
                                      variant.id,
                                      field.key,
                                      event.target.value,
                                      field.type ?? "text",
                                    )
                                  }
                                  disabled={variant.status === "INACTIVE"}
                                  className="mt-2 w-full rounded-xl border border-black/10 px-3 py-2.5 font-normal outline-none focus:border-black"
                                />
                              )}
                              {field.type === "number" && field.min !== undefined && field.max !== undefined ? (
                                <div className="mt-1 text-xs font-normal text-slate-500">
                                  Allowed: {field.min}–{field.max}{field.hint ? ` ${field.hint}` : ""}
                                </div>
                              ) : null}
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>) : null}
                </div>
              );
            })}
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-black/10 bg-white p-6">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">
                Inventory
              </h2>
              <p className="mt-1 text-sm text-neutral-500">
                Adjust available stock per warehouse from the product editor.
              </p>
            </div>

            <Link
              href="/staff/inventory"
              className="rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-medium hover:bg-neutral-50"
            >
              Open inventory
            </Link>
          </div>

          {inventory.length === 0 ? (
            <div className="rounded-xl border border-dashed border-black/10 bg-neutral-50 p-5 text-sm text-neutral-600">
              No inventory record exists for this product yet.
              Use the inventory screen to initialize stock for a variant.
            </div>
          ) : (
            <div className="space-y-4">
              {inventory.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-black/10 p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="font-semibold">
                        {item.productVariant.variantName ||
                          item.productVariant.sku}
                      </div>
                      <div className="mt-1 text-sm text-neutral-500">
                        {item.productVariant.sku} ·{" "}
                        {item.warehouse.name} (
                        {item.warehouse.code})
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-sm text-neutral-500">
                        Sellable
                      </div>
                      <div className="text-lg font-semibold">
                        {Math.max(
                          item.quantityAvailable -
                          item.quantityReserved,
                          0,
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-4">
                    <div className="rounded-xl bg-neutral-50 p-4">
                      <div className="text-xs uppercase tracking-wider text-neutral-400">
                        Available
                      </div>
                      <div className="mt-1 text-xl font-semibold">
                        {item.quantityAvailable}
                      </div>
                    </div>

                    <div className="rounded-xl bg-neutral-50 p-4">
                      <div className="text-xs uppercase tracking-wider text-neutral-400">
                        Reserved
                      </div>
                      <div className="mt-1 text-xl font-semibold">
                        {item.quantityReserved}
                      </div>
                    </div>

                    <div className="rounded-xl bg-neutral-50 p-4">
                      <div className="text-xs uppercase tracking-wider text-neutral-400">
                        Reorder level
                      </div>
                      <div className="mt-1 text-xl font-semibold">
                        {item.reorderLevel ?? "â€”"}
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium">
                        Stock adjustment
                        <input
                          type="number"
                          placeholder="+5 or -2"
                          value={
                            inventoryDeltas[item.id] ??
                            ""
                          }
                          onChange={(event) =>
                            setInventoryDeltas(
                              (current) => ({
                                ...current,
                                [item.id]:
                                  event.target.value,
                              }),
                            )
                          }
                          className="mt-2 w-full rounded-xl border border-black/10 px-3 py-2.5 outline-none focus:border-black"
                        />
                      </label>

                      <button
                        type="button"
                        onClick={() =>
                          void adjustInventory(item)
                        }
                        disabled={
                          inventorySavingId === item.id
                        }
                        className="mt-2 w-full rounded-xl bg-black px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                      >
                        {inventorySavingId === item.id
                          ? "Adjusting…"
                          : "Adjust stock"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="mt-6 flex justify-end gap-3">
          <Link
            href="/staff/catalogue/products"
            className="rounded-xl border border-black/10 bg-white px-5 py-3 text-sm font-semibold hover:bg-neutral-50"
          >
            Cancel
          </Link>
          <button
            type="button"
            onClick={() => void saveProduct()}
            disabled={saving || variants.length === 0}
            className="rounded-xl bg-black px-6 py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving ? "Saving variants…" : "Save changes"}
          </button>
        </div>
      </div>
    </main>
  );
}