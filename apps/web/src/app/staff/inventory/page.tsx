"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  clearStaffAccessToken,
  getStaffAccessToken,
} from "../../../lib/staff-auth-api";
import {
  adjustInventory,
  getInitializationCandidates,
  getInventory,
  getWarehouses,
  initializeInventory,
  StaffInventoryApiError,
} from "../../../lib/staff-inventory-api";
import type {
  StaffInventoryCandidate,
  StaffInventoryItem,
  StaffWarehouse,
} from "../../../types/staff-inventory";

function money(value: string) {
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

function sellable(item: StaffInventoryItem) {
  return Math.max(item.quantityAvailable - item.quantityReserved, 0);
}

/* Variant pill — matches Shopify's gray variant chip */
function VariantPill({ label }: { label: string }) {
  if (!label) return null;
  return (
    <span className="inline-flex max-w-full items-center truncate rounded-md bg-neutral-100 px-1.5 py-0.5 text-[11.5px] font-normal text-neutral-600">
      {label}
    </span>
  );
}

export default function StaffInventoryPage() {
  const router = useRouter();

  const [token, setToken] = useState<string | null>(null);

  const [warehouses, setWarehouses] = useState<StaffWarehouse[]>([]);
  const [items, setItems] = useState<StaffInventoryItem[]>([]);
  const [warehouseId, setWarehouseId] = useState<number | "">("");

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [locationMenuOpen, setLocationMenuOpen] = useState(false);

  const [initializeOpen, setInitializeOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<StaffInventoryItem | null>(null);

  const [candidates, setCandidates] = useState<StaffInventoryCandidate[]>([]);
  const [candidateSearch, setCandidateSearch] = useState("");
  const [initVariantId, setInitVariantId] = useState("");
  const [initQuantity, setInitQuantity] = useState("0");
  const [initReorderLevel, setInitReorderLevel] = useState("");
  const [initNotes, setInitNotes] = useState("");

  const [adjustDelta, setAdjustDelta] = useState("");
  const [adjustNotes, setAdjustNotes] = useState("");

  const selectedWarehouse = useMemo(
    () => warehouses.find((w) => w.id === warehouseId) ?? null,
    [warehouses, warehouseId],
  );

  // Close the location dropdown when clicking outside
  useEffect(() => {
    if (!locationMenuOpen) return;
    function handleClick(event: MouseEvent) {
      const target = event.target as HTMLElement;
      if (!target.closest("[data-location-filter]")) {
        setLocationMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [locationMenuOpen]);

  async function loadInventory(
    activeToken: string,
    selectedWarehouseId: number | "",
    currentSearch: string,
  ) {
    try {
      setLoading(true);
      setError("");

      const result = await getInventory(activeToken, {
        warehouseId:
          typeof selectedWarehouseId === "number" ? selectedWarehouseId : undefined,
        search: currentSearch,
      });

      setItems(result.items);
    } catch (error) {
      if (error instanceof StaffInventoryApiError && error.status === 401) {
        clearStaffAccessToken();
        router.replace("/staff/login");
        return;
      }
      setError(error instanceof Error ? error.message : "Unable to load inventory.");
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
    const staffToken = activeToken;
    setToken(staffToken);

    async function load() {
      try {
        setError("");
        const warehouseResult = await getWarehouses(staffToken);
        setWarehouses(warehouseResult);

        if (warehouseResult.length > 0) {
          const firstWarehouse = warehouseResult[0];
          if (firstWarehouse) {
            setWarehouseId(firstWarehouse.id);
            await loadInventory(staffToken, firstWarehouse.id, "");
          }
        } else {
          await loadInventory(staffToken, "", "");
        }
      } catch (error) {
        if (error instanceof StaffInventoryApiError && error.status === 401) {
          clearStaffAccessToken();
          router.replace("/staff/login");
          return;
        }
        setError(
          error instanceof Error ? error.message : "Unable to load staff inventory.",
        );
        setLoading(false);
      }
    }

    void load();
  }, [router]);

  async function refresh() {
    if (!token) return;
    await loadInventory(token, warehouseId, search);
  }

  function selectLocation(nextValue: number | "") {
    setLocationMenuOpen(false);
    if (nextValue === warehouseId) return;
    setWarehouseId(nextValue);
    if (token) void loadInventory(token, nextValue, search);
  }

  async function openInitialize() {
    if (!token || typeof warehouseId !== "number") {
      setError("Select a warehouse first.");
      return;
    }

    setActionLoading(true);
    setError("");

    try {
      const result = await getInitializationCandidates(token, {
        warehouseId,
        search: candidateSearch,
      });
      setCandidates(result);
      setInitVariantId(result[0]?.id ?? "");
      setInitializeOpen(true);
    } catch (error) {
      if (error instanceof StaffInventoryApiError && error.status === 401) {
        clearStaffAccessToken();
        router.replace("/staff/login");
        return;
      }
      setError(
        error instanceof Error ? error.message : "Unable to load initialization candidates.",
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function submitInitialize(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || typeof warehouseId !== "number") return;

    setActionLoading(true);
    setError("");

    try {
      await initializeInventory(token, {
        productVariantId: initVariantId,
        warehouseId,
        initialQuantity: Number.parseInt(initQuantity, 10),
        reorderLevel: initReorderLevel.trim()
          ? Number.parseInt(initReorderLevel, 10)
          : null,
        notes: initNotes.trim() || null,
      });

      setInitializeOpen(false);
      setInitQuantity("0");
      setInitReorderLevel("");
      setInitNotes("");
      setCandidateSearch("");
      setInitVariantId("");

      await refresh();
    } catch (error) {
      if (error instanceof StaffInventoryApiError && error.status === 401) {
        clearStaffAccessToken();
        router.replace("/staff/login");
        return;
      }
      setError(error instanceof Error ? error.message : "Unable to initialize inventory.");
    } finally {
      setActionLoading(false);
    }
  }

  function openAdjust(item: StaffInventoryItem) {
    setSelectedItem(item);
    setAdjustDelta("");
    setAdjustNotes("");
    setError("");
    setAdjustOpen(true);
  }

  async function submitAdjust(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !selectedItem) return;

    const delta = Number.parseInt(adjustDelta, 10);
    if (!Number.isInteger(delta) || delta === 0) {
      setError("Enter a non-zero whole number.");
      return;
    }

    setActionLoading(true);
    setError("");

    try {
      await adjustInventory(token, {
        productVariantId: selectedItem.productVariantId,
        warehouseId: selectedItem.warehouseId,
        quantityDelta: delta,
        notes: adjustNotes.trim() || null,
      });

      setAdjustOpen(false);
      setSelectedItem(null);
      setAdjustDelta("");
      setAdjustNotes("");

      await refresh();
    } catch (error) {
      if (error instanceof StaffInventoryApiError && error.status === 401) {
        clearStaffAccessToken();
        router.replace("/staff/login");
        return;
      }
      setError(error instanceof Error ? error.message : "Unable to adjust inventory.");
    } finally {
      setActionLoading(false);
    }
  }

  /* Inline Popover Editing State */
  const [inlineEditingItemId, setInlineEditingItemId] = useState<string | null>(null);
  const [inlineMode, setInlineMode] = useState<"set" | "add">("set");
  const [inlineValue, setInlineValue] = useState<string>("");
  const [inlineReason, setInlineReason] = useState<string>("LOCATION");
  const [inlineSubmitting, setInlineSubmitting] = useState<boolean>(false);
  const [reasonDropdownOpen, setReasonDropdownOpen] = useState<boolean>(false);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);

  function openInlineEdit(item: StaffInventoryItem, e: React.MouseEvent) {
    e.stopPropagation();
    setInlineEditingItemId(item.id);
    setInlineMode("set");
    setInlineValue(String(sellable(item)));
    setInlineReason("LOCATION");
    setReasonDropdownOpen(false);
  }

  function closeInlineEdit() {
    setInlineEditingItemId(null);
    setInlineValue("");
    setReasonDropdownOpen(false);
  }

  async function handleInlineSave(item: StaffInventoryItem) {
    if (!token) return;
    const num = Number.parseInt(inlineValue, 10);
    if (!Number.isFinite(num)) {
      setError("Please enter a valid whole number.");
      return;
    }

    let delta = 0;
    const currentSellable = sellable(item);
    if (inlineMode === "set") {
      delta = num - currentSellable;
    } else {
      delta = num;
    }

    if (delta === 0) {
      closeInlineEdit();
      return;
    }

    try {
      setInlineSubmitting(true);
      setError("");
      const reasonLabel =
        inlineReason === "LOCATION"
          ? null
          : inlineReason;

      await adjustInventory(token, {
        productVariantId: item.productVariantId,
        warehouseId: item.warehouseId,
        quantityDelta: delta,
        notes: reasonLabel,
      });

      closeInlineEdit();
      await refresh();
    } catch (err) {
      if (err instanceof StaffInventoryApiError && err.status === 401) {
        clearStaffAccessToken();
        router.replace("/staff/login");
        return;
      }
      setError(err instanceof Error ? err.message : "Unable to adjust inventory.");
    } finally {
      setInlineSubmitting(false);
    }
  }

  const allSelected = items.length > 0 && selectedItemIds.length === items.length;
  const someSelected = selectedItemIds.length > 0 && selectedItemIds.length < items.length;

  const activeLocationLabel =
    warehouseId === "" ? "All locations" : (selectedWarehouse?.name ?? "Location");

  return (
    <div className="min-h-screen bg-white text-[13px] text-[#303030]" onClick={() => closeInlineEdit()}>
      <div className="mx-auto max-w-[1300px] px-6 pt-5 pb-4">
        {/* -------------------- Top Bar / Header -------------------- */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white border border-[#e3e3e3] text-[#303030] shadow-xs">
              <svg
                width="16"
                height="16"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
              >
                <path
                  d="M3 6.5 10 3l7 3.5v7L10 17l-7-3.5v-7Z"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinejoin="round"
                />
                <path
                  d="m3.4 6.7 6.6 3.3 6.6-3.3M10 10v7"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <h1 className="text-[20px] font-semibold text-[#1a1a1a]">
              Inventory
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled
              title="Coming soon"
              className="inline-flex h-8 items-center justify-center rounded-lg border border-[#d4d4d4] bg-white px-3 text-[13px] font-medium text-[#303030] shadow-xs hover:bg-[#f7f7f7] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Export
            </button>
            <button
              type="button"
              onClick={() => void openInitialize()}
              disabled={actionLoading || typeof warehouseId !== "number"}
              className="inline-flex h-8 items-center justify-center rounded-lg border border-[#d4d4d4] bg-white px-3 text-[13px] font-medium text-[#303030] shadow-xs hover:bg-[#f7f7f7] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Import
            </button>
          </div>
        </div>

        {/* ----------------- Body ----------------- */}
        <div>
        {error ? (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-[13px] text-red-700">
            <svg
              viewBox="0 0 20 20"
              fill="currentColor"
              className="mt-0.5 h-4 w-4 shrink-0"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16ZM9 5.75a1 1 0 0 1 2 0v4.5a1 1 0 0 1-2 0v-4.5Zm1 8.5a1.125 1.125 0 1 0 0-2.25 1.125 1.125 0 0 0 0 2.25Z"
                clipRule="evenodd"
              />
            </svg>
            <span>{error}</span>
          </div>
        ) : null}

        {/* Search + filter bar */}
        <div className="flex items-stretch gap-0 rounded-xl border border-neutral-200 bg-white shadow-xs">
          {/* Left: Location filter dropdown */}
          <div className="relative" data-location-filter>
            <button
              type="button"
              onClick={() => setLocationMenuOpen((open) => !open)}
              aria-haspopup="listbox"
              aria-expanded={locationMenuOpen}
              className="flex h-full items-center gap-1 border-r border-neutral-200 px-3 text-[13px] text-neutral-700 hover:bg-neutral-50"
            >
              <span className="font-medium">{activeLocationLabel}</span>
              <svg
                viewBox="0 0 16 16"
                fill="none"
                className="h-3.5 w-3.5 text-neutral-500"
                aria-hidden="true"
              >
                <path
                  d="m5 7 3-3 3 3M5 9l3 3 3-3"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            {locationMenuOpen ? (
              <div
                role="listbox"
                className="absolute top-full left-0 z-50 mt-1 w-56 overflow-hidden rounded-lg border border-neutral-200 bg-white py-1 shadow-lg"
              >
                <button
                  type="button"
                  role="option"
                  aria-selected={warehouseId === ""}
                  onClick={() => selectLocation("")}
                  className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-[13px] hover:bg-neutral-50 ${
                    warehouseId === ""
                      ? "font-medium text-neutral-900"
                      : "text-neutral-700"
                  }`}
                >
                  All locations
                  {warehouseId === "" ? (
                    <svg
                      viewBox="0 0 16 16"
                      fill="none"
                      className="h-3.5 w-3.5 text-neutral-800"
                      aria-hidden="true"
                    >
                      <path
                        d="m3.5 8.5 3 3 6-6.5"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : null}
                </button>

                {warehouses.length > 0 ? (
                  <div className="my-1 border-t border-neutral-100" />
                ) : null}

                {warehouses.map((w) => (
                  <button
                    key={w.id}
                    type="button"
                    role="option"
                    aria-selected={warehouseId === w.id}
                    onClick={() => selectLocation(w.id)}
                    className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-[13px] hover:bg-neutral-50 ${
                      warehouseId === w.id
                        ? "font-medium text-neutral-900"
                        : "text-neutral-700"
                    }`}
                  >
                    <span className="truncate">{w.name}</span>
                    {warehouseId === w.id ? (
                      <svg
                        viewBox="0 0 16 16"
                        fill="none"
                        className="h-3.5 w-3.5 text-neutral-800 shrink-0"
                        aria-hidden="true"
                      >
                        <path
                          d="m3.5 8.5 3 3 6-6.5"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    ) : null}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          {/* Center: Search input */}
          <div className="relative flex-1">
            <svg
              viewBox="0 0 16 16"
              fill="none"
              className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-neutral-500"
              aria-hidden="true"
            >
              <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5" />
              <path
                d="m10.5 10.5 3 3"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void refresh();
              }}
              placeholder="Search and filter"
              className="h-full w-full bg-transparent py-2.5 pr-3 pl-9 text-[13px] text-neutral-800 outline-none placeholder:text-neutral-500"
            />
          </div>

          {/* Right: Refresh only */}
          <div className="flex items-center gap-1 border-l border-neutral-200 px-3 py-2">
            <button
              type="button"
              onClick={() => void refresh()}
              disabled={loading}
              aria-label="Refresh"
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-neutral-600 hover:bg-neutral-100 disabled:opacity-50"
            >
              <svg
                viewBox="0 0 16 16"
                fill="none"
                className="h-4 w-4"
                aria-hidden="true"
              >
                <path
                  d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9M13.5 3v3h-3"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* ----------------- Table ----------------- */}
        <div className="mt-3 overflow-visible rounded-xl border border-neutral-200 bg-white shadow-xs">
          <div className="overflow-x-auto overflow-y-visible">
            <div className="min-w-[1020px]">
              {/* Header */}
              <div className="grid grid-cols-[40px_minmax(280px,2.4fr)_minmax(110px,0.9fr)_minmax(90px,0.8fr)_minmax(90px,0.8fr)_minmax(100px,0.9fr)_minmax(90px,0.8fr)_minmax(90px,0.8fr)] items-center gap-2 border-b border-neutral-200 bg-white px-4 py-2.5 text-[12px] font-medium text-neutral-600">
                <div className="flex justify-center">
                  <input
                    type="checkbox"
                    aria-label="Select all"
                    checked={allSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someSelected;
                    }}
                    onChange={(e) =>
                      setSelectedItemIds(
                        e.target.checked ? items.map((it) => it.id) : [],
                      )
                    }
                    className="h-3.5 w-3.5 rounded border-neutral-300 accent-neutral-900"
                  />
                </div>
                <div>Product</div>
                <div>SKU</div>
                <div className="text-right">
                  <span className="cursor-help border-b border-dotted border-neutral-400" title="Damaged, quality control, or safety stock">
                    Unavailable
                  </span>
                </div>
                <div className="text-right">
                  <span className="cursor-help border-b border-dotted border-neutral-400" title="Reserved for existing draft or confirmed orders">
                    Committed
                  </span>
                </div>
                <div className="text-right">
                  <span className="cursor-help border-b border-dotted border-neutral-400 font-semibold text-neutral-800" title="Units ready to be sold">
                    Available
                  </span>
                </div>
                <div className="text-right">
                  <span className="cursor-help border-b border-dotted border-neutral-400" title="Physical inventory count in the warehouse">
                    On hand
                  </span>
                </div>
                <div className="text-right">
                  <span className="cursor-help border-b border-dotted border-neutral-400" title="Purchase orders in transit">
                    Incoming
                  </span>
                </div>
              </div>

              {/* Rows */}
              {loading ? (
                <div className="flex items-center justify-center gap-2 py-16 text-[13px] text-neutral-500">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-800" />
                  Loading inventory...
                </div>
              ) : items.length === 0 ? (
                <div className="py-20 text-center">
                  <p className="text-[13px] text-neutral-500">
                    {search
                      ? "No inventory records match your search"
                      : "No inventory records found in this warehouse"}
                  </p>
                  <button
                    type="button"
                    onClick={() => void openInitialize()}
                    disabled={typeof warehouseId !== "number"}
                    className="mt-3 text-[13px] font-medium text-blue-600 hover:underline disabled:opacity-50"
                  >
                    Initialize inventory
                  </button>
                </div>
              ) : (
                items.map((item) => {
                  const sellableUnits = sellable(item);
                  const onHand = item.quantityAvailable;
                  const committed = item.quantityReserved;
                  const unavailable = 0;
                  const incoming = 0;
                  const isEditing = inlineEditingItemId === item.id;

                  const variantLabel = [
                    item.productVariant.variantName &&
                    item.productVariant.variantName !== "Default"
                      ? item.productVariant.variantName
                      : null,
                    item.productVariant.ramGb
                      ? `${item.productVariant.ramGb}GB`
                      : null,
                    item.productVariant.storageGb
                      ? storageLabel(item.productVariant.storageGb)
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" / ");

                  return (
                    <div
                      key={item.id}
                      className={`relative grid grid-cols-[40px_minmax(280px,2.4fr)_minmax(110px,0.9fr)_minmax(90px,0.8fr)_minmax(90px,0.8fr)_minmax(100px,0.9fr)_minmax(90px,0.8fr)_minmax(90px,0.8fr)] items-center gap-2 border-b border-neutral-100 px-4 py-2.5 transition-colors last:border-b-0 ${
                        isEditing ? "bg-neutral-50/70" : "hover:bg-neutral-50"
                      }`}
                    >
                      {/* Checkbox */}
                      <div
                        className="flex justify-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          aria-label={`Select ${item.productVariant.product.name}`}
                          checked={selectedItemIds.includes(item.id)}
                          onChange={(e) =>
                            setSelectedItemIds((curr) =>
                              e.target.checked
                                ? [...curr, item.id]
                                : curr.filter((id) => id !== item.id),
                            )
                          }
                          className="h-3.5 w-3.5 rounded border-neutral-300 accent-neutral-900"
                        />
                      </div>

                      {/* Product */}
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md border border-neutral-200 bg-neutral-100 text-[10px] font-semibold text-neutral-500">
                          {item.productVariant.product.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <span className="block truncate text-[13px] font-medium text-neutral-900">
                            {item.productVariant.product.name}
                          </span>
                          {variantLabel && (
                            <div className="mt-0.5">
                              <VariantPill label={variantLabel} />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* SKU */}
                      <div className="truncate text-[12.5px] text-neutral-600">
                        {item.productVariant.sku || (
                          <span className="text-neutral-400">No SKU</span>
                        )}
                      </div>

                      {/* Unavailable */}
                      <div className="text-right text-[13px] tabular-nums text-neutral-500">
                        {unavailable}
                      </div>

                      {/* Committed */}
                      <div className="text-right text-[13px] tabular-nums text-neutral-500">
                        {committed}
                      </div>

                      {/* Available (Clickable to inline popover editor) */}
                      <div className="relative flex justify-end">
                        <button
                          type="button"
                          onClick={(e) => openInlineEdit(item, e)}
                          className={`group flex min-w-[54px] items-center justify-end rounded-md px-2 py-1 text-right text-[13px] font-medium tabular-nums transition-all ${
                            isEditing
                              ? "bg-neutral-200/90 text-neutral-900 shadow-inner"
                              : "text-neutral-900 hover:bg-neutral-100 hover:ring-1 hover:ring-neutral-300"
                          }`}
                        >
                          {sellableUnits}
                        </button>

                        {/* Inline Popover (Shopify matching) */}
                        {isEditing && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="absolute right-0 top-1/2 z-50 -translate-y-1/2 flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white p-1.5 shadow-xl animate-in fade-in zoom-in-95 duration-150"
                          >
                            {/* Mode toggle ('Set to' / 'Add') + Quantity Input */}
                            <div className="flex h-8 items-center rounded-lg border border-neutral-200 bg-white px-1 text-[13px] shadow-2xs focus-within:border-neutral-400">
                              <div className="relative flex items-center pr-1 border-r border-neutral-200 text-neutral-700">
                                <select
                                  value={inlineMode}
                                  onChange={(e) =>
                                    setInlineMode(e.target.value as "set" | "add")
                                  }
                                  className="appearance-none bg-transparent py-1 pr-4 pl-1 text-[12.5px] font-normal text-neutral-800 outline-none cursor-pointer"
                                >
                                  <option value="set">Set to</option>
                                  <option value="add">Add</option>
                                </select>
                                <svg
                                  viewBox="0 0 16 16"
                                  fill="none"
                                  className="pointer-events-none absolute right-1 h-3 w-3 text-neutral-500"
                                >
                                  <path
                                    d="m4 6 4 4 4-4"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                  />
                                </svg>
                              </div>
                              <input
                                autoFocus
                                type="number"
                                value={inlineValue}
                                onChange={(e) => setInlineValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") void handleInlineSave(item);
                                  if (e.key === "Escape") closeInlineEdit();
                                }}
                                className="w-16 bg-transparent px-2 text-right text-[13px] font-medium text-neutral-900 outline-none tabular-nums"
                              />
                            </div>

                            {/* Location / Reason dropdown */}
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() => setReasonDropdownOpen(!reasonDropdownOpen)}
                                className="flex h-8 items-center gap-2 rounded-lg border border-neutral-200 bg-white px-2.5 text-[12px] font-medium text-neutral-800 shadow-2xs hover:bg-neutral-50"
                              >
                                <span className="max-w-[160px] truncate uppercase tracking-tight">
                                  {inlineReason === "LOCATION"
                                    ? item.warehouse.name || "Default Warehouse"
                                    : inlineReason}
                                </span>
                                <svg
                                  viewBox="0 0 16 16"
                                  fill="none"
                                  className="h-3 w-3 text-neutral-500 shrink-0"
                                >
                                  <path
                                    d="m5 6 3-3 3 3M5 10l3 3 3-3"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                  />
                                </svg>
                              </button>

                              {/* Dropdown menu */}
                              {reasonDropdownOpen && (
                                <div className="absolute right-0 top-full mt-1.5 w-60 z-60 rounded-xl border border-neutral-200 bg-white py-1.5 shadow-xl animate-in fade-in zoom-in-95 duration-100">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setInlineReason("LOCATION");
                                      setReasonDropdownOpen(false);
                                    }}
                                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12.5px] hover:bg-neutral-100 text-neutral-900"
                                  >
                                    <span className="w-4 text-neutral-800">
                                      {inlineReason === "LOCATION" ? "✓" : ""}
                                    </span>
                                    <span className="font-medium uppercase truncate">
                                      {item.warehouse.name || "Default Warehouse"}
                                    </span>
                                  </button>

                                  <div className="my-1 border-t border-neutral-100" />

                                  {[
                                    "Damaged (Unavailable)",
                                    "Quality control (Unavailable)",
                                    "Safety stock (Unavailable)",
                                    "Other (Unavailable)",
                                  ].map((r) => (
                                    <button
                                      key={r}
                                      type="button"
                                      onClick={() => {
                                        setInlineReason(r);
                                        setReasonDropdownOpen(false);
                                      }}
                                      className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] text-neutral-700 hover:bg-neutral-100"
                                    >
                                      <span className="w-4 text-neutral-800">
                                        {inlineReason === r ? "✓" : ""}
                                      </span>
                                      <span>{r}</span>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Full Modal Adjust button (Icon) */}
                            <button
                              type="button"
                              title="Full adjustment form"
                              onClick={() => {
                                closeInlineEdit();
                                openAdjust(item);
                              }}
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 text-neutral-600 hover:bg-neutral-100"
                            >
                              <svg
                                viewBox="0 0 16 16"
                                fill="none"
                                className="h-3.5 w-3.5"
                              >
                                <rect
                                  x="2.5"
                                  y="2.5"
                                  width="11"
                                  height="11"
                                  rx="2"
                                  stroke="currentColor"
                                  strokeWidth="1.3"
                                />
                                <path
                                  d="M6 8h4M8 6v4"
                                  stroke="currentColor"
                                  strokeWidth="1.3"
                                  strokeLinecap="round"
                                />
                              </svg>
                            </button>

                            {/* Save / Apply Checkmark */}
                            <button
                              type="button"
                              disabled={inlineSubmitting}
                              onClick={() => void handleInlineSave(item)}
                              className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-900 text-white hover:bg-neutral-800 disabled:opacity-50 shadow-xs"
                            >
                              {inlineSubmitting ? (
                                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                              ) : (
                                <svg
                                  viewBox="0 0 16 16"
                                  fill="none"
                                  className="h-4 w-4"
                                >
                                  <path
                                    d="m3.5 8.5 3 3 6-7"
                                    stroke="currentColor"
                                    strokeWidth="1.8"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                              )}
                            </button>
                          </div>
                        )}
                      </div>

                      {/* On hand */}
                      <div className="text-right text-[13px] tabular-nums text-neutral-900">
                        {onHand}
                      </div>

                      {/* Incoming */}
                      <div className="text-right text-[13px] tabular-nums text-neutral-500">
                        {incoming}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Footer helper */}
        <div className="mt-6 text-center text-[12px] text-neutral-600">
          <a href="#" className="hover:underline">
            Learn more about managing inventory
          </a>
        </div>
      </div>
      </div>

      {/* ----------------- Initialize Modal ----------------- */}
      {initializeOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form
            onSubmit={submitInitialize}
            className="w-full max-w-lg overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4">
              <div>
                <h3 className="text-[15px] font-semibold text-neutral-900">
                  Initialize inventory
                </h3>
                <p className="text-[12px] text-neutral-500">
                  Warehouse:{" "}
                  <span className="font-medium text-neutral-700">
                    {selectedWarehouse?.name}
                  </span>{" "}
                  ({selectedWarehouse?.code})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInitializeOpen(false)}
                className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
              >
                <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4">
                  <path
                    d="m4 4 8 8M12 4 4 12"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>

            <div className="space-y-4 p-6 text-[13px]">
              <div>
                <label className="mb-1 block text-[12px] font-medium text-neutral-700">
                  Search variant
                </label>
                <input
                  value={candidateSearch}
                  onChange={(event) => setCandidateSearch(event.target.value)}
                  onKeyDown={async (event) => {
                    if (event.key !== "Enter") return;
                    event.preventDefault();

                    if (token && typeof warehouseId === "number") {
                      try {
                        setActionLoading(true);
                        setError("");
                        const result = await getInitializationCandidates(token, {
                          warehouseId,
                          search: candidateSearch,
                        });
                        setCandidates(result);
                        setInitVariantId(result[0]?.id ?? "");
                      } catch (error) {
                        if (
                          error instanceof StaffInventoryApiError &&
                          error.status === 401
                        ) {
                          clearStaffAccessToken();
                          router.replace("/staff/login");
                          return;
                        }
                        setError(
                          error instanceof Error
                            ? error.message
                            : "Unable to search product variants.",
                        );
                      } finally {
                        setActionLoading(false);
                      }
                    }
                  }}
                  placeholder="Type product name or SKU and press Enter"
                  className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-[13px] text-neutral-800 outline-none placeholder:text-neutral-400 focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200"
                />
              </div>

              <div>
                <label className="mb-1 block text-[12px] font-medium text-neutral-700">
                  Select product variant *
                </label>
                <select
                  value={initVariantId}
                  onChange={(event) => setInitVariantId(event.target.value)}
                  required
                  className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-[13px] text-neutral-800 outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200"
                >
                  <option value="">Select variant</option>
                  {candidates.map((candidate) => (
                    <option key={candidate.id} value={candidate.id}>
                      {candidate.product.name} · {candidate.variantName} (SKU:{" "}
                      {candidate.sku})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[12px] font-medium text-neutral-700">
                    Initial quantity *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={initQuantity}
                    onChange={(event) => setInitQuantity(event.target.value)}
                    required
                    className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-[13px] text-neutral-800 outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[12px] font-medium text-neutral-700">
                    Reorder level
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={initReorderLevel}
                    onChange={(event) => setInitReorderLevel(event.target.value)}
                    placeholder="Optional (e.g. 5)"
                    className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-[13px] text-neutral-800 outline-none placeholder:text-neutral-400 focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-[12px] font-medium text-neutral-700">
                  Notes
                </label>
                <textarea
                  value={initNotes}
                  onChange={(event) => setInitNotes(event.target.value)}
                  placeholder="Optional reference, PO number, or supplier receipt notes..."
                  rows={2}
                  className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-[13px] text-neutral-800 outline-none placeholder:text-neutral-400 focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-neutral-200 bg-[#fafafa] px-6 py-3">
              <button
                type="button"
                onClick={() => setInitializeOpen(false)}
                className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-[13px] font-medium text-neutral-700 hover:bg-neutral-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading || !initVariantId}
                className="rounded-lg bg-neutral-900 px-3.5 py-1.5 text-[13px] font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
              >
                {actionLoading ? "Saving..." : "Initialize"}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {/* ----------------- Adjust Modal ----------------- */}
      {adjustOpen && selectedItem ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form
            onSubmit={submitAdjust}
            className="w-full max-w-md overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4">
              <div>
                <h3 className="text-[15px] font-semibold text-neutral-900">
                  Adjust stock
                </h3>
                <p className="text-[12px] text-neutral-500">
                  {selectedItem.productVariant.product.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setAdjustOpen(false);
                  setSelectedItem(null);
                }}
                className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
              >
                <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4">
                  <path
                    d="m4 4 8 8M12 4 4 12"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>

            <div className="space-y-4 p-6 text-[13px]">
              <div className="rounded-lg border border-neutral-200 bg-neutral-50/60 p-3">
                <div className="flex items-center justify-between text-[12px] text-neutral-600">
                  <span>
                    SKU:{" "}
                    <strong className="text-neutral-800">
                      {selectedItem.productVariant.sku}
                    </strong>
                  </span>
                  <span>
                    Warehouse:{" "}
                    <strong className="text-neutral-800">
                      {selectedItem.warehouse.code}
                    </strong>
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-4 border-t border-neutral-200/60 pt-2 text-[12.5px]">
                  <div>
                    <span className="text-neutral-500">Available: </span>
                    <strong className="text-neutral-900">
                      {selectedItem.quantityAvailable}
                    </strong>
                  </div>
                  <div>
                    <span className="text-neutral-500">Reserved: </span>
                    <strong className="text-neutral-900">
                      {selectedItem.quantityReserved}
                    </strong>
                  </div>
                  <div>
                    <span className="text-neutral-500">Sellable: </span>
                    <strong className="font-semibold text-emerald-700">
                      {sellable(selectedItem)}
                    </strong>
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-[12px] font-medium text-neutral-700">
                  Quantity adjustment *
                </label>
                <input
                  type="number"
                  step="1"
                  required
                  value={adjustDelta}
                  onChange={(event) => setAdjustDelta(event.target.value)}
                  placeholder="e.g. 5 (add) or -2 (remove)"
                  className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-[13px] text-neutral-800 outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200"
                />
                <span className="mt-1 block text-[11px] text-neutral-400">
                  Use positive numbers to add stock, negative to subtract.
                </span>
              </div>

              <div>
                <label className="mb-1 block text-[12px] font-medium text-neutral-700">
                  Reason / Notes
                </label>
                <textarea
                  value={adjustNotes}
                  onChange={(event) => setAdjustNotes(event.target.value)}
                  placeholder="e.g. Cycle count adjustment, damaged unit written off"
                  rows={2}
                  className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-[13px] text-neutral-800 outline-none placeholder:text-neutral-400 focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-neutral-200 bg-[#fafafa] px-6 py-3">
              <button
                type="button"
                onClick={() => {
                  setAdjustOpen(false);
                  setSelectedItem(null);
                }}
                className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-[13px] font-medium text-neutral-700 hover:bg-neutral-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading || !adjustDelta}
                className="rounded-lg bg-neutral-900 px-3.5 py-1.5 text-[13px] font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
              >
                {actionLoading ? "Saving..." : "Apply adjustment"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}