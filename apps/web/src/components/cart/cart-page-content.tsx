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
    return `${storageGb / 1024}TB SSD`;
  }

  return `${storageGb}GB SSD`;
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

  const freeShippingThreshold = 50000;
  const currentSubtotalNum = Number(subtotal) || 0;
  const freeShippingDiff = Math.max(0, freeShippingThreshold - currentSubtotalNum);
  const freeShippingProgress = Math.min(100, (currentSubtotalNum / freeShippingThreshold) * 100);

  if (!isHydrated) {
    return (
      <div className="rounded-3xl border border-stone-200 bg-[#f0f2ee] p-12 text-center">
        <p className="text-sm font-medium text-stone-500">Loading your cart...</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-stone-300 bg-[#f0f2ee]/60 px-6 py-20 text-center sm:px-10">
        <h1
          style={{ fontFamily: "var(--font-serif), 'Instrument Serif', Georgia, serif" }}
          className="text-4xl font-normal tracking-tight text-slate-950 sm:text-5xl"
        >
          Your cart is empty
        </h1>

        <p className="mx-auto mt-3 max-w-md text-sm text-stone-500">
          Explore our collection of flagship laptops and add a laptop to get started.
        </p>

        <Link
          href="/laptops"
          className="mt-8 inline-flex h-12 items-center justify-center rounded-full bg-slate-950 px-8 text-sm font-semibold text-white transition hover:bg-stone-800"
        >
          Browse Laptops
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* 1. Header: 'Your cart' matching 'Shop All' size exactly */}
      <div className="border-b border-stone-200/80 pb-6 mb-8">
        <h1
          style={{ fontFamily: "var(--font-serif), 'Instrument Serif', Georgia, serif" }}
          className="text-4xl font-normal tracking-tight text-slate-950 sm:text-5xl flex items-start"
        >
          <span>Your cart</span>
          <span className="text-sm font-sans font-medium text-stone-400 ml-1.5 -translate-y-1">
            {itemCount}
          </span>
        </h1>
      </div>

      {/* 2. Main 2-Column Grid */}
      <div className="grid grid-cols-12 gap-8 lg:gap-14 items-start">
        {/* Left Column: Cart Items List */}
        <div className="col-span-12 lg:col-span-7 xl:col-span-8 space-y-6">
          {items.map((item) => (
            <div
              key={item.variantId}
              className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 pb-6 border-b border-stone-200/60"
            >
              {/* Product Thumbnail & Details */}
              <div className="flex items-center gap-4 sm:gap-6 min-w-0">
                <Link
                  href={`/laptops/${item.productSlug}`}
                  className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-[#f0f2ee] p-2 overflow-hidden transition-opacity hover:opacity-90"
                >
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.productName}
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <span className="text-3xl">💻</span>
                  )}
                </Link>

                <div className="min-w-0">
                  <Link
                    href={`/laptops/${item.productSlug}`}
                    className="block text-[17px] font-semibold text-slate-900 hover:text-emerald-950 transition-colors line-clamp-1"
                  >
                    {item.productName}
                  </Link>
                  <p className="mt-1 text-[13px] text-stone-500">
                    {[
                      item.ramGb ? `${item.ramGb}GB RAM` : null,
                      item.storageGb ? formatStorage(item.storageGb) : null,
                      item.variantName,
                    ]
                      .filter(Boolean)
                      .join(" · ") || item.brandName}
                  </p>
                  <div className="mt-1.5 flex items-baseline gap-2">
                    <span className="text-[15px] font-semibold text-[#c64f3d]">
                      {formatPrice(item.sellingPrice, item.currency)}
                    </span>
                    {item.compareAtPrice &&
                    Number(item.compareAtPrice) > Number(item.sellingPrice) ? (
                      <span className="text-[13px] text-stone-400 line-through">
                        {formatPrice(item.compareAtPrice, item.currency)}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Quantity Stepper, Price & Remove Link */}
              <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto pt-2 sm:pt-0">
                {/* Pill Stepper */}
                <div className="flex items-center rounded-full bg-[#f0f2ee] px-3 py-1.5 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
                    className="flex h-7 w-7 items-center justify-center text-base font-medium text-slate-700 hover:text-slate-950 transition-colors"
                    aria-label={`Decrease quantity of ${item.productName}`}
                  >
                    −
                  </button>
                  <span className="w-7 text-center text-[14px] font-medium text-slate-900">
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                    className="flex h-7 w-7 items-center justify-center text-base font-medium text-slate-700 hover:text-slate-950 transition-colors"
                    aria-label={`Increase quantity of ${item.productName}`}
                  >
                    +
                  </button>
                </div>

                {/* Total for this line */}
                <div className="text-[15px] font-semibold text-slate-900 min-w-[70px] text-right">
                  {formatPrice(
                    String(Number(item.sellingPrice) * item.quantity),
                    item.currency,
                  )}
                </div>

                {/* Underlined Remove Button */}
                <button
                  type="button"
                  onClick={() => removeItem(item.variantId)}
                  className="text-[13px] text-stone-500 hover:text-slate-900 underline underline-offset-4 transition-colors"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}

          <div className="pt-2 flex justify-between items-center">
            <Link
              href="/laptops"
              className="text-sm font-medium text-stone-600 hover:text-slate-950 transition-colors"
            >
              ← Continue shopping
            </Link>
            <button
              type="button"
              onClick={clearCart}
              className="text-xs text-stone-400 hover:text-red-600 transition-colors"
            >
              Clear entire cart
            </button>
          </div>
        </div>

        {/* Right Column: Free shipping indicator, Total, and Lime Checkout Pill */}
        <aside className="col-span-12 lg:col-span-5 xl:col-span-4 space-y-6 lg:sticky lg:top-28">
          {/* Free Shipping Tracker */}
          <div className="space-y-2">
            <p className="text-[13px] text-stone-600 font-normal">
              {freeShippingDiff > 0 ? (
                <>
                  Spend <span className="font-semibold text-emerald-800">₹{freeShippingDiff.toLocaleString("en-IN")}</span> more to reach free shipping!
                </>
              ) : (
                <span className="font-semibold text-emerald-800">
                  🎉 You have qualified for Free Express Shipping!
                </span>
              )}
            </p>
            <div className="h-2 w-full rounded-full bg-stone-200 overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-800 transition-all duration-300"
                style={{ width: `${freeShippingProgress}%` }}
              />
            </div>
          </div>

          {/* Clean Order Summary Box */}
          <div className="rounded-2xl bg-[#f0f2ee] p-5 space-y-4">
            <div className="flex justify-between text-sm text-stone-600">
              <span>Items Subtotal</span>
              <span className="font-medium text-slate-900">
                {formatPrice(subtotal, items[0]?.currency ?? "INR")}
              </span>
            </div>
            <div className="flex justify-between text-sm text-stone-600 border-b border-stone-200 pb-4">
              <span>Shipping</span>
              <span className="font-medium text-emerald-800">
                {freeShippingDiff === 0 ? "FREE" : "Calculated at checkout"}
              </span>
            </div>
            <div className="pt-1">
              <div className="flex items-baseline justify-between text-xs text-stone-500">
                <span className="text-[14px] font-medium text-slate-800">Estimated total</span>
                <span>Taxes & shipping calculated at checkout.</span>
              </div>
              <div className="mt-2 text-[38px] font-light text-slate-950 tracking-tight leading-none">
                {formatPrice(subtotal, items[0]?.currency ?? "INR")}
              </div>
            </div>
          </div>

          {/* Lime / Pale Green Checkout Button */}
          <Link
            href="/checkout"
            className="flex h-14 w-full items-center justify-center rounded-full bg-[#d6f088] text-[15px] font-semibold text-slate-950 shadow-sm transition hover:bg-[#c9e874] active:scale-[0.99]"
          >
            Check Out
          </Link>
        </aside>
      </div>
    </div>
  );
}