"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useCustomerAuth } from "@/components/auth/customer-auth-provider";
import { getCustomerOrder } from "@/lib/orders-api";
import type {
  OrderDetail as OrderDetailData,
} from "@/types/orders";

function formatCurrency(
  amount: string,
  currency: string,
) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(amount));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getStatusClasses(
  status: string,
) {
  switch (status) {
    case "PENDING":
      return "bg-amber-50 text-amber-700";

    case "CONFIRMED":
      return "bg-blue-50 text-blue-700";

    case "PROCESSING":
      return "bg-violet-50 text-violet-700";

    case "SHIPPED":
      return "bg-indigo-50 text-indigo-700";

    case "DELIVERED":
      return "bg-emerald-50 text-emerald-700";

    case "CANCELLED":
      return "bg-red-50 text-red-700";

    case "COMPLETED":
      return "bg-emerald-50 text-emerald-700";

    default:
      return "bg-neutral-100 text-neutral-700";
  }
}

export function OrderDetail({
  orderNumber,
}: {
  orderNumber: string;
}) {
  const router = useRouter();

  const {
    accessToken,
    customer,
    isLoading: isAuthLoading,
  } = useCustomerAuth();

  const [order, setOrder] =
    useState<OrderDetailData | null>(
      null,
    );

  const [isLoading, setIsLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    if (!accessToken || !customer) {
      router.replace("/login");
      return;
    }

    const customerAccessToken = accessToken;

    let cancelled = false;

    async function loadOrder() {
      setIsLoading(true);
      setError(null);

      try {
        const response =
          await getCustomerOrder(
            customerAccessToken,
            orderNumber,
          );

        if (!cancelled) {
          setOrder(response.order);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load this order.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadOrder();

    return () => {
      cancelled = true;
    };
  }, [
    accessToken,
    customer,
    isAuthLoading,
    orderNumber,
    router,
  ]);

  if (isAuthLoading || isLoading) {
    return (
      <section className="mx-auto w-full max-w-5xl space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-900 border-t-transparent" />
          <p className="text-sm font-medium text-stone-500">
            Retrieving order {orderNumber}...
          </p>
        </div>

        {/* Skeleton cards */}
        <div className="rounded-3xl border border-stone-200/80 bg-white p-6 md:p-8 animate-pulse space-y-6">
          <div className="flex items-center justify-between border-b border-stone-100 pb-5">
            <div className="space-y-2">
              <div className="h-6 w-48 rounded-lg bg-stone-200" />
              <div className="h-4 w-32 rounded bg-stone-100" />
            </div>
            <div className="h-8 w-24 rounded-full bg-stone-200" />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 rounded-2xl bg-stone-50 p-4 space-y-2">
                <div className="h-3 w-16 rounded bg-stone-200" />
                <div className="h-5 w-24 rounded bg-stone-200" />
              </div>
            ))}
          </div>

          <div className="space-y-4 pt-4">
            <div className="h-24 rounded-2xl bg-stone-50" />
            <div className="h-24 rounded-2xl bg-stone-50" />
          </div>
        </div>
      </section>
    );
  }

  if (!accessToken || !customer) {
    return null;
  }

  if (error) {
    return (
      <section className="mx-auto w-full max-w-5xl">
        <div className="rounded-3xl border border-red-200 bg-red-50 p-6">
          <h2 className="text-base font-semibold text-red-900">
            Unable to load order
          </h2>

          <p className="mt-2 text-sm text-red-700">
            {error}
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() =>
                window.location.reload()
              }
              className="rounded-2xl bg-neutral-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800"
            >
              Try again
            </button>

            <Link
              href="/account/orders"
              className="rounded-2xl border border-neutral-300 px-4 py-2.5 text-sm font-medium text-neutral-800 transition hover:bg-white"
            >
              Back to orders
            </Link>
          </div>
        </div>
      </section>
    );
  }

  if (!order) {
    return null;
  }

  return (
    <div className="mx-auto w-full max-w-5xl">
      {/* Top back navigation */}
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/account/orders"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-600 hover:text-slate-950 transition-colors"
        >
          <span>←</span> Back to all orders
        </Link>
        <span className="text-xs text-stone-400">Order ID: #{order.id}</span>
      </div>

      <div className="space-y-6">
        {/* Order Header Card */}
        <section className="rounded-3xl border border-stone-200/90 bg-[#f0f2ee]/60 p-6 sm:p-8 shadow-2xs">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <span className="text-xs font-semibold tracking-wider uppercase text-stone-500">
                Order Reference
              </span>
              <h1
                style={{ fontFamily: "var(--font-serif), 'Instrument Serif', Georgia, serif" }}
                className="mt-1 text-3xl font-normal tracking-tight text-slate-950 sm:text-4xl"
              >
                {order.orderNumber}
              </h1>
              <p className="mt-2 text-xs text-stone-500">
                Placed on {formatDate(order.createdAt)}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-3.5 py-1 text-xs font-semibold tracking-wide uppercase ${getStatusClasses(
                  order.status,
                )}`}
              >
                {order.status}
              </span>
              <span className="rounded-full bg-stone-200/80 px-3 py-1 text-xs font-medium text-stone-700">
                {order.paymentStatus === "PAID" ? "✓ Paid" : order.paymentStatus}
              </span>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 border-t border-stone-200/70 pt-5">
            <div className="rounded-2xl bg-white/80 p-3.5 border border-stone-200/60">
              <p className="text-[11px] font-medium uppercase tracking-wide text-stone-400">Payment Status</p>
              <p className="mt-1 text-xs font-semibold text-slate-900">{order.paymentStatus}</p>
            </div>

            <div className="rounded-2xl bg-white/80 p-3.5 border border-stone-200/60">
              <p className="text-[11px] font-medium uppercase tracking-wide text-stone-400">Fulfillment</p>
              <p className="mt-1 text-xs font-semibold text-slate-900">{order.fulfillmentStatus}</p>
            </div>

            <div className="rounded-2xl bg-white/80 p-3.5 border border-stone-200/60">
              <p className="text-[11px] font-medium uppercase tracking-wide text-stone-400">Items Count</p>
              <p className="mt-1 text-xs font-semibold text-slate-900">
                {order.items.reduce((acc, it) => acc + it.quantity, 0)} Units
              </p>
            </div>

            <div className="rounded-2xl bg-white/80 p-3.5 border border-stone-200/60">
              <p className="text-[11px] font-medium uppercase tracking-wide text-stone-400">Total Charged</p>
              <p className="mt-1 text-xs font-bold text-slate-900">
                {formatCurrency(order.totalAmount, order.currency)}
              </p>
            </div>
          </div>
        </section>

        {/* 2-column layout: Items on Left, Address & Timeline on Right */}
        <div className="grid grid-cols-12 gap-6 items-start">
          {/* Left Column: Products List */}
          <div className="col-span-12 lg:col-span-7 space-y-6">
            <section className="rounded-3xl border border-stone-200/90 bg-white p-6 shadow-2xs">
              <div className="border-b border-stone-100 pb-4 mb-4">
                <h2 className="text-base font-semibold text-slate-900">
                  Ordered Laptops &amp; Items ({order.items.length})
                </h2>
              </div>

              <div className="divide-y divide-stone-100">
                {order.items.map((item) => (
                  <article key={item.id} className="py-4 first:pt-0 last:pb-0">
                    <div className="flex gap-4 items-start">
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#f0f2ee] p-2 text-2xl">
                        💻
                      </div>

                      <div className="min-w-0 flex-1">
                        {item.productVariant?.product ? (
                          <Link
                            href={`/laptops/${item.productVariant.product.slug}`}
                            className="block font-semibold text-sm text-slate-900 hover:text-emerald-900 transition-colors line-clamp-1"
                          >
                            {item.productName}
                          </Link>
                        ) : (
                          <h3 className="font-semibold text-sm text-slate-900">{item.productName}</h3>
                        )}

                        <p className="mt-1 text-xs text-stone-500">
                          {[
                            item.productVariant?.ramGb ? `${item.productVariant.ramGb}GB RAM` : null,
                            item.productVariant?.storageGb ? `${item.productVariant.storageGb}GB SSD` : null,
                            item.productVariant?.variantName ?? null,
                          ]
                            .filter(Boolean)
                            .join(" · ") || `SKU: ${item.sku}`}
                        </p>

                        <div className="mt-2 flex items-center gap-3 text-xs text-stone-600">
                          <span className="rounded bg-stone-100 px-2 py-0.5 font-medium text-slate-700">
                            Qty: {item.quantity}
                          </span>
                          <span>{formatCurrency(item.unitPrice, order.currency)} each</span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold text-slate-900">
                          {formatCurrency(item.totalAmount, order.currency)}
                        </p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            {/* Financial summary */}
            <section className="rounded-3xl border border-stone-200/90 bg-[#f0f2ee]/50 p-6 shadow-2xs">
              <h2 className="text-sm font-semibold text-slate-900 mb-4">Payment Breakdown</h2>
              <div className="space-y-3 text-xs text-stone-600">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-medium text-slate-900">{formatCurrency(order.subtotal, order.currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery Charges</span>
                  <span className="font-medium text-emerald-800">
                    {Number(order.shippingAmount) === 0 ? "FREE (Priority Delivery)" : formatCurrency(order.shippingAmount, order.currency)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Taxes &amp; GST</span>
                  <span className="font-medium text-slate-900">{formatCurrency(order.taxAmount, order.currency)}</span>
                </div>
                <div className="border-t border-stone-200/80 pt-3 flex justify-between items-baseline">
                  <span className="text-sm font-semibold text-slate-900">Final Total</span>
                  <span className="text-2xl font-bold text-slate-950 tracking-tight">
                    {formatCurrency(order.totalAmount, order.currency)}
                  </span>
                </div>
              </div>
            </section>
          </div>

          {/* Right Column: Delivery Address & Status Timeline */}
          <div className="col-span-12 lg:col-span-5 space-y-6">
            {/* Delivery Destination */}
            <section className="rounded-3xl border border-stone-200/90 bg-white p-6 shadow-2xs">
              <div className="flex items-center gap-2.5 mb-4 border-b border-stone-100 pb-3">
                <svg className="h-4 w-4 text-stone-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <h2 className="text-sm font-semibold text-slate-900">Delivery Destination</h2>
              </div>

              {order.shippingAddress ? (
                <div className="space-y-1.5 text-xs text-stone-600 leading-relaxed">
                  <p className="font-semibold text-sm text-slate-900">
                    {order.shippingAddress.recipientName || "Valued Customer"}
                  </p>
                  {order.shippingAddress.phone ? (
                    <p className="text-stone-500 font-medium">{order.shippingAddress.phone}</p>
                  ) : null}
                  <p className="pt-1">{order.shippingAddress.addressLine1}</p>
                  {order.shippingAddress.addressLine2 ? (
                    <p>{order.shippingAddress.addressLine2}</p>
                  ) : null}
                  <p>
                    {order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.postalCode}
                  </p>
                  <p className="font-medium text-stone-400">{order.shippingAddress.country}</p>
                </div>
              ) : (
                <div className="text-xs text-stone-500 leading-relaxed">
                  <p className="font-medium text-slate-900">Klarone Direct Delivery</p>
                  <p className="mt-1">Hand-delivered in Kolkata or priority express all-India dispatch.</p>
                </div>
              )}
            </section>

            {/* Timeline */}
            <section className="rounded-3xl border border-stone-200/90 bg-white p-6 shadow-2xs">
              <h2 className="text-sm font-semibold text-slate-900 mb-4 border-b border-stone-100 pb-3">
                Order Activity &amp; Updates
              </h2>

              {order.statusHistory.length === 0 ? (
                <p className="text-xs text-stone-400">Order confirmed. Updates will appear as dispatch commences.</p>
              ) : (
                <div className="space-y-4">
                  {order.statusHistory.map((entry, index) => (
                    <div key={entry.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div
                          className={`mt-1 h-2.5 w-2.5 rounded-full ${
                            index === order.statusHistory.length - 1 ? "bg-slate-950" : "bg-stone-300"
                          }`}
                        />
                        {index < order.statusHistory.length - 1 ? (
                          <div className="mt-1 h-full w-px bg-stone-200" />
                        ) : null}
                      </div>
                      <div className="pb-1">
                        <p className="text-xs font-semibold text-slate-900">{entry.newStatus}</p>
                        <p className="text-[11px] text-stone-400">{formatDate(entry.createdAt)}</p>
                        {entry.notes ? <p className="mt-1 text-xs text-stone-600">{entry.notes}</p> : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>

        {/* Action navigation */}
        <div className="pt-4 flex flex-wrap gap-3">
          <Link
            href="/account/orders"
            className="rounded-full border border-stone-300 bg-white px-5 py-3 text-xs font-semibold text-slate-900 transition hover:bg-stone-50"
          >
            ← Back to orders list
          </Link>
          <Link
            href="/laptops"
            className="rounded-full bg-[#d6f088] px-6 py-3 text-xs font-semibold text-slate-950 transition hover:bg-[#c9e874]"
          >
            Browse More Laptops
          </Link>
        </div>
      </div>
    </div>
  );
}