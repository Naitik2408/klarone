"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "motion/react";
import { useCart } from "../cart/cart-provider";
import type { CatalogueProduct } from "../../types/catalogue";

interface ProductCardProps {
  product: CatalogueProduct;
  priority?: boolean;
}

export function ProductCard({
  product,
  priority = false,
}: ProductCardProps) {
  const { addItem } = useCart();
  const [adding, setAdding] = useState(false);

  const variant = product.variants?.[0];
  const price = Number(variant?.sellingPrice || 0);
  const originalPrice = variant?.compareAtPrice ? Number(variant.compareAtPrice) : undefined;
  const primaryMedia = product.media?.[0];

  const productUrl = `/laptops/${product.slug || product.id}`;

  async function handleAddToCart(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (adding) return;
    setAdding(true);
    try {
      await addItem({
        product: product as any,
        variantId: variant?.id ? String(variant.id) : `${product.id}-default`,
      });
    } catch {
      // Cart fallback
    } finally {
      setTimeout(() => setAdding(false), 500);
    }
  }

  return (
    <div className="group relative flex flex-col justify-between rounded-[24px] bg-[#f0f2ee] p-3 sm:p-4 transition-transform duration-200 hover:-translate-y-1 hover:shadow-[0_12px_30px_rgb(0,0,0,0.06)]">
      <Link href={productUrl} className="block w-full focus:outline-none">
        {/* Clean Unified Product Stage */}
        <div className="relative flex aspect-[4/4.4] min-h-[160px] sm:min-h-[220px] w-full items-center justify-center overflow-hidden rounded-[18px] bg-white/40">
          {primaryMedia?.url ? (
            <Image
              src={primaryMedia.url}
              alt={primaryMedia.altText ?? product.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              priority={priority}
              className="object-contain p-3 sm:p-5 transition-transform duration-200 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-4xl sm:text-5xl text-stone-400 select-none">
              💻
            </div>
          )}
        </div>

        {/* Card Meta & Bottom Row matching landing page Month's Top Products */}
        <div className="mt-3.5 sm:mt-4 flex items-end justify-between px-1 pb-1">
          <div className="flex flex-col min-w-0 pr-2">
            <span className="text-[11px] sm:text-xs font-normal text-stone-500 uppercase tracking-wide truncate">
              {product.brand?.name ?? product.category?.name ?? "Laptops"}
            </span>
            <h3 className="mt-0.5 sm:mt-1 text-[14px] sm:text-[16px] font-semibold tracking-tight text-slate-900 group-hover:text-emerald-950 transition-colors line-clamp-1">
              {product.name}
            </h3>

            {/* Price Row */}
            <div className="mt-1.5 flex items-baseline gap-2">
              <span className="text-sm sm:text-base font-semibold text-slate-900">
                {new Intl.NumberFormat("en-IN", {
                  style: "currency",
                  currency: variant?.currency || "INR",
                  maximumFractionDigits: 0,
                }).format(price)}
              </span>
              {originalPrice && (
                <span className="text-xs text-stone-400 line-through">
                  {new Intl.NumberFormat("en-IN", {
                    style: "currency",
                    currency: variant?.currency || "INR",
                    maximumFractionDigits: 0,
                  }).format(originalPrice)}
                </span>
              )}
            </div>
          </div>

          {/* Circular Add to Cart Button (44px) matching Landing Page with Shopping Bag Icon */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            type="button"
            onClick={handleAddToCart}
            disabled={adding}
            aria-label={`Add ${product.name} to cart`}
            className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-full bg-slate-950 text-white shadow-sm transition-all duration-200 hover:scale-105 hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
          >
            {adding ? (
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
          </motion.button>
        </div>
      </Link>
    </div>
  );
}
