import type {
  PaymentInitiationInput,
  PaymentInitiationResult,
  PaymentMethod,
  PaymentProvider,
} from "./payment-provider.types";

export const PAYMENT_PROVIDER = Symbol(
  "PAYMENT_PROVIDER",
);

export type {
  PaymentInitiationInput,
  PaymentInitiationResult,
  PaymentMethod,
  PaymentProvider,
};