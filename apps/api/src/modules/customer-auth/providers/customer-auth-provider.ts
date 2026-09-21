import type { VerifiedCustomerIdentity } from "../types/customer-identity.types";

export const CUSTOMER_AUTH_PROVIDER = Symbol(
  "CUSTOMER_AUTH_PROVIDER",
);

export interface CustomerAuthProvider {
  readonly providerName: string;

  verifyIdentity(
    credential: string,
  ): Promise<VerifiedCustomerIdentity>;
}