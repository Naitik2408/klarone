"use client";

import { useState } from "react";
import { useCart } from "./cart-provider";
import type { CatalogueProductDetail } from "../../types/catalogue";

interface AddToCartButtonProps {
  product: CatalogueProductDetail;
  variantId: string;
}

export function AddToCartButton({
  product,
  variantId,
}: AddToCartButtonProps) {
  const { addItem } = useCart();

  const [isAdding, setIsAdding] = useState(false);
  const [added, setAdded] = useState(false);

  async function handleAddToCart() {
    if (isAdding) {
      return;
    }

    setIsAdding(true);
    setAdded(false);

    try {
      await addItem({
        product,
        variantId,
      });

      setAdded(true);

      window.setTimeout(() => {
        setAdded(false);
      }, 1800);
    } finally {
      setIsAdding(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => {
        void handleAddToCart();
      }}
      disabled={isAdding}
      className={`mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold transition-all duration-200 active:scale-[0.99] disabled:cursor-not-allowed ${
        added
          ? "bg-emerald-600 text-white"
          : "bg-slate-950 text-white hover:bg-slate-800 disabled:opacity-50"
      }`}
    >
      {isAdding ? (
        <>
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          <span>Adding to Bag...</span>
        </>
      ) : added ? (
        <>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <span>Added to Bag</span>
        </>
      ) : (
        "Add to Cart"
      )}
    </button>
  );
}