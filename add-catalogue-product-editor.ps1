# Add Klarone staff catalogue product editor + Edit link
# Run from: D:\Contribution\Klarone2
# Requires the API on http://localhost:3000 and the web app on http://localhost:3001.

$ErrorActionPreference = "Stop"

$root = (Get-Location).Path
$listPath = Join-Path $root "apps\web\src\app\staff\catalogue\products\page.tsx"
$routeDir = Join-Path $root "apps\web\src\app\staff\catalogue\products\[id]"
$routePath = Join-Path $routeDir "page.tsx"

if (-not (Test-Path $listPath)) {
  throw "Could not find catalogue list page: $listPath"
}

$list = Get-Content $listPath -Raw
if ([string]::IsNullOrWhiteSpace($list)) {
  throw "Catalogue list page is empty."
}

if ($list -notmatch 'products\.map\(\(product\)') {
  throw "Catalogue list page did not match the expected product-row structure."
}

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$listBackup = "$listPath.bak-$stamp"
Copy-Item $listPath $listBackup -Force
Write-Host "List page backup: $listBackup" -ForegroundColor Cyan

if ($list -notmatch 'from "next/link"') {
  $list = $list.Replace(
    '"use client";',
    '"use client";

import Link from "next/link";'
  )
}

$namePattern = '(?s)<div\s+className="font-medium">\s*\{product\.name\}\s*</div>'

if ($list -notmatch 'Edit product') {
  if ($list -notmatch $namePattern) {
    throw "Could not find the product-name element in the catalogue list page."
  }

  $newNameBlock = @'
<div>
  <Link
    href={`/staff/catalogue/products/${product.id}`}
    className="font-medium hover:underline"
  >
    {product.name}
  </Link>

  <div className="mt-1 text-xs text-neutral-500">
    {product.modelNumber ||
      "No model number"}
  </div>

  <div className="mt-1 text-xs text-neutral-400">
    {product.slug}
  </div>

  <Link
    href={`/staff/catalogue/products/${product.id}`}
    className="mt-2 inline-flex rounded-lg border border-black/10 px-2.5 py-1.5 text-xs font-medium hover:bg-neutral-50"
  >
    Edit product
  </Link>
</div>
'@

  $regex = [regex]::new($namePattern)
  $list = $regex.Replace(
    $list,
    $newNameBlock,
    1
  )
}

[System.IO.File]::WriteAllText(
  [System.IO.Path]::GetFullPath($listPath),
  $list,
  (New-Object System.Text.UTF8Encoding($false))
)

New-Item -ItemType Directory -Force -Path $routeDir | Out-Null

$editor = @'
"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  clearStaffAccessToken,
  getStaffAccessToken,
} from "../../../../lib/staff-auth-api";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:3000";

type Specification = {
  id?: string;
  productVariantId?: string;
  cpuBrand?: string | null;
  cpuModel?: string | null;
  cpuGeneration?: string | null;
  cpuCores?: number | null;
  cpuThreads?: number | null;
  gpuBrand?: string | null;
  gpuModel?: string | null;
  gpuVramGb?: number | null;
  ramType?: string | null;
  ramSpeedMhz?: number | null;
  maxRamGb?: number | null;
  ramSlots?: number | null;
  storageType?: string | null;
  storageInterface?: string | null;
  storageSlots?: number | null;
  maxStorageGb?: number | null;
  displaySizeInches?: string | null;
  displayResolution?: string | null;
  displayPanelType?: string | null;
  displayRefreshRateHz?: number | null;
  displayBrightnessNits?: number | null;
  displayColorGamut?: string | null;
  batteryCapacityWh?: string | null;
  weightKg?: string | null;
  widthMm?: string | null;
  depthMm?: string | null;
  heightMm?: string | null;
  webcamResolution?: string | null;
  wifiVersion?: string | null;
  bluetoothVersion?: string | null;
  keyboardType?: string | null;
  keyboardBacklight?: boolean | null;
  fingerprintSensor?: boolean | null;
};

type Variant = {
  id: string;
  sku: string;
  variantName: string | null;
  color: string | null;
  ramGb: number | null;
  storageGb: number | null;
  operatingSystem: string | null;
  basePrice: string;
  sellingPrice: string;
  compareAtPrice: string | null;
  currency: string;
  warrantyMonths: number | null;
  status: string;
  specification: Specification | null;
};

type Product = {
  id: string;
  brandId: number;
  categoryId: number;
  name: string;
  slug: string;
  modelNumber: string | null;
  manufacturerPartNumber: string | null;
  shortDescription: string | null;
  description: string | null;
  productType: string;
  status: string;
  brand: {
    id: number;
    name: string;
    slug: string;
  };
  category: {
    id: number;
    name: string;
    slug: string;
  };
  variants: Variant[];
};

function fieldValue(value: string | number | null | undefined) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value);
}

export default function StaffCatalogueProductEditor() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const productId = params.id;

  const [token, setToken] = useState<string | null>(null);
  const [product, setProduct] = useState<Product | null>(null);

  const [name, setName] = useState("");
  const [modelNumber, setModelNumber] = useState("");
  const [manufacturerPartNumber, setManufacturerPartNumber] =
    useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [description, setDescription] = useState("");

  const [variantId, setVariantId] = useState("");
  const [sku, setSku] = useState("");
  const [variantName, setVariantName] = useState("");
  const [color, setColor] = useState("");
  const [ramGb, setRamGb] = useState("");
  const [storageGb, setStorageGb] = useState("");
  const [operatingSystem, setOperatingSystem] = useState("");
  const [basePrice, setBasePrice] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [compareAtPrice, setCompareAtPrice] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [warrantyMonths, setWarrantyMonths] = useState("");

  const [spec, setSpec] = useState<Specification>({});

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function updateSpec<K extends keyof Specification>(
    key: K,
    value: Specification[K],
  ) {
    setSpec((current) => ({
      ...current,
      [key]: value,
    }));
  }

  useEffect(() => {
    const activeToken = getStaffAccessToken();

    if (!activeToken) {
      router.replace("/staff/login");
      return;
    }

    setToken(activeToken);

    async function load() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `${API_BASE_URL}/staff/catalogue/products/${productId}`,
          {
            headers: {
              Authorization: `Bearer ${activeToken}`,
            },
          },
        );

        if (response.status === 401) {
          clearStaffAccessToken();
          router.replace("/staff/login");
          return;
        }

        const body = await response.json();

        if (!response.ok) {
          throw new Error(
            body?.message ||
              "Unable to load catalogue product.",
          );
        }

        const loadedProduct = body as Product;
        const loadedVariant = loadedProduct.variants[0];

        if (!loadedVariant) {
          throw new Error(
            "This product has no active variant to edit.",
          );
        }

        setProduct(loadedProduct);
        setName(loadedProduct.name);
        setModelNumber(
          fieldValue(loadedProduct.modelNumber),
        );
        setManufacturerPartNumber(
          fieldValue(
            loadedProduct.manufacturerPartNumber,
          ),
        );
        setShortDescription(
          fieldValue(loadedProduct.shortDescription),
        );
        setDescription(
          fieldValue(loadedProduct.description),
        );

        setVariantId(loadedVariant.id);
        setSku(loadedVariant.sku);
        setVariantName(
          fieldValue(loadedVariant.variantName),
        );
        setColor(fieldValue(loadedVariant.color));
        setRamGb(fieldValue(loadedVariant.ramGb));
        setStorageGb(fieldValue(loadedVariant.storageGb));
        setOperatingSystem(
          fieldValue(loadedVariant.operatingSystem),
        );
        setBasePrice(loadedVariant.basePrice);
        setSellingPrice(loadedVariant.sellingPrice);
        setCompareAtPrice(
          fieldValue(loadedVariant.compareAtPrice),
        );
        setCurrency(loadedVariant.currency || "INR");
        setWarrantyMonths(
          fieldValue(loadedVariant.warrantyMonths),
        );
        setSpec(loadedVariant.specification ?? {});
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load catalogue product.",
        );
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [productId, router]);

  async function submit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!token || !variantId) {
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    const nullable = (value: string) =>
      value.trim() ? value.trim() : null;

    const integerOrNull = (value: string) => {
      const trimmed = value.trim();

      if (!trimmed) {
        return null;
      }

      const number = Number(trimmed);
      return Number.isInteger(number) ? number : null;
    };

    const numberOrNull = (value: string) => {
      const trimmed = value.trim();

      if (!trimmed) {
        return null;
      }

      const number = Number(trimmed);
      return Number.isFinite(number) ? number : null;
    };

    try {
      const response = await fetch(
        `${API_BASE_URL}/staff/catalogue/products/${productId}/update`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            variantId,
            name: name.trim(),
            modelNumber: nullable(modelNumber),
            manufacturerPartNumber:
              nullable(manufacturerPartNumber),
            shortDescription:
              nullable(shortDescription),
            description: nullable(description),
            variant: {
              sku: sku.trim(),
              variantName: nullable(variantName),
              color: nullable(color),
              ramGb: integerOrNull(ramGb),
              storageGb: integerOrNull(storageGb),
              operatingSystem:
                nullable(operatingSystem),
              basePrice,
              sellingPrice,
              compareAtPrice:
                compareAtPrice.trim()
                  ? compareAtPrice.trim()
                  : null,
              currency: currency.trim() || "INR",
              warrantyMonths:
                integerOrNull(warrantyMonths),
              specification: {
                cpuBrand: nullable(
                  fieldValue(spec.cpuBrand),
                ),
                cpuModel: nullable(
                  fieldValue(spec.cpuModel),
                ),
                cpuGeneration: nullable(
                  fieldValue(spec.cpuGeneration),
                ),
                cpuCores: specValueInteger(spec.cpuCores),
                cpuThreads:
                  specValueInteger(spec.cpuThreads),
                gpuBrand: nullable(
                  fieldValue(spec.gpuBrand),
                ),
                gpuModel: nullable(
                  fieldValue(spec.gpuModel),
                ),
                gpuVramGb:
                  specValueInteger(spec.gpuVramGb),
                ramType: nullable(
                  fieldValue(spec.ramType),
                ),
                ramSpeedMhz:
                  specValueInteger(spec.ramSpeedMhz),
                maxRamGb:
                  specValueInteger(spec.maxRamGb),
                ramSlots:
                  specValueInteger(spec.ramSlots),
                storageType: nullable(
                  fieldValue(spec.storageType),
                ),
                storageInterface: nullable(
                  fieldValue(spec.storageInterface),
                ),
                storageSlots:
                  specValueInteger(spec.storageSlots),
                maxStorageGb:
                  specValueInteger(spec.maxStorageGb),
                displaySizeInches:
                  specValueNumber(
                    spec.displaySizeInches,
                  ),
                displayResolution: nullable(
                  fieldValue(spec.displayResolution),
                ),
                displayPanelType: nullable(
                  fieldValue(spec.displayPanelType),
                ),
                displayRefreshRateHz:
                  specValueInteger(
                    spec.displayRefreshRateHz,
                  ),
                displayBrightnessNits:
                  specValueInteger(
                    spec.displayBrightnessNits,
                  ),
                displayColorGamut: nullable(
                  fieldValue(spec.displayColorGamut),
                ),
                batteryCapacityWh:
                  specValueNumber(
                    spec.batteryCapacityWh,
                  ),
                weightKg:
                  specValueNumber(spec.weightKg),
                widthMm:
                  specValueNumber(spec.widthMm),
                depthMm:
                  specValueNumber(spec.depthMm),
                heightMm:
                  specValueNumber(spec.heightMm),
                webcamResolution: nullable(
                  fieldValue(spec.webcamResolution),
                ),
                wifiVersion: nullable(
                  fieldValue(spec.wifiVersion),
                ),
                bluetoothVersion: nullable(
                  fieldValue(
                    spec.bluetoothVersion,
                  ),
                ),
                keyboardType: nullable(
                  fieldValue(spec.keyboardType),
                ),
                keyboardBacklight:
                  spec.keyboardBacklight ?? null,
                fingerprintSensor:
                  spec.fingerprintSensor ?? null,
              },
            },
          }),
        },
      );

      if (response.status === 401) {
        clearStaffAccessToken();
        router.replace("/staff/login");
        return;
      }

      const body = await response.json();

      if (!response.ok) {
        throw new Error(
          body?.message ||
            "Unable to save catalogue product.",
        );
      }

      setSuccess("Product saved successfully.");
      setProduct((current) =>
        current
          ? {
              ...current,
              name: body.name ?? current.name,
              shortDescription:
                body.shortDescription ??
                current.shortDescription,
            }
          : current,
      );
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save catalogue product.",
      );
    } finally {
      setSaving(false);
    }
  }

  function specValueInteger(
    value: number | string | null | undefined,
  ) {
    if (value === null || value === undefined || value === "") {
      return null;
    }

    const parsed = Number(value);
    return Number.isInteger(parsed) ? parsed : null;
  }

  function specValueNumber(
    value: number | string | null | undefined,
  ) {
    if (value === null || value === undefined || value === "") {
      return null;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function textField(
    label: string,
    value: string | number | null | undefined,
    onChange: (value: string) => void,
    type = "text",
  ) {
    return (
      <label className="block">
        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-neutral-400">
          {label}
        </span>
        <input
          type={type}
          value={fieldValue(value)}
          onChange={(event) =>
            onChange(event.target.value)
          }
          className="w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-black/30"
        />
      </label>
    );
  }

  function boolField(
    label: string,
    value: boolean | null | undefined,
    onChange: (value: boolean | null) => void,
  ) {
    return (
      <label className="block">
        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-neutral-400">
          {label}
        </span>
        <select
          value={
            value === null || value === undefined
              ? ""
              : value
                ? "true"
                : "false"
          }
          onChange={(event) => {
            if (!event.target.value) {
              onChange(null);
              return;
            }

            onChange(event.target.value === "true");
          }}
          className="w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-black/30"
        >
          <option value="">Not specified</option>
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
      </label>
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f6f6f3] text-neutral-950">
        <div className="mx-auto max-w-6xl px-6 py-12 text-sm text-neutral-500">
          Loading product...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f6f6f3] text-neutral-950">
      <header className="border-b border-black/10 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-xs font-semibold tracking-[0.22em] text-neutral-400">
              KLARONE
            </p>
            <h1 className="mt-1 text-xl font-semibold">
              Edit product
            </h1>
          </div>

          <Link
            href="/staff/catalogue/products"
            className="rounded-lg border border-black/10 px-4 py-2 text-sm font-medium hover:bg-neutral-50"
          >
            Back to catalogue
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-8">
        {error ? (
          <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {success}
          </div>
        ) : null}

        <form
          onSubmit={submit}
          className="space-y-6"
        >
          <section className="rounded-3xl border border-black/10 bg-white p-6">
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400">
                Product
              </p>
              <h2 className="mt-1 text-xl font-semibold">
                {product?.name}
              </h2>
              <p className="mt-1 text-sm text-neutral-500">
                {product?.brand.name} ·{" "}
                {product?.category.name} ·{" "}
                <span className="font-medium">
                  {product?.status}
                </span>
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {textField(
                "Name",
                name,
                setName,
              )}
              {textField(
                "Model number",
                modelNumber,
                setModelNumber,
              )}
              {textField(
                "Manufacturer part number",
                manufacturerPartNumber,
                setManufacturerPartNumber,
              )}
              {textField(
                "Product type",
                product?.productType ?? "LAPTOP",
                () => undefined,
              )}
            </div>

            <div className="mt-4 grid gap-4">
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-neutral-400">
                  Short description
                </span>
                <textarea
                  value={shortDescription}
                  onChange={(event) =>
                    setShortDescription(
                      event.target.value,
                    )
                  }
                  rows={3}
                  className="w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-black/30"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-neutral-400">
                  Description
                </span>
                <textarea
                  value={description}
                  onChange={(event) =>
                    setDescription(event.target.value)
                  }
                  rows={6}
                  className="w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-black/30"
                />
              </label>
            </div>
          </section>

          <section className="rounded-3xl border border-black/10 bg-white p-6">
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400">
                Variant
              </p>
              <h2 className="mt-1 text-xl font-semibold">
                {variantName || sku}
              </h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {textField("SKU", sku, setSku)}
              {textField(
                "Variant name",
                variantName,
                setVariantName,
              )}
              {textField("Color", color, setColor)}
              {textField(
                "RAM GB",
                ramGb,
                setRamGb,
                "number",
              )}
              {textField(
                "Storage GB",
                storageGb,
                setStorageGb,
                "number",
              )}
              {textField(
                "Operating system",
                operatingSystem,
                setOperatingSystem,
              )}
              {textField(
                "Base price",
                basePrice,
                setBasePrice,
                "number",
              )}
              {textField(
                "Selling price",
                sellingPrice,
                setSellingPrice,
                "number",
              )}
              {textField(
                "Compare-at price",
                compareAtPrice,
                setCompareAtPrice,
                "number",
              )}
              {textField(
                "Currency",
                currency,
                setCurrency,
              )}
              {textField(
                "Warranty months",
                warrantyMonths,
                setWarrantyMonths,
                "number",
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-black/10 bg-white p-6">
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400">
                Specifications
              </p>
              <h2 className="mt-1 text-xl font-semibold">
                Technical facts
              </h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {textField(
                "CPU brand",
                spec.cpuBrand,
                (value) =>
                  updateSpec("cpuBrand", value),
              )}
              {textField(
                "CPU model",
                spec.cpuModel,
                (value) =>
                  updateSpec("cpuModel", value),
              )}
              {textField(
                "CPU generation",
                spec.cpuGeneration,
                (value) =>
                  updateSpec(
                    "cpuGeneration",
                    value,
                  ),
              )}
              {textField(
                "CPU cores",
                spec.cpuCores,
                (value) =>
                  updateSpec(
                    "cpuCores",
                    value
                      ? Number(value)
                      : null,
                  ),
                "number",
              )}
              {textField(
                "CPU threads",
                spec.cpuThreads,
                (value) =>
                  updateSpec(
                    "cpuThreads",
                    value
                      ? Number(value)
                      : null,
                  ),
                "number",
              )}
              {textField(
                "GPU brand",
                spec.gpuBrand,
                (value) =>
                  updateSpec("gpuBrand", value),
              )}
              {textField(
                "GPU model",
                spec.gpuModel,
                (value) =>
                  updateSpec("gpuModel", value),
              )}
              {textField(
                "GPU VRAM GB",
                spec.gpuVramGb,
                (value) =>
                  updateSpec(
                    "gpuVramGb",
                    value
                      ? Number(value)
                      : null,
                  ),
                "number",
              )}
              {textField(
                "RAM type",
                spec.ramType,
                (value) =>
                  updateSpec("ramType", value),
              )}
              {textField(
                "RAM speed MHz",
                spec.ramSpeedMhz,
                (value) =>
                  updateSpec(
                    "ramSpeedMhz",
                    value
                      ? Number(value)
                      : null,
                  ),
                "number",
              )}
              {textField(
                "Max RAM GB",
                spec.maxRamGb,
                (value) =>
                  updateSpec(
                    "maxRamGb",
                    value
                      ? Number(value)
                      : null,
                  ),
                "number",
              )}
              {textField(
                "RAM slots",
                spec.ramSlots,
                (value) =>
                  updateSpec(
                    "ramSlots",
                    value
                      ? Number(value)
                      : null,
                  ),
                "number",
              )}
              {textField(
                "Storage type",
                spec.storageType,
                (value) =>
                  updateSpec(
                    "storageType",
                    value,
                  ),
              )}
              {textField(
                "Storage interface",
                spec.storageInterface,
                (value) =>
                  updateSpec(
                    "storageInterface",
                    value,
                  ),
              )}
              {textField(
                "Storage slots",
                spec.storageSlots,
                (value) =>
                  updateSpec(
                    "storageSlots",
                    value
                      ? Number(value)
                      : null,
                  ),
                "number",
              )}
              {textField(
                "Max storage GB",
                spec.maxStorageGb,
                (value) =>
                  updateSpec(
                    "maxStorageGb",
                    value
                      ? Number(value)
                      : null,
                  ),
                "number",
              )}
              {textField(
                "Display size inches",
                spec.displaySizeInches,
                (value) =>
                  updateSpec(
                    "displaySizeInches",
                    value,
                  ),
                "number",
              )}
              {textField(
                "Display resolution",
                spec.displayResolution,
                (value) =>
                  updateSpec(
                    "displayResolution",
                    value,
                  ),
              )}
              {textField(
                "Display panel type",
                spec.displayPanelType,
                (value) =>
                  updateSpec(
                    "displayPanelType",
                    value,
                  ),
              )}
              {textField(
                "Display refresh rate Hz",
                spec.displayRefreshRateHz,
                (value) =>
                  updateSpec(
                    "displayRefreshRateHz",
                    value
                      ? Number(value)
                      : null,
                  ),
                "number",
              )}
              {textField(
                "Display brightness nits",
                spec.displayBrightnessNits,
                (value) =>
                  updateSpec(
                    "displayBrightnessNits",
                    value
                      ? Number(value)
                      : null,
                  ),
                "number",
              )}
              {textField(
                "Display color gamut",
                spec.displayColorGamut,
                (value) =>
                  updateSpec(
                    "displayColorGamut",
                    value,
                  ),
              )}
              {textField(
                "Battery capacity Wh",
                spec.batteryCapacityWh,
                (value) =>
                  updateSpec(
                    "batteryCapacityWh",
                    value,
                  ),
                "number",
              )}
              {textField(
                "Weight kg",
                spec.weightKg,
                (value) =>
                  updateSpec(
                    "weightKg",
                    value,
                  ),
                "number",
              )}
              {textField(
                "Width mm",
                spec.widthMm,
                (value) =>
                  updateSpec(
                    "widthMm",
                    value,
                  ),
                "number",
              )}
              {textField(
                "Depth mm",
                spec.depthMm,
                (value) =>
                  updateSpec(
                    "depthMm",
                    value,
                  ),
                "number",
              )}
              {textField(
                "Height mm",
                spec.heightMm,
                (value) =>
                  updateSpec(
                    "heightMm",
                    value,
                  ),
                "number",
              )}
              {textField(
                "Webcam resolution",
                spec.webcamResolution,
                (value) =>
                  updateSpec(
                    "webcamResolution",
                    value,
                  ),
              )}
              {textField(
                "WiFi version",
                spec.wifiVersion,
                (value) =>
                  updateSpec(
                    "wifiVersion",
                    value,
                  ),
              )}
              {textField(
                "Bluetooth version",
                spec.bluetoothVersion,
                (value) =>
                  updateSpec(
                    "bluetoothVersion",
                    value,
                  ),
              )}
              {textField(
                "Keyboard type",
                spec.keyboardType,
                (value) =>
                  updateSpec(
                    "keyboardType",
                    value,
                  ),
              )}
              {boolField(
                "Keyboard backlight",
                spec.keyboardBacklight,
                (value) =>
                  updateSpec(
                    "keyboardBacklight",
                    value,
                  ),
              )}
              {boolField(
                "Fingerprint sensor",
                spec.fingerprintSensor,
                (value) =>
                  updateSpec(
                    "fingerprintSensor",
                    value,
                  ),
              )}
            </div>
          </section>

          <div className="sticky bottom-4 flex items-center justify-end gap-3 rounded-2xl border border-black/10 bg-white/95 p-4 shadow-lg backdrop-blur">
            <Link
              href="/staff/catalogue/products"
              className="rounded-xl border border-black/10 px-5 py-3 text-sm font-medium hover:bg-neutral-50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-neutral-950 px-5 py-3 text-sm font-medium text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
'@

[System.IO.File]::WriteAllText(
  [System.IO.Path]::GetFullPath($routePath),
  $editor,
  (New-Object System.Text.UTF8Encoding($false))
)

Write-Host ""
Write-Host "Product editor route created: $routePath" -ForegroundColor Green
Write-Host "Catalogue list updated with an Edit product button." -ForegroundColor Green
Write-Host ""
Write-Host "Next: from apps\web run pnpm exec next build" -ForegroundColor Yellow
Write-Host "Then open http://localhost:3001/staff/catalogue/products/4" -ForegroundColor Yellow
