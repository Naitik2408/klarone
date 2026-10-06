import type { CartItem } from "@/types/cart";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3000";

export interface ServerCartResponse {
  id: string | null;
  customerId: string | null;
  status: string;
  currency: string;
  itemCount: number;
  subtotal: string;
  items: ServerCartItem[];
}

export interface ServerCartItem {
  id: string;
  productVariantId: string;
  quantity: number;
  unitPrice: string;
  storedUnitPrice: string;
  lineTotal: string;
  currency: string;
  product: {
    id: string;
    name: string;
    slug: string;
    brand: {
      id: number;
      name: string;
      slug: string;
    };
  };
  variant: {
    id: string;
    sku: string;
    variantName: string | null;
    ramGb: number | null;
    storageGb: number | null;
    operatingSystem: string | null;
    sellingPrice: string;
    compareAtPrice: string | null;
    currency: string;
    availableQuantity: number;
  };
}

async function parseResponse<T>(
  response: Response,
): Promise<T> {
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      data &&
      typeof data === "object" &&
      "message" in data &&
      typeof data.message === "string"
        ? data.message
        : "Cart request failed";

    throw new Error(message);
  }

  return data as T;
}

async function authenticatedFetch<T>(
  accessToken: string,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);

  headers.set(
    "Authorization",
    `Bearer ${accessToken}`,
  );

  if (init.body && !headers.has("Content-Type")) {
    headers.set(
      "Content-Type",
      "application/json",
    );
  }

  const response = await fetch(
    `${API_BASE_URL}${path}`,
    {
      ...init,
      headers,
      cache: "no-store",
    },
  );

  return parseResponse<T>(response);
}

export async function getCustomerCart(
  accessToken: string,
): Promise<ServerCartResponse> {
  return authenticatedFetch<ServerCartResponse>(
    accessToken,
    "/cart",
  );
}

export async function addCustomerCartItem(
  accessToken: string,
  input: {
    variantId: string;
    quantity: number;
  },
): Promise<ServerCartResponse> {
  return authenticatedFetch<ServerCartResponse>(
    accessToken,
    "/cart/items",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}

export async function updateCustomerCartItem(
  accessToken: string,
  itemId: string,
  quantity: number,
): Promise<ServerCartResponse> {
  return authenticatedFetch<ServerCartResponse>(
    accessToken,
    `/cart/items/${itemId}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        quantity,
      }),
    },
  );
}

export async function removeCustomerCartItem(
  accessToken: string,
  itemId: string,
): Promise<ServerCartResponse> {
  return authenticatedFetch<ServerCartResponse>(
    accessToken,
    `/cart/items/${itemId}`,
    {
      method: "DELETE",
    },
  );
}

export async function clearCustomerCart(
  accessToken: string,
): Promise<ServerCartResponse> {
  return authenticatedFetch<ServerCartResponse>(
    accessToken,
    "/cart/items",
    {
      method: "DELETE",
    },
  );
}

export function mapServerCartItemToCartItem(
  item: ServerCartItem,
): CartItem {
  return {
    id: item.id,
    productId: item.product.id,
    variantId: item.productVariantId,
    productSlug: item.product.slug,
    productName: item.product.name,
    variantName:
      item.variant.variantName ??
      item.variant.sku,
    sku: item.variant.sku,
    sellingPrice: item.variant.sellingPrice,
    compareAtPrice:
      item.variant.compareAtPrice,
    currency: item.variant.currency,
    quantity: item.quantity,
    imageUrl: null,
    brandName: item.product.brand.name,
    ramGb: item.variant.ramGb,
    storageGb: item.variant.storageGb,
  };
}