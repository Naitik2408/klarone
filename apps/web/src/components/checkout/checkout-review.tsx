"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCart } from "../cart/cart-provider";
import { createCheckoutQuote } from "../../lib/checkout-api";
import type { CheckoutQuote } from "../../types/checkout";

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

export function CheckoutReview() {
  const {
    items,
    clearCart,
    isHydrated,
  } = useCart();

  const [quote, setQuote] =
    useState<CheckoutQuote | null>(null);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    if (!isHydrated || items.length === 0) {
      return;
    }

    let cancelled = false;

    async function loadQuote() {
      setLoading(true);
      setError(null);

      try {
        const nextQuote =
          await createCheckoutQuote(
            items.map((item) => ({
              variantId: item.variantId,
              quantity: item.quantity,
            })),
          );

        if (!cancelled) {
          setQuote(nextQuote);
        }
      } catch (requestError) {
        if (!cancelled) {
          setQuote(null);

          setError(
            requestError instanceof Error
              ? requestError.message
              : "Unable to verify your cart.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadQuote();

    return () => {
      cancelled = true;
    };
  }, [items, isHydrated]);

  if (!isHydrated) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8">
        <p className="text-sm text-slate-500">
          Loading checkout...
        </p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
          Your cart is empty
        </h1>

        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
          Add a laptop to your cart before starting
          checkout.
        </p>

        <Link
          href="/laptops"
          className="mt-7 inline-flex rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-600"
        >
          Browse laptops
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
      <section>
        <div className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-blue-600">
            Checkout
          </p>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
            Review your order
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-600">
            Klarone verifies the current product price
            and available stock before checkout.
          </p>
        </div>

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
            <p className="text-sm font-semibold text-red-900">
              We could not verify your cart.
            </p>

            <p className="mt-2 text-sm leading-6 text-red-700">
              {error}
            </p>

            <Link
              href="/cart"
              className="mt-4 inline-flex rounded-full border border-red-300 px-4 py-2 text-sm font-medium text-red-800 hover:bg-red-100"
            >
              Back to cart
            </Link>
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <p className="text-sm text-slate-500">
              Verifying prices and stock...
            </p>
          </div>
        ) : null}

        {!loading && quote ? (
          <div className="space-y-4">
            {quote.items.map((item) => (
              <article
                key={item.variantId}
                className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"
              >
                <div className="flex items-start justify-between gap-5">
                  <div className="min-w-0">
                    <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-400">
                      {item.brandName}
                    </p>

                    <h2 className="mt-1 text-lg font-semibold tracking-tight text-slate-950">
                      {item.productName}
                    </h2>

                    {item.variantName ? (
                      <p className="mt-1 text-sm text-slate-500">
                        {item.variantName}
                      </p>
                    ) : null}

                    <p className="mt-3 text-sm text-slate-500">
                      Quantity:{" "}
                      <span className="font-medium text-slate-800">
                        {item.quantity}
                      </span>
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      SKU: {item.sku}
                    </p>
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="text-lg font-semibold text-slate-950">
                      {formatPrice(
                        item.lineTotal,
                        item.currency,
                      )}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {formatPrice(
                        item.unitPrice,
                        item.currency,
                      )}{" "}
                      each
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </section>

      <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-6 lg:sticky lg:top-24">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">
          Order summary
        </p>

        <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
          Klarone checkout
        </h2>

        {quote ? (
          <>
            <div className="mt-6 space-y-3 border-b border-slate-100 pb-5">
              <div className="flex justify-between gap-4 text-sm">
                <span className="text-slate-500">
                  Subtotal
                </span>

                <span className="font-medium text-slate-950">
                  {formatPrice(
                    quote.pricing.subtotal,
                    quote.pricing.currency,
                  )}
                </span>
              </div>

              <div className="flex justify-between gap-4 text-sm">
                <span className="text-slate-500">
                  Shipping
                </span>

                <span className="font-medium text-slate-700">
                  To be calculated
                </span>
              </div>

              <div className="flex justify-between gap-4 text-sm">
                <span className="text-slate-500">
                  Tax
                </span>

                <span className="font-medium text-slate-700">
                  {formatPrice(
                    quote.pricing.taxAmount,
                    quote.pricing.currency,
                  )}
                </span>
              </div>
            </div>

            <div className="mt-5 flex items-end justify-between gap-4">
              <span className="text-base font-semibold text-slate-950">
                Current total
              </span>

              <span className="text-2xl font-semibold tracking-tight text-slate-950">
                {formatPrice(
                  quote.pricing.totalAmount,
                  quote.pricing.currency,
                )}
              </span>
            </div>

            <button
              type="button"
              disabled
              className="mt-6 flex h-12 w-full items-center justify-center rounded-full bg-slate-950 px-5 text-sm font-semibold text-white opacity-60"
            >
              Continue to secure checkout
            </button>

            <p className="mt-4 text-center text-xs leading-5 text-slate-400">
              Payment and customer authentication will
              be connected in the next checkout step.
            </p>

            <button
              type="button"
              onClick={clearCart}
              className="mt-4 w-full text-sm font-medium text-slate-400 hover:text-red-600"
            >
              Clear cart
            </button>
          </>
        ) : (
          <div className="mt-6 rounded-xl bg-slate-50 p-4">
            <p className="text-sm text-slate-500">
              Waiting for the server to verify your
              cart.
            </p>
          </div>
        )}
      </aside>
    </div>
  );
}