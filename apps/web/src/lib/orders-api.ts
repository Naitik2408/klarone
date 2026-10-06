import type {
  OrderDetailResponse,
  OrdersListResponse,
} from "@/types/orders";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:3000";

async function parseResponse<T>(
  response: Response,
): Promise<T> {
  const data = await response
    .json()
    .catch(() => null);

  if (!response.ok) {
    const message =
      data &&
      typeof data === "object" &&
      "message" in data &&
      typeof data.message === "string"
        ? data.message
        : "Order request failed";

    throw new Error(message);
  }

  return data as T;
}

async function authenticatedFetch<T>(
  accessToken: string,
  path: string,
): Promise<T> {
  const response = await fetch(
    `${API_BASE_URL}${path}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    },
  );

  return parseResponse<T>(response);
}

export async function getCustomerOrders(
  accessToken: string,
): Promise<OrdersListResponse> {
  return authenticatedFetch<OrdersListResponse>(
    accessToken,
    "/orders",
  );
}

export async function getCustomerOrder(
  accessToken: string,
  orderNumber: string,
): Promise<OrderDetailResponse> {
  return authenticatedFetch<OrderDetailResponse>(
    accessToken,
    `/orders/${encodeURIComponent(orderNumber)}`,
  );
}