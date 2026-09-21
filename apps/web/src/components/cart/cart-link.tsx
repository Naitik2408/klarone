"use client";

import Link from "next/link";
import { useCart } from "./cart-provider";

export function CartLink() {
  const { itemCount, isHydrated } = useCart();

  return (
    <Link
      href="/cart"
      className="relative flex h-10 items-center gap-2 rounded-full border border-slate-200 px-3.5 text-sm font-medium text-slate-800 transition-colors hover:bg-slate-50"
      aria-label={
        isHydrated
          ? `Cart with ${itemCount} ${
              itemCount === 1 ? "item" : "items"
            }`
          : "Cart"
      }
    >
      <span aria-hidden="true">🛒</span>

      <span className="hidden sm:inline">
        Cart
      </span>

      {isHydrated && itemCount > 0 ? (
        <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold text-white">
          {itemCount > 99 ? "99+" : itemCount}
        </span>
      ) : null}
    </Link>
  );
}