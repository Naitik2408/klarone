"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type {
  AddToCartInput,
  CartContextValue,
  CartItem,
} from "../../types/cart";

const CART_STORAGE_KEY = "klarone-cart";

const CartContext = createContext<CartContextValue | null>(
  null,
);

function createCartItem({
  product,
  variantId,
}: AddToCartInput): CartItem | null {
  const variant = product.variants.find(
    (item) => item.id === variantId,
  );

  if (!variant) {
    return null;
  }

  return {
    productId: product.id,
    variantId: variant.id,
    productSlug: product.slug,
    productName: product.name,
    variantName: variant.variantName,
    sku: variant.sku,
    sellingPrice: variant.sellingPrice,
    compareAtPrice: variant.compareAtPrice,
    currency: variant.currency,
    quantity: 1,
    imageUrl: product.media[0]?.url ?? null,
    brandName: product.brand.name,
    ramGb: variant.ramGb,
    storageGb: variant.storageGb,
  };
}

export function CartProvider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isHydrated, setIsHydrated] =
    useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(
        CART_STORAGE_KEY,
      );

      if (stored) {
        const parsed: unknown = JSON.parse(stored);

        if (Array.isArray(parsed)) {
          setItems(parsed as CartItem[]);
        }
      }
    } catch {
      // Ignore malformed local cart data.
    } finally {
      setIsHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    try {
      window.localStorage.setItem(
        CART_STORAGE_KEY,
        JSON.stringify(items),
      );
    } catch {
      // Ignore localStorage write failures.
    }
  }, [items, isHydrated]);

  const addItem = useCallback(
    ({ product, variantId }: AddToCartInput) => {
      const item = createCartItem({
        product,
        variantId,
      });

      if (!item) {
        return;
      }

      setItems((currentItems) => {
        const existingItem = currentItems.find(
          (currentItem) =>
            currentItem.variantId === variantId,
        );

        if (existingItem) {
          return currentItems.map((currentItem) =>
            currentItem.variantId === variantId
              ? {
                  ...currentItem,
                  quantity:
                    currentItem.quantity + 1,
                }
              : currentItem,
          );
        }

        return [...currentItems, item];
      });
    },
    [],
  );

  const removeItem = useCallback(
    (variantId: string) => {
      setItems((currentItems) =>
        currentItems.filter(
          (item) => item.variantId !== variantId,
        ),
      );
    },
    [],
  );

  const updateQuantity = useCallback(
    (variantId: string, quantity: number) => {
      if (quantity <= 0) {
        setItems((currentItems) =>
          currentItems.filter(
            (item) => item.variantId !== variantId,
          ),
        );

        return;
      }

      setItems((currentItems) =>
        currentItems.map((item) =>
          item.variantId === variantId
            ? {
                ...item,
                quantity: Math.max(
                  1,
                  Math.floor(quantity),
                ),
              }
            : item,
        ),
      );
    },
    [],
  );

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const itemCount = useMemo(
    () =>
      items.reduce(
        (total, item) => total + item.quantity,
        0,
      ),
    [items],
  );

  const subtotal = useMemo(() => {
    const total = items.reduce(
      (sum, item) =>
        sum + Number(item.sellingPrice) * item.quantity,
      0,
    );

    return String(total);
  }, [items]);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      itemCount,
      subtotal,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      isHydrated,
    }),
    [
      items,
      itemCount,
      subtotal,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      isHydrated,
    ],
  );

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error(
      "useCart must be used within a CartProvider",
    );
  }

  return context;
}