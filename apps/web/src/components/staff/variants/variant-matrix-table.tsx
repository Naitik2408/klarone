"use client";

import { useMemo, useState } from "react";
import type {
  StaffMatrixVariant,
  StaffProductOption,
} from "../../../types/staff-catalogue";

export interface VariantMatrixTableProps {
  options: StaffProductOption[];
  variants: StaffMatrixVariant[];
  onOpenVariant?: (variantId: string) => void;
  onDeleteVariant?: (variant: StaffMatrixVariant) => void;
}

function readHex(fields: Record<string, unknown> | undefined): string | null {
  if (!fields) return null;
  const v = fields.hex;
  return typeof v === "string" && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v)
    ? v
    : null;
}

function money(value: string | number | null | undefined): string {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return value == null ? "—" : String(value);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function linkFor(variant: StaffMatrixVariant, optionId: string) {
  return variant.optionValues.find((l) => l.productOptionId === optionId) ?? null;
}

export default function VariantMatrixTable({
  options,
  variants,
  onOpenVariant,
  onDeleteVariant,
}: VariantMatrixTableProps) {
  const optionsWithValues = useMemo(
    () => options.filter((o) => o.values.length > 0),
    [options],
  );
  const [groupByOptionId, setGroupByOptionId] = useState<string | null>(
    optionsWithValues[0]?.id ?? null,
  );
  const effectiveGroupBy =
    groupByOptionId && optionsWithValues.some((o) => o.id === groupByOptionId)
      ? groupByOptionId
      : optionsWithValues[0]?.id ?? null;

  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");

  function toggleGroup(id: string) {
    setExpandedGroups((current) => {
      const copy = new Set(current);
      if (copy.has(id)) copy.delete(id);
      else copy.add(id);
      return copy;
    });
  }

  const groups = useMemo(() => {
    if (!effectiveGroupBy) return [];
    const option = optionsWithValues.find((o) => o.id === effectiveGroupBy);
    if (!option) return [];

    const q = query.trim().toLowerCase();

    return option.values.map((value) => {
      const matchingVariants = variants.filter((variant) => {
        const link = linkFor(variant, option.id);
        return link?.productOptionValueId === value.id;
      });

      const valueMatches = q ? value.value.toLowerCase().includes(q) : true;
      const variantsMatching = q
        ? matchingVariants.filter((v) => {
            const vName = (v.variantName ?? "").toLowerCase();
            const sku = v.sku.toLowerCase();
            const optionText = v.optionValues
              .map((l) => l.value.toLowerCase())
              .join(" ");
            return (
              vName.includes(q) || sku.includes(q) || optionText.includes(q)
            );
          })
        : matchingVariants;

      const filteredVariants = valueMatches ? matchingVariants : variantsMatching;

      const prices = matchingVariants.map((v) => Number(v.sellingPrice));
      const minPrice = prices.length ? Math.min(...prices) : null;
      const maxPrice = prices.length ? Math.max(...prices) : null;
      const totalAvailable = matchingVariants.reduce(
        (sum, v) => sum + v.quantityAvailable,
        0,
      );
      const groupImageUrl =
        matchingVariants.find((v) => v.imageUrl)?.imageUrl ?? null;

      return {
        value,
        variants: filteredVariants,
        allVariantsForValue: matchingVariants,
        minPrice,
        maxPrice,
        totalAvailable,
        groupImageUrl,
      };
    });
  }, [effectiveGroupBy, optionsWithValues, variants, query]);

  const visibleGroups = groups.filter((g) => g.allVariantsForValue.length > 0);

  if (!effectiveGroupBy) {
    return (
      <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50 px-4 py-6 text-center text-[12.5px] text-neutral-500">
        Add an option with at least one value to see the variant matrix.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 bg-white px-4 py-2.5">
        <div className="flex items-center gap-2 text-[12.5px]">
          <span className="text-neutral-600">Group by</span>
          <select
            value={effectiveGroupBy}
            onChange={(e) => setGroupByOptionId(e.target.value)}
            className="rounded-md border border-neutral-200 bg-white px-2 py-1 text-[12.5px] text-neutral-800 outline-none hover:border-neutral-300 focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200"
          >
            {optionsWithValues.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-md border border-neutral-200 bg-white px-2 py-1 focus-within:border-neutral-400 focus-within:ring-2 focus-within:ring-neutral-200">
            <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5 text-neutral-400">
              <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.4" />
              <path
                d="m10.5 10.5 2 2"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
            </svg>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search variants"
              className="w-[160px] border-0 bg-transparent text-[12.5px] outline-none placeholder:text-neutral-400"
            />
          </div>
          <button
            type="button"
            aria-label="Filter"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-neutral-200 text-neutral-500 hover:bg-neutral-50"
          >
            <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
              <path
                d="M2.5 4h11M4.5 8h7M6.5 12h3"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-[40px_minmax(0,2fr)_140px_100px_120px_40px] items-center gap-3 border-b border-neutral-100 bg-[#fafafa] px-4 py-2 text-[11px] font-medium uppercase tracking-wide text-neutral-500">
        <span />
        <span>Variant</span>
        <span>Price</span>
        <span>Available</span>
        <span>Publishing</span>
        <span />
      </div>

      {visibleGroups.length === 0 ? (
        <div className="px-4 py-6 text-center text-[12.5px] text-neutral-500">
          No variants match the current filter.
        </div>
      ) : (
        visibleGroups.map((group) => {
          const expanded = expandedGroups.has(group.value.id);
          const hex = readHex(group.value.metaobjectEntry?.fields);

          return (
            <div
              key={group.value.id}
              className="border-b border-neutral-100 last:border-b-0"
            >
              <button
                type="button"
                onClick={() => toggleGroup(group.value.id)}
                className="grid w-full grid-cols-[40px_minmax(0,2fr)_140px_100px_120px_40px] items-center gap-3 bg-white px-4 py-3 text-left hover:bg-neutral-50"
              >
                <span className="flex items-center justify-center">
                  <span className="flex h-4 w-4 items-center justify-center rounded border border-neutral-300 bg-white" />
                </span>
                <span className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-md border border-neutral-200 bg-white">
                    {group.groupImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={group.groupImageUrl}
                        alt={group.value.value}
                        className="h-full w-full object-cover"
                      />
                    ) : hex ? (
                      <span
                        className="h-4 w-4 rounded"
                        style={{ backgroundColor: hex }}
                      />
                    ) : (
                      <svg
                        viewBox="0 0 16 16"
                        fill="none"
                        className="h-3.5 w-3.5 text-sky-500"
                      >
                        <circle cx="8" cy="8" r="5" stroke="currentColor" strokeWidth="1.6" />
                        <circle cx="8" cy="8" r="1.6" fill="currentColor" />
                      </svg>
                    )}
                  </span>
                  <span className="flex flex-col">
                    <span className="text-[13px] font-medium text-neutral-800">
                      {group.value.value}
                    </span>
                    <span className="text-[11.5px] text-neutral-500">
                      {group.allVariantsForValue.length}{" "}
                      {group.allVariantsForValue.length === 1 ? "variant" : "variants"}
                    </span>
                  </span>
                </span>
                <span className="text-[12.5px] text-neutral-800">
                  {group.minPrice == null
                    ? "—"
                    : group.minPrice === group.maxPrice
                      ? money(group.minPrice)
                      : `${money(group.minPrice)}–${money(group.maxPrice)}`}
                </span>
                <span className="text-[12.5px] text-neutral-800">
                  {group.totalAvailable}
                </span>
                <span className="flex items-center gap-3 text-[11.5px] text-neutral-500">
                  <span className="inline-flex items-center gap-1">
                    <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
                      <circle cx="5.5" cy="5.5" r="2.5" stroke="currentColor" strokeWidth="1.3" />
                      <path
                        d="M9 10.5c0-1.4 1.1-2.5 2.5-2.5S14 9.1 14 10.5"
                        stroke="currentColor"
                        strokeWidth="1.3"
                        strokeLinecap="round"
                      />
                      <path
                        d="M2 13c0-1.4 1.3-2.5 3-2.5S8 11.6 8 13"
                        stroke="currentColor"
                        strokeWidth="1.3"
                        strokeLinecap="round"
                      />
                    </svg>
                    2
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
                      <rect
                        x="3.5"
                        y="3.5"
                        width="9"
                        height="9"
                        rx="1"
                        stroke="currentColor"
                        strokeWidth="1.3"
                      />
                      <path
                        d="M6 6.5h4M6 9h4"
                        stroke="currentColor"
                        strokeWidth="1.3"
                        strokeLinecap="round"
                      />
                    </svg>
                    0
                  </span>
                </span>
                <span className="flex justify-center">
                  <svg
                    viewBox="0 0 16 16"
                    fill="none"
                    className={`h-3.5 w-3.5 text-neutral-500 transition-transform ${
                      expanded ? "rotate-180" : ""
                    }`}
                  >
                    <path
                      d="m4 6 4 4 4-4"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </button>

              {expanded ? (
                <div className="bg-[#fafafa]">
                  {group.allVariantsForValue.map((variant) => {
                    const variantLink = variant.optionValues.find(
                      (l) => l.productOptionId === effectiveGroupBy,
                    );
                    const variantSwatchHex = readHex(
                      variantLink?.metaobjectEntry?.fields,
                    );

                    return (
                      <div
                        key={variant.id}
                        className="grid grid-cols-[40px_minmax(0,2fr)_140px_100px_120px_40px] items-center gap-3 border-t border-neutral-100 px-4 py-2.5 text-[12.5px]"
                      >
                        <span />
                        <span className="flex items-center gap-3">
                          <span className="flex h-6 w-6 items-center justify-center overflow-hidden rounded border border-neutral-200 bg-white">
                            {variant.imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={variant.imageUrl}
                                alt={variant.sku}
                                className="h-full w-full object-cover"
                              />
                            ) : variantSwatchHex ? (
                              <span
                                className="h-3 w-3 rounded"
                                style={{ backgroundColor: variantSwatchHex }}
                              />
                            ) : (
                              <svg
                                viewBox="0 0 16 16"
                                fill="none"
                                className="h-3 w-3 text-neutral-400"
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
                                <path
                                  d="M3 10l2.5-2.5L8 10l2.5-3L13 9.5"
                                  stroke="currentColor"
                                  strokeWidth="1.3"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            )}
                          </span>
                          <button
                            type="button"
                            onClick={() => onOpenVariant?.(variant.id)}
                            className="flex flex-col text-left hover:text-neutral-900"
                          >
                            <span className="text-neutral-800">
                              {(() => {
                                const remaining = variant.optionValues.filter(
                                  (l) => l.productOptionId !== effectiveGroupBy,
                                );
                                if (remaining.length > 0) {
                                  return remaining.map((l) => l.value).join(" / ");
                                }
                                return (
                                  variant.optionValues[0]?.value ||
                                  variant.variantName ||
                                  variant.sku
                                );
                              })()}
                            </span>
                          </button>
                        </span>
                        <span className="text-neutral-800">
                          {money(variant.sellingPrice)}
                        </span>
                        <span className="text-neutral-800">
                          {variant.quantityAvailable}
                        </span>
                        <span className="text-[11.5px] text-neutral-500">
                          {variant.status === "ACTIVE" ? "Active" : "Inactive"}
                        </span>
                        <span className="flex justify-center">
                          {onDeleteVariant ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteVariant(variant);
                              }}
                              aria-label={`Delete variant ${variant.sku}`}
                              className="flex h-6 w-6 items-center justify-center rounded-md border border-transparent text-neutral-400 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                            >
                              <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
                                <path
                                  d="M3.5 4.5h9M6 4.5V3h4v1.5M5 6.5v6M8 6.5v6M11 6.5v6M4.5 4.5l.5 9.5h6l.5-9.5"
                                  stroke="currentColor"
                                  strokeWidth="1.4"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            </button>
                          ) : null}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })
      )}

      <div className="border-t border-neutral-100 bg-white px-4 py-2 text-[11.5px] text-neutral-500">
        Total inventory at AJC BOSE ROAD KOLKATA:{" "}
        {variants.reduce((sum, v) => sum + v.quantityAvailable, 0)} available
      </div>
    </div>
  );
}