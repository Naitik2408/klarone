"use client";

import { useState } from "react";
import Link from "next/link";
import { useCart } from "../cart/cart-provider";
import type { CatalogueProduct } from "../../types/catalogue";

interface ProductCardProps {
  product: CatalogueProduct;
}

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

export function ProductCard({
  product,
}: ProductCardProps) {
  const { addItem } = useCart();
  const [isAdding, setIsAdding] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  const variant = product.variants[0];
  const primaryMedia = product.media[0];
  const isSale =
    variant &&
    variant.compareAtPrice &&
    Number(variant.compareAtPrice) > Number(variant.sellingPrice);

  async function handleAddToCart(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (!variant || isAdding) return;

    setIsAdding(true);
    try {
      await addItem({
        product: product as any,
        variantId: variant.id,
      });
      setJustAdded(true);
      setTimeout(() => setJustAdded(false), 1600);
    } catch {
      // Cart fallback
    } finally {
      setIsAdding(false);
    }
  }

  return (
    <article className="group relative flex flex-col justify-between rounded-[20px] sm:rounded-[24px] bg-[#f0f2ee] p-2.5 sm:p-4 transition-transform duration-200">
      <Link
        href={`/laptops/${product.slug}`}
        className="block w-full"
      >
        {/* Clean Unified Product Stage matching aspect ratio */}
        <div className="relative flex aspect-[4/4.4] min-h-[120px] sm:min-h-[200px] w-full items-center justify-center overflow-hidden rounded-[14px] sm:rounded-[18px] bg-white/40">
          {primaryMedia?.url ? (
            <img
              src={primaryMedia.url}
              alt={primaryMedia.altText ?? product.name}
              className="h-full w-full object-contain p-2.5 sm:p-4 transition-transform duration-200 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-2xl sm:text-4xl text-stone-400 select-none">
              💻
            </div>
          )}

          {/* Floating Cart Button placed directly on the bottom right of the image stage on mobile like user reference image */}
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={isAdding}
            aria-label={`Add ${product.name} to cart`}
            className="absolute bottom-2 right-2 flex sm:hidden h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-950 text-white shadow-md transition-all active:scale-90 disabled:opacity-50 z-20 cursor-pointer"
          >
            {isAdding ? (
              <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : justAdded ? (
              <span className="text-[10px] font-bold text-lime-300">✓</span>
            ) : (
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2.2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                />
              </svg>
            )}
          </button>
        </div>

        {/* Card Meta & Bottom Row */}
        <div className="mt-2.5 sm:mt-4 flex items-end justify-between px-0.5 sm:px-1 pb-0.5 sm:pb-1">
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-[11px] sm:text-xs font-normal text-stone-500 truncate">
              {product.category.name}
            </span>

            <h3 className="mt-0.5 sm:mt-1 text-xs sm:text-[16px] font-semibold tracking-tight text-slate-900 group-hover:text-emerald-950 line-clamp-1">
              {product.name}
            </h3>

            <div className="mt-1 sm:mt-1.5 flex flex-wrap items-baseline gap-1 sm:gap-2">
              <span className="text-xs sm:text-sm font-semibold text-slate-900">
                {variant
                  ? formatPrice(variant.sellingPrice, variant.currency)
                  : "Check availability"}
              </span>

              {variant?.compareAtPrice &&
              Number(variant.compareAtPrice) > Number(variant.sellingPrice) ? (
                <span className="text-[10px] sm:text-xs text-stone-400 line-through">
                  {formatPrice(variant.compareAtPrice, variant.currency)}
                </span>
              ) : null}
            </div>
          </div>

          {/* Desktop Circular Add to Cart Button (44px / h-11 w-11) */}
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={isAdding}
            aria-label={`Add ${product.name} to cart`}
            className="hidden sm:flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-950 text-white shadow-sm transition-all duration-200 hover:scale-105 hover:bg-slate-800 active:scale-95 disabled:opacity-50 cursor-pointer ml-2"
          >
            {isAdding ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : justAdded ? (
              <span className="text-xs font-bold text-lime-300">✓</span>
            ) : (
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2.2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                />
              </svg>
            )}
          </button>
        </div>
      </Link>
    </article>
  );
}