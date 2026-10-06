"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import {
  clearStaffAccessToken,
  getStaffAccessToken,
} from "@/lib/staff-auth-api";
import {
  createStaffDraft,
  StaffOrdersApiError,
} from "@/lib/staff-orders-api";
import { getStaffCustomers } from "@/lib/staff-customers-api";
import { getStaffProducts } from "@/lib/staff-catalogue-api";
import type { StaffCustomerListItem } from "@/types/staff-customers";
import type { StaffCatalogueProduct } from "@/types/staff-catalogue";

/* ---------------- shared styles (matching NewProductPage) ---------------- */

const inputBase =
  "w-full rounded-lg border bg-white px-3 py-2 text-[13px] text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:ring-2";

const inputClass = `${inputBase} border-neutral-200 hover:border-neutral-300 focus:border-neutral-400 focus:ring-neutral-200`;

const inputErrorClass = `${inputBase} border-red-300 bg-red-50/40 focus:border-red-400 focus:ring-red-200`;

/* ---------------- helpers ---------------- */

function money(amount: number | string, currency = "INR") {
  const num = Number(amount);
  if (!Number.isFinite(num)) return `₹0.00`;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currency || "INR",
    maximumFractionDigits: 2,
  }).format(num);
}

function customerDisplayName(c: StaffCustomerListItem) {
  return (
    [c.person.firstName, c.person.middleName, c.person.lastName]
      .filter(Boolean)
      .join(" ")
      .trim() || "Customer"
  );
}

/* ---------------- small primitives ---------------- */

function SectionCard({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
      {title ? (
        <div className="border-b border-neutral-100 px-4 py-3">
          <h2 className="text-[13px] font-medium text-neutral-800">
            {title}
          </h2>
        </div>
      ) : null}
      <div className="px-4 py-4">{children}</div>
    </section>
  );
}

function FieldLabel({
  children,
  hint,
}: {
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <span className="mb-1.5 flex items-center justify-between text-[12px] font-medium text-neutral-700">
      <span>{children}</span>
      {hint ? (
        <span className="text-[11px] text-neutral-400">{hint}</span>
      ) : null}
    </span>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="mt-1 flex items-center gap-1 text-[11.5px] text-red-600">
      <svg
        viewBox="0 0 16 16"
        fill="currentColor"
        className="h-3 w-3 shrink-0"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M8 2a6 6 0 1 0 0 12A6 6 0 0 0 8 2Zm-.75 3a.75.75 0 0 1 1.5 0v3.5a.75.75 0 0 1-1.5 0V5Zm.75 7.25a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z"
          clipRule="evenodd"
        />
      </svg>
      {message}
    </p>
  );
}

/* ---------------- page ---------------- */

export default function CreateOrderDraftPage() {
  const router = useRouter();

  const [token, setToken] = useState<string | null>(null);

  // Draft basics
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(false);

  // Customer state & search
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerResults, setCustomerResults] = useState<
    StaffCustomerListItem[]
  >([]);
  const [selectedCustomer, setSelectedCustomer] =
    useState<StaffCustomerListItem | null>(null);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  // Product picker modal
  const [showProductModal, setShowProductModal] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [productResults, setProductResults] = useState<StaffCatalogueProduct[]>(
    [],
  );
  const [loadingProducts, setLoadingProducts] = useState(false);

  // Custom item modal
  const [showCustomItemModal, setShowCustomItemModal] = useState(false);
  const [customItemName, setCustomItemName] = useState("");
  const [customItemPrice, setCustomItemPrice] = useState("");
  const [customItemQty, setCustomItemQty] = useState("1");

  // Line items
  const [items, setItems] = useState<
    Array<{
      productVariantId: string;
      productName: string;
      sku: string;
      unitPrice: number;
      quantity: number;
      totalAmount: number;
    }>
  >([]);

  // Metadata
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState("");
  const [tagsList, setTagsList] = useState<string[]>([]);
  const [currency] = useState("INR");

  const customerInputRef = useRef<HTMLInputElement | null>(null);

  /* ---------------- auth ---------------- */

  useEffect(() => {
    const active = getStaffAccessToken();
    if (!active) {
      router.replace("/staff/login");
      return;
    }
    setToken(active);
  }, [router]);

  /* ---------------- customer search ---------------- */

  useEffect(() => {
    if (!token || !customerSearch.trim() || selectedCustomer) {
      setCustomerResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await getStaffCustomers(token, {
          search: customerSearch.trim(),
          page: 1,
          pageSize: 5,
        });
        setCustomerResults(res.customers);
        setShowCustomerDropdown(true);
      } catch {
        /* ignore */
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [customerSearch, token, selectedCustomer]);

  /* ---------------- product search ---------------- */

  useEffect(() => {
    if (!token || !showProductModal) return;

    const timer = setTimeout(async () => {
      try {
        setLoadingProducts(true);
        const res = await getStaffProducts(token, {
          search: productSearch.trim() || undefined,
        });
        setProductResults(res.items);
      } catch {
        /* ignore */
      } finally {
        setLoadingProducts(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [productSearch, showProductModal, token]);

  // Selected variants in picker modal: map variantId -> { variant, product }
  const [selectedVariants, setSelectedVariants] = useState<
    Map<
      string,
      {
        variantId: string;
        productName: string;
        variantTitle: string;
        sku: string;
        unitPrice: number;
      }
    >
  >(new Map());
  const [searchFilter, setSearchFilter] = useState("all");

  /* ---------------- handlers ---------------- */

  function handleSelectCustomer(c: StaffCustomerListItem) {
    setSelectedCustomer(c);
    setCustomerSearch(customerDisplayName(c));
    setShowCustomerDropdown(false);
  }

  function handleRemoveCustomer() {
    setSelectedCustomer(null);
    setCustomerSearch("");
    setTimeout(() => customerInputRef.current?.focus(), 0);
  }

  function handleAddTag(e: React.KeyboardEvent) {
    if (e.key === "Enter" && tags.trim()) {
      e.preventDefault();
      if (!tagsList.includes(tags.trim())) {
        setTagsList([...tagsList, tags.trim()]);
      }
      setTags("");
    }
  }

  function handleRemoveTag(tagToRemove: string) {
    setTagsList(tagsList.filter((t) => t !== tagToRemove));
  }

  function handleOpenProductModal() {
    setSelectedVariants(new Map());
    setProductSearch("");
    setShowProductModal(true);
  }

  type ModalVariantItem = {
    id: string;
    sku: string;
    sellingPrice: string;
    variantName?: string | null;
    color?: string | null;
    ramGb?: number | null;
    storageGb?: number | null;
    operatingSystem?: string | null;
    quantityAvailable?: number;
    quantityReserved?: number;
  };

  function getProductModalVariants(prod: StaffCatalogueProduct): ModalVariantItem[] {
    if (prod.variants && prod.variants.length > 0) {
      return prod.variants;
    }
    return [
      {
        id: prod.id,
        sku: prod.modelNumber || `SKU-${prod.id}`,
        sellingPrice: prod.lowestSellingPrice || "0",
        variantName: "Standard",
        quantityAvailable: prod.quantityAvailable ?? 0,
        quantityReserved: prod.quantityReserved ?? 0,
      },
    ];
  }

  function isProductFullySelected(prod: StaffCatalogueProduct) {
    const vars = getProductModalVariants(prod);
    return vars.every((v) => selectedVariants.has(v.id));
  }

  function isProductPartiallySelected(prod: StaffCatalogueProduct) {
    const vars = getProductModalVariants(prod);
    const someSelected = vars.some((v) => selectedVariants.has(v.id));
    const allSelected = vars.every((v) => selectedVariants.has(v.id));
    return someSelected && !allSelected;
  }

  function toggleProductAllVariants(prod: StaffCatalogueProduct) {
    const vars = getProductModalVariants(prod);
    const allSelected = isProductFullySelected(prod);
    const next = new Map(selectedVariants);

    if (allSelected) {
      vars.forEach((v) => next.delete(v.id));
    } else {
      vars.forEach((v) => {
        const price = Number(v.sellingPrice) || 0;
        const vTitle =
          v.variantName ||
          [
            v.color,
            v.ramGb ? `${v.ramGb}GB` : null,
            v.storageGb ? `${v.storageGb}GB` : null,
          ]
            .filter(Boolean)
            .join(" / ") ||
          "Default";
        next.set(v.id, {
          variantId: v.id,
          productName: prod.name,
          variantTitle: vTitle,
          sku: v.sku,
          unitPrice: price,
        });
      });
    }
    setSelectedVariants(next);
  }

  function toggleVariant(
    prod: StaffCatalogueProduct,
    v: ModalVariantItem,
  ) {
    const next = new Map(selectedVariants);
    if (next.has(v.id)) {
      next.delete(v.id);
    } else {
      const price = Number(v.sellingPrice) || 0;
      const vTitle =
        v.variantName ||
        [
          v.color,
          v.ramGb ? `${v.ramGb}GB` : null,
          v.storageGb ? `${v.storageGb}GB` : null,
        ]
          .filter(Boolean)
          .join(" / ") ||
        "Default";
      next.set(v.id, {
        variantId: v.id,
        productName: prod.name,
        variantTitle: vTitle,
        sku: v.sku,
        unitPrice: price,
      });
    }
    setSelectedVariants(next);
  }


  function handleAddSelectedVariants() {
    if (selectedVariants.size === 0) return;

    setItems((curr) => {
      const updated = [...curr];
      selectedVariants.forEach((item) => {
        const existingIdx = updated.findIndex((i) => i.productVariantId === item.variantId);
        if (existingIdx >= 0) {
          const exist = updated[existingIdx];
          const newQty = exist.quantity + 1;
          updated[existingIdx] = {
            ...exist,
            quantity: newQty,
            totalAmount: exist.unitPrice * newQty,
          };
        } else {
          const display = item.variantTitle && item.variantTitle !== "Default"
            ? `${item.productName} — ${item.variantTitle}`
            : item.productName;
          updated.push({
            productVariantId: item.variantId,
            productName: display,
            sku: item.sku,
            unitPrice: item.unitPrice,
            quantity: 1,
            totalAmount: item.unitPrice,
          });
        }
      });
      return updated;
    });

    setShowProductModal(false);
    setSelectedVariants(new Map());
  }

  function handleAddCustomItem() {
    const price = parseFloat(customItemPrice) || 0;
    const qty = parseInt(customItemQty, 10) || 1;
    if (!customItemName.trim()) return;

    setItems((curr) => [
      ...curr,
      {
        productVariantId: "0",
        productName: customItemName.trim(),
        sku: "CUSTOM-ITEM",
        unitPrice: price,
        quantity: qty,
        totalAmount: price * qty,
      },
    ]);
    setShowCustomItemModal(false);
    setCustomItemName("");
    setCustomItemPrice("");
    setCustomItemQty("1");
  }

  function updateItemQty(index: number, newQty: number) {
    if (newQty < 1) {
      setItems((curr) => curr.filter((_, i) => i !== index));
      return;
    }
    setItems((curr) =>
      curr.map((item, i) =>
        i === index
          ? { ...item, quantity: newQty, totalAmount: item.unitPrice * newQty }
          : item,
      ),
    );
  }

  function removeItem(index: number) {
    setItems((curr) => curr.filter((_, i) => i !== index));
  }

  /* ---------------- calculations ---------------- */

  const subtotal = items.reduce((sum, item) => sum + item.totalAmount, 0);
  const total = subtotal;

  /* ---------------- save ---------------- */

  async function handleSaveDraft() {
    if (!token) return;

    if (items.length === 0) {
      setError("Please add at least one product or custom item before saving.");
      return;
    }

    setError("");
    setCreating(true);

    try {
      const draftRes = await createStaffDraft(token, {
        customerId: selectedCustomer?.id,
        email: selectedCustomer?.person.email || undefined,
        phone: selectedCustomer?.person.phone || undefined,
        notes: notes.trim() || undefined,
        currency,
        tags: tagsList,
        items: items.map((it) => ({
          productVariantId:
            it.productVariantId === "0" ? null : it.productVariantId,
          productName: it.productName,
          sku: it.sku,
          unitPrice: it.unitPrice,
          quantity: it.quantity,
        })),
      });

      router.push(
        `/staff/orders/drafts/${encodeURIComponent(draftRes.draftNumber)}`,
      );
    } catch (caught) {
      if (caught instanceof StaffOrdersApiError && caught.status === 401) {
        clearStaffAccessToken();
        router.replace("/staff/login");
        return;
      }
      setError(
        caught instanceof Error
          ? caught.message
          : "Failed to create draft order.",
      );
      setCreating(false);
    }
  }

  /* ---------------- render ---------------- */

  return (
    <div className="text-[13px] text-neutral-800">
      {/* Header */}
      <div className="border-b border-neutral-200 bg-white px-6 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <Link
              href="/staff/orders/drafts"
              aria-label="Back to drafts"
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
              <Link
                href="/staff/orders/drafts"
                className="text-neutral-500 hover:text-neutral-800"
              >
                Drafts
              </Link>
              <span className="text-neutral-300">/</span>
              <span className="truncate font-medium text-neutral-800">
                Create order
              </span>
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/staff/orders/drafts"
              className="rounded-lg border border-neutral-200 bg-white px-3.5 py-1.5 text-[13px] font-medium text-neutral-700 hover:bg-neutral-50"
            >
              Discard
            </Link>
            <button
              type="button"
              onClick={() => void handleSaveDraft()}
              disabled={creating}
              className="rounded-lg bg-neutral-900 px-3.5 py-1.5 text-[13px] font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
            >
              {creating ? "Saving…" : "Save draft"}
            </button>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="px-6 py-5">
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

        <div className="mb-5">
          <h1 className="text-[20px] font-semibold text-neutral-900">
            Create order
          </h1>
          <p className="mt-1 text-[12.5px] text-neutral-500">
            Add products, pick a customer, and save it as a draft. You can
            review pricing and payment options on the next screen.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          {/* LEFT */}
          <div className="space-y-5">
            {/* Products Card */}
            <SectionCard title="Products">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-neutral-200 bg-neutral-50 py-10 text-center">
                  <p className="text-[12.5px] text-neutral-500">
                    No products added yet.
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowCustomItemModal(true)}
                      className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-[12px] font-medium text-neutral-700 hover:bg-neutral-50"
                    >
                      + Custom item
                    </button>
                    <button
                      type="button"
                      onClick={handleOpenProductModal}
                      className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-[12px] font-medium text-neutral-700 hover:bg-neutral-50"
                    >
                      + Product
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="divide-y divide-neutral-100">
                    {items.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between py-3 first:pt-0"
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-neutral-200 bg-neutral-50 text-neutral-500">
                            <svg
                              viewBox="0 0 20 20"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              className="h-4 w-4"
                            >
                              <rect
                                x="3"
                                y="3"
                                width="14"
                                height="14"
                                rx="2"
                              />
                              <circle cx="8" cy="8" r="1.5" />
                              <path d="m17 13-4-4-6 6" />
                            </svg>
                          </div>
                          <div className="min-w-0">
                            <div className="truncate text-[13px] font-medium text-neutral-800">
                              {item.productName}
                            </div>
                            <div className="text-[11.5px] text-neutral-500">
                              SKU: {item.sku}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 pl-3">
                          <div className="w-20 text-right text-[12.5px] text-neutral-600">
                            {money(item.unitPrice, currency)}
                          </div>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) =>
                              updateItemQty(
                                idx,
                                parseInt(e.target.value, 10) || 1,
                              )
                            }
                            className="h-8 w-14 rounded-lg border border-neutral-200 bg-white text-center text-[12.5px] text-neutral-900 outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200"
                          />
                          <div className="w-24 text-right text-[13px] font-medium text-neutral-900">
                            {money(item.totalAmount, currency)}
                          </div>
                          <button
                            type="button"
                            onClick={() => removeItem(idx)}
                            className="rounded-md p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
                            title="Remove item"
                          >
                            <svg
                              viewBox="0 0 16 16"
                              fill="none"
                              className="h-3.5 w-3.5"
                            >
                              <path
                                d="m4 4 8 8M12 4l-8 8"
                                stroke="currentColor"
                                strokeWidth="1.6"
                                strokeLinecap="round"
                              />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 flex items-center gap-2 border-t border-neutral-100 pt-3">
                    <button
                      type="button"
                      onClick={() => setShowCustomItemModal(true)}
                      className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-[12px] font-medium text-neutral-700 hover:bg-neutral-50"
                    >
                      + Custom item
                    </button>
                    <button
                      type="button"
                      onClick={handleOpenProductModal}
                      className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-[12px] font-medium text-neutral-700 hover:bg-neutral-50"
                    >
                      + Product
                    </button>
                  </div>
                </>
              )}
            </SectionCard>

            {/* Payment Card */}
            <SectionCard title="Payment">
              <div className="space-y-3 text-[13px]">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-600">Subtotal</span>
                  <div className="flex items-center gap-6">
                    <span className="text-[12px] text-neutral-500">
                      {items.length} item{items.length === 1 ? "" : "s"}
                    </span>
                    <span className="font-medium text-neutral-900">
                      {money(subtotal, currency)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    className="text-[13px] text-blue-600 hover:underline"
                  >
                    Add discount
                  </button>
                  <span className="text-[12.5px] text-neutral-500">₹0.00</span>
                </div>

                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    className="text-[13px] text-blue-600 hover:underline"
                  >
                    Add shipping or delivery
                  </button>
                  <span className="text-[12.5px] text-neutral-500">₹0.00</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-neutral-600">
                    <span>Estimated tax</span>
                    <span className="text-[11px] text-neutral-400">ⓘ</span>
                  </div>
                  <span className="text-[12.5px] text-neutral-500">
                    {items.length > 0 ? "Included" : "Not calculated"}
                  </span>
                </div>

                <div className="flex items-center justify-between border-t border-neutral-100 pt-3 text-[14px] font-semibold text-neutral-900">
                  <span>Total</span>
                  <span>
                    {money(total, currency)} {currency}
                  </span>
                </div>
              </div>

              {items.length === 0 && (
                <div className="mt-4 rounded-lg border border-neutral-100 bg-neutral-50 px-3 py-2.5 text-center text-[11.5px] text-neutral-500">
                  Add a product to calculate total and view payment options
                </div>
              )}
            </SectionCard>
          </div>

          {/* RIGHT RAIL */}
          <aside className="space-y-5 lg:sticky lg:top-4 lg:self-start">
            {/* Notes */}
            <SectionCard title="Notes">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                placeholder="Add notes about this order..."
                className={inputClass}
              />
            </SectionCard>

            {/* Customer */}
            <SectionCard title="Customer">
              {!selectedCustomer ? (
                <div className="relative">
                  <input
                    ref={customerInputRef}
                    type="text"
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    placeholder="Search or create a customer"
                    className={inputClass}
                  />

                  {showCustomerDropdown && customerResults.length > 0 && (
                    <div className="absolute top-full left-0 z-30 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-neutral-200 bg-white py-1 shadow-lg">
                      {customerResults.map((c) => (
                        <div
                          key={c.id}
                          onClick={() => handleSelectCustomer(c)}
                          className="cursor-pointer px-3 py-2 hover:bg-neutral-50"
                        >
                          <div className="text-[13px] font-medium text-neutral-800">
                            {customerDisplayName(c)}
                          </div>
                          <div className="text-[11.5px] text-neutral-500">
                            {c.person.email ||
                              c.person.phone ||
                              c.customerCode}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-[13px] font-medium text-neutral-800">
                        {customerDisplayName(selectedCustomer)}
                      </div>
                      <div className="truncate text-[11.5px] text-neutral-500">
                        {selectedCustomer.person.email || "No email"}
                      </div>
                      {selectedCustomer.person.phone && (
                        <div className="truncate text-[11.5px] text-neutral-500">
                          {selectedCustomer.person.phone}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveCustomer}
                      className="shrink-0 text-[11.5px] text-blue-600 hover:underline"
                    >
                      Change
                    </button>
                  </div>
                </div>
              )}
            </SectionCard>



            <SectionCard title="Tags">
              <FieldLabel hint="optional">Order tags</FieldLabel>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                onKeyDown={handleAddTag}
                placeholder="Add tag and press Enter"
                className={inputClass}
              />
              {tagsList.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {tagsList.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 rounded-md bg-neutral-100 px-2 py-0.5 text-[11px] text-neutral-700"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="text-neutral-400 hover:text-neutral-700"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <p className="mt-1 text-[11.5px] text-neutral-500">
                Use tags to filter orders later.
              </p>
            </SectionCard>

            {/* Advanced (consistent with NewProductPage) */}
            <SectionCard>
              <button
                type="button"
                onClick={() => setAdvancedOpen((v) => !v)}
                className="flex items-center gap-1.5 text-[12px] text-neutral-500 hover:text-neutral-800"
              >
                <svg
                  viewBox="0 0 16 16"
                  fill="none"
                  className={`h-3 w-3 transition-transform ${
                    advancedOpen ? "rotate-90" : ""
                  }`}
                >
                  <path
                    d="m6 4 4 4-4 4"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Advanced
              </button>

              {advancedOpen ? (
                <div className="mt-3 text-[12px] text-neutral-500">
                  More options (billing address, delivery method, etc.) will be
                  available on the draft detail screen after saving.
                </div>
              ) : null}
            </SectionCard>
          </aside>
        </div>
      </div>

      {/* ----------------- Select Products Modal (Shopify style) ----------------- */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-neutral-200 bg-white shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-neutral-100 px-6 py-4">
              <h3 className="text-[16px] font-semibold text-neutral-900">
                Select products
              </h3>
              <button
                type="button"
                onClick={() => setShowProductModal(false)}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
              >
                <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4">
                  <path
                    d="m4 4 8 8M12 4l-8 8"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>

            {/* Search & Filter Bar */}
            <div className="border-b border-neutral-100 px-6 py-3">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <svg
                    viewBox="0 0 20 20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-neutral-400"
                  >
                    <circle cx="9" cy="9" r="6" />
                    <path d="m13.5 13.5 4 4" strokeLinecap="round" />
                  </svg>
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Search products"
                    autoFocus
                    className="w-full rounded-lg border border-neutral-200 bg-white py-2 pr-3 pl-9 text-[13px] text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200"
                  />
                </div>

                <div className="relative shrink-0">
                  <select
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="h-[38px] rounded-lg border border-neutral-200 bg-white px-3 pr-8 text-[12.5px] text-neutral-700 outline-none hover:border-neutral-300 focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200"
                  >
                    <option value="all">Search by All</option>
                    <option value="laptop">Laptops</option>
                    <option value="desktop">Desktops</option>
                    <option value="accessory">Accessories / Parts</option>
                  </select>
                </div>
              </div>

              <div className="mt-2.5 flex items-center gap-1.5">
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-md border border-neutral-200 bg-white px-2.5 py-1 text-[11.5px] font-medium text-neutral-600 hover:bg-neutral-50"
                >
                  <span>Add filter</span>
                  <span className="text-[12px]">+</span>
                </button>
              </div>
            </div>

            {/* Table Header */}
            <div className="grid grid-cols-[minmax(0,1fr)_100px_140px] items-center border-b border-neutral-100 bg-neutral-50/70 px-6 py-2 text-[11px] font-medium text-neutral-500 uppercase tracking-wider">
              <div>Product</div>
              <div className="text-right">Available</div>
              <div className="text-right">Price</div>
            </div>

            {/* List Body */}
            <div className="flex-1 overflow-y-auto divide-y divide-neutral-100">
              {loadingProducts ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-800" />
                  <p className="mt-2 text-[12.5px] text-neutral-500">
                    Loading products...
                  </p>
                </div>
              ) : productResults.length === 0 ? (
                <div className="py-12 text-center text-[12.5px] text-neutral-500">
                  No products found.
                </div>
              ) : (
                productResults.map((prod) => {
                  const hasVariants =
                    Array.isArray(prod.variants) && prod.variants.length > 0;
                  const vars = hasVariants
                    ? prod.variants!
                    : [
                        {
                          id: prod.id,
                          sku: prod.modelNumber || `SKU-${prod.id}`,
                          variantName: "Standard",
                          color: null,
                          ramGb: null,
                          storageGb: null,
                          operatingSystem: null,
                          sellingPrice: prod.lowestSellingPrice || "0",
                          status: prod.status,
                          quantityAvailable: prod.quantityAvailable ?? 0,
                          quantityReserved: prod.quantityReserved ?? 0,
                        },
                      ];

                  const fullySelected = isProductFullySelected(prod);
                  const partiallySelected = isProductPartiallySelected(prod);

                  return (
                    <div key={prod.id} className="transition-colors hover:bg-neutral-50/40">
                      {/* Product Header Row */}
                      <div className="grid grid-cols-[minmax(0,1fr)_100px_140px] items-center px-6 py-2.5">
                        <div className="flex min-w-0 items-center gap-3">
                          <label className="relative flex cursor-pointer items-center">
                            <input
                              type="checkbox"
                              checked={fullySelected}
                              ref={(el) => {
                                if (el) el.indeterminate = partiallySelected;
                              }}
                              onChange={() => toggleProductAllVariants(prod)}
                              className="h-4 w-4 cursor-pointer rounded border-neutral-300 text-neutral-900 focus:ring-neutral-400"
                            />
                          </label>

                          <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100">
                            {prod.imageUrl ? (
                              <img
                                src={prod.imageUrl}
                                alt={prod.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <svg
                                viewBox="0 0 20 20"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                className="h-4 w-4 text-neutral-400"
                              >
                                <rect
                                  x="3"
                                  y="3"
                                  width="14"
                                  height="14"
                                  rx="2"
                                />
                                <circle cx="8" cy="8" r="1.5" />
                                <path d="m17 13-4-4-6 6" />
                              </svg>
                            )}
                          </div>

                          <div className="min-w-0">
                            <span className="truncate text-[13px] font-medium text-neutral-900">
                              {prod.name}
                            </span>
                          </div>
                        </div>

                        <div className="text-right text-[12px] text-neutral-500">
                          {prod.quantityAvailable ?? 0}
                        </div>

                        <div className="text-right text-[12.5px] font-medium text-neutral-900">
                          {prod.lowestSellingPrice
                            ? money(prod.lowestSellingPrice, currency)
                            : "—"}
                        </div>
                      </div>

                      {/* Variants Child Rows */}
                      <div className="divide-y divide-neutral-50 bg-neutral-50/30">
                        {vars.map((v) => {
                          const isChecked = selectedVariants.has(v.id);
                          const variantLabel =
                            v.variantName ||
                            [
                              v.color,
                              v.ramGb ? `${v.ramGb}GB RAM` : null,
                              v.storageGb ? `${v.storageGb}GB SSD` : null,
                              v.operatingSystem,
                            ]
                              .filter(Boolean)
                              .join(" / ") ||
                            "Standard edition";
                          const qtyAvail = v.quantityAvailable ?? 0;
                          const isZeroStock = qtyAvail <= 0;

                          return (
                            <div
                              key={v.id}
                              onClick={() => toggleVariant(prod, v)}
                              className={`grid cursor-pointer grid-cols-[minmax(0,1fr)_100px_140px] items-center py-2 pr-6 pl-12 transition-colors hover:bg-neutral-100/60 ${
                                isChecked ? "bg-neutral-100/40" : ""
                              }`}
                            >
                              <div className="flex min-w-0 items-center gap-3">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {}} // handled by parent div onClick
                                  className="h-3.5 w-3.5 cursor-pointer rounded border-neutral-300 text-neutral-900 focus:ring-neutral-400"
                                />
                                <div className="min-w-0">
                                  <div className="truncate text-[12.5px] text-neutral-700">
                                    {variantLabel}
                                  </div>
                                  <div className="text-[11px] text-neutral-400">
                                    {v.sku}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center justify-end gap-1 text-[12px]">
                                {isZeroStock ? (
                                  <span className="flex items-center gap-1 text-amber-600" title="Out of stock">
                                    <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                                      <path
                                        fillRule="evenodd"
                                        d="M6.701 2.25c.577-1 2.02-1 2.598 0l5.196 9a1.5 1.5 0 0 1-1.299 2.25H2.794a1.5 1.5 0 0 1-1.299-2.25l5.196-9ZM8 5.5a.75.75 0 0 0-.75.75v2.5a.75.75 0 0 0 1.5 0v-2.5A.75.75 0 0 0 8 5.5Zm0 6a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z"
                                        clipRule="evenodd"
                                      />
                                    </svg>
                                    <span>0</span>
                                  </span>
                                ) : (
                                  <span className="text-neutral-600">{qtyAvail}</span>
                                )}
                              </div>

                              <div className="text-right text-[12.5px] font-medium text-neutral-900">
                                {money(v.sellingPrice, currency)}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-neutral-100 px-6 py-3.5">
              <span className="text-[12px] text-neutral-500">
                {selectedVariants.size}/500 variants selected
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="rounded-lg border border-neutral-200 bg-white px-3.5 py-1.5 text-[13px] font-medium text-neutral-700 hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddSelectedVariants}
                  disabled={selectedVariants.size === 0}
                  className="rounded-lg bg-neutral-900 px-4 py-1.5 text-[13px] font-medium text-white hover:bg-neutral-800 disabled:opacity-40"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- Custom Item Modal ----------------- */}
      {showCustomItemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl border border-neutral-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-3">
              <h3 className="text-[14px] font-medium text-neutral-800">
                Add custom item
              </h3>
              <button
                type="button"
                onClick={() => setShowCustomItemModal(false)}
                className="rounded-md p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
              >
                <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
                  <path
                    d="m4 4 8 8M12 4l-8 8"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>

            <div className="space-y-3 p-5">
              <div>
                <FieldLabel>Item name</FieldLabel>
                <input
                  type="text"
                  value={customItemName}
                  onChange={(e) => setCustomItemName(e.target.value)}
                  placeholder="e.g. Expedited service / Custom charge"
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <FieldLabel>Price (₹)</FieldLabel>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={customItemPrice}
                    onChange={(e) => setCustomItemPrice(e.target.value)}
                    placeholder="0.00"
                    className={inputClass}
                  />
                </div>
                <div>
                  <FieldLabel>Quantity</FieldLabel>
                  <input
                    type="number"
                    min="1"
                    value={customItemQty}
                    onChange={(e) => setCustomItemQty(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-neutral-100 px-5 py-3">
              <button
                type="button"
                onClick={() => setShowCustomItemModal(false)}
                className="rounded-lg border border-neutral-200 bg-white px-3.5 py-1.5 text-[13px] font-medium text-neutral-700 hover:bg-neutral-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddCustomItem}
                disabled={!customItemName.trim()}
                className="rounded-lg bg-neutral-900 px-3.5 py-1.5 text-[13px] font-medium text-white hover:bg-neutral-800 disabled:opacity-40"
              >
                Add item
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}