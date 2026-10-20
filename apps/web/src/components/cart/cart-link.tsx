"use client";

import Link from "next/link";
import { useCart } from "./cart-provider";

export function CartLink() {
  const { itemCount, isHydrated } = useCart();

  return (
    <Link
      href="/cart"
      className="relative flex h-10 items-center gap-2 rounded-full border border-slate-800/60 bg-slate-900/40 px-3.5 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-800/80 hover:text-white"
      aria-label={
        isHydrated
          ? `Cart with ${itemCount} ${
              itemCount === 1 ? "item" : "items"
            }`
          : "Shopping Cart"
      }
    >
      {/* Precision Authored SVG Cart Icon matching luxury line-art system */}
      <svg
        className="h-4 w-4 shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth="1.75"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25c-.669 0-1.189-.578-1.119-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
        />
      </svg>

      <span className="hidden sm:inline">Cart</span>

      {/* Dynamic Count Badge with Live Polite Screen Reader Updates */}
      {isHydrated && itemCount > 0 ? (
        <span
          aria-live="polite"
          className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-[#d6f088] px-1 text-[10px] font-bold text-slate-950 shadow-sm"
        >
          {itemCount > 99 ? "99+" : itemCount}
          <span className="sr-only">items in cart</span>
        </span>
      ) : null}
    </Link>
  );
}
