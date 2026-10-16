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
      <div className="border-b border-stone-200/80 pb-5 sm:pb-6 mb-6 sm:mb-8">
        <h1
          style={{ fontFamily: "var(--font-serif), 'Instrument Serif', Georgia, serif" }}
          className="text-3xl font-normal tracking-tight text-slate-950 sm:text-4xl md:text-5xl flex items-start"
        >
          <span>Your cart</span>
          <span className="text-xs sm:text-sm font-sans font-medium text-stone-400 ml-1.5 -translate-y-1">
            ({itemCount})
          </span>
        </h1>
      </div>

      {/* 2. Main 2-Column Grid */}
      <div className="grid grid-cols-12 gap-6 md:gap-8 lg:gap-14 items-start">
        {/* Left Column: Cart Items List */}
        <div className="col-span-12 lg:col-span-7 xl:col-span-8 space-y-4 sm:space-y-6">
          {items.map((item) => (
            <div
              key={item.variantId}
              className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 sm:gap-5 pb-5 sm:pb-6 border-b border-stone-200/60"
            >
              {/* Product Thumbnail & Details */}
              <div className="flex items-start sm:items-center gap-3.5 sm:gap-5 min-w-0 flex-1">
                <Link
                  href={`/laptops/${item.productSlug}`}
                  className="flex h-20 w-20 sm:h-24 sm:w-24 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl bg-[#f0f2ee] p-2 overflow-hidden transition-opacity hover:opacity-90"
                >
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.productName}
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <span className="text-2xl sm:text-3xl">💻</span>
                  )}
                </Link>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      href={`/laptops/${item.productSlug}`}
                      className="block text-sm sm:text-base font-semibold text-slate-900 hover:text-emerald-950 transition-colors line-clamp-2"
                    >
                      {item.productName}
                    </Link>
                    {/* Mobile remove button icon on the top right */}
                    <button
                      type="button"
                      onClick={() => removeItem(item.variantId)}
                      className="sm:hidden text-stone-400 hover:text-slate-900 p-1 -mr-1"
                      aria-label={`Remove ${item.productName}`}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <p className="mt-1 text-xs sm:text-[13px] text-stone-500 leading-snug">
                    {[
                      item.ramGb ? `${item.ramGb}GB RAM` : null,
                      item.storageGb ? formatStorage(item.storageGb) : null,
                      item.variantName,
                    ]
                      .filter(Boolean)
                      .join(" · ") || item.brandName}
                  </p>
                  <div className="mt-1.5 flex items-baseline gap-2">
                    <span className="text-sm sm:text-[15px] font-semibold text-[#c64f3d]">
                      {formatPrice(item.sellingPrice, item.currency)}
                    </span>
                    {item.compareAtPrice &&
                    Number(item.compareAtPrice) > Number(item.sellingPrice) ? (
                      <span className="text-xs sm:text-[13px] text-stone-400 line-through">
                        {formatPrice(item.compareAtPrice, item.currency)}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Quantity Stepper, Price & Remove Link */}
              <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-5 w-full sm:w-auto pt-2 sm:pt-0 border-t border-stone-100 sm:border-t-0">
                {/* Pill Stepper */}
                <div className="flex items-center rounded-full bg-[#f0f2ee] px-2.5 py-1 sm:px-3 sm:py-1.5 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
                    className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center text-base sm:text-lg font-medium text-slate-700 hover:text-slate-950 active:scale-95 transition-transform"
                    aria-label={`Decrease quantity of ${item.productName}`}
                  >
                    −
                  </button>
                  <span className="w-7 sm:w-8 text-center text-xs sm:text-[14px] font-medium text-slate-900 select-none">
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                    className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center text-base sm:text-lg font-medium text-slate-700 hover:text-slate-950 active:scale-95 transition-transform"
                    aria-label={`Increase quantity of ${item.productName}`}
                  >
                    +
                  </button>
                </div>

                {/* Total for this line */}
                <div className="text-sm sm:text-[15px] font-semibold text-slate-900 min-w-[70px] sm:min-w-[80px] text-right">
                  {formatPrice(
                    String(Number(item.sellingPrice) * item.quantity),
                    item.currency,
                  )}
                </div>

                {/* Desktop Remove Button */}
                <button
                  type="button"
                  onClick={() => removeItem(item.variantId)}
                  className="hidden sm:inline-block text-[13px] text-stone-500 hover:text-slate-900 underline underline-offset-4 transition-colors"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}

          <div className="pt-3 flex flex-row items-center justify-between gap-3">
            <Link
              href="/laptops"
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-stone-600 hover:text-slate-950 transition-colors"
            >
              <span>←</span>
              <span>Continue shopping</span>
            </Link>
            <button
              type="button"
              onClick={clearCart}
              className="text-xs text-stone-400 hover:text-red-600 transition-colors py-1 px-2 rounded hover:bg-red-50/50"
            >
              Clear entire cart
            </button>
          </div>
        </div>

        {/* Right Column: Free shipping indicator, Total, and Lime Checkout Pill */}
        <aside className="col-span-12 lg:col-span-5 xl:col-span-4 space-y-4 sm:space-y-6 lg:sticky lg:top-28">
          {/* Free Shipping Tracker */}
          <div className="space-y-2 rounded-2xl bg-stone-50 border border-stone-200/60 p-3.5 sm:p-4">
            <p className="text-xs sm:text-[13px] text-stone-600 font-normal">
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
          <div className="rounded-2xl bg-[#f0f2ee] p-4 sm:p-5 space-y-3.5 sm:space-y-4">
            <div className="flex justify-between text-xs sm:text-sm text-stone-600">
              <span>Items Subtotal</span>
              <span className="font-medium text-slate-900">
                {formatPrice(subtotal, items[0]?.currency ?? "INR")}
              </span>
            </div>
            <div className="flex justify-between text-xs sm:text-sm text-stone-600 border-b border-stone-200 pb-3 sm:pb-4">
              <span>Shipping</span>
              <span className="font-medium text-emerald-800">
                {freeShippingDiff === 0 ? "FREE" : "Calculated at checkout"}
              </span>
            </div>
            <div className="pt-1">
              <div className="flex items-baseline justify-between text-xs text-stone-500">
                <span className="text-xs sm:text-[14px] font-medium text-slate-800">Estimated total</span>
                <span className="text-[11px] sm:text-xs text-stone-400">Taxes calculated at checkout</span>
              </div>
              <div className="mt-1.5 sm:mt-2 text-2xl sm:text-3xl md:text-[38px] font-light text-slate-950 tracking-tight leading-none">
                {formatPrice(subtotal, items[0]?.currency ?? "INR")}
              </div>
            </div>
          </div>

          {/* Lime / Pale Green Checkout Button */}
          <Link
            href="/checkout"
            className="hidden sm:flex h-12 sm:h-14 w-full items-center justify-center rounded-full bg-[#d6f088] text-sm sm:text-[15px] font-semibold text-slate-950 shadow-sm transition hover:bg-[#c9e874] active:scale-[0.99]"
          >
            Check Out
          </Link>
        </aside>
      </div>

      {/* Mobile Sticky Bottom Checkout Bar (appears on phones for quick checkout) */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-stone-200 px-4 py-3 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between gap-3 max-w-md mx-auto">
          <div className="min-w-0">
            <span className="block text-[11px] uppercase tracking-wider text-stone-500 font-medium">Total</span>
            <span className="block text-lg font-bold text-slate-950 truncate">
              {formatPrice(subtotal, items[0]?.currency ?? "INR")}
            </span>
          </div>
          <Link
            href="/checkout"
            className="flex-1 max-w-[200px] flex h-11 items-center justify-center rounded-full bg-[#d6f088] text-sm font-semibold text-slate-950 shadow-sm transition hover:bg-[#c9e874] active:scale-95"
          >
            Check Out ({itemCount})
          </Link>
        </div>
      </div>
    </div>
  );
}