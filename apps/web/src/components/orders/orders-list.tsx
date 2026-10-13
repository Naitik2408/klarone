"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useCustomerAuth } from "@/components/auth/customer-auth-provider";
import { getCustomerOrders } from "@/lib/orders-api";
import type { OrderListItem } from "@/types/orders";

function formatCurrency(amount: string, currency: string) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number(amount));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function getStatusBadge(status: string) {
  switch (status) {
    case "PENDING":
      return "bg-amber-50 text-amber-800 border-amber-200";
    case "CONFIRMED":
    case "PROCESSING":
      return "bg-blue-50 text-blue-800 border-blue-200";
    case "SHIPPED":
      return "bg-indigo-50 text-indigo-800 border-indigo-200";
    case "DELIVERED":
    case "COMPLETED":
      return "bg-emerald-50 text-emerald-800 border-emerald-200";
    case "CANCELLED":
      return "bg-red-50 text-red-800 border-red-200";
    default:
      return "bg-stone-100 text-stone-800 border-stone-200";
  }
}

export function OrdersList() {
  const router = useRouter();
  const { accessToken, customer, isAuthLoading } = useCustomerAuth() as any;

  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthLoading) return;
    if (!accessToken || !customer) {
      router.replace("/login");
      return;
    }

    const customerAccessToken = accessToken;
    let cancelled = false;

    async function loadOrders() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await getCustomerOrders(customerAccessToken);
        if (!cancelled) {
          setOrders(response.orders);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load your orders.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadOrders();
    return () => {
      cancelled = true;
    };
  }, [accessToken, customer, isAuthLoading, router]);

  if (isAuthLoading || isLoading) {
    return (
      <div className="rounded-3xl border border-stone-200 bg-[#f0f2ee] p-12 text-center">
        <p className="text-sm font-medium text-stone-500">Loading your orders...</p>
      </div>
    );
  }

  if (!accessToken || !customer) {
    return null;
  }

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 mb-6">
          {error}
        </div>
      ) : null}

      <div className="flex items-center justify-between">
        <h2
          style={{ fontFamily: "var(--font-serif), 'Instrument Serif', Georgia, serif" }}
          className="text-2xl font-normal text-slate-950"
        >
          Order History
        </h2>
        <span className="text-xs text-stone-400 font-medium">
          {orders.length} {orders.length === 1 ? "order" : "orders"}
        </span>
      </div>

      {orders.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-stone-300 bg-[#f0f2ee]/50 px-6 py-16 text-center">
          <h3
            style={{ fontFamily: "var(--font-serif), 'Instrument Serif', Georgia, serif" }}
            className="text-3xl font-normal text-slate-950"
          >
            No orders placed yet
          </h3>
          <p className="mx-auto mt-2 max-w-sm text-sm text-stone-500">
            When you purchase laptops with Klarone, your orders and tracking details will appear here.
          </p>
          <Link
            href="/laptops"
            className="mt-6 inline-flex rounded-full bg-slate-950 px-7 py-3 text-xs font-semibold text-white transition hover:bg-stone-800"
          >
            Browse Laptops
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/account/orders/${encodeURIComponent(order.orderNumber)}`}
              className="group block rounded-2xl bg-[#f0f2ee] p-6 transition duration-200 hover:shadow-md"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="text-base font-semibold text-slate-950 group-hover:text-emerald-950">
                      {order.orderNumber}
                    </span>
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${getStatusBadge(
                        order.status,
                      )}`}
                    >
                      {order.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-stone-500">Placed on {formatDate(order.createdAt)}</p>
                </div>

                <div className="sm:text-right">
                  <p className="text-xs text-stone-400 font-medium">Total</p>
                  <p className="text-base font-bold text-slate-950">
                    {formatCurrency(order.totalAmount, order.currency)}
                  </p>
                </div>
              </div>

              {/* Items summary */}
              <div className="mt-4 border-t border-stone-200/80 pt-4 space-y-2">
                {order.items.map((item) => (
                  <div key={item.id} className="flex justify-between text-xs text-stone-700">
                    <span className="truncate pr-4">
                      {item.quantity}× {item.productName}
                    </span>
                    <span className="font-medium shrink-0">
                      {formatCurrency(item.totalAmount, order.currency)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex items-center justify-between pt-2 text-xs font-semibold text-slate-900 group-hover:text-emerald-900">
                <span>View Details & Tracking</span>
                <span className="transition-transform group-hover:translate-x-1">→</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}