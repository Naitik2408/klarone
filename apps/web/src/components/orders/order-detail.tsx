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
      <section className="mx-auto w-full max-w-5xl">
        <div className="rounded-3xl border border-neutral-200 bg-white p-8">
          <p className="text-sm text-neutral-500">
            Loading order details...
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
    <section className="mx-auto w-full max-w-5xl">
      <div className="mb-6">
        <Link
          href="/account/orders"
          className="text-sm font-medium text-neutral-600 hover:text-neutral-950"
        >
          ← Back to orders
        </Link>
      </div>

      <div className="space-y-5">
        <section className="rounded-3xl border border-neutral-200 bg-white p-6 sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-medium text-neutral-500">
                Order
              </p>

              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-950 sm:text-3xl">
                {order.orderNumber}
              </h1>

              <p className="mt-2 text-sm text-neutral-500">
                Created{" "}
                {formatDate(
                  order.createdAt,
                )}
              </p>
            </div>

            <span
              className={`self-start rounded-full px-3 py-1.5 text-sm font-medium ${getStatusClasses(
                order.status,
              )}`}
            >
              {order.status}
            </span>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-neutral-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                Payment
              </p>

              <p className="mt-1 text-sm font-semibold text-neutral-950">
                {order.paymentStatus}
              </p>
            </div>

            <div className="rounded-2xl bg-neutral-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                Fulfillment
              </p>

              <p className="mt-1 text-sm font-semibold text-neutral-950">
                {order.fulfillmentStatus}
              </p>
            </div>

            <div className="rounded-2xl bg-neutral-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                Total
              </p>

              <p className="mt-1 text-sm font-semibold text-neutral-950">
                {formatCurrency(
                  order.totalAmount,
                  order.currency,
                )}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-neutral-200 bg-white p-6 sm:p-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-neutral-500">
                Items
              </p>

              <h2 className="mt-1 text-xl font-semibold text-neutral-950">
                Order summary
              </h2>
            </div>

            <span className="text-sm text-neutral-500">
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
          </div>

          <div className="mt-6 divide-y divide-neutral-100">
            {order.items.map(
              (item) => (
                <div
                  key={item.id}
                  className="flex gap-4 py-5 first:pt-0 last:pb-0"
                >
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-neutral-100 text-xs font-semibold text-neutral-500">
                    LAP
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium text-neutral-950">
                      {item.productName}
                    </h3>

                    <p className="mt-1 text-sm text-neutral-500">
                      SKU: {item.sku}
                    </p>

                    {item.productVariant ? (
                      <p className="mt-1 text-sm text-neutral-500">
                        {item.productVariant
                          .variantName ??
                          "Standard configuration"}
                        {" · "}
                        {item.productVariant
                          .ramGb
                          ? `${item.productVariant.ramGb}GB RAM`
                          : ""}
                        {item.productVariant
                          .storageGb
                          ? ` · ${item.productVariant.storageGb}GB storage`
                          : ""}
                      </p>
                    ) : null}

                    <p className="mt-2 text-sm text-neutral-600">
                      {item.quantity} ×{" "}
                      {formatCurrency(
                        item.unitPrice,
                        order.currency,
                      )}
                    </p>
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="font-semibold text-neutral-950">
                      {formatCurrency(
                        item.totalAmount,
                        order.currency,
                      )}
                    </p>
                  </div>
                </div>
              ),
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-neutral-200 bg-white p-6 sm:p-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-neutral-500">
                Amount
              </p>

              <h2 className="mt-1 text-xl font-semibold text-neutral-950">
                Payment summary
              </h2>
            </div>
          </div>

          <div className="mt-6 space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-neutral-600">
                Subtotal
              </span>

              <span className="font-medium text-neutral-950">
                {formatCurrency(
                  order.subtotal,
                  order.currency,
                )}
              </span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="text-neutral-600">
                Discount
              </span>

              <span className="font-medium text-neutral-950">
                {formatCurrency(
                  order.discountAmount,
                  order.currency,
                )}
              </span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="text-neutral-600">
                Shipping
              </span>

              <span className="font-medium text-neutral-950">
                {formatCurrency(
                  order.shippingAmount,
                  order.currency,
                )}
              </span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="text-neutral-600">
                Tax
              </span>

              <span className="font-medium text-neutral-950">
                {formatCurrency(
                  order.taxAmount,
                  order.currency,
                )}
              </span>
            </div>

            <div className="border-t border-neutral-100 pt-4">
              <div className="flex justify-between gap-4">
                <span className="text-base font-semibold text-neutral-950">
                  Total
                </span>

                <span className="text-base font-semibold text-neutral-950">
                  {formatCurrency(
                    order.totalAmount,
                    order.currency,
                  )}
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-neutral-200 bg-white p-6 sm:p-8">
          <p className="text-sm font-medium text-neutral-500">
            Order timeline
          </p>

          <h2 className="mt-1 text-xl font-semibold text-neutral-950">
            Status history
          </h2>

          {order.statusHistory.length ===
          0 ? (
            <p className="mt-5 text-sm text-neutral-500">
              No status history is available
              yet.
            </p>
          ) : (
            <div className="mt-6 space-y-5">
              {order.statusHistory.map(
                (entry, index) => (
                  <div
                    key={entry.id}
                    className="flex gap-4"
                  >
                    <div className="flex flex-col items-center">
                      <div
                        className={`mt-1 h-3 w-3 rounded-full ${
                          index ===
                          order.statusHistory
                            .length -
                            1
                            ? "bg-neutral-950"
                            : "bg-neutral-300"
                        }`}
                      />

                      {index <
                      order.statusHistory
                        .length -
                        1 ? (
                        <div className="mt-2 h-full w-px bg-neutral-200" />
                      ) : null}
                    </div>

                    <div className="pb-1">
                      <p className="font-medium text-neutral-950">
                        {entry.newStatus}
                      </p>

                      <p className="mt-1 text-sm text-neutral-500">
                        {formatDate(
                          entry.createdAt,
                        )}
                      </p>

                      {entry.notes ? (
                        <p className="mt-2 text-sm leading-6 text-neutral-600">
                          {entry.notes}
                        </p>
                      ) : null}
                    </div>
                  </div>
                ),
              )}
            </div>
          )}
        </section>

        {order.payments.length > 0 ? (
          <section className="rounded-3xl border border-neutral-200 bg-white p-6 sm:p-8">
            <p className="text-sm font-medium text-neutral-500">
              Payments
            </p>

            <h2 className="mt-1 text-xl font-semibold text-neutral-950">
              Payment records
            </h2>

            <div className="mt-6 space-y-3">
              {order.payments.map(
                (payment) => (
                  <div
                    key={payment.id}
                    className="flex flex-col gap-2 rounded-2xl bg-neutral-50 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-medium text-neutral-950">
                        {payment.provider}
                      </p>

                      <p className="mt-1 text-xs text-neutral-500">
                        {formatDate(
                          payment.createdAt,
                        )}
                      </p>
                    </div>

                    <div className="sm:text-right">
                      <p className="font-medium text-neutral-950">
                        {formatCurrency(
                          payment.amount,
                          payment.currency,
                        )}
                      </p>

                      <p className="mt-1 text-xs text-neutral-500">
                        {payment.status}
                      </p>
                    </div>
                  </div>
                ),
              )}
            </div>
          </section>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <Link
            href="/account/orders"
            className="rounded-2xl border border-neutral-300 px-5 py-3 text-sm font-medium text-neutral-800 transition hover:bg-white"
          >
            Back to orders
          </Link>

          <Link
            href="/laptops"
            className="rounded-2xl bg-neutral-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-neutral-800"
          >
            Continue shopping
          </Link>
        </div>
      </div>
    </section>
  );
}