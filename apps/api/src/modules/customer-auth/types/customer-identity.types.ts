import type { Prisma } from "@klarone/db";

export interface VerifiedCustomerIdentity {
  provider: string;
  externalAuthId: string;

  identifierType:
    | "PHONE"
    | "EMAIL"
    | "OTHER";

  identifierValue?: string | null;

  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;

  metadata?: Prisma.InputJsonValue;
}

export interface CustomerIdentityResult {
  userAccountId: string;
  customerId: string;
  personId: string;
  provider: string;
  externalAuthId: string;
}