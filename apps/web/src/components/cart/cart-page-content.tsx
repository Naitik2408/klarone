"use client";

import Link from "next/link";
import { useCart } from "./cart-provider";

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

function formatStorage(
  storageGb: number | null,
): string | null {
  if (!storageGb) {
    return null;
  }

  if (storageGb >= 1024) {
    return `${storageGb / 1024}TB`;
  }

  return `${storageGb}GB`;
}

export function CartPageContent() {
  const {
    items,
    itemCount,
    subtotal,
    removeItem,
    updateQuantity,
    clearCart,
    isHydrated,
  } = useCart();

  if (!isHydrated) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8">
        <p className="text-sm text-slate-500">
          Loading your cart...
        </p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center sm:px-10">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-xl">
          🛒
        </div>

        <h1 className="mt-5 text-2xl font-semibold tracking-tight text-slate-950">
          Your cart is empty
        </h1>

        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
          Explore the Klarone catalogue and add a laptop
          when you find one that fits your needs.
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
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <section>
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-slate-500">
              {itemCount}{" "}
              {itemCount === 1 ? "item" : "items"}
            </p>

            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
              Your cart
            </h1>
          </div>

          <button
            type="button"
            onClick={clearCart}
            className="text-sm font-medium text-slate-500 transition-colors hover:text-red-600"
          >
            Clear cart
          </button>
        </div>

        <div className="space-y-4">
          {items.map((item) => (
            <article
              key={item.variantId}
              className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"
            >
              <div className="flex flex-col gap-5 sm:flex-row">
                <Link
                  href={`/laptops/${item.productSlug}`}
                  className="flex h-28 w-full shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100 sm:h-32 sm:w-40"
                >
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.productName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <span className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
                        Klarone
                      </span>
                    </div>
                  )}
                </Link>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-col justify-between gap-4 sm:flex-row">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-400">
                        {item.brandName}
                      </p>

                      <Link
                        href={`/laptops/${item.productSlug}`}
                        className="mt-1 block text-lg font-semibold tracking-tight text-slate-950 hover:text-blue-600"
                      >
                        {item.productName}
                      </Link>

                      {item.variantName ? (
                        <p className="mt-1 text-sm text-slate-500">
                          {item.variantName}
                        </p>
                      ) : null}

                      <div className="mt-3 flex flex-wrap gap-2">
                        {item.ramGb ? (
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                            {item.ramGb}GB RAM
                          </span>
                        ) : null}

                        {item.storageGb ? (
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                            {formatStorage(
                              item.storageGb,
                            )}{" "}
                            SSD
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="sm:text-right">
                      <p className="text-lg font-semibold text-slate-950">
                        {formatPrice(
                          String(
                            Number(item.sellingPrice) *
                              item.quantity,
                          ),
                          item.currency,
                        )}
                      </p>

                      {item.compareAtPrice &&
                      item.compareAtPrice !==
                        item.sellingPrice ? (
                        <p className="mt-1 text-sm text-slate-400 line-through">
                          {formatPrice(
                            String(
                              Number(
                                item.compareAtPrice,
                              ) * item.quantity,
                            ),
                            item.currency,
                          )}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-4">
                    <div className="inline-flex items-center rounded-full border border-slate-300">
                      <button
                        type="button"
                        onClick={() =>
                          updateQuantity(
                            item.variantId,
                            item.quantity - 1,
                          )
                        }
                        className="flex h-9 w-9 items-center justify-center text-slate-600 hover:text-slate-950"
                        aria-label={`Decrease quantity of ${item.productName}`}
                      >
                        −
                      </button>

                      <span className="min-w-10 text-center text-sm font-medium text-slate-800">
                        {item.quantity}
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          updateQuantity(
                            item.variantId,
                            item.quantity + 1,
                          )
                        }
                        className="flex h-9 w-9 items-center justify-center text-slate-600 hover:text-slate-950"
                        aria-label={`Increase quantity of ${item.productName}`}
                      >
                        +
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        removeItem(item.variantId)
                      }
                      className="text-sm font-medium text-slate-500 transition-colors hover:text-red-600"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-6 lg:sticky lg:top-24">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">
          Order summary
        </p>

        <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
          Ready when you are
        </h2>

        <div className="mt-6 space-y-3 border-b border-slate-100 pb-5">
          <div className="flex justify-between gap-4 text-sm">
            <span className="text-slate-500">
              Subtotal
            </span>

            <span className="font-medium text-slate-950">
              {formatPrice(
                subtotal,
                items[0]?.currency ?? "INR",
              )}
            </span>
          </div>

          <div className="flex justify-between gap-4 text-sm">
            <span className="text-slate-500">
              Shipping
            </span>

            <span className="font-medium text-slate-700">
              Calculated at checkout
            </span>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between gap-4">
          <span className="text-base font-semibold text-slate-950">
            Total
          </span>

          <span className="text-2xl font-semibold tracking-tight text-slate-950">
            {formatPrice(
              subtotal,
              items[0]?.currency ?? "INR",
            )}
          </span>
        </div>

        <Link
          href="/checkout"
          className="mt-6 flex h-12 w-full items-center justify-center rounded-full bg-slate-950 px-5 text-sm font-semibold text-white transition-colors hover:bg-blue-600"
        >
          Proceed to checkout
        </Link>

        <p className="mt-4 text-center text-xs leading-5 text-slate-400">
          Checkout will be handled through Klarone&apos;s
          secure payment flow.
        </p>
      </aside>
    </div>
  );
}