import type { CustomerMeResponse } from "@/types/customer-auth";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3000";

export const CUSTOMER_ACCESS_TOKEN_KEY =
  "klarone-customer-access-token";

export interface CustomerOtpRequestResult {
  challengeId: string;
  expiresInSeconds: number;
  maskedPhone: string;
}

export interface CustomerAuthResult {
  accessToken: string;
  expiresIn: number;
  tokenType: string;
  customer: CustomerMeResponse["customer"];
}

export class CustomerAuthError extends Error {
  readonly status: number;
  readonly code: "UNAUTHORIZED" | "API_ERROR";

  constructor(
    message: string,
    options: {
      status: number;
      code: "UNAUTHORIZED" | "API_ERROR";
    },
  ) {
    super(message);
    this.name = "CustomerAuthError";
    this.status = options.status;
    this.code = options.code;
  }
}

async function parseResponse<T>(response: Response): Promise<T> {
  let data: unknown = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    if (response.status === 401) {
      throw new CustomerAuthError(
        "Your session has expired. Please sign in again.",
        {
          status: 401,
          code: "UNAUTHORIZED",
        },
      );
    }

    const message =
      data &&
      typeof data === "object" &&
      "message" in data &&
      typeof data.message === "string"
        ? data.message
        : "Customer authentication request failed";

    throw new CustomerAuthError(message, {
      status: response.status,
      code: "API_ERROR",
    });
  }

  return data as T;
}

export function getCustomerAccessToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return sessionStorage.getItem(CUSTOMER_ACCESS_TOKEN_KEY);
}

export function storeCustomerAccessToken(token: string): void {
  if (typeof window === "undefined") {
    return;
  }

  sessionStorage.setItem(CUSTOMER_ACCESS_TOKEN_KEY, token);
}

export function clearStoredCustomerAccessToken(): void {
  if (typeof window === "undefined") {
    return;
  }

  sessionStorage.removeItem(CUSTOMER_ACCESS_TOKEN_KEY);
}

export async function requestCustomerOtp(
  phone: string,
): Promise<CustomerOtpRequestResult> {
  const response = await fetch(
    `${API_BASE_URL}/customer-auth/request-otp`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        phone,
      }),
    },
  );

  return parseResponse<CustomerOtpRequestResult>(response);
}

export async function verifyCustomerOtp(
  challengeId: string,
  phone: string,
  code: string,
): Promise<CustomerAuthResult> {
  const response = await fetch(
    `${API_BASE_URL}/customer-auth/verify-otp`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        challengeId,
        phone,
        code,
      }),
    },
  );

  return parseResponse<CustomerAuthResult>(response);
}

export async function getCustomerMe(
  accessToken?: string | null,
): Promise<CustomerMeResponse> {
  const token = accessToken ?? getCustomerAccessToken();

  if (!token) {
    throw new CustomerAuthError(
      "No customer session is available.",
      {
        status: 401,
        code: "UNAUTHORIZED",
      },
    );
  }

  const response = await fetch(
    `${API_BASE_URL}/customer-auth/me`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    },
  );

  return parseResponse<CustomerMeResponse>(response);
}