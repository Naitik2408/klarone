"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";

import type { CustomerMeResponse } from "@/types/customer-auth";

import {
  clearStoredCustomerAccessToken,
  CustomerAuthError,
  getCustomerAccessToken,
  getCustomerMe,
  storeCustomerAccessToken,
  verifyCustomerOtp,
  type CustomerAuthResult,
} from "@/lib/customer-auth-api";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3000";

interface VerifyOtpAndSignInInput {
  challengeId: string;
  phone: string;
  code: string;
}

interface CustomerAuthContextValue {
  customer: CustomerMeResponse["customer"] | null;
  accessToken: string | null;
  isLoading: boolean;
  isAuthLoading: boolean;
  isAuthenticated: boolean;

  verifyOtpAndSignIn(
    input: VerifyOtpAndSignInInput,
  ): Promise<CustomerAuthResult>;

  verifyOtpAndSignIn(
    phone: string,
    challengeId: string,
    code: string,
  ): Promise<CustomerAuthResult>;

  logout: () => void;
  refreshCustomer: () => Promise<void>;
}

const CustomerAuthContext =
  createContext<CustomerAuthContextValue | undefined>(undefined);

interface CustomerAuthProviderProps {
  children: ReactNode;
}

export function CustomerAuthProvider({
  children,
}: CustomerAuthProviderProps) {
  const router = useRouter();

  const [customer, setCustomer] =
    useState<CustomerMeResponse["customer"] | null>(null);

  const [accessToken, setAccessToken] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);

  const redirectToLogin = useCallback(() => {
    clearStoredCustomerAccessToken();

    setAccessToken(null);
    setCustomer(null);

    if (typeof window === "undefined") {
      return;
    }

    const currentPath =
      `${window.location.pathname}${window.location.search}`;

    if (window.location.pathname === "/login") {
      return;
    }

    const next =
      currentPath && currentPath !== "/"
        ? `?next=${encodeURIComponent(currentPath)}`
        : "";

    router.replace(`/login${next}`);
  }, [router]);

  const restoreSession = useCallback(async () => {
    let storedToken = getCustomerAccessToken();

    // If local token not found, check if Better Auth has an active cookie session (e.g. from Google OAuth)
    if (!storedToken) {
      try {
        const { authClient } = await import("@/lib/auth-client");
        const sessionRes = await authClient.getSession({
          fetchOptions: {
            credentials: "include",
          },
        });
        console.log("[CustomerAuth] Better Auth session check result:", sessionRes);

        if (sessionRes?.data?.user?.email) {
          // Sync Better Auth user with backend customer-auth service
          const syncRes = await fetch(`${API_BASE_URL}/customer-auth/sync-session`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              email: sessionRes.data.user.email,
              name: sessionRes.data.user.name,
              betterAuthUserId: sessionRes.data.user.id,
            }),
          });
          if (syncRes.ok) {
            const syncData = (await syncRes.json()) as { accessToken: string };
            if (syncData.accessToken) {
              storeCustomerAccessToken(syncData.accessToken);
              storedToken = syncData.accessToken;
            }
          } else {
            console.error("[CustomerAuth] sync-session returned error status:", syncRes.status);
          }
        }
      } catch (sessionErr) {
        console.warn("[CustomerAuth] Better Auth session check notice:", sessionErr);
      }
    }

    if (!storedToken) {
      setAccessToken(null);
      setCustomer(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const response = await getCustomerMe(storedToken);

      setAccessToken(storedToken);
      setCustomer(response.customer);
    } catch (error) {
      if (
        error instanceof CustomerAuthError &&
        error.code === "UNAUTHORIZED"
      ) {
        redirectToLogin();
        return;
      }

      setAccessToken(storedToken);
      setCustomer(null);
    } finally {
      setIsLoading(false);
    }
  }, [redirectToLogin]);

  useEffect(() => {
    void restoreSession();
  }, [restoreSession]);

  async function verifyOtpAndSignIn(
    input: VerifyOtpAndSignInInput,
  ): Promise<CustomerAuthResult>;

  async function verifyOtpAndSignIn(
    phone: string,
    challengeId: string,
    code: string,
  ): Promise<CustomerAuthResult>;

  async function verifyOtpAndSignIn(
    inputOrPhone: VerifyOtpAndSignInInput | string,
    challengeId?: string,
    code?: string,
  ): Promise<CustomerAuthResult> {
    let phone: string;
    let resolvedChallengeId: string;
    let resolvedCode: string;

    if (typeof inputOrPhone === "string") {
      phone = inputOrPhone;
      resolvedChallengeId = challengeId ?? "";
      resolvedCode = code ?? "";
    } else {
      phone = inputOrPhone.phone;
      resolvedChallengeId = inputOrPhone.challengeId;
      resolvedCode = inputOrPhone.code;
    }

    const response = await verifyCustomerOtp(
      resolvedChallengeId,
      phone,
      resolvedCode,
    );

    storeCustomerAccessToken(response.accessToken);

    // Fetch complete customer profile with person record populated
    let fullCustomer = response.customer;
    try {
      const meResponse = await getCustomerMe(response.accessToken);
      fullCustomer = meResponse.customer;
    } catch {
      // fallback to initial
    }

    setAccessToken(response.accessToken);
    setCustomer(fullCustomer);

    return response;
  }

  const logout = useCallback(() => {
    clearStoredCustomerAccessToken();

    setAccessToken(null);
    setCustomer(null);

    router.replace("/");
  }, [router]);

  const refreshCustomer = useCallback(async () => {
    const token = getCustomerAccessToken();

    if (!token) {
      setAccessToken(null);
      setCustomer(null);
      return;
    }

    try {
      const response = await getCustomerMe(token);

      setAccessToken(token);
      setCustomer(response.customer);
    } catch (error) {
      if (
        error instanceof CustomerAuthError &&
        error.code === "UNAUTHORIZED"
      ) {
        redirectToLogin();
        return;
      }

      throw error;
    }
  }, [redirectToLogin]);

  const value = useMemo<CustomerAuthContextValue>(
    () => ({
      customer,
      accessToken,
      isLoading,
      isAuthLoading: isLoading,
      isAuthenticated: Boolean(accessToken && customer),
      verifyOtpAndSignIn,
      logout,
      refreshCustomer,
    }),
    [
      customer,
      accessToken,
      isLoading,
      logout,
      refreshCustomer,
    ],
  );

  return (
    <CustomerAuthContext.Provider value={value}>
      {children}
    </CustomerAuthContext.Provider>
  );
}

export function useCustomerAuth(): CustomerAuthContextValue {
  const context = useContext(CustomerAuthContext);

  if (!context) {
    throw new Error(
      "useCustomerAuth must be used inside CustomerAuthProvider",
    );
  }

  return context;
}