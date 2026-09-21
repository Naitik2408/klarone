import type {
  CheckoutQuote,
  CheckoutQuoteRequestItem,
} from "../types/checkout";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:3000";

export async function createCheckoutQuote(
  items: CheckoutQuoteRequestItem[],
): Promise<CheckoutQuote> {
  const response = await fetch(
    `${API_BASE_URL}/checkout/quote`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        items,
      }),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    let message = `Checkout quote failed: ${response.status} ${response.statusText}`;

    try {
      const errorBody: unknown =
        await response.json();

      if (
        errorBody &&
        typeof errorBody === "object" &&
        "message" in errorBody
      ) {
        const apiMessage = (
          errorBody as {
            message?: unknown;
          }
        ).message;

        if (typeof apiMessage === "string") {
          message = apiMessage;
        }
      }
    } catch {
      // Keep the default error message.
    }

    throw new Error(message);
  }

  return response.json() as Promise<CheckoutQuote>;
}