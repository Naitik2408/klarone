import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "../../../components/site/header";
import { AddToCartButton } from "../../../components/cart/add-to-cart-button";
import { getProduct } from "../../../lib/api";

interface ProductPageProps {
  params: Promise<{
    slug: string;
  }>;
}

function formatPrice(
  amount: string,
  currency: string,
): string {
  const numericAmount = Number(amount);

  if (!Number.isFinite(numericAmount)) {
    return `${currency} ${amount}`;
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(numericAmount);
}

function formatStorage(storageGb: number | null) {
  if (!storageGb) {
    return null;
  }

  if (storageGb >= 1024) {
    return `${storageGb / 1024}TB`;
  }

  return `${storageGb}GB`;
}

function getSpecificationValue(
  specification: Record<string, unknown> | null,
  key: string,
): string | null {
  if (!specification) {
    return null;
  }

  const value = specification[key];

  if (value === null || value === undefined) {
    return null;
  }

  return String(value);
}

export default async function ProductPage({
  params,
}: ProductPageProps) {
  const { slug } = await params;

  let product;

  try {
    product = await getProduct(slug);
  } catch {
    notFound();
  }

  const variant = product.variants[0];

  if (!variant) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header />

        <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <Link
            href="/laptops"
            className="text-sm font-medium text-slate-500 transition-colors hover:text-slate-950"
          >
            ← Back to laptops
          </Link>

          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-8">
            <h1 className="text-2xl font-semibold text-slate-950">
              {product.name}
            </h1>

            <p className="mt-3 text-slate-600">
              This product does not currently have an
              active purchasable configuration.
            </p>
          </div>
        </main>
      </div>
    );
  }

  const specification = variant.specification;

  const cpuModel = getSpecificationValue(
    specification,
    "cpuModel",
  );

  const cpuCores = getSpecificationValue(
    specification,
    "cpuCores",
  );

  const cpuThreads = getSpecificationValue(
    specification,
    "cpuThreads",
  );

  const gpuModel = getSpecificationValue(
    specification,
    "gpuModel",
  );

  const displaySize = getSpecificationValue(
    specification,
    "displaySizeInches",
  );

  const displayResolution = getSpecificationValue(
    specification,
    "displayResolution",
  );

  const displayPanel = getSpecificationValue(
    specification,
    "displayPanelType",
  );

  const displayRefreshRate = getSpecificationValue(
    specification,
    "displayRefreshRateHz",
  );

  const batteryCapacity = getSpecificationValue(
    specification,
    "batteryCapacityWh",
  );

  const weight = getSpecificationValue(
    specification,
    "weightKg",
  );

  const wifiVersion = getSpecificationValue(
    specification,
    "wifiVersion",
  );

  const bluetoothVersion = getSpecificationValue(
    specification,
    "bluetoothVersion",
  );

  const specRows = [
    ["Processor", cpuModel],
    ["CPU cores", cpuCores],
    ["CPU threads", cpuThreads],
    ["Graphics", gpuModel],
    ["Display", displaySize ? `${displaySize}"` : null],
    ["Resolution", displayResolution],
    ["Panel", displayPanel],
    [
      "Refresh rate",
      displayRefreshRate
        ? `${displayRefreshRate}Hz`
        : null,
    ],
    [
      "Battery",
      batteryCapacity
        ? `${batteryCapacity}Wh`
        : null,
    ],
    [
      "Weight",
      weight ? `${weight}kg` : null,
    ],
    ["Wi-Fi", wifiVersion],
    ["Bluetooth", bluetoothVersion],
  ].filter(
    (item): item is [string, string] => Boolean(item[1]),
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link
            href="/laptops"
            className="text-sm font-medium text-slate-500 transition-colors hover:text-slate-950"
          >
            ← Back to laptops
          </Link>
        </div>

        <section className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
            <div className="aspect-[4/3] bg-gradient-to-br from-slate-100 via-white to-slate-200">
              {product.media.length > 0 &&
              product.media[0]?.url ? (
                <img
                  src={product.media[0].url}
                  alt={
                    product.media[0].altText ??
                    product.name
                  }
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center">
                  <div className="flex h-32 w-52 items-center justify-center rounded-2xl border-2 border-slate-300 bg-white shadow-sm">
                    <div className="h-16 w-28 rounded-lg border border-slate-300 bg-slate-50" />
                  </div>

                  <p className="mt-5 text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
                    Product image
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-medium text-white">
                {product.brand.name}
              </span>

              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                {product.category.name}
              </span>
            </div>

            <h1 className="text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
              {product.name}
            </h1>

            {product.shortDescription ? (
              <p className="mt-4 text-base leading-7 text-slate-600">
                {product.shortDescription}
              </p>
            ) : null}

            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">
                Configuration
              </p>

              <h2 className="mt-2 text-lg font-semibold text-slate-950">
                {variant.variantName ??
                  `${variant.ramGb ?? ""}GB / ${
                    formatStorage(
                      variant.storageGb,
                    ) ?? ""
                  }`}
              </h2>

              <div className="mt-4 flex flex-wrap gap-2">
                {variant.ramGb ? (
                  <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700">
                    {variant.ramGb}GB RAM
                  </span>
                ) : null}

                {variant.storageGb ? (
                  <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700">
                    {formatStorage(
                      variant.storageGb,
                    )}{" "}
                    SSD
                  </span>
                ) : null}

                {variant.operatingSystem ? (
                  <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700">
                    {variant.operatingSystem}
                  </span>
                ) : null}

                {variant.color ? (
                  <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700">
                    {variant.color}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="mt-6">
              <div className="flex items-end gap-3">
                <span className="text-3xl font-semibold tracking-tight text-slate-950">
                  {formatPrice(
                    variant.sellingPrice,
                    variant.currency,
                  )}
                </span>

                {variant.compareAtPrice &&
                variant.compareAtPrice !==
                  variant.sellingPrice ? (
                  <span className="pb-1 text-base text-slate-400 line-through">
                    {formatPrice(
                      variant.compareAtPrice,
                      variant.currency,
                    )}
                  </span>
                ) : null}
              </div>

              {variant.warrantyMonths ? (
                <p className="mt-2 text-sm text-slate-500">
                  {variant.warrantyMonths} months warranty
                </p>
              ) : null}

              <AddToCartButton
                product={product}
                variantId={variant.id}
              />
            </div>

            <div className="mt-7 rounded-2xl bg-slate-950 p-5 text-white">
              <p className="text-sm font-semibold">
                Need help deciding?
              </p>

              <p className="mt-2 text-sm leading-6 text-slate-300">
                Klarone Select can help match a laptop
                to your work, study, gaming, or other
                requirements.
              </p>

              <Link
                href="/#klarone-select"
                className="mt-4 inline-flex rounded-full bg-white px-4 py-2.5 text-sm font-medium text-slate-950 transition-colors hover:bg-blue-50"
              >
                Explore Klarone Select
              </Link>
            </div>
          </div>
        </section>

        {product.description ? (
          <section className="mt-10 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
              About this laptop
            </h2>

            <p className="mt-4 max-w-4xl whitespace-pre-line text-base leading-7 text-slate-600">
              {product.description}
            </p>
          </section>
        ) : null}

        {specRows.length > 0 ? (
          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
              Specifications
            </h2>

            <div className="mt-6 grid gap-x-8 sm:grid-cols-2">
              {specRows.map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-center justify-between gap-4 border-b border-slate-100 py-3"
                >
                  <span className="text-sm text-slate-500">
                    {label}
                  </span>

                  <span className="text-right text-sm font-medium text-slate-900">
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {variant.features.length > 0 ? (
          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
              Highlights
            </h2>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {variant.features.map((feature) => (
                <div
                  key={feature.id}
                  className="rounded-xl bg-slate-50 p-4"
                >
                  <p className="text-xs font-medium uppercase tracking-[0.12em] text-blue-600">
                    {feature.featureType}
                  </p>

                  <h3 className="mt-2 font-semibold text-slate-950">
                    {feature.featureName}
                  </h3>

                  {feature.description ? (
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      {feature.description}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {variant.ports.length > 0 ? (
          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
              Ports & connectivity
            </h2>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {variant.ports.map((port) => (
                <div
                  key={String(port.id)}
                  className="rounded-xl bg-slate-50 p-4"
                >
                  <p className="font-semibold text-slate-950">
                    {String(port.portType)}
                  </p>

                  {port.version ? (
                    <p className="mt-1 text-sm text-slate-500">
                      Version: {String(port.version)}
                    </p>
                  ) : null}

                  {port.quantity ? (
                    <p className="mt-1 text-sm text-slate-500">
                      Quantity: {String(port.quantity)}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}