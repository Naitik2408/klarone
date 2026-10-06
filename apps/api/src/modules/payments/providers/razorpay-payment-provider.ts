import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHmac, timingSafeEqual } from "node:crypto";
import Razorpay from "razorpay";

import type {
  PaymentInitiationInput,
  PaymentInitiationResult,
  PaymentMethod,
  PaymentProvider,
  PaymentVerificationInput,
  PaymentVerificationProvider,
  PaymentVerificationResult,
} from "./payment-provider.types";

@Injectable()
export class RazorpayPaymentProvider
  implements
    PaymentProvider,
    PaymentVerificationProvider
{
  readonly providerName = "RAZORPAY";

  readonly supportedMethods:
    readonly PaymentMethod[] = [
      "RAZORPAY",
    ];

  private client: Razorpay | null = null;

  constructor(
    private readonly configService: ConfigService,
  ) {}

  async initiatePayment(
    input: PaymentInitiationInput,
    method: PaymentMethod,
  ): Promise<PaymentInitiationResult> {
    if (method !== "RAZORPAY") {
      throw new Error(
        "RazorpayPaymentProvider only supports RAZORPAY",
      );
    }

    if (input.currency !== "INR") {
      throw new Error(
        "Razorpay V1 currently supports INR checkout only",
      );
    }

    const client = this.getClient();

    /*
     * Razorpay expects amount in the smallest unit
     * of the currency. For INR:
     *
     * ?1 = 100 paise
     */
    const amountInPaise =
      this.toSmallestCurrencyUnit(
        input.amount,
      );

    const razorpayOrder =
      await client.orders.create({
        amount: amountInPaise,
        currency: input.currency,
        receipt: input.orderNumber,
        notes: {
          klaroneOrderId:
            input.orderId,
          klaroneOrderNumber:
            input.orderNumber,
          customerId:
            input.customerId,
        },
      });

    return {
      provider:
        this.providerName,

      providerOrderId:
        razorpayOrder.id,

      status: "CREATED",

      paymentMethod:
        "RAZORPAY",

      checkoutUrl: null,

      checkoutKeyId:
        this.configService.get<string>(
          "RAZORPAY_KEY_ID",
        ) ?? null,

      metadata: {
        razorpayOrderId:
          razorpayOrder.id,
        amount:
          razorpayOrder.amount,
        currency:
          razorpayOrder.currency,
        customerPhone:
          input.customerPhone,
        customerName:
          input.customerName,
        customerEmail:
          input.customerEmail,
      },
    };
  }

  async verifyPayment(
    input: PaymentVerificationInput,
  ): Promise<PaymentVerificationResult> {
    const client = this.getClient();

    const keySecret =
      this.configService.get<string>(
        "RAZORPAY_KEY_SECRET",
      );

    if (!keySecret) {
      throw new ServiceUnavailableException(
        "Razorpay credentials are not configured",
      );
    }

    /*
     * Razorpay signature verification:
     *
     * HMAC_SHA256(
     *   razorpay_order_id + "|" + razorpay_payment_id,
     *   razorpay_key_secret
     * )
     *
     * The provider order ID comes from Klarone's trusted
     * payment record, not from the browser.
     */
    const signaturePayload =
      `${input.providerOrderId}|${input.providerPaymentId}`;

    const expectedSignature =
      createHmac(
        "sha256",
        keySecret,
      )
        .update(signaturePayload)
        .digest("hex");

    const expectedBuffer =
      Buffer.from(
        expectedSignature,
        "utf8",
      );

    const receivedBuffer =
      Buffer.from(
        input.providerSignature,
        "utf8",
      );

    const signaturesMatch =
      expectedBuffer.length ===
        receivedBuffer.length &&
      timingSafeEqual(
        expectedBuffer,
        receivedBuffer,
      );

    if (!signaturesMatch) {
      throw new BadRequestException(
        "Razorpay payment signature verification failed",
      );
    }

    /*
     * Fetch the payment directly from Razorpay after
     * signature validation. Klarone uses this provider-side
     * response as the source of truth for payment status.
     */
    const razorpayPayment =
      await client.payments.fetch(
        input.providerPaymentId,
      );

    if (
      razorpayPayment.order_id !==
      input.providerOrderId
    ) {
      throw new BadRequestException(
        "Razorpay payment does not belong to the expected order",
      );
    }

    const expectedAmountInPaise =
      this.toSmallestCurrencyUnit(
        input.amount,
      );

    if (
      Number(razorpayPayment.amount) !==
      expectedAmountInPaise
    ) {
      throw new BadRequestException(
        "Razorpay payment amount does not match the Klarone order",
      );
    }

    if (
      razorpayPayment.currency !==
      input.currency
    ) {
      throw new BadRequestException(
        "Razorpay payment currency does not match the Klarone order",
      );
    }

    let status:
      | "PAID"
      | "AUTHORIZED"
      | "FAILED"
      | "PENDING";

    switch (
      razorpayPayment.status
    ) {
      case "captured":
        status = "PAID";
        break;

      case "authorized":
        status = "AUTHORIZED";
        break;

      case "failed":
        status = "FAILED";
        break;

      case "created":
        status = "PENDING";
        break;

      default:
        status = "PENDING";
        break;
    }

    return {
      provider:
        this.providerName,

      providerOrderId:
        input.providerOrderId,

      providerPaymentId:
        input.providerPaymentId,

      status,

      metadata: {
        razorpayPaymentId:
          razorpayPayment.id,
        razorpayOrderId:
          razorpayPayment.order_id,
        razorpayStatus:
          razorpayPayment.status,
        amount:
          razorpayPayment.amount,
        currency:
          razorpayPayment.currency,
        captured:
          razorpayPayment.captured,
        method:
          razorpayPayment.method,
      },
    };
  }

  private getClient(): Razorpay {
    if (this.client) {
      return this.client;
    }

    const keyId =
      this.configService.get<string>(
        "RAZORPAY_KEY_ID",
      );

    const keySecret =
      this.configService.get<string>(
        "RAZORPAY_KEY_SECRET",
      );

    if (!keyId || !keySecret) {
      throw new ServiceUnavailableException(
        "Razorpay credentials are not configured",
      );
    }

    this.client = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    return this.client;
  }

  private toSmallestCurrencyUnit(
    amount: string,
  ): number {
    const numericAmount =
      Number(amount);

    if (
      !Number.isFinite(
        numericAmount,
      ) ||
      numericAmount <= 0
    ) {
      throw new Error(
        "Invalid payment amount",
      );
    }

    const smallestUnit =
      Math.round(
        numericAmount * 100,
      );

    if (smallestUnit <= 0) {
      throw new Error(
        "Invalid payment amount",
      );
    }

    return smallestUnit;
  }
}
