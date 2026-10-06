import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { PrismaService } from "../../database/prisma.service";
import type { AuthenticatedCustomer } from "../customer-auth/types/customer-session.types";
import type {
  InitiatePaymentDto,
} from "./dto/initiate-payment.dto";
import type {
  VerifyRazorpayPaymentDto,
} from "./dto/verify-razorpay-payment.dto";
import {
  CodPaymentProvider,
} from "./providers/cod-payment-provider";
import {
  RazorpayPaymentProvider,
} from "./providers/razorpay-payment-provider";
import type {
  PaymentMethod,
} from "./providers/payment-provider.types";

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly codPaymentProvider: CodPaymentProvider,
    private readonly razorpayPaymentProvider: RazorpayPaymentProvider,
  ) {}

  async initiatePayment(
    customer: AuthenticatedCustomer,
    dto: InitiatePaymentDto,
  ) {
    const customerId =
      this.toBigInt(
        customer.customerId,
      );

    const orderNumber =
      dto.orderNumber.trim();

    if (!orderNumber) {
      throw new BadRequestException(
        "Order number is required",
      );
    }

    const paymentMethod =
      dto.paymentMethod;

    if (
      paymentMethod !== "COD" &&
      paymentMethod !== "RAZORPAY"
    ) {
      throw new BadRequestException(
        "Unsupported payment method",
      );
    }

    const order =
      await this.prisma.order.findFirst({
        where: {
          customerId,
          orderNumber,
        },
        include: {
          customer: {
            include: {
              person: true,
            },
          },
          payments: {
            orderBy: {
              createdAt: "desc",
            },
          },
        },
      });

    if (!order) {
      throw new NotFoundException(
        "Order not found",
      );
    }

    if (
      order.paymentStatus ===
        "PAID" ||
      order.status ===
        "CANCELLED"
    ) {
      throw new BadRequestException(
        "This order is no longer available for payment",
      );
    }

    /*
     * If an existing payment for this method is still usable,
     * return it instead of blindly creating duplicates.
     *
     * This is especially useful if the browser retries because
     * of a slow network response.
     */
    const existingPayment =
      order.payments.find(
        (payment) =>
          payment.paymentMethod ===
            paymentMethod &&
          (
            payment.status ===
              "CREATED" ||
            payment.status ===
              "PENDING" ||
            payment.status ===
              "AUTHORIZED"
          ),
      );

    if (existingPayment) {
      return {
        payment: {
          id:
            existingPayment.id.toString(),
          provider:
            existingPayment.provider,
          providerOrderId:
            existingPayment.providerOrderId,
          providerPaymentId:
            existingPayment.providerPaymentId,
          paymentMethod:
            existingPayment.paymentMethod,
          amount:
            existingPayment.amount.toString(),
          currency:
            existingPayment.currency,
          status:
            existingPayment.status,
          checkoutKeyId:
            existingPayment.provider ===
            "RAZORPAY"
              ? this.getRazorpayKeyId()
              : null,
        },
        order: {
          id:
            order.id.toString(),
          orderNumber:
            order.orderNumber,
          status:
            order.status,
          paymentStatus:
            order.paymentStatus,
          fulfillmentStatus:
            order.fulfillmentStatus,
          totalAmount:
            order.totalAmount.toString(),
          currency:
            order.currency,
        },
      };
    }

    const provider =
      this.getProvider(
        paymentMethod,
      );

    const customerPerson =
      order.customer.person;

    const customerName =
      [
        customerPerson.firstName,
        customerPerson.middleName,
        customerPerson.lastName,
      ]
        .filter(
          (value) =>
            Boolean(value?.trim()),
        )
        .join(" ")
        .trim() || null;

    /*
     * Razorpay/COD receives the authoritative amount from
     * the Klarone Order record. The browser never supplies it.
     */
    const initiation =
      await provider.initiatePayment(
        {
          orderId:
            order.id.toString(),
          orderNumber:
            order.orderNumber,
          amount:
            order.totalAmount.toString(),
          currency:
            order.currency,
          customerId:
            customerId.toString(),
          customerPhone:
            customerPerson.phone,
          customerName,
          customerEmail:
            customerPerson.email,
        },
        paymentMethod,
      );

    const result =
      await this.prisma.$transaction(
        async (tx) => {
          const payment =
            await tx.payment.create({
              data: {
                orderId:
                  order.id,
                provider:
                  initiation.provider,
                providerOrderId:
                  initiation.providerOrderId,
                providerPaymentId:
                  null,
                amount:
                  order.totalAmount,
                currency:
                  order.currency,
                paymentMethod:
                  initiation.paymentMethod,
                status:
                  initiation.status,
              },
            });

          await tx.paymentTransaction.create({
            data: {
              paymentId:
                payment.id,
              transactionType:
                "INITIATION",
              amount:
                order.totalAmount,
              providerTransactionId:
                initiation.providerOrderId,
              status:
                initiation.status,
              metadata:
                initiation.metadata
                  ? initiation.metadata
                  : undefined,
            },
          });

          /*
           * COD is a confirmed order but still unpaid.
           *
           * Razorpay remains PENDING until the payment is
           * verified by the backend.
           */
          if (
            paymentMethod === "COD" &&
            order.status ===
              "PENDING"
          ) {
            await tx.order.update({
              where: {
                id: order.id,
              },
              data: {
                status:
                  "CONFIRMED",
                paymentStatus:
                  "PENDING",
              },
            });

            await tx.orderStatusHistory.create({
              data: {
                orderId:
                  order.id,
                oldStatus:
                  order.status,
                newStatus:
                  "CONFIRMED",
                changedByUserId:
                  null,
                notes:
                  "COD payment method selected",
              },
            });
          }

          return payment;
        },
        {
          maxWait: 15000,
          timeout: 30000,
        },
      );

    return {
      payment: {
        id:
          result.id.toString(),
        provider:
          result.provider,
        providerOrderId:
          result.providerOrderId,
        providerPaymentId:
          result.providerPaymentId,
        paymentMethod:
          result.paymentMethod,
        amount:
          result.amount.toString(),
        currency:
          result.currency,
        status:
          result.status,
        checkoutKeyId:
          paymentMethod ===
          "RAZORPAY"
            ? this.getRazorpayKeyId()
            : null,
      },
      order: {
        id:
          order.id.toString(),
        orderNumber:
          order.orderNumber,
        status:
          paymentMethod ===
          "COD"
            ? "CONFIRMED"
            : order.status,
        paymentStatus:
          order.paymentStatus,
        fulfillmentStatus:
          order.fulfillmentStatus,
        totalAmount:
          order.totalAmount.toString(),
        currency:
          order.currency,
      },
    };
  }

  async verifyRazorpayPayment(
    customer: AuthenticatedCustomer,
    dto: VerifyRazorpayPaymentDto,
  ) {
    const customerId =
      this.toBigInt(
        customer.customerId,
      );

    const orderNumber =
      dto.orderNumber.trim();

    const razorpayPaymentId =
      dto.razorpayPaymentId.trim();

    const razorpayOrderId =
      dto.razorpayOrderId.trim();

    const razorpaySignature =
      dto.razorpaySignature.trim();

    if (
      !orderNumber ||
      !razorpayPaymentId ||
      !razorpayOrderId ||
      !razorpaySignature
    ) {
      throw new BadRequestException(
        "Complete Razorpay payment details are required",
      );
    }

    const order =
      await this.prisma.order.findFirst({
        where: {
          customerId,
          orderNumber,
        },
        include: {
          payments: {
            where: {
              paymentMethod:
                "RAZORPAY",
            },
            orderBy: {
              createdAt: "desc",
            },
          },
        },
      });

    if (!order) {
      throw new NotFoundException(
        "Order not found",
      );
    }

    const payment =
      order.payments.find(
        (item) =>
          item.provider ===
            "RAZORPAY" &&
          item.providerOrderId ===
            razorpayOrderId,
      );

    if (!payment) {
      throw new BadRequestException(
        "No matching Razorpay payment was found for this order",
      );
    }

    /*
     * Verification is idempotent for the same already-paid payment.
     */
    if (
      payment.status ===
        "PAID"
    ) {
      if (
        payment.providerPaymentId ===
        razorpayPaymentId
      ) {
        return {
          payment: {
            id:
              payment.id.toString(),
            provider:
              payment.provider,
            providerOrderId:
              payment.providerOrderId,
            providerPaymentId:
              payment.providerPaymentId,
            paymentMethod:
              payment.paymentMethod,
            amount:
              payment.amount.toString(),
            currency:
              payment.currency,
            status:
              payment.status,
          },
          order: {
            id:
              order.id.toString(),
            orderNumber:
              order.orderNumber,
            status:
              order.status,
            paymentStatus:
              order.paymentStatus,
            fulfillmentStatus:
              order.fulfillmentStatus,
            totalAmount:
              order.totalAmount.toString(),
            currency:
              order.currency,
          },
        };
      }

      throw new BadRequestException(
        "This order already has a different paid Razorpay payment",
      );
    }

    /*
     * Payment.providerOrderId is nullable in the database,
     * but Razorpay verification requires an actual provider
     * order ID. Fail explicitly if the payment record is malformed.
     */
    const providerOrderId =
      payment.providerOrderId;

    if (!providerOrderId) {
      throw new BadRequestException(
        "Razorpay payment record is missing its provider order ID",
      );
    }

    const verification =
      await this.razorpayPaymentProvider
        .verifyPayment({
          orderId:
            order.id.toString(),
          orderNumber:
            order.orderNumber,
          amount:
            order.totalAmount.toString(),
          currency:
            order.currency,
          providerOrderId,
          providerPaymentId:
            razorpayPaymentId,
          providerSignature:
            razorpaySignature,
        });

    const result =
      await this.prisma.$transaction(
        async (tx) => {
          const currentPayment =
            await tx.payment.findUnique({
              where: {
                id: payment.id,
              },
            });

          if (!currentPayment) {
            throw new NotFoundException(
              "Payment record not found",
            );
          }

          if (
            currentPayment.status ===
              "PAID"
          ) {
            if (
              currentPayment.providerPaymentId ===
              razorpayPaymentId
            ) {
              return currentPayment;
            }

            throw new BadRequestException(
              "This payment has already been completed with a different Razorpay payment",
            );
          }

          const paymentStatus =
            verification.status;

          const paymentUpdate =
            await tx.payment.update({
              where: {
                id: currentPayment.id,
              },
              data: {
                providerPaymentId:
                  verification.providerPaymentId,
                status:
                  paymentStatus,
                paidAt:
                  paymentStatus ===
                  "PAID"
                    ? new Date()
                    : null,
              },
            });

          await tx.paymentTransaction.create({
            data: {
              paymentId:
                currentPayment.id,
              transactionType:
                "VERIFICATION",
              amount:
                currentPayment.amount,
              providerTransactionId:
                verification.providerPaymentId,
              status:
                paymentStatus,
              metadata:
                verification.metadata
                  ? verification.metadata
                  : undefined,
            },
          });

          if (
            paymentStatus ===
            "PAID"
          ) {
            const updatedOrder =
              await tx.order.update({
                where: {
                  id: order.id,
                },
                data: {
                  status:
                    order.status ===
                    "PENDING"
                      ? "CONFIRMED"
                      : order.status,
                  paymentStatus:
                    "PAID",
                },
              });

            if (
              order.status !==
                updatedOrder.status
            ) {
              await tx.orderStatusHistory.create({
                data: {
                  orderId:
                    order.id,
                  oldStatus:
                    order.status,
                  newStatus:
                    updatedOrder.status,
                  changedByUserId:
                    null,
                  notes:
                    "Razorpay payment verified",
                },
              });
            }
          } else if (
            paymentStatus ===
            "FAILED"
          ) {
            await tx.order.update({
              where: {
                id: order.id,
              },
              data: {
                paymentStatus:
                  "FAILED",
              },
            });
          }

          return paymentUpdate;
        },
        {
          maxWait: 15000,
          timeout: 30000,
        },
      );

    const finalOrder =
      await this.prisma.order.findUnique({
        where: {
          id: order.id,
        },
      });

    if (!finalOrder) {
      throw new NotFoundException(
        "Order not found after payment verification",
      );
    }

    return {
      payment: {
        id:
          result.id.toString(),
        provider:
          result.provider,
        providerOrderId:
          result.providerOrderId,
        providerPaymentId:
          result.providerPaymentId,
        paymentMethod:
          result.paymentMethod,
        amount:
          result.amount.toString(),
        currency:
          result.currency,
        status:
          result.status,
      },
      order: {
        id:
          finalOrder.id.toString(),
        orderNumber:
          finalOrder.orderNumber,
        status:
          finalOrder.status,
        paymentStatus:
          finalOrder.paymentStatus,
        fulfillmentStatus:
          finalOrder.fulfillmentStatus,
        totalAmount:
          finalOrder.totalAmount.toString(),
        currency:
          finalOrder.currency,
      },
    };
  }

  private getProvider(
    method: PaymentMethod,
  ) {
    switch (method) {
      case "COD":
        return this.codPaymentProvider;

      case "RAZORPAY":
        return this.razorpayPaymentProvider;

      default:
        throw new BadRequestException(
          "Unsupported payment method",
        );
    }
  }

  private getRazorpayKeyId() {
    return (
      process.env.RAZORPAY_KEY_ID ??
      null
    );
  }

  private toBigInt(
    value: string,
  ): bigint {
    try {
      const result = BigInt(value);

      if (result <= 0n) {
        throw new Error(
          "Must be positive",
        );
      }

      return result;
    } catch {
      throw new BadRequestException(
        "Invalid customer identifier",
      );
    }
  }
}
