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

interface VerifyOtpAndSignInInput {
  challengeId: string;
  phone: string;
  code: string;
}

interface CustomerAuthContextValue {
  customer: CustomerMeResponse["customer"] | null;
  accessToken: string | null;
  isLoading: boolean;
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
    const storedToken = getCustomerAccessToken();

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

      // Temporary server/network errors should not destroy
      // an otherwise potentially valid local session.
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

    setAccessToken(response.accessToken);
    setCustomer(response.customer);

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