export type PaymentMethod =
  | "COD"
  | "RAZORPAY";

export interface InitiatePaymentResponse {
  payment: {
    id: string;
    provider: string;
    providerOrderId: string | null;
    providerPaymentId: string | null;
    paymentMethod: PaymentMethod;
    amount: string;
    currency: string;
    status: string;
    checkoutKeyId: string | null;
  };
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

export interface VerifyRazorpayPaymentResponse {
  payment: {
    id: string;
    provider: string;
    providerOrderId: string | null;
    providerPaymentId: string | null;
    paymentMethod: PaymentMethod;
    amount: string;
    currency: string;
    status: string;
  };
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

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:3000";

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
        : "Payment request failed";

    throw new Error(message);
  }

  return data as T;
}

export async function initiatePayment(
  accessToken: string,
  input: {
    orderNumber: string;
    paymentMethod: PaymentMethod;
  },
): Promise<InitiatePaymentResponse> {
  const response = await fetch(
    `${API_BASE_URL}/payments/initiate`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(input),
      cache: "no-store",
    },
  );

  return parseResponse<InitiatePaymentResponse>(
    response,
  );
}

export async function verifyRazorpayPayment(
  accessToken: string,
  input: {
    orderNumber: string;
    razorpayPaymentId: string;
    razorpayOrderId: string;
    razorpaySignature: string;
  },
): Promise<VerifyRazorpayPaymentResponse> {
  const response = await fetch(
    `${API_BASE_URL}/payments/razorpay/verify`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(input),
      cache: "no-store",
    },
  );

  return parseResponse<VerifyRazorpayPaymentResponse>(
    response,
  );
}
