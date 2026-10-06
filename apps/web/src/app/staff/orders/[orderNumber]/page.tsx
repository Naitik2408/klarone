"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import {
  clearStaffAccessToken,
  getStaffAccessToken,
} from "@/lib/staff-auth-api";
import {
  getStaffOrder,
  StaffOrdersApiError,
  updateStaffOrderStatus,
} from "@/lib/staff-orders-api";
import type { StaffOrderDetail } from "@/types/staff-orders";

const ORDER_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
];

function money(amount: number | string, currency = "INR") {
  const num = Number(amount);
  if (!Number.isFinite(num)) return `₹0.00`;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currency || "INR",
    maximumFractionDigits: 2,
  }).format(num);
}

function customerDisplayName(order: StaffOrderDetail) {
  return (
    [
      order.customer.person.firstName,
      order.customer.person.middleName,
      order.customer.person.lastName,
    ]
      .filter(Boolean)
      .join(" ")
      .trim() || "Customer"
  );
}

function formatOrderTime(value: string) {
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
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function paymentPill(status: string) {
  const upper = status.toUpperCase();
  if (upper === "PAID") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#cbf4c9] px-2.5 py-0.5 text-[11px] font-semibold text-[#0e6245]">
        <span className="h-1.5 w-1.5 rounded-full bg-[#108043]" />
        Paid
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fed3d1] px-2.5 py-0.5 text-[11px] font-semibold text-[#8a1c14]">
      <span className="h-1.5 w-1.5 rounded-full bg-[#d72c0d]" />
      {status}
    </span>
  );
}

function fulfillmentPill(status: string) {
  const upper = status.toUpperCase();
  if (upper === "FULFILLED") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#cbf4c9] px-2.5 py-0.5 text-[11px] font-semibold text-[#0e6245]">
        <span className="h-1.5 w-1.5 rounded-full bg-[#108043]" />
        Fulfilled
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fed3d1] px-2.5 py-0.5 text-[11px] font-semibold text-[#8a1c14]">
      <span className="h-1.5 w-1.5 rounded-full bg-[#d72c0d]" />
      Unfulfilled
    </span>
  );
}

export default function StaffOrderDetailPage() {
  const router = useRouter();
  const params = useParams<{ orderNumber: string }>();
  const orderNumber = decodeURIComponent(params.orderNumber);

  const [token, setToken] = useState<string | null>(null);
  const [order, setOrder] = useState<StaffOrderDetail | null>(null);
  const [status, setStatus] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [timelineComment, setTimelineComment] = useState("");

  async function load(activeToken: string) {
    try {
      setLoading(true);
      setError("");
      const result = await getStaffOrder(activeToken, orderNumber);
      setOrder(result.order);
      setStatus(result.order.status);
    } catch (caught) {
      if (caught instanceof StaffOrdersApiError && caught.status === 401) {
        clearStaffAccessToken();
        router.replace("/staff/login");
        return;
      }
      setError(
        caught instanceof Error ? caught.message : "Unable to load order.",
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
    void load(activeToken);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, orderNumber]);

  async function handleUpdateStatus(newStatus: string) {
    if (!token || !order) return;
    try {
      setSaving(true);
      setError("");
      setSuccess("");
      await updateStaffOrderStatus(token, order.orderNumber, {
        status: newStatus,
        notes,
      });
      await load(token);
      setNotes("");
      setSuccess(`Order marked as ${newStatus}.`);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to update order status.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f1f1f1] text-[13px] text-[#616161]">
        <div className="flex items-center gap-2">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#d4d4d4] border-t-[#1a1a1a]" />
          Loading order details...
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-8 text-center text-[#8a1c14]">
        {error || "Order not found."}
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
              href="/staff/orders"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#d4d4d4] bg-white text-[#616161] hover:bg-[#f7f7f7] shadow-xs"
              aria-label="Back to orders"
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
                href="/staff/orders"
                className="text-[14px] text-[#616161] hover:underline"
              >
                Orders
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled
              className="inline-flex h-8 items-center justify-center rounded-lg border border-[#d4d4d4] bg-white px-3 text-[13px] font-medium text-[#303030] shadow-xs hover:bg-[#f7f7f7] disabled:opacity-50"
            >
              Print
            </button>
            <button
              type="button"
              disabled
              className="inline-flex h-8 items-center justify-center rounded-lg border border-[#d4d4d4] bg-white px-3 text-[13px] font-medium text-[#303030] shadow-xs hover:bg-[#f7f7f7] disabled:opacity-50"
            >
              Refund
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

        {/* Title, Badges & Subtitle */}
        <div className="mt-4">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-[24px] font-semibold text-[#1a1a1a]">
              {order.orderNumber}
            </h1>
            <div>{paymentPill(order.paymentStatus)}</div>
            <div>{fulfillmentPill(order.fulfillmentStatus)}</div>
          </div>
          <p className="mt-0.5 text-[12px] text-[#616161]">
            Placed {formatOrderTime(order.placedAt || order.createdAt)}
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

        {/* ----------------- 2-Column Shopify Layout ----------------- */}
        <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[1fr_320px]">
          {/* Main Left Column */}
          <div className="space-y-4">
            {/* Fulfillment Action Banner if Unfulfilled */}
            {order.fulfillmentStatus.toUpperCase() !== "FULFILLED" && (
              <div className="flex items-center justify-between rounded-xl border border-[#e3e3e3] bg-white p-4 shadow-xs">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#fff4e5] text-[#b25e02]">
                    📦
                  </span>
                  <div>
                    <h3 className="font-semibold text-[#1a1a1a]">
                      Unfulfilled ({order.items.length})
                    </h3>
                    <p className="text-[12px] text-[#616161]">
                      Ready to process and ship to customer
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleUpdateStatus("SHIPPED")}
                  disabled={saving}
                  className="rounded-lg bg-[#1a1a1a] px-3.5 py-1.5 text-[12px] font-medium text-white hover:bg-[#303030] shadow-xs transition-colors"
                >
                  Fulfill items
                </button>
              </div>
            )}

            {/* Products Card */}
            <div className="rounded-xl border border-[#e3e3e3] bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between pb-3">
                <h2 className="text-[14px] font-semibold text-[#1a1a1a]">
                  Products ({order.items.length})
                </h2>
              </div>

              <div className="divide-y divide-[#f1f1f1]">
                {order.items.map((item) => (
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
                        <div className="text-[11px] text-[#8c9196]">
                          SKU: {item.sku}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 pl-3">
                      <div className="text-[13px] text-[#616161]">
                        {money(item.unitPrice, order.currency)} × {item.quantity}
                      </div>

                      <div className="w-24 text-right font-semibold text-[#1a1a1a]">
                        {money(item.totalAmount, order.currency)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment Summary Card */}
            <div className="rounded-xl border border-[#e3e3e3] bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between pb-3">
                <h2 className="text-[14px] font-semibold text-[#1a1a1a]">
                  Payment
                </h2>
                <div>{paymentPill(order.paymentStatus)}</div>
              </div>

              <div className="space-y-3 pt-2 text-[13px]">
                <div className="flex items-center justify-between">
                  <span className="text-[#616161]">Subtotal</span>
                  <div className="flex items-center gap-6">
                    <span className="text-[#8c9196]">
                      {order.items.length} item{order.items.length === 1 ? "" : "s"}
                    </span>
                    <span className="font-semibold text-[#1a1a1a]">
                      {money(order.subtotal, order.currency)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[#616161]">Discount</span>
                  <span className="text-[#8c9196]">
                    -{money(order.discountAmount, order.currency)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[#616161]">Shipping</span>
                  <span className="text-[#8c9196]">
                    {money(order.shippingAmount, order.currency)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-[#616161]">
                    <span>Estimated tax</span>
                    <span className="text-[11px] text-[#8c9196]">ⓘ</span>
                  </div>
                  <div className="flex items-center gap-6">
                    <span className="text-[#8c9196]">
                      {money(order.taxAmount, order.currency)} · 9% CGST
                    </span>
                    <span className="text-[#8c9196]">Included</span>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-[#e3e3e3] pt-4 text-[15px] font-semibold text-[#1a1a1a]">
                  <span>Total</span>
                  <span>
                    {money(order.totalAmount, order.currency)} {order.currency}
                  </span>
                </div>
              </div>
            </div>

            {/* Timeline Section */}
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

          {/* Right Sidebar Columns */}
          <div className="space-y-4">
            {/* Status Selector */}
            <div className="rounded-xl border border-[#e3e3e3] bg-white p-4 shadow-xs">
              <span className="text-[13px] font-semibold text-[#1a1a1a]">
                Update status
              </span>
              <div className="mt-2 space-y-2">
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="h-8 w-full rounded-lg border border-[#d4d4d4] bg-white px-2 text-[12px] text-[#303030] outline-none"
                >
                  {ORDER_STATUSES.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={saving || status === order.status}
                  onClick={() => handleUpdateStatus(status)}
                  className="w-full rounded-lg bg-[#1a1a1a] py-1.5 text-[12px] font-medium text-white hover:bg-[#303030] disabled:opacity-40 transition-colors"
                >
                  {saving ? "Updating..." : "Save status"}
                </button>
              </div>
            </div>

            {/* Customer Section */}
            <div className="rounded-xl border border-[#e3e3e3] bg-white p-4 shadow-xs">
              <div className="flex items-center justify-between pb-2">
                <span className="text-[13px] font-semibold text-[#1a1a1a]">
                  Customer
                </span>
                <span className="text-[#8c9196] cursor-pointer">···</span>
              </div>

              <div>
                <Link
                  href={`/staff/customers/${encodeURIComponent(
                    order.customer.customerCode,
                  )}`}
                  className="font-semibold text-[#005bd3] hover:underline"
                >
                  {customerDisplayName(order)}
                </Link>
                <div className="text-[12px] text-[#616161]">
                  Customer Code: {order.customer.customerCode}
                </div>
                <div className="mt-1 text-[12px] text-[#005bd3] hover:underline">
                  {order.customer.person.email || "No email"}
                </div>
                {order.customer.person.phone && (
                  <div className="text-[12px] text-[#8c9196]">
                    {order.customer.person.phone}
                  </div>
                )}
              </div>
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
                {order.shippingAddress ? (
                  <>
                    <p className="font-medium">
                      {order.shippingAddress.recipientName || customerDisplayName(order)}
                    </p>
                    <p className="text-[#616161]">{order.shippingAddress.addressLine1}</p>
                    <p className="text-[#616161]">
                      {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}
                    </p>
                    <p className="text-[#616161]">{order.shippingAddress.country}</p>
                  </>
                ) : (
                  <p className="text-[#8c9196]">No shipping address provided</p>
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
              <span className="text-[13px] font-semibold text-[#1a1a1a]">
                Markets
              </span>
              <div className="mt-2 flex items-center gap-1.5 text-[12px] text-[#303030]">
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
                  value={order.currency}
                  className="h-8 w-full rounded-lg border border-[#d4d4d4] bg-[#fafafa] px-2 text-[12px] text-[#303030] outline-none"
                >
                  <option value="INR">Indian Rupee (INR ₹)</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}