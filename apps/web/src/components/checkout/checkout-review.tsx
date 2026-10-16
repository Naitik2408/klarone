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

  const [orderSuccessRedirecting, setOrderSuccessRedirecting] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  // Delivery & Customer Form State
  const [recipientName, setRecipientName] = useState("");
  const [phone, setPhone] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("Kolkata");
  const [stateName, setStateName] = useState("West Bengal");
  const [postalCode, setPostalCode] = useState("");

  useEffect(() => {
    if (customer) {
      if (!recipientName) {
        const full = `${customer.person?.firstName ?? ""} ${customer.person?.lastName ?? ""}`.trim();
        if (full) setRecipientName(full);
      }
      if (!phone && customer.person?.phone) {
        setPhone(customer.person.phone);
      }
    }
  }, [customer]);

  const quoteItems = useMemo(
    () =>
      items.map((item) => ({
        variantId: item.variantId,
        quantity: item.quantity,
      })),
    [items],
  );

  const cartItemMap = useMemo(() => {
    const map = new Map<string, (typeof items)[0]>();
    for (const it of items) {
      map.set(it.variantId, it);
    }
    return map;
  }, [items]);

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
      if (!addressLine1.trim() || !city.trim() || !postalCode.trim()) {
        setError("Please enter your complete delivery street address, city, and pincode.");
        setIsPlacingOrder(false);
        return;
      }

      /*
       * The server creates the order from the
       * authoritative PostgreSQL cart.
       *
       * Prices are never taken from the browser.
       */
      const orderResponse =
        await createCheckoutOrder(
          accessToken,
          {
            shippingAddress: {
              recipientName: recipientName.trim() || undefined,
              phone: phone.trim() || undefined,
              addressLine1: addressLine1.trim(),
              addressLine2: addressLine2.trim() || undefined,
              city: city.trim(),
              state: stateName.trim(),
              postalCode: postalCode.trim(),
              country: "India",
            },
          },
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
        setOrderSuccessRedirecting(true);

        const orderDetailUrl = `/account/orders/${encodeURIComponent(
          paymentResponse.order.orderNumber,
        )}`;

        try {
          await clearCart();
        } catch {
          /*
           * The order has already been created successfully.
           * Do not turn a successful order into a checkout
           * error merely because browser cart cleanup failed.
           */
        }

        router.replace(orderDetailUrl);

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
                setOrderSuccessRedirecting(true);

                const orderDetailUrl = `/account/orders/${encodeURIComponent(
                  verification.order.orderNumber,
                )}`;

                try {
                  await clearCart();
                } catch {
                  /*
                   * The payment is already verified.
                   * The order page remains the source of truth
                   * even if browser cart cleanup fails.
                   */
                }

                router.replace(orderDetailUrl);
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
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-900 border-t-transparent" />
          <p className="text-sm font-medium text-neutral-500">Preparing secure checkout...</p>
        </div>
      </div>
    );
  }

  if (orderSuccessRedirecting) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center py-16 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <svg className="h-8 w-8 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-950">
          Order Confirmed!
        </h2>
        <p className="mt-2 text-sm text-stone-500">
          Taking you to your order summary...
        </p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl py-12 text-center">
        <div className="relative mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-neutral-100 ring-8 ring-neutral-50">
          <svg className="h-9 w-9 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
        </div>

        <h1 className="text-3xl font-semibold tracking-tight text-neutral-900">
          Your cart is empty
        </h1>

        <p className="mx-auto mt-3 max-w-md text-sm text-neutral-500 leading-relaxed">
          Looks like you haven&apos;t added any laptops to your bag yet. Explore our curated selection of verified machines.
        </p>

        <div className="mt-8 flex justify-center gap-3">
          <Link
            href="/laptops"
            className="inline-flex items-center gap-2 rounded-full bg-neutral-900 px-6 py-3.5 text-sm font-medium text-white shadow-sm transition hover:bg-neutral-800 hover:shadow"
          >
            Explore Laptops
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </Link>
        </div>
      </div>
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
    <div className="py-4">
      {/* Header matching Cart page style */}
      <div className="border-b border-stone-200/80 pb-6 mb-8">
        <h1
          style={{ fontFamily: "var(--font-serif), 'Instrument Serif', Georgia, serif" }}
          className="text-4xl font-normal tracking-tight text-slate-950 sm:text-5xl"
        >
          Review &amp; Checkout
        </h1>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
        {/* Left column: Cart Items & Delivery verification */}
        <section className="space-y-6">
          {error ? (
            <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-sm text-rose-800">
              <svg className="h-5 w-5 shrink-0 text-rose-500 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="font-semibold text-rose-900">Action Needed</p>
                <p className="mt-0.5 text-xs text-rose-700">{error}</p>
              </div>
            </div>
          ) : null}

          {/* Shipping & Delivery Address Form */}
          <div className="rounded-2xl border border-stone-200/90 bg-[#f0f2ee]/50 p-6 shadow-2xs">
            <div className="flex items-center justify-between border-b border-stone-200/60 pb-4 mb-5">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white shadow-2xs">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-base font-semibold text-slate-900">
                    Shipping &amp; Delivery Destination
                  </h2>
                  <p className="text-xs text-stone-500">
                    Direct hand-delivery in Kolkata &amp; all-India insured dispatch
                  </p>
                </div>
              </div>

              {customer ? (
                <span className="hidden sm:inline-block rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-800 border border-emerald-200/60">
                  Verified Account
                </span>
              ) : (
                <Link
                  href="/login?redirect=/checkout"
                  className="text-xs font-semibold text-slate-900 underline underline-offset-4 hover:text-stone-700"
                >
                  Sign in
                </Link>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1.5">
                  Recipient Full Name *
                </label>
                <input
                  type="text"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-stone-400 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1.5">
                  Mobile Number (for delivery SMS &amp; OTP) *
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-stone-400 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                  required
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-stone-700 mb-1.5">
                  Street Address / House / Flat / Apartment No. *
                </label>
                <input
                  type="text"
                  value={addressLine1}
                  onChange={(e) => setAddressLine1(e.target.value)}
                  placeholder="e.g. Flat 4B, Tower 2, Green View Apartments, Salt Lake Sector V"
                  className="w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-stone-400 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                  required
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-stone-700 mb-1.5">
                  Landmark (Optional)
                </label>
                <input
                  type="text"
                  value={addressLine2}
                  onChange={(e) => setAddressLine2(e.target.value)}
                  placeholder="e.g. Near RDB Cinemas / Behind Technopolis"
                  className="w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-stone-400 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1.5">
                  City *
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Kolkata"
                  className="w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-stone-400 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1.5">
                    State *
                  </label>
                  <input
                    type="text"
                    value={stateName}
                    onChange={(e) => setStateName(e.target.value)}
                    placeholder="West Bengal"
                    className="w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-stone-400 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1.5">
                    PIN Code *
                  </label>
                  <input
                    type="text"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    placeholder="700091"
                    maxLength={6}
                    className="w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-stone-400 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Items review card */}
          <div className="rounded-2xl border border-neutral-200/80 bg-white p-6 shadow-xs">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
              <h2 className="text-base font-semibold text-neutral-900">
                Items in your package ({quote?.items?.length || items.length})
              </h2>
              <Link
                href="/cart"
                className="text-xs font-semibold text-neutral-500 hover:text-neutral-900 transition"
              >
                Edit Cart
              </Link>
            </div>

            <div className="divide-y divide-neutral-100">
              {quote?.items.map((item) => {
                const cartDetails = cartItemMap.get(item.variantId);
                return (
                  <article key={item.variantId} className="py-5 first:pt-4 last:pb-0">
                    <div className="flex gap-4 sm:gap-6 items-start">
                      {/* Product Thumbnail */}
                      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-neutral-200/80 bg-neutral-50 flex items-center justify-center p-1.5">
                        {cartDetails?.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={cartDetails.imageUrl}
                            alt={item.productName}
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          <svg className="h-8 w-8 text-neutral-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        )}
                      </div>

                      {/* Info & Specs */}
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-semibold tracking-wider uppercase text-neutral-400">
                          {item.brandName}
                        </p>
                        <h3 className="text-sm font-semibold text-neutral-900 truncate">
                          {item.productName}
                        </h3>
                        <p className="mt-0.5 text-xs text-neutral-500">
                          {item.variantName}
                        </p>

                        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-neutral-500">
                          <span className="rounded-md bg-neutral-100 px-2 py-0.5 font-medium text-neutral-700">
                            Qty: {item.quantity}
                          </span>
                          <span className="text-neutral-300">•</span>
                          <span>SKU: {item.sku}</span>
                          <span className="text-neutral-300">•</span>
                          <span className="text-emerald-700 font-medium">In Stock</span>
                        </div>
                      </div>

                      {/* Pricing */}
                      <div className="text-right">
                        <p className="text-base font-semibold text-neutral-900">
                          {formatPrice(item.lineTotal, item.currency)}
                        </p>
                        {item.quantity > 1 ? (
                          <p className="text-xs text-neutral-400">
                            {formatPrice(item.unitPrice, item.currency)} each
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </article>
                );
              })}

              {isQuoting ? (
                <div className="py-4 text-center text-xs text-neutral-400 animate-pulse">
                  Verifying current price and real-time inventory...
                </div>
              ) : null}
            </div>
          </div>
        </section>

        {/* Right column: Sticky Order summary & payment choices */}
        <aside className="h-fit space-y-6 lg:sticky lg:top-28">
          <div className="rounded-2xl bg-[#f0f2ee] p-6 space-y-5 shadow-2xs">
            <h2 className="text-base font-semibold tracking-tight text-slate-900">
              Order Payment Summary
            </h2>

            <div className="space-y-3 text-sm text-stone-600">
              <div className="flex items-center justify-between">
                <span>Items Subtotal</span>
                <span className="font-medium text-slate-900">
                  {quote ? formatPrice(quote.pricing.subtotal, quote.pricing.currency) : "—"}
                </span>
              </div>

              <div className="flex items-center justify-between border-b border-stone-200/80 pb-3">
                <span>Delivery</span>
                <span className="font-semibold text-emerald-800">
                  {Number(quote?.pricing.shippingAmount ?? 0) === 0 ? "FREE" : formatPrice(quote!.pricing.shippingAmount, quote!.pricing.currency)}
                </span>
              </div>

              <div className="pt-1">
                <div className="flex items-baseline justify-between text-xs text-stone-500">
                  <span className="text-[14px] font-medium text-slate-800">Total Payable</span>
                  <span>GST &amp; delivery included</span>
                </div>
                <div className="mt-2 text-[38px] font-light text-slate-950 tracking-tight leading-none">
                  {quote ? formatPrice(quote.pricing.total, quote.pricing.currency) : "—"}
                </div>
              </div>
            </div>

            {/* Select Payment Method */}
            <div className="border-t border-stone-200/80 pt-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-3">
                Choose Payment Method
              </p>

              <div className="space-y-2.5">
                {/* Razorpay Option */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod("RAZORPAY")}
                  disabled={isPlacingOrder}
                  className={`w-full flex items-center justify-between rounded-xl border p-3.5 text-left transition ${
                    paymentMethod === "RAZORPAY"
                      ? "border-slate-950 bg-white ring-1 ring-slate-950 shadow-2xs"
                      : "border-stone-200 bg-white/70 hover:bg-white hover:border-stone-300"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                        paymentMethod === "RAZORPAY" ? "border-slate-950" : "border-stone-300"
                      }`}
                    >
                      {paymentMethod === "RAZORPAY" ? (
                        <div className="h-2 w-2 rounded-full bg-slate-950" />
                      ) : null}
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-slate-900">
                        Pay Online (UPI, Cards, NetBanking)
                      </p>
                      <p className="text-[11px] text-stone-500">
                        Secure instant checkout via Razorpay
                      </p>
                    </div>
                  </div>

                  <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200/50">
                    UPI
                  </span>
                </button>

                {/* COD Option */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod("COD")}
                  disabled={isPlacingOrder}
                  className={`w-full flex items-center justify-between rounded-xl border p-3.5 text-left transition ${
                    paymentMethod === "COD"
                      ? "border-slate-950 bg-white ring-1 ring-slate-950 shadow-2xs"
                      : "border-stone-200 bg-white/70 hover:bg-white hover:border-stone-300"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                        paymentMethod === "COD" ? "border-slate-950" : "border-stone-300"
                      }`}
                    >
                      {paymentMethod === "COD" ? (
                        <div className="h-2 w-2 rounded-full bg-slate-950" />
                      ) : null}
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-slate-900">
                        Cash on Delivery
                      </p>
                      <p className="text-[11px] text-stone-500">
                        Pay when your order is delivered &amp; inspected
                      </p>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Action CTA Button matching Cart page's lime/accent pill */}
            <button
              type="button"
              onClick={() => {
                void handlePlaceOrder();
              }}
              disabled={isAuthLoading || isQuoting || isPlacingOrder || !quote}
              className="mt-2 flex h-14 w-full items-center justify-center rounded-full bg-[#d6f088] text-[15px] font-semibold text-slate-950 shadow-sm transition hover:bg-[#c9e874] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPlacingOrder ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
                  <span>Processing Order...</span>
                </div>
              ) : isAuthLoading ? (
                "Checking session..."
              ) : !isAuthenticated ? (
                "Sign In to Complete Order"
              ) : paymentMethod === "COD" ? (
                "Confirm Cash on Delivery"
              ) : (
                "Pay with Razorpay"
              )}
            </button>

            <p className="text-center text-[11px] text-stone-500">
              Orders are backed by Klarone&apos;s 7-Day Replacement Guarantee &amp; Brand Warranty.
            </p>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={() => {
                void handleClearCart();
              }}
              disabled={isPlacingOrder}
              className="text-xs text-stone-400 hover:text-slate-900 transition"
            >
              Clear Cart
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
