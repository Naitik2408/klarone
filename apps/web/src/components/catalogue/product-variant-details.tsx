"use client";

import { useState } from "react";
import { AddToCartButton } from "../cart/add-to-cart-button";
import type { CatalogueProductDetail } from "../../types/catalogue";

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

export function ProductVariantDetails({
  product,
}: {
  product: CatalogueProductDetail;
}) {
  const [selectedVariantId, setSelectedVariantId] = useState(
    product.variants[0]?.id ?? "",
  );

  const variant =
    product.variants.find(
      (item) => item.id === selectedVariantId,
    ) ?? product.variants[0];

  if (!variant) {
    return null;
  }

  const specification = variant.specification;

  const specRows = [
    [
      "Processor",
      getSpecificationValue(
        specification,
        "cpuModel",
      ),
    ],
    [
      "CPU cores",
      getSpecificationValue(
        specification,
        "cpuCores",
      ),
    ],
    [
      "CPU threads",
      getSpecificationValue(
        specification,
        "cpuThreads",
      ),
    ],
    [
      "Graphics",
      getSpecificationValue(
        specification,
        "gpuModel",
      ),
    ],
    [
      "Display",
      (() => {
        const value = getSpecificationValue(
          specification,
          "displaySizeInches",
        );

        return value ? `${value}"` : null;
      })(),
    ],
    [
      "Resolution",
      getSpecificationValue(
        specification,
        "displayResolution",
      ),
    ],
    [
      "Panel",
      getSpecificationValue(
        specification,
        "displayPanelType",
      ),
    ],
    [
      "Refresh rate",
      (() => {
        const value = getSpecificationValue(
          specification,
          "displayRefreshRateHz",
        );

        return value ? `${value}Hz` : null;
      })(),
    ],
    [
      "Battery",
      (() => {
        const value = getSpecificationValue(
          specification,
          "batteryCapacityWh",
        );

        return value ? `${value}Wh` : null;
      })(),
    ],
    [
      "Weight",
      (() => {
        const value = getSpecificationValue(
          specification,
          "weightKg",
        );

        return value ? `${value}kg` : null;
      })(),
    ],
    [
      "Wi-Fi",
      getSpecificationValue(
        specification,
        "wifiVersion",
      ),
    ],
    [
      "Bluetooth",
      getSpecificationValue(
        specification,
        "bluetoothVersion",
      ),
    ],
  ].filter(
    (item): item is [string, string] =>
      Boolean(item[1]),
  );

  return (
    <>
      {/* Configuration */}
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">
          Configuration
        </p>

        {product.variants.length > 1 ? (
          <div className="mt-4 grid gap-3">
            {product.variants.map((item) => {
              const isSelected =
                item.id === variant.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() =>
                    setSelectedVariantId(item.id)
                  }
                  className={`w-full rounded-xl border p-4 text-left transition ${
                    isSelected
                      ? "border-blue-600 bg-blue-50 ring-1 ring-blue-600"
                      : "border-slate-200 bg-white hover:border-slate-400"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-slate-950">
                        {item.variantName ??
                          `${item.ramGb ?? ""}GB / ${
                            formatStorage(
                              item.storageGb,
                            ) ?? ""
                          }`}
                      </p>

                      <div className="mt-2 flex flex-wrap gap-2">
                        {item.ramGb ? (
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                            {item.ramGb}GB RAM
                          </span>
                        ) : null}

                        {item.storageGb ? (
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                            {formatStorage(
                              item.storageGb,
                            )}{" "}
                            SSD
                          </span>
                        ) : null}

                        {item.operatingSystem ? (
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                            {item.operatingSystem}
                          </span>
                        ) : null}

                        {item.color ? (
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                            {item.color}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <span className="shrink-0 text-sm font-semibold text-slate-950">
                      {formatPrice(
                        item.sellingPrice,
                        item.currency,
                      )}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        ) : null}

        <h2 className="mt-5 text-lg font-semibold text-slate-950">
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

      {/* Price & Cart */}
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

      {/* Specifications */}
      {specRows.length > 0 ? (
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
            Specifications
          </h2>

          <div className="mt-6 grid gap-x-8 sm:grid-cols-2">
            {specRows.map(
              ([label, value]) => (
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
              ),
            )}
          </div>
        </section>
      ) : null}

      {/* Highlights */}
      {variant.features.length > 0 ? (
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
            Highlights
          </h2>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {variant.features.map(
              (feature) => (
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
              ),
            )}
          </div>
        </section>
      ) : null}

      {/* Ports */}
      {variant.ports.length > 0 ? (
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
            Ports & connectivity
          </h2>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {variant.ports.map(
              (port, index) => (
                <div
                  key={String(
                    port.id ?? index,
                  )}
                  className="rounded-xl bg-slate-50 p-4"
                >
                  <p className="font-semibold text-slate-950">
                    {String(
                      port.portType,
                    )}
                  </p>

                  {port.version ? (
                    <p className="mt-1 text-sm text-slate-500">
                      Version:{" "}
                      {String(
                        port.version,
                      )}
                    </p>
                  ) : null}

                  {port.quantity ? (
                    <p className="mt-1 text-sm text-slate-500">
                      Quantity:{" "}
                      {String(
                        port.quantity,
                      )}
                    </p>
                  ) : null}
                </div>
              ),
            )}
          </div>
        </section>
      ) : null}
    </>
  );
}