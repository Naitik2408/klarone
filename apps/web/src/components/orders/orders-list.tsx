"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useCustomerAuth } from "@/components/auth/customer-auth-provider";
import { getCustomerOrders } from "@/lib/orders-api";
import type {
  OrderListItem,
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

function getStatusClasses(status: string) {
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

export function OrdersList() {
  const router = useRouter();

  const {
    accessToken,
    customer,
    isLoading: isAuthLoading,
  } = useCustomerAuth();

  const [orders, setOrders] =
    useState<OrderListItem[]>([]);

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

    async function loadOrders() {
      setIsLoading(true);
      setError(null);

      try {
        const response =
          await getCustomerOrders(
            customerAccessToken,
          );

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
  }, [
    accessToken,
    customer,
    isAuthLoading,
    router,
  ]);

  if (isAuthLoading || isLoading) {
    return (
      <section className="mx-auto w-full max-w-5xl">
        <div className="rounded-3xl border border-neutral-200 bg-white p-8">
          <p className="text-sm text-neutral-500">
            Loading your orders...
          </p>
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
            Unable to load orders
          </h2>

          <p className="mt-2 text-sm text-red-700">
            {error}
          </p>

          <button
            type="button"
            onClick={() =>
              window.location.reload()
            }
            className="mt-4 rounded-2xl bg-neutral-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800"
          >
            Try again
          </button>
        </div>
      </section>
    );
  }

  if (orders.length === 0) {
    return (
      <section className="mx-auto w-full max-w-5xl">
        <div className="rounded-3xl border border-neutral-200 bg-white p-8 text-center">
          <p className="text-sm font-medium text-neutral-500">
            No orders yet
          </p>

          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-neutral-950">
            Your orders will appear here
          </h2>

          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-neutral-600">
            Once you place a Klarone order,
            you can track its status and view
            the complete order details here.
          </p>

          <Link
            href="/laptops"
            className="mt-6 inline-flex rounded-2xl bg-neutral-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-neutral-800"
          >
            Browse laptops
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-5xl">
      <div className="mb-6">
        <p className="text-sm font-medium text-neutral-500">
          Account
        </p>

        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-neutral-950">
          My orders
        </h1>

        <p className="mt-2 text-sm text-neutral-600">
          {orders.length}{" "}
          {orders.length === 1
            ? "order"
            : "orders"}{" "}
          on your Klarone account.
        </p>
      </div>

      <div className="space-y-4">
        {orders.map((order) => (
          <Link
            key={order.id}
            href={`/account/orders/${encodeURIComponent(
              order.orderNumber,
            )}`}
            className="block rounded-3xl border border-neutral-200 bg-white p-6 transition hover:border-neutral-300 hover:shadow-sm"
          >
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-base font-semibold text-neutral-950">
                    {order.orderNumber}
                  </h2>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusClasses(
                      order.status,
                    )}`}
                  >
                    {order.status}
                  </span>
                </div>

                <p className="mt-2 text-sm text-neutral-500">
                  {formatDate(
                    order.createdAt,
                  )}
                </p>
              </div>

              <div className="sm:text-right">
                <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                  Total
                </p>

                <p className="mt-1 text-lg font-semibold text-neutral-950">
                  {formatCurrency(
                    order.totalAmount,
                    order.currency,
                  )}
                </p>
              </div>
            </div>

            <div className="mt-5 border-t border-neutral-100 pt-5">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-neutral-600">
                <span>
                  {order.items.reduce(
                    (total, item) =>
                      total + item.quantity,
                    0,
                  )}{" "}
                  {order.items.reduce(
                    (total, item) =>
                      total + item.quantity,
                    0,
                  ) === 1
                    ? "item"
                    : "items"}
                </span>

                <span className="text-neutral-300">
                  •
                </span>

                <span>
                  Payment:{" "}
                  {order.paymentStatus}
                </span>

                <span className="text-neutral-300">
                  •
                </span>

                <span>
                  Fulfillment:{" "}
                  {order.fulfillmentStatus}
                </span>
              </div>

              <div className="mt-4 space-y-2">
                {order.items.map(
                  (item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-4 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-neutral-900">
                          {item.productName}
                        </p>

                        <p className="text-neutral-500">
                          {item.quantity} ×{" "}
                          {formatCurrency(
                            item.unitPrice,
                            order.currency,
                          )}
                        </p>
                      </div>

                      <p className="shrink-0 font-medium text-neutral-900">
                        {formatCurrency(
                          item.totalAmount,
                          order.currency,
                        )}
                      </p>
                    </div>
                  ),
                )}
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-neutral-100 pt-4">
                <span className="text-sm font-medium text-neutral-600">
                  View order details
                </span>

                <span className="text-sm font-semibold text-neutral-950">
                  →
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}