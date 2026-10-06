"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import {
  clearStaffAccessToken,
  getStaffAccessToken,
} from "@/lib/staff-auth-api";
import {
  addStaffDraftItem,
  completeStaffDraft,
  getStaffDraft,
  removeStaffDraftItem,
  StaffOrdersApiError,
  updateStaffDraft,
  updateStaffDraftItem,
} from "@/lib/staff-orders-api";
import {
  getStaffCustomers,
} from "@/lib/staff-customers-api";
import {
  getStaffProducts,
} from "@/lib/staff-catalogue-api";
import type { StaffDraftDetail } from "@/types/staff-orders";
import type { StaffCustomerListItem } from "@/types/staff-customers";
import type { StaffCatalogueProduct } from "@/types/staff-catalogue";

function money(amount: number | string, currency = "INR") {
  const num = Number(amount);
  if (!Number.isFinite(num)) return `₹0.00`;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currency || "INR",
    maximumFractionDigits: 2,
  }).format(num);
}

function customerDisplayName(c: StaffDraftDetail["customer"]) {
  if (!c?.person) return "No customer";
  return [c.person.firstName, c.person.middleName, c.person.lastName]
    .filter(Boolean)
    .join(" ")
    .trim() || "Customer";
}

function formatDraftTime(value: string) {
  const date = new Date(value);
  const now = new Date();

  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (isToday) {
    return `today at ${date.toLocaleTimeString("en-IN", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })}`;
  }

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export default function StaffDraftDetailPage() {
  const router = useRouter();
  const params = useParams<{ draftNumber: string }>();
  const draftNumber = decodeURIComponent(params.draftNumber);

  const [token, setToken] = useState<string | null>(null);
  const [draft, setDraft] = useState<StaffDraftDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Product modal
  const [showProductModal, setShowProductModal] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [productResults, setProductResults] = useState<StaffCatalogueProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  // Custom Item Modal
  const [showCustomItemModal, setShowCustomItemModal] = useState(false);
  const [customItemName, setCustomItemName] = useState("");
  const [customItemPrice, setCustomItemPrice] = useState("");
  const [customItemQty, setCustomItemQty] = useState("1");

  // Customer search & attachment
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerResults, setCustomerResults] = useState<StaffCustomerListItem[]>([]);
  const [searchingCustomers, setSearchingCustomers] = useState(false);

  // Notes & Timeline comment
  const [notes, setNotes] = useState("");
  const [timelineComment, setTimelineComment] = useState("");

  async function load(activeToken: string) {
    try {
      setLoading(true);
      setError("");
      const res = await getStaffDraft(activeToken, draftNumber);
      setDraft(res.draft);
      setNotes(res.draft.notes || "");
    } catch (caught) {
      if (caught instanceof StaffOrdersApiError && caught.status === 401) {
        clearStaffAccessToken();
        router.replace("/staff/login");
        return;
      }
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to load draft order.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const active = getStaffAccessToken();
    if (!active) {
      router.replace("/staff/login");
      return;
    }
    setToken(active);
    void load(active);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, draftNumber]);

  // Product search in modal
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
        // ignore
      } finally {
        setLoadingProducts(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [productSearch, showProductModal, token]);

  // Customer search
  useEffect(() => {
    if (!token || !customerSearch.trim() || !showCustomerSearch) {
      setCustomerResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setSearchingCustomers(true);
        const res = await getStaffCustomers(token, {
          search: customerSearch.trim(),
          page: 1,
          pageSize: 5,
        });
        setCustomerResults(res.customers);
      } catch {
        // ignore
      } finally {
        setSearchingCustomers(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [customerSearch, token, showCustomerSearch]);

  async function handleAttachCustomer(c: StaffCustomerListItem) {
    if (!token || !draft) return;
    try {
      setActionLoading(true);
      setError("");
      const res = await updateStaffDraft(token, draft.draftNumber, {
        customerId: c.id,
        email: c.person.email || undefined,
        phone: c.person.phone || undefined,
      });
      setDraft(res.draft);
      setShowCustomerSearch(false);
      setCustomerSearch("");
      setSuccess("Customer attached successfully.");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Failed to attach customer.",
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function handleAddProduct(prod: StaffCatalogueProduct) {
    if (!token || !draft) return;
    try {
      setActionLoading(true);
      setError("");
      const unitPrice = prod.lowestSellingPrice ? Number(prod.lowestSellingPrice) : 0;
      const res = await addStaffDraftItem(token, draft.draftNumber, {
        productVariantId: prod.id,
        quantity: 1,
        unitPrice,
      });
      setDraft(res.draft);
      setShowProductModal(false);
      setProductSearch("");
      setSuccess("Item added to draft.");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Failed to add item.",
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function handleUpdateQty(itemId: string, newQty: number) {
    if (!token || !draft) return;
    if (newQty < 1) {
      await handleRemoveItem(itemId);
      return;
    }
    try {
      const res = await updateStaffDraftItem(token, draft.draftNumber, itemId, {
        quantity: newQty,
      });
      setDraft(res.draft);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Failed to update item quantity.",
      );
    }
  }

  async function handleRemoveItem(itemId: string) {
    if (!token || !draft) return;
    try {
      setActionLoading(true);
      const res = await removeStaffDraftItem(token, draft.draftNumber, itemId);
      setDraft(res.draft);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Failed to remove item.",
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function handleMarkAsPaid() {
    if (!token || !draft) return;
    if (draft.items.length === 0) {
      setError("Please add at least one product before marking as paid.");
      return;
    }
    if (!draft.customer) {
      setError("Please attach a customer before completing this draft order.");
      return;
    }

    const conf = window.confirm(
      `Mark ${draft.draftNumber} as paid and convert to confirmed order?`,
    );
    if (!conf) return;

    try {
      setActionLoading(true);
      setError("");
      const res = await completeStaffDraft(token, draft.draftNumber, {
        markAsPaid: true,
      });
      // Redirect to newly created order!
      router.push(`/staff/orders/${encodeURIComponent(res.orderNumber)}`);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Failed to mark order as paid.",
      );
      setActionLoading(false);
    }
  }

  async function handleSaveNotes() {
    if (!token || !draft) return;
    try {
      setActionLoading(true);
      const res = await updateStaffDraft(token, draft.draftNumber, {
        notes,
      });
      setDraft(res.draft);
      setSuccess("Notes saved.");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Failed to save notes.",
      );
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f1f1f1] text-[13px] text-[#616161]">
        <div className="flex items-center gap-2">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#d4d4d4] border-t-[#1a1a1a]" />
          Loading draft order...
        </div>
      </div>
    );
  }

  if (!draft) {
    return (
      <div className="p-8 text-center text-[#8a1c14]">
        {error || "Draft order not found."}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f1f1f1] text-[13px] text-[#303030]">
      {/* ----------------- Top Header Bar ----------------- */}
      <div className="mx-auto max-w-[1180px] px-6 pt-5 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/staff/orders/drafts"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#d4d4d4] bg-white text-[#616161] hover:bg-[#f7f7f7] shadow-xs"
              aria-label="Back to drafts"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="m10 4-4 4 4 4" strokeLinecap="round" />
              </svg>
            </Link>
            <div className="flex items-center gap-2">
              <Link
                href="/staff/orders/drafts"
                className="text-[14px] text-[#616161] hover:underline"
              >
                Drafts
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled
              className="inline-flex h-8 items-center justify-center rounded-lg border border-[#d4d4d4] bg-white px-3 text-[13px] font-medium text-[#303030] shadow-xs hover:bg-[#f7f7f7] disabled:opacity-50"
            >
              Duplicate
            </button>
            <button
              type="button"
              disabled
              className="inline-flex h-8 items-center justify-center rounded-lg border border-[#d4d4d4] bg-white px-3 text-[13px] font-medium text-[#303030] shadow-xs hover:bg-[#f7f7f7] disabled:opacity-50"
            >
              Share
            </button>
            <button
              type="button"
              disabled
              className="inline-flex h-8 items-center justify-center gap-1 rounded-lg border border-[#d4d4d4] bg-white px-3 text-[13px] font-medium text-[#303030] shadow-xs hover:bg-[#f7f7f7] disabled:opacity-50"
            >
              More actions
              <svg width="10" height="10" viewBox="0 0 20 20" fill="currentColor">
                <path d="m6 8 4 4 4-4" />
              </svg>
            </button>
          </div>
        </div>

        {/* Title & Subtitle */}
        <div className="mt-4">
          <div className="flex items-center gap-3">
            <h1 className="text-[24px] font-semibold text-[#1a1a1a]">
              {draft.draftNumber}
            </h1>
            {draft.status === "COMPLETED" && (
              <span className="inline-flex items-center rounded-full bg-[#cbf4c9] px-2.5 py-0.5 text-[11px] font-medium text-[#0e6245]">
                Completed
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[12px] text-[#616161]">
            Updated by My Store Admin {formatDraftTime(draft.updatedAt)}
          </p>
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-[#fed3d1] bg-[#fff4f4] px-4 py-2.5 text-[13px] text-[#8a1c14]">
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-[#cbf4c9] bg-[#f2fdf5] px-4 py-2.5 text-[13px] text-[#0e6245]">
            <span>{success}</span>
          </div>
        )}

        {/* ----------------- 2-Column Shopify Layout matching screenshot ----------------- */}
        <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[1fr_320px]">
          {/* Main Left Column */}
          <div className="space-y-4">
            {/* Products Section */}
            <div className="rounded-xl border border-[#e3e3e3] bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between pb-3">
                <h2 className="text-[14px] font-semibold text-[#1a1a1a]">
                  Products
                </h2>
                <div className="flex items-center gap-2">
                  <span className="text-[#8c9196] cursor-pointer">···</span>
                  <button
                    type="button"
                    onClick={() => setShowCustomItemModal(true)}
                    className="inline-flex h-7 items-center gap-1 rounded-lg border border-[#d4d4d4] bg-white px-2.5 text-[12px] font-medium text-[#303030] hover:bg-[#f7f7f7] shadow-xs"
                  >
                    + Custom item
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowProductModal(true)}
                    className="inline-flex h-7 items-center gap-1 rounded-lg border border-[#d4d4d4] bg-white px-2.5 text-[12px] font-medium text-[#303030] hover:bg-[#f7f7f7] shadow-xs"
                  >
                    + Product
                  </button>
                </div>
              </div>

              {draft.items.length === 0 ? (
                <div className="py-8 text-center text-[13px] text-[#616161]">
                  No products added yet.
                </div>
              ) : (
                <div className="divide-y divide-[#f1f1f1]">
                  {draft.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between py-3.5"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-[#e3e3e3] bg-[#1a1a1a] text-white">
                          <svg
                            width="20"
                            height="20"
                            viewBox="0 0 20 20"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                          >
                            <rect x="3" y="4" width="14" height="10" rx="1.5" />
                            <path d="M2 15h16" />
                          </svg>
                        </div>
                        <div className="min-w-0 pr-2">
                          <div className="truncate font-semibold text-[#1a1a1a]">
                            {item.productName}
                          </div>
                          <span className="inline-block mt-0.5 rounded bg-[#f1f1f1] px-1.5 py-0.5 text-[10px] font-medium text-[#616161]">
                            Notebook
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 pl-3">
                        <div className="font-medium text-[#005bd3]">
                          {money(item.unitPrice, draft.currency)}
                        </div>

                        {/* Quantity input */}
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) =>
                            handleUpdateQty(
                              item.id,
                              parseInt(e.target.value, 10) || 1,
                            )
                          }
                          className="h-8 w-14 rounded-lg border border-[#d4d4d4] bg-white text-center text-[13px] text-[#303030] outline-none focus:border-[#1a1a1a]"
                        />

                        {/* Total amount */}
                        <div className="w-24 text-right font-semibold text-[#1a1a1a]">
                          {money(item.totalAmount, draft.currency)}
                        </div>

                        {/* Remove cross */}
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          className="text-[#8c9196] hover:text-[#d72c0d] p-1"
                          title="Remove item"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Payment Section matching screenshot */}
            <div className="rounded-xl border border-[#e3e3e3] bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between pb-3">
                <h2 className="text-[14px] font-semibold text-[#1a1a1a]">
                  Payment
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled
                    className="inline-flex h-7 items-center rounded-lg border border-[#d4d4d4] bg-white px-3 text-[12px] font-medium text-[#303030] hover:bg-[#f7f7f7] shadow-xs disabled:opacity-50"
                  >
                    Send invoice
                  </button>
                  <button
                    type="button"
                    onClick={handleMarkAsPaid}
                    disabled={actionLoading || draft.status === "COMPLETED"}
                    className="inline-flex h-7 items-center rounded-lg bg-[#1a1a1a] px-3.5 text-[12px] font-medium text-white hover:bg-[#303030] shadow-xs disabled:opacity-50 transition-colors"
                  >
                    Mark as paid
                  </button>
                </div>
              </div>

              <div className="space-y-3 pt-2 text-[13px]">
                <div className="flex items-center justify-between">
                  <span className="text-[#616161]">Subtotal</span>
                  <div className="flex items-center gap-6">
                    <span className="text-[#8c9196]">
                      {draft.items.length} item{draft.items.length === 1 ? "" : "s"}
                    </span>
                    <span className="font-semibold text-[#1a1a1a]">
                      {money(draft.subtotal, draft.currency)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    className="text-[#005bd3] hover:underline"
                  >
                    Add discount
                  </button>
                  <span className="text-[#8c9196]">₹0.00</span>
                </div>

                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    className="text-[#005bd3] hover:underline"
                  >
                    Add shipping or delivery
                  </button>
                  <span className="text-[#8c9196]">₹0.00</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-[#616161]">
                    <span>Estimated tax</span>
                    <span className="text-[11px] text-[#8c9196]">ⓘ</span>
                  </div>
                  <div className="flex items-center gap-6">
                    <span className="text-[#8c9196]">
                      {money(draft.taxAmount, draft.currency)} · 9% CGST
                    </span>
                    <span className="text-[#8c9196]">Included</span>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-[#e3e3e3] pt-4 text-[15px] font-semibold text-[#1a1a1a]">
                  <span>Total</span>
                  <span>
                    {money(draft.totalAmount, draft.currency)} {draft.currency}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-[#616161]">Payment due later</span>
                  <div className="h-5 w-9 rounded-full bg-[#e3e3e3] p-0.5 cursor-pointer">
                    <div className="h-4 w-4 rounded-full bg-white shadow-xs" />
                  </div>
                </div>
              </div>
            </div>

            {/* Timeline Section matching screenshot */}
            <div className="rounded-xl border border-[#e3e3e3] bg-white p-5 shadow-xs">
              <h2 className="text-[14px] font-semibold text-[#1a1a1a] pb-3">
                Timeline
              </h2>

              <div className="flex items-start gap-3 pt-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#fca130] text-[12px] font-bold text-white">
                  MA
                </div>
                <div className="flex-1 rounded-xl border border-[#d4d4d4] bg-white p-2.5 focus-within:border-[#1a1a1a]">
                  <textarea
                    value={timelineComment}
                    onChange={(e) => setTimelineComment(e.target.value)}
                    placeholder="Leave a comment..."
                    rows={2}
                    className="w-full text-[13px] text-[#303030] outline-none placeholder-[#8c9196]"
                  />
                  <div className="flex items-center justify-between border-t border-[#f1f1f1] pt-2 text-[#8c9196]">
                    <div className="flex items-center gap-3 text-[14px]">
                      <button type="button" className="hover:text-[#1a1a1a]">☺</button>
                      <button type="button" className="hover:text-[#1a1a1a]">@</button>
                      <button type="button" className="hover:text-[#1a1a1a]">#</button>
                      <button type="button" className="hover:text-[#1a1a1a]">📎</button>
                    </div>
                    <button
                      type="button"
                      disabled={!timelineComment.trim()}
                      className="rounded bg-[#1a1a1a] px-2.5 py-1 text-[11px] font-medium text-white hover:bg-[#303030] disabled:opacity-40"
                    >
                      Post
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Sidebar Columns matching screenshot */}
          <div className="space-y-4">
            {/* Notes Section */}
            <div className="rounded-xl border border-[#e3e3e3] bg-white p-4 shadow-xs">
              <div className="flex items-center justify-between pb-2">
                <span className="text-[13px] font-semibold text-[#1a1a1a]">
                  Notes
                </span>
                <button
                  type="button"
                  onClick={handleSaveNotes}
                  className="text-[11px] font-medium text-[#005bd3] hover:underline"
                >
                  Save
                </button>
              </div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="No notes"
                rows={2}
                className="w-full rounded-lg border border-[#d4d4d4] bg-white p-2.5 text-[12px] text-[#303030] outline-none placeholder-[#8c9196] focus:border-[#1a1a1a]"
              />
            </div>

            {/* Customer Section */}
            <div className="relative rounded-xl border border-[#e3e3e3] bg-white p-4 shadow-xs">
              <div className="flex items-center justify-between pb-2">
                <span className="text-[13px] font-semibold text-[#1a1a1a]">
                  Customer
                </span>
                <span
                  onClick={() => setShowCustomerSearch((v) => !v)}
                  className="text-[#8c9196] cursor-pointer"
                >
                  ···
                </span>
              </div>

              {showCustomerSearch && (
                <div className="mb-3 space-y-2">
                  <input
                    type="text"
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    placeholder="Search customer name or email"
                    className="h-8 w-full rounded-lg border border-[#d4d4d4] px-2.5 text-[12px] text-[#303030] outline-none"
                  />
                  {customerResults.length > 0 && (
                    <div className="max-h-40 overflow-y-auto divide-y divide-[#f1f1f1] rounded-lg border border-[#e3e3e3] bg-white">
                      {customerResults.map((c) => (
                        <div
                          key={c.id}
                          onClick={() => handleAttachCustomer(c)}
                          className="cursor-pointer p-2 hover:bg-[#f7f7f7]"
                        >
                          <div className="font-medium text-[#1a1a1a]">
                            {[c.person.firstName, c.person.lastName].filter(Boolean).join(" ")}
                          </div>
                          <div className="text-[11px] text-[#8c9196]">
                            {c.person.email}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {draft.customer ? (
                <div>
                  <div className="font-semibold text-[#005bd3] cursor-pointer hover:underline">
                    {customerDisplayName(draft.customer)}
                  </div>
                  <div className="text-[12px] text-[#616161]">
                    No orders
                  </div>
                  <div className="mt-1 text-[12px] text-[#005bd3] hover:underline">
                    {draft.customer.person.email || "No email"}
                  </div>
                </div>
              ) : (
                <div className="text-[12px] text-[#8c9196]">
                  No customer attached. Click ··· to search and attach.
                </div>
              )}
            </div>

            {/* Shipping Address Section */}
            <div className="rounded-xl border border-[#e3e3e3] bg-white p-4 shadow-xs">
              <div className="flex items-center justify-between pb-2">
                <span className="text-[13px] font-semibold text-[#1a1a1a]">
                  Shipping address
                </span>
                <span className="text-[#8c9196] cursor-pointer">···</span>
              </div>
              <div className="text-[12px] text-[#303030]">
                {draft.customer ? (
                  <>
                    <p className="font-medium">{customerDisplayName(draft.customer)}</p>
                    <p className="text-[#616161]">India</p>
                  </>
                ) : (
                  <p className="text-[#8c9196]">No shipping address</p>
                )}
              </div>
            </div>

            {/* Billing Address Section */}
            <div className="rounded-xl border border-[#e3e3e3] bg-white p-4 shadow-xs">
              <div className="flex items-center justify-between pb-2">
                <span className="text-[13px] font-semibold text-[#1a1a1a]">
                  Billing address
                </span>
                <span className="text-[#8c9196] cursor-pointer">···</span>
              </div>
              <p className="text-[12px] text-[#616161]">
                Same as shipping address
              </p>
            </div>

            {/* Markets */}
            <div className="rounded-xl border border-[#e3e3e3] bg-white p-4 shadow-xs">
              <div className="flex items-center justify-between pb-2">
                <span className="text-[13px] font-semibold text-[#1a1a1a]">
                  Markets
                </span>
                <span className="text-[12px] text-[#8c9196]">⇄</span>
              </div>
              <div className="flex items-center gap-1.5 text-[12px] text-[#303030]">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#f1f1f1] text-[11px]">
                  🌐
                </span>
                <span>India</span>
              </div>
            </div>

            {/* Currency */}
            <div className="rounded-xl border border-[#e3e3e3] bg-white p-4 shadow-xs">
              <span className="text-[13px] font-semibold text-[#1a1a1a]">
                Currency
              </span>
              <div className="mt-2">
                <select
                  disabled
                  value={draft.currency}
                  className="h-8 w-full rounded-lg border border-[#d4d4d4] bg-[#fafafa] px-2 text-[12px] text-[#303030] outline-none"
                >
                  <option value="INR">Indian Rupee (INR ₹)</option>
                </select>
              </div>
            </div>

            {/* Tags */}
            <div className="rounded-xl border border-[#e3e3e3] bg-white p-4 shadow-xs">
              <div className="flex items-center justify-between pb-2">
                <span className="text-[13px] font-semibold text-[#1a1a1a]">
                  Tags
                </span>
                <span className="text-[12px] text-[#8c9196]">✎</span>
              </div>
              <input
                type="text"
                readOnly
                placeholder=""
                className="h-8 w-full rounded-lg border border-[#d4d4d4] bg-white px-2.5 text-[12px] text-[#303030] outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ----------------- Product Picker Modal ----------------- */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl border border-[#e3e3e3] bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#e3e3e3] px-5 py-4">
              <h3 className="text-[15px] font-semibold text-[#1a1a1a]">
                Select product
              </h3>
              <button
                type="button"
                onClick={() => setShowProductModal(false)}
                className="text-[#8c9196] hover:text-[#1a1a1a]"
              >
                ✕
              </button>
            </div>

            <div className="p-4">
              <div className="relative">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[#8c9196]"
                >
                  <circle cx="7" cy="7" r="4.5" />
                  <path d="m10.5 10.5 3 3" strokeLinecap="round" />
                </svg>
                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Search products"
                  className="h-8 w-full rounded-lg border border-[#d4d4d4] bg-white pr-3 pl-8 text-[13px] text-[#303030] outline-none placeholder-[#8c9196] focus:border-[#1a1a1a]"
                />
              </div>

              <div className="mt-3 max-h-72 overflow-y-auto divide-y divide-[#f1f1f1]">
                {loadingProducts ? (
                  <div className="py-8 text-center text-[#8c9196]">
                    Loading products...
                  </div>
                ) : productResults.length === 0 ? (
                  <div className="py-8 text-center text-[#8c9196]">
                    No products found.
                  </div>
                ) : (
                  productResults.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => handleAddProduct(p)}
                      className="flex cursor-pointer items-center justify-between py-2.5 px-2 hover:bg-[#f7f7f7] rounded-lg transition-colors"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="font-medium text-[#1a1a1a] truncate">
                          {p.name}
                        </div>
                        <div className="text-[11px] text-[#8c9196]">
                          {p.brand?.name} · {p.productType}
                        </div>
                      </div>
                      <div className="shrink-0 font-medium text-[#1a1a1a]">
                        {p.lowestSellingPrice
                          ? money(p.lowestSellingPrice, draft.currency)
                          : "₹0.00"}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="flex justify-end border-t border-[#e3e3e3] px-5 py-3 bg-[#fafafa]">
              <button
                type="button"
                onClick={() => setShowProductModal(false)}
                className="rounded-lg border border-[#d4d4d4] bg-white px-3 py-1.5 text-[12px] font-medium text-[#303030] hover:bg-[#f7f7f7]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
