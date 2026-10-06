import type { Prisma } from "@klarone/db";

export type PaymentMethod =
  | "RAZORPAY"
  | "COD";

export type PaymentStatus =
  | "CREATED"
  | "PENDING"
  | "AUTHORIZED"
  | "PAID"
  | "FAILED"
  | "CANCELLED"
  | "REFUNDED";

export interface PaymentInitiationInput {
  orderId: string;
  orderNumber: string;
  amount: string;
  currency: string;
  customerId: string;
  customerPhone: string | null;
  customerName: string | null;
  customerEmail: string | null;
}

export interface PaymentInitiationResult {
  provider: string;
  providerOrderId: string | null;
  status: PaymentStatus;
  paymentMethod: PaymentMethod;
  checkoutUrl: string | null;
  checkoutKeyId: string | null;
  metadata?: Prisma.InputJsonValue;
}

export interface PaymentVerificationInput {
  orderId: string;
  orderNumber: string;
  amount: string;
  currency: string;
  providerOrderId: string;
  providerPaymentId: string;
  providerSignature: string;
}

export interface PaymentVerificationResult {
  provider: string;
  providerOrderId: string;
  providerPaymentId: string;
  status: PaymentStatus;
  metadata?: Prisma.InputJsonValue;
}

export interface PaymentProvider {
  readonly providerName: string;
  readonly supportedMethods:
    readonly PaymentMethod[];

  initiatePayment(
    input: PaymentInitiationInput,
    method: PaymentMethod,
  ): Promise<PaymentInitiationResult>;
}

export interface PaymentVerificationProvider {
  readonly providerName: string;

  verifyPayment(
    input: PaymentVerificationInput,
  ): Promise<PaymentVerificationResult>;
}
