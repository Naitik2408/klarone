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
  const { addItem, isHydrated } = useCart();
  const [added, setAdded] = useState(false);

  function handleAddToCart() {
    addItem({
      product,
      variantId,
    });

    setAdded(true);

    window.setTimeout(() => {
      setAdded(false);
    }, 1800);
  }

  return (
    <button
      type="button"
      onClick={handleAddToCart}
      disabled={!isHydrated}
      className="mt-5 flex h-12 w-full items-center justify-center rounded-full bg-blue-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {added ? "Added to cart" : "Add to cart"}
    </button>
  );
}