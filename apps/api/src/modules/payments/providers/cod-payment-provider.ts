import { Injectable } from "@nestjs/common";

import type {
  PaymentInitiationInput,
  PaymentInitiationResult,
  PaymentMethod,
  PaymentProvider,
} from "./payment-provider.types";

@Injectable()
export class CodPaymentProvider
  implements PaymentProvider
{
  readonly providerName = "COD";

  readonly supportedMethods: readonly PaymentMethod[] = [
    "COD",
  ];

  async initiatePayment(
    input: PaymentInitiationInput,
    method: PaymentMethod,
  ): Promise<PaymentInitiationResult> {
    if (method !== "COD") {
      throw new Error(
        "CodPaymentProvider only supports COD",
      );
    }

    return {
      provider: this.providerName,
      providerOrderId: null,
      status: "CREATED",
      paymentMethod: "COD",
      checkoutUrl: null,
      checkoutKeyId: null,
      metadata: {
        orderId: input.orderId,
        orderNumber: input.orderNumber,
        amount: input.amount,
        currency: input.currency,
        customerId: input.customerId,
      },
    };
  }
}