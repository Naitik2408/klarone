import type {
  PaymentMethod,
} from "../providers/payment-provider.types";

export interface InitiatePaymentDto {
  orderNumber: string;
  paymentMethod: PaymentMethod;
}