"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useCart } from "../cart/cart-provider";
import type { CatalogueProduct } from "../../types/catalogue";

interface ProductCardProps {
  product: CatalogueProduct;
  priority?: boolean;
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
  priority = false,
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
            <Image
              src={primaryMedia.url}
              alt={primaryMedia.altText ?? product.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              priority={priority}
              className="object-contain p-2.5 sm:p-4 transition-transform duration-200 group-hover:scale-105"
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
            className="absolute bottom-2 right-2 flex sm:hidden h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-950 text-white shadow-md transition-all active:scale-90 disabled:opacity-50 z-20 cursor-pointer touch-manipulation"
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
                strokeWidth="2.5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4.5v15m7.5-7.5h-15"
                />
              </svg>
            )}
          </button>
        </div>

        {/* Product Details Header */}
        <div className="mt-2.5 sm:mt-3 flex items-start justify-between gap-1">
          <div className="min-w-0 pr-1">
            <p className="text-[10px] sm:text-[11px] font-medium tracking-wide uppercase text-stone-500 truncate">
              {product.brand?.name ?? "Klarone"}
            </p>
            <h3 className="font-serif text-[13px] sm:text-[15px] font-normal leading-snug text-slate-900 group-hover:text-slate-700 transition-colors line-clamp-2">
              {product.name}
            </h3>
          </div>
        </div>
      </Link>

      {/* Specifications pills */}
      <div className="mt-2 flex flex-wrap gap-1">
        {variant?.ramGb && (
          <span className="rounded bg-stone-200/60 px-1.5 py-0.5 text-[9px] sm:text-[10px] font-medium text-stone-700">
            {variant.ramGb}GB RAM
          </span>
        )}
        {variant?.storageGb && (
          <span className="rounded bg-stone-200/60 px-1.5 py-0.5 text-[9px] sm:text-[10px] font-medium text-stone-700">
            {variant.storageGb >= 1024
              ? `${variant.storageGb / 1024}TB`
              : `${variant.storageGb}GB`}{" "}
            SSD
          </span>
        )}
      </div>

      {/* Pricing & Desktop Add to Cart Button */}
      <div className="mt-2.5 sm:mt-3 flex items-center justify-between pt-2 border-t border-stone-200/50">
        <div>
          {variant ? (
            <div className="flex items-baseline gap-1.5">
              <span className="text-[13px] sm:text-[14px] font-semibold text-slate-900">
                {formatPrice(variant.sellingPrice, variant.currency)}
              </span>
              {isSale && variant.compareAtPrice && (
                <span className="text-[10px] sm:text-[11px] text-stone-600 line-through">
                  {formatPrice(variant.compareAtPrice, variant.currency)}
                </span>
              )}
            </div>
          ) : (
            <span className="text-[12px] text-stone-500">Contact for price</span>
          )}
        </div>

        {/* Desktop Add to Cart Pill button */}
        <button
          type="button"
          onClick={handleAddToCart}
          disabled={isAdding}
          className="hidden sm:inline-flex items-center gap-1 rounded-full bg-slate-900 hover:bg-slate-800 text-white px-3 py-1 text-[11px] font-medium transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
        >
          {isAdding ? (
            <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : justAdded ? (
            <span className="text-lime-300">Added</span>
          ) : (
            <span>Add</span>
          )}
        </button>
      </div>
    </article>
  );
}
