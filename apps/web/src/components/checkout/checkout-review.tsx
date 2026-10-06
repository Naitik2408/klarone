"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { useCustomerAuth } from "@/components/auth/customer-auth-provider";
import { useCart } from "@/components/cart/cart-provider";
import {
  cancelPendingOrder,
  createCheckoutOrder,
  getCheckoutQuote,
} from "@/lib/checkout-api";
import {
  initiatePayment,
  verifyRazorpayPayment,
  type PaymentMethod,
} from "@/lib/payments-api";

import type {
  CheckoutQuoteResponse,
} from "@/types/checkout";

const RAZORPAY_CHECKOUT_SCRIPT =
  "https://checkout.razorpay.com/v1/checkout.js";

let razorpayScriptPromise: Promise<void> | null =
  null;

function formatPrice(
  amount: string,
  currency: string,
) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(amount));
}

function loadRazorpayCheckoutScript(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(
      new Error(
        "Razorpay Checkout can only be loaded in the browser.",
      ),
    );
  }

  if (window.Razorpay) {
    return Promise.resolve();
  }

  if (razorpayScriptPromise) {
    return razorpayScriptPromise;
  }

  razorpayScriptPromise =
    new Promise<void>((resolve, reject) => {
      const existingScript =
        document.querySelector<HTMLScriptElement>(
          `script[src="${RAZORPAY_CHECKOUT_SCRIPT}"]`,
        );

      if (existingScript) {
        existingScript.addEventListener(
          "load",
          () => {
            if (window.Razorpay) {
              resolve();
            } else {
              reject(
                new Error(
                  "Razorpay Checkout loaded, but the checkout library is unavailable.",
                ),
              );
            }
          },
          { once: true },
        );

        existingScript.addEventListener(
          "error",
          () => {
            reject(
              new Error(
                "Unable to load Razorpay Checkout.",
              ),
            );
          },
          { once: true },
        );

        return;
      }

      const script =
        document.createElement("script");

      script.src =
        RAZORPAY_CHECKOUT_SCRIPT;
      script.async = true;

      script.onload = () => {
        if (window.Razorpay) {
          resolve();
        } else {
          razorpayScriptPromise = null;

          reject(
            new Error(
              "Razorpay Checkout loaded, but the checkout library is unavailable.",
            ),
          );
        }
      };

      script.onerror = () => {
        razorpayScriptPromise = null;

        reject(
          new Error(
            "Unable to load Razorpay Checkout. Please check your connection and try again.",
          ),
        );
      };

      document.head.appendChild(script);
    });

  return razorpayScriptPromise;
}

export function CheckoutReview() {
  const router = useRouter();

  const {
    items,
    clearCart,
    isHydrated,
  } = useCart();

  const {
    accessToken,
    customer,
    isLoading: isAuthLoading,
  } = useCustomerAuth();

  const [quote, setQuote] =
    useState<CheckoutQuoteResponse | null>(
      null,
    );

  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("COD");

  const [isQuoting, setIsQuoting] =
    useState(false);

  const [isPlacingOrder, setIsPlacingOrder] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const quoteItems = useMemo(
    () =>
      items.map((item) => ({
        variantId: item.variantId,
        quantity: item.quantity,
      })),
    [items],
  );

  const quoteKey = JSON.stringify(
    quoteItems,
  );

  useEffect(() => {
    if (
      !isHydrated ||
      items.length === 0
    ) {
      setQuote(null);
      return;
    }

    let cancelled = false;

    async function loadQuote() {
      setIsQuoting(true);
      setError(null);

      try {
        const response =
          await getCheckoutQuote({
            items: quoteItems,
          });

        if (!cancelled) {
          setQuote(response);
        }
      } catch (quoteError) {
        if (!cancelled) {
          setQuote(null);
          setError(
            quoteError instanceof Error
              ? quoteError.message
              : "Unable to validate your cart.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsQuoting(false);
        }
      }
    }

    void loadQuote();

    return () => {
      cancelled = true;
    };
  }, [
    isHydrated,
    items.length,
    quoteKey,
  ]);

  async function handlePlaceOrder() {
    if (
      isAuthLoading ||
      isPlacingOrder
    ) {
      return;
    }

    if (!accessToken || !customer) {
      router.push(
        `/login?next=${encodeURIComponent("/checkout")}`,
      );
      return;
    }

    if (!quote) {
      setError(
        "Your checkout quote is not ready yet.",
      );
      return;
    }

    setIsPlacingOrder(true);
    setError(null);

    /*
     * Keep the Klarone order number available so a
     * failure before Razorpay opens can also release
     * the pending inventory reservation.
     */
    let pendingOrderNumber: string | null =
      null;

    try {
      /*
       * The server creates the order from the
       * authoritative PostgreSQL cart.
       *
       * Prices are never taken from the browser.
       */
      const orderResponse =
        await createCheckoutOrder(
          accessToken,
        );

      pendingOrderNumber =
        orderResponse.order.orderNumber;

      const paymentResponse =
        await initiatePayment(
          accessToken,
          {
            orderNumber:
              orderResponse.order
                .orderNumber,
            paymentMethod,
          },
        );

      /*
       * COD is immediately confirmed by Klarone.
       */
      if (paymentMethod === "COD") {
        try {
          await clearCart();
        } catch {
          /*
           * The order has already been created successfully.
           * Do not turn a successful order into a checkout
           * error merely because browser cart cleanup failed.
           */
        }

        router.push(
          `/account/orders/${encodeURIComponent(
            paymentResponse.order
              .orderNumber,
          )}`,
        );

        return;
      }

      /*
       * Razorpay Standard Checkout.
       */
      if (paymentMethod === "RAZORPAY") {
        const razorpayOrderId =
          paymentResponse.payment
            .providerOrderId;

        const checkoutKeyId =
          paymentResponse.payment
            .checkoutKeyId;

        if (!razorpayOrderId) {
          throw new Error(
            "Razorpay order was not created correctly.",
          );
        }

        if (!checkoutKeyId) {
          throw new Error(
            "Razorpay checkout is not configured. Please configure RAZORPAY_KEY_ID on the API.",
          );
        }

        await loadRazorpayCheckoutScript();

        if (!window.Razorpay) {
          throw new Error(
            "Razorpay Checkout is unavailable.",
          );
        }

        const amountInPaise =
          Math.round(
            Number(
              paymentResponse.payment
                .amount,
            ) * 100,
          );

        if (
          !Number.isFinite(
            amountInPaise,
          ) ||
          amountInPaise <= 0
        ) {
          throw new Error(
            "Invalid Razorpay payment amount.",
          );
        }

        let callbackReceived =
          false;

        const razorpayCheckout =
          new window.Razorpay({
            key: checkoutKeyId,
            amount:
              amountInPaise,
            currency:
              paymentResponse.payment
                .currency,
            name: "Klarone",
            description:
              `Klarone laptop order ${paymentResponse.order.orderNumber}`,
            order_id:
              razorpayOrderId,
            notes: {
              klaroneOrderNumber:
                paymentResponse.order
                  .orderNumber,
            },
            handler: async (
              razorpayResponse,
            ) => {
              callbackReceived = true;

              try {
                setError(null);

                const verification =
                  await verifyRazorpayPayment(
                    accessToken,
                    {
                      orderNumber:
                        paymentResponse
                          .order
                          .orderNumber,
                      razorpayPaymentId:
                        razorpayResponse.razorpay_payment_id,
                      razorpayOrderId:
                        razorpayResponse.razorpay_order_id,
                      razorpaySignature:
                        razorpayResponse.razorpay_signature,
                    },
                  );

                if (
                  verification.payment
                    .status !==
                  "PAID"
                ) {
                  setError(
                    "Razorpay returned the payment, but Klarone could not confirm it as paid yet. Please do not retry immediately.",
                  );
                  setIsPlacingOrder(false);
                  return;
                }

                /*
                 * Backend has verified the payment.
                 * The cart can now be cleared.
                 */
                try {
                  await clearCart();
                } catch {
                  /*
                   * The payment is already verified.
                   * The order page remains the source of truth
                   * even if browser cart cleanup fails.
                   */
                }

                router.push(
                  `/account/orders/${encodeURIComponent(
                    verification.order
                      .orderNumber,
                  )}`,
                );
              } catch (verificationError) {
                setError(
                  verificationError instanceof
                    Error
                    ? verificationError.message
                    : "Razorpay payment verification failed.",
                );

                setIsPlacingOrder(false);
              }
            },
            modal: {
              ondismiss: () => {
                if (
                  callbackReceived
                ) {
                  return;
                }

                /*
                 * The customer closed Razorpay without
                 * completing payment.
                 *
                 * Cancel the pending Klarone order so its
                 * inventory reservation is released immediately.
                 */
                void (async () => {
                  if (
                    !accessToken ||
                    !pendingOrderNumber
                  ) {
                    setError(
                      "Online payment was not completed.",
                    );
                    setIsPlacingOrder(false);
                    return;
                  }

                  try {
                    await cancelPendingOrder(
                      accessToken,
                      pendingOrderNumber,
                    );

                    setError(
                      "Online payment was cancelled. Your cart is still available to retry.",
                    );
                  } catch (cancelError) {
                    setError(
                      cancelError instanceof
                        Error
                        ? `Online payment was not completed, but Klarone could not cancel the pending order: ${cancelError.message}`
                        : "Online payment was not completed, but Klarone could not cancel the pending order.",
                    );
                  } finally {
                    setIsPlacingOrder(false);
                  }
                })();
              },
            },
          });

        razorpayCheckout.open();

        return;
      }
    } catch (orderError) {
      /*
       * If Razorpay setup failed after the Klarone order
       * was created, release the pending reservation.
       */
      if (
        paymentMethod === "RAZORPAY" &&
        accessToken &&
        pendingOrderNumber
      ) {
        try {
          await cancelPendingOrder(
            accessToken,
            pendingOrderNumber,
          );
        } catch {
          /*
           * Preserve the original checkout error.
           * The 15-minute server-side expiry is the fallback.
           */
        }
      }

      setError(
        orderError instanceof Error
          ? orderError.message
          : "Unable to place your order.",
      );

      setIsPlacingOrder(false);
    }
  }

  async function handleClearCart() {
    setError(null);

    try {
      await clearCart();
    } catch (clearError) {
      setError(
        clearError instanceof Error
          ? clearError.message
          : "Unable to clear your cart.",
      );
    }
  }

  if (!isHydrated) {
    return (
      <main className="min-h-[calc(100vh-73px)] bg-slate-50 px-4 py-12">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-3xl border border-slate-200 bg-white p-8">
            <p className="text-sm text-slate-500">
              Loading your checkout...
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (items.length === 0) {
    return (
      <main className="min-h-[calc(100vh-73px)] bg-slate-50 px-4 py-12">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center">
            <p className="text-sm font-medium text-slate-500">
              Your cart is empty
            </p>

            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
              Nothing to check out
            </h1>

            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-600">
              Add a laptop to your cart before
              continuing to checkout.
            </p>

            <Link
              href="/laptops"
              className="mt-6 inline-flex rounded-2xl bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              Browse laptops
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const currency =
    quote?.pricing.currency ??
    items[0]?.currency ??
    "INR";

  const isAuthenticated =
    Boolean(
      accessToken &&
      customer,
    );

  return (
    <main className="min-h-[calc(100vh-73px)] bg-slate-50 px-4 py-12">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-8 lg:grid-cols-[1fr_420px]">
          <section>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">
              Checkout
            </p>

            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              Review your order
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              Klarone verifies the current
              product price and available stock
              before creating your order.
            </p>

            {error ? (
              <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            <div className="mt-8 space-y-4">
              {quote?.items.map((item) => (
                <article
                  key={item.variantId}
                  className="rounded-3xl border border-slate-200 bg-white p-6"
                >
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm font-medium uppercase tracking-wide text-slate-400">
                        {item.brandName}
                      </p>

                      <h2 className="mt-1 text-xl font-semibold text-slate-950">
                        {item.productName}
                      </h2>

                      <p className="mt-2 text-sm text-slate-500">
                        {item.variantName}
                      </p>

                      <p className="mt-3 text-sm text-slate-600">
                        Quantity:{" "}
                        <span className="font-medium text-slate-950">
                          {item.quantity}
                        </span>
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        SKU: {item.sku}
                      </p>

                      <p className="mt-3 text-xs text-slate-500">
                        {item.availableQuantity}{" "}
                        unit
                        {item.availableQuantity ===
                        1
                          ? ""
                          : "s"}{" "}
                        currently available
                      </p>
                    </div>

                    <div className="text-left sm:text-right">
                      <p className="text-2xl font-semibold text-slate-950">
                        {formatPrice(
                          item.lineTotal,
                          item.currency,
                        )}
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
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

              {isQuoting ? (
                <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-500">
                  Rechecking current price and
                  stock...
                </div>
              ) : null}
            </div>
          </section>

          <aside className="h-fit rounded-3xl border border-slate-200 bg-white p-7 shadow-sm lg:sticky lg:top-6">
            <p className="text-sm font-medium uppercase tracking-[0.16em] text-slate-400">
              Order summary
            </p>

            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
              Klarone checkout
            </h2>

            <div className="mt-8 space-y-4 text-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-600">
                  Subtotal
                </span>

                <span className="font-medium text-slate-950">
                  {quote
                    ? formatPrice(
                        quote.pricing.subtotal,
                        quote.pricing.currency,
                      )
                    : "—"}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-600">
                  Shipping
                </span>

                <span className="font-medium text-slate-950">
                  {quote
                    ? formatPrice(
                        quote.pricing.shippingAmount,
                        quote.pricing.currency,
                      )
                    : "—"}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-600">
                  Tax
                </span>

                <span className="font-medium text-slate-950">
                  {quote
                    ? formatPrice(
                        quote.pricing.taxAmount,
                        quote.pricing.currency,
                      )
                    : "—"}
                </span>
              </div>

              <div className="border-t border-slate-200 pt-5">
                <div className="flex items-end justify-between gap-4">
                  <span className="text-base font-semibold text-slate-950">
                    Current total
                  </span>

                  <span className="text-2xl font-semibold tracking-tight text-slate-950">
                    {quote
                      ? formatPrice(
                          quote.pricing.total,
                          quote.pricing.currency,
                        )
                      : "—"}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-7">
              <p className="text-sm font-semibold text-slate-950">
                Payment method
              </p>

              <div className="mt-3 space-y-3">
                <button
                  type="button"
                  onClick={() =>
                    setPaymentMethod(
                      "COD",
                    )
                  }
                  disabled={
                    isPlacingOrder
                  }
                  className={`w-full rounded-2xl border p-4 text-left transition ${
                    paymentMethod ===
                    "COD"
                      ? "border-slate-950 bg-slate-50"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                        paymentMethod ===
                        "COD"
                          ? "border-slate-950"
                          : "border-slate-300"
                      }`}
                    >
                      {paymentMethod ===
                      "COD" ? (
                        <div className="h-2.5 w-2.5 rounded-full bg-slate-950" />
                      ) : null}
                    </div>

                    <div>
                      <p className="font-medium text-slate-950">
                        Cash on Delivery
                      </p>

                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        Pay when your Klarone order
                        is delivered.
                      </p>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setPaymentMethod(
                      "RAZORPAY",
                    )
                  }
                  disabled={
                    isPlacingOrder
                  }
                  className={`w-full rounded-2xl border p-4 text-left transition ${
                    paymentMethod ===
                    "RAZORPAY"
                      ? "border-slate-950 bg-slate-50"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                        paymentMethod ===
                        "RAZORPAY"
                          ? "border-slate-950"
                          : "border-slate-300"
                      }`}
                    >
                      {paymentMethod ===
                      "RAZORPAY" ? (
                        <div className="h-2.5 w-2.5 rounded-full bg-slate-950" />
                      ) : null}
                    </div>

                    <div>
                      <p className="font-medium text-slate-950">
                        Online payment
                      </p>

                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        Pay securely online with
                        Razorpay.
                      </p>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                void handlePlaceOrder();
              }}
              disabled={
                isAuthLoading ||
                isQuoting ||
                isPlacingOrder ||
                !quote
              }
              className="mt-7 w-full rounded-2xl bg-slate-950 px-5 py-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPlacingOrder
                ? "Processing..."
                : isAuthLoading
                  ? "Checking session..."
                  : !isAuthenticated
                    ? "Sign in to continue"
                    : paymentMethod ===
                      "COD"
                      ? "Place COD order"
                      : "Pay securely with Razorpay"}
            </button>

            <p className="mt-4 text-center text-xs leading-5 text-slate-500">
              {paymentMethod ===
              "COD"
                ? "Your COD order will be confirmed immediately and payment will remain pending until delivery."
                : "Your payment is verified by Klarone's backend before the order is marked paid."}
            </p>

            <button
              type="button"
              onClick={() => {
                void handleClearCart();
              }}
              disabled={
                isPlacingOrder
              }
              className="mt-5 w-full text-sm font-medium text-slate-400 transition hover:text-slate-700 disabled:opacity-50"
            >
              Clear cart
            </button>

            <p className="mt-4 text-center text-xs text-slate-400">
              Currency: {currency}
            </p>
          </aside>
        </div>
      </div>
    </main>
  );
}
