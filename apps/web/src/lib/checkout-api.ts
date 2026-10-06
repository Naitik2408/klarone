import type {
  CheckoutQuoteRequest,
  CheckoutQuoteResponse,
  CreateCheckoutOrderResponse,
} from "@/types/checkout";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:3000";

export interface CancelPendingOrderResponse {
  order: {
    id: string;
    orderNumber: string;
    status: string;
    paymentStatus: string;
    fulfillmentStatus: string;
    totalAmount: string;
    currency: string;
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
        : "Checkout request failed";

    throw new Error(message);
  }

  return data as T;
}

export async function getCheckoutQuote(
  request: CheckoutQuoteRequest,
): Promise<CheckoutQuoteResponse> {
  const response = await fetch(
    `${API_BASE_URL}/checkout/quote`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
      cache: "no-store",
    },
  );

  return parseResponse<CheckoutQuoteResponse>(
    response,
  );
}

export async function createCheckoutOrder(
  accessToken: string,
): Promise<CreateCheckoutOrderResponse> {
  const response = await fetch(
    `${API_BASE_URL}/checkout/order`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    },
  );

  return parseResponse<CreateCheckoutOrderResponse>(
    response,
  );
}

export async function cancelPendingOrder(
  accessToken: string,
  orderNumber: string,
): Promise<CancelPendingOrderResponse> {
  const response = await fetch(
    `${API_BASE_URL}/checkout/order/${encodeURIComponent(
      orderNumber,
    )}/cancel`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    },
  );

  return parseResponse<CancelPendingOrderResponse>(
    response,
  );
}
