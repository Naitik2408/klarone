import type { VerifiedCustomerIdentity } from "../types/customer-identity.types";

export const CUSTOMER_AUTH_PROVIDER = Symbol(
  "CUSTOMER_AUTH_PROVIDER",
);

export interface CustomerOtpRequestResult {
  challengeId: string;
  expiresInSeconds: number;
  maskedPhone: string;
}

export interface CustomerOtpVerificationInput {
  challengeId: string;
  phone: string;
  code: string;
}

export interface CustomerAuthProvider {
  readonly providerName: string;

  requestOtp(
    phone: string,
  ): Promise<CustomerOtpRequestResult>;

  verifyOtp(
    input: CustomerOtpVerificationInput,
  ): Promise<VerifiedCustomerIdentity>;
}