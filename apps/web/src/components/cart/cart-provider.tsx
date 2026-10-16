"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { useCustomerAuth } from "../auth/customer-auth-provider";
import {
  addCustomerCartItem,
  clearCustomerCart,
  getCustomerCart,
  mapServerCartItemToCartItem,
  removeCustomerCartItem,
  updateCustomerCartItem,
} from "../../lib/cart-api";
import {
  CustomerAuthError,
  clearStoredCustomerAccessToken,
} from "../../lib/customer-auth-api";
import type {
  AddToCartInput,
  CartContextValue,
  CartItem,
} from "../../types/cart";

const CART_STORAGE_KEY = "klarone-cart";
const AUTH_NOTICE_STORAGE_KEY = "klarone-auth-notice";

const CartContext = createContext<CartContextValue | null>(null);

function isUnauthorizedError(error: unknown): boolean {
  if (
    error instanceof CustomerAuthError &&
    error.code === "UNAUTHORIZED"
  ) {
    return true;
  }

  if (
    error &&
    typeof error === "object" &&
    "status" in error &&
    error.status === 401
  ) {
    return true;
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    return (
      message.includes("invalid or expired customer access token") ||
      message.includes("expired customer access token") ||
      message.includes("invalid customer access token") ||
      message.includes("unauthorized")
    );
  }

  return false;
}

function redirectAfterSessionExpiry(): void {
  if (typeof window === "undefined") {
    return;
  }

  clearStoredCustomerAccessToken();

  const isProtectedPage =
    window.location.pathname.startsWith("/account") ||
    window.location.pathname.startsWith("/checkout");

  if (!isProtectedPage) {
    return;
  }

  sessionStorage.setItem(
    AUTH_NOTICE_STORAGE_KEY,
    "Your session expired. Please sign in again.",
  );

  const currentPath =
    `${window.location.pathname}${window.location.search}`;

  const next =
    currentPath && currentPath !== "/login"
      ? `?next=${encodeURIComponent(currentPath)}`
      : "";

  window.location.assign(`/login${next}`);
}

export function CartProvider({
  children,
}: {
  children: ReactNode;
}) {
  const {
    accessToken,
    customer,
    isLoading: isAuthLoading,
  } = useCustomerAuth();

  const [items, setItems] = useState<CartItem[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);
  const [localStorageLoaded, setLocalStorageLoaded] =
    useState(false);

  const localGuestItemsRef = useRef<CartItem[]>([]);

  const syncedCustomerRef =
    useRef<string | null>(null);

  const previousCustomerRef =
    useRef<string | null>(null);

  useEffect(() => {
    try {
      const storedCart =
        window.localStorage.getItem(
          CART_STORAGE_KEY,
        );

      if (storedCart) {
        const parsed =
          JSON.parse(storedCart) as CartItem[];

        if (Array.isArray(parsed)) {
          localGuestItemsRef.current = parsed;
        }
      }
    } catch {
      window.localStorage.removeItem(
        CART_STORAGE_KEY,
      );

      localGuestItemsRef.current = [];
    } finally {
      setLocalStorageLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (
      !localStorageLoaded ||
      !isHydrated ||
      isAuthLoading ||
      accessToken ||
      customer
    ) {
      return;
    }

    window.localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify(items),
    );

    localGuestItemsRef.current = items;
  }, [
    items,
    accessToken,
    customer,
    isAuthLoading,
    localStorageLoaded,
    isHydrated,
  ]);

  useEffect(() => {
    if (
      isAuthLoading ||
      !localStorageLoaded ||
      !accessToken ||
      !customer
    ) {
      return;
    }

    const customerAccessToken = accessToken;
    const customerId = customer.customerId;

    if (
      syncedCustomerRef.current === customerId
    ) {
      return;
    }

    let cancelled = false;

    async function synchronizeCart() {
      const guestItems =
        localGuestItemsRef.current;

      try {
        let serverCart =
          await getCustomerCart(
            customerAccessToken,
          );

        const failedGuestItems: CartItem[] = [];

        for (const item of guestItems) {
          try {
            serverCart =
              await addCustomerCartItem(
                customerAccessToken,
                {
                  variantId: item.variantId,
                  quantity: item.quantity,
                },
              );
          } catch (error) {
            if (isUnauthorizedError(error)) {
              redirectAfterSessionExpiry();
              return;
            }

            console.error(
              `Failed to merge guest cart item ${item.variantId}`,
              error,
            );

            failedGuestItems.push(item);
          }
        }

        if (cancelled) {
          return;
        }

        if (failedGuestItems.length === 0) {
          setItems(
            serverCart.items.map(
              mapServerCartItemToCartItem,
            ),
          );

          window.localStorage.removeItem(
            CART_STORAGE_KEY,
          );

          localGuestItemsRef.current = [];
        } else {
          const refreshedServerCart =
            await getCustomerCart(
              customerAccessToken,
            );

          setItems(
            refreshedServerCart.items.map(
              mapServerCartItemToCartItem,
            ),
          );

          window.localStorage.setItem(
            CART_STORAGE_KEY,
            JSON.stringify(
              failedGuestItems,
            ),
          );

          localGuestItemsRef.current =
            failedGuestItems;
        }

        syncedCustomerRef.current =
          customerId;
      } catch (error) {
        if (isUnauthorizedError(error)) {
          redirectAfterSessionExpiry();
          return;
        }

        console.error(
          "Failed to synchronize customer cart",
          error,
        );

        if (!cancelled) {
          setItems(
            guestItems,
          );
        }
      } finally {
        if (!cancelled) {
          setIsHydrated(true);
        }
      }
    }

    void synchronizeCart();

    return () => {
      cancelled = true;
    };
  }, [
    accessToken,
    customer,
    isAuthLoading,
    localStorageLoaded,
  ]);

  useEffect(() => {
    if (
      isAuthLoading ||
      !localStorageLoaded
    ) {
      return;
    }

    if (accessToken && customer) {
      previousCustomerRef.current =
        customer.customerId;

      return;
    }

    if (previousCustomerRef.current) {
      window.localStorage.removeItem(
        CART_STORAGE_KEY,
      );

      localGuestItemsRef.current = [];
      setItems([]);

      previousCustomerRef.current = null;
      syncedCustomerRef.current = null;
      setIsHydrated(true);

      return;
    }

    if (!accessToken && !customer) {
      setItems(
        localGuestItemsRef.current,
      );

      setIsHydrated(true);
    }
  }, [
    accessToken,
    customer,
    isAuthLoading,
    localStorageLoaded,
  ]);

  async function addItem({
    product,
    variantId,
  }: AddToCartInput) {
    const variant =
      product.variants.find(
        (item) => item.id === variantId,
      );

    if (!variant) {
      return;
    }

    if (accessToken && customer) {
      const customerAccessToken =
        accessToken;

      try {
        const serverCart =
          await addCustomerCartItem(
            customerAccessToken,
            {
              variantId,
              quantity: 1,
            },
          );

        setItems(
          serverCart.items.map(
            mapServerCartItemToCartItem,
          ),
        );
      } catch (error) {
        if (isUnauthorizedError(error)) {
          redirectAfterSessionExpiry();
          return;
        }

        console.error(
          "Failed to add item to customer cart",
          error,
        );
      }

      return;
    }

    setItems((currentItems) => {
      const existingItem =
        currentItems.find(
          (item) =>
            item.variantId === variantId,
        );

      if (existingItem) {
        return currentItems.map((item) =>
          item.variantId === variantId
            ? {
                ...item,
                quantity:
                  item.quantity + 1,
              }
            : item,
        );
      }

      const nextItem: CartItem = {
        id: undefined,
        productId: product.id,
        variantId: variant.id,
        productSlug: product.slug,
        productName: product.name,
        variantName:
          variant.variantName ??
          variant.sku,
        sku: variant.sku,
        sellingPrice:
          variant.sellingPrice,
        compareAtPrice:
          variant.compareAtPrice,
        currency: variant.currency,
        quantity: 1,
        imageUrl:
          product.media?.[0]?.url ?? null,
        brandName:
          product.brand.name,
        ramGb: variant.ramGb,
        storageGb: variant.storageGb,
      };

      return [
        ...currentItems,
        nextItem,
      ];
    });
  }

  async function removeItem(
    variantId: string,
  ) {
    if (accessToken && customer) {
      const customerAccessToken =
        accessToken;

      const item = items.find(
        (currentItem) =>
          currentItem.variantId ===
          variantId,
      );

      if (!item?.id) {
        return;
      }

      try {
        const serverCart =
          await removeCustomerCartItem(
            customerAccessToken,
            item.id,
          );

        setItems(
          serverCart.items.map(
            mapServerCartItemToCartItem,
          ),
        );
      } catch (error) {
        if (isUnauthorizedError(error)) {
          redirectAfterSessionExpiry();
          return;
        }

        console.error(
          "Failed to remove customer cart item",
          error,
        );
      }

      return;
    }

    setItems((currentItems) =>
      currentItems.filter(
        (item) =>
          item.variantId !== variantId,
      ),
    );
  }

  async function updateQuantity(
    variantId: string,
    quantity: number,
  ) {
    if (quantity <= 0) {
      await removeItem(variantId);
      return;
    }

    if (accessToken && customer) {
      const customerAccessToken =
        accessToken;

      const item = items.find(
        (currentItem) =>
          currentItem.variantId ===
          variantId,
      );

      if (!item?.id) {
        return;
      }

      try {
        const serverCart =
          await updateCustomerCartItem(
            customerAccessToken,
            item.id,
            quantity,
          );

        setItems(
          serverCart.items.map(
            mapServerCartItemToCartItem,
          ),
        );
      } catch (error) {
        if (isUnauthorizedError(error)) {
          redirectAfterSessionExpiry();
          return;
        }

        console.error(
          "Failed to update customer cart item",
          error,
        );
      }

      return;
    }

    setItems((currentItems) =>
      currentItems.map((item) =>
        item.variantId === variantId
          ? {
              ...item,
              quantity,
            }
          : item,
      ),
    );
  }

  async function clearCart() {
    if (accessToken && customer) {
      const customerAccessToken =
        accessToken;

      try {
        const serverCart =
          await clearCustomerCart(
            customerAccessToken,
          );

        setItems(
          serverCart.items.map(
            mapServerCartItemToCartItem,
          ),
        );
      } catch (error) {
        if (isUnauthorizedError(error)) {
          redirectAfterSessionExpiry();
          return;
        }

        console.error(
          "Failed to clear customer cart",
          error,
        );
      }

      return;
    }

    setItems([]);
    localGuestItemsRef.current = [];

    window.localStorage.removeItem(
      CART_STORAGE_KEY,
    );
  }

  const itemCount = useMemo(
    () =>
      items.reduce(
        (total, item) =>
          total + item.quantity,
        0,
      ),
    [items],
  );

  const subtotal = useMemo(
    () =>
      items
        .reduce(
          (total, item) =>
            total +
            Number(item.sellingPrice) *
              item.quantity,
          0,
        )
        .toFixed(2),
    [items],
  );

  const value: CartContextValue = {
    items,
    itemCount,
    subtotal,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    isHydrated,
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context =
    useContext(CartContext);

  if (!context) {
    throw new Error(
      "useCart must be used inside CartProvider",
    );
  }

  return context;
}