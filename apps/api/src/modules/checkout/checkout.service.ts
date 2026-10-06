import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import Decimal from "decimal.js";
import { randomUUID } from "node:crypto";

import { PrismaService } from "../../database/prisma.service";
import type { AuthenticatedCustomer } from "../customer-auth/types/customer-session.types";
import type {
  CheckoutQuoteDto,
  CheckoutQuoteItemInput,
} from "./dto/checkout-quote.dto";

const PENDING_ORDER_TIMEOUT_MS = 15 * 60 * 1000;

@Injectable()
export class CheckoutService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async quote(dto: CheckoutQuoteDto) {
    if (
      !dto.items ||
      !Array.isArray(dto.items) ||
      dto.items.length === 0
    ) {
      throw new BadRequestException(
        "At least one checkout item is required",
      );
    }

    const normalizedItems =
      this.normalizeQuoteItems(dto.items);

    const variantIds =
      normalizedItems.map((item) =>
        this.toBigInt(item.variantId),
      );

    const variants =
      await this.prisma.productVariant.findMany({
        where: {
          id: {
            in: variantIds,
          },
          status: "ACTIVE",
          product: {
            status: "PUBLISHED",
          },
        },
        include: {
          product: {
            include: {
              brand: true,
            },
          },
          inventories: true,
        },
      });

    const variantsById = new Map(
      variants.map((variant) => [
        variant.id.toString(),
        variant,
      ]),
    );

    let currency: string | null = null;
    let subtotal = new Decimal(0);

    const items = normalizedItems.map(
      (requestedItem) => {
        const variant =
          variantsById.get(
            requestedItem.variantId,
          );

        if (!variant) {
          throw new NotFoundException(
            `Product variant ${requestedItem.variantId} was not found`,
          );
        }

        const availableQuantity =
          this.getAvailableQuantity(
            variant.inventories,
          );

        if (
          availableQuantity <
          requestedItem.quantity
        ) {
          throw new BadRequestException(
            `${variant.product.name} has only ${availableQuantity} unit(s) available`,
          );
        }

        if (currency === null) {
          currency = variant.currency;
        } else if (
          currency !== variant.currency
        ) {
          throw new BadRequestException(
            "Checkout items must use the same currency",
          );
        }

        const unitPrice =
          variant.sellingPrice;

        const lineTotal =
          new Decimal(unitPrice.toString()).mul(
            requestedItem.quantity,
          );

        subtotal =
          subtotal.add(lineTotal);

        return {
          variantId:
            variant.id.toString(),
          productId:
            variant.productId.toString(),
          productName:
            variant.product.name,
          productSlug:
            variant.product.slug,
          brandName:
            variant.product.brand.name,
          sku: variant.sku,
          variantName:
            variant.variantName ??
            variant.sku,
          quantity:
            requestedItem.quantity,
          unitPrice:
            unitPrice.toString(),
          compareAtPrice:
            variant.compareAtPrice?.toString() ??
            null,
          lineTotal:
            lineTotal.toFixed(2),
          currency:
            variant.currency,
          availableQuantity,
        };
      },
    );

    const resolvedCurrency =
      currency ?? "INR";

    const zero = new Decimal(0);

    return {
      items,
      pricing: {
        currency: resolvedCurrency,
        subtotal:
          subtotal.toFixed(2),
        discountAmount:
          zero.toFixed(2),
        shippingAmount:
          zero.toFixed(2),
        taxAmount:
          zero.toFixed(2),
        total:
          subtotal.toFixed(2),
      },
    };
  }

  async createOrder(
    customer: AuthenticatedCustomer,
  ) {
    const customerId =
      this.toBigInt(
        customer.customerId,
      );

    return this.prisma.$transaction(
      async (tx) => {
        const cart =
          await tx.cart.findFirst({
            where: {
              customerId,
              status: "ACTIVE",
            },
            include: {
              items: {
                orderBy: {
                  createdAt: "asc",
                },
                include: {
                  productVariant: {
                    include: {
                      product: true,
                      inventories: {
                        orderBy: {
                          id: "asc",
                        },
                      },
                    },
                  },
                },
              },
            },
          });

        if (
          !cart ||
          cart.items.length === 0
        ) {
          throw new BadRequestException(
            "Your cart is empty",
          );
        }

        /*
         * A pending order from an earlier checkout attempt
         * may still be holding stock.
         *
         * If it has expired, cancel it and release that
         * reservation before creating/resuming checkout.
         */
        const pendingOrder =
          await tx.order.findFirst({
            where: {
              customerId,
              status: "PENDING",
              paymentStatus:
                "PENDING",
            },
            orderBy: {
              createdAt: "desc",
            },
            include: {
              items: {
                orderBy: {
                  id: "asc",
                },
              },
            },
          });

        if (pendingOrder) {
          const expiresAt =
            pendingOrder.createdAt.getTime() +
            PENDING_ORDER_TIMEOUT_MS;

          if (
            Date.now() >=
            expiresAt
          ) {
            await this.releaseInventoryForOrder(
              tx,
              pendingOrder.items,
            );

            await tx.order.update({
              where: {
                id: pendingOrder.id,
              },
              data: {
                status: "CANCELLED",
              },
            });

            await tx.orderStatusHistory.create({
              data: {
                orderId:
                  pendingOrder.id,
                oldStatus:
                  pendingOrder.status,
                newStatus:
                  "CANCELLED",
                changedByUserId:
                  null,
                notes:
                  "Pending checkout expired; inventory reservation released",
              },
            });
          } else {
            const normalizedExistingOrderItems =
              pendingOrder.items.map(
                (item) => {
                  if (
                    item.productVariantId ===
                    null
                  ) {
                    throw new BadRequestException(
                      "The existing pending order contains an invalid item and cannot be resumed",
                    );
                  }

                  return {
                    item,
                    productVariantId:
                      item.productVariantId.toString(),
                  };
                },
              );

            const sameItemCount =
              normalizedExistingOrderItems.length ===
              cart.items.length;

            const sameItems =
              sameItemCount &&
              cart.items.every(
                (cartItem) => {
                  const orderItem =
                    normalizedExistingOrderItems.find(
                      (entry) =>
                        entry.productVariantId ===
                        cartItem.productVariantId.toString(),
                    );

                  return (
                    orderItem !== undefined &&
                    orderItem.item.quantity ===
                      cartItem.quantity
                  );
                },
              );

            if (sameItems) {
              return {
                order: {
                  id:
                    pendingOrder.id.toString(),
                  orderNumber:
                    pendingOrder.orderNumber,
                  status:
                    pendingOrder.status,
                  paymentStatus:
                    pendingOrder.paymentStatus,
                  fulfillmentStatus:
                    pendingOrder.fulfillmentStatus,
                  subtotal:
                    pendingOrder.subtotal.toString(),
                  discountAmount:
                    pendingOrder.discountAmount.toString(),
                  shippingAmount:
                    pendingOrder.shippingAmount.toString(),
                  taxAmount:
                    pendingOrder.taxAmount.toString(),
                  totalAmount:
                    pendingOrder.totalAmount.toString(),
                  currency:
                    pendingOrder.currency,
                  createdAt:
                    pendingOrder.createdAt.toISOString(),
                  items:
                    normalizedExistingOrderItems.map(
                      (entry) => ({
                        productVariantId:
                          entry.productVariantId,
                        productName:
                          entry.item.productName,
                        sku:
                          entry.item.sku,
                        quantity:
                          entry.item.quantity,
                        unitPrice:
                          entry.item.unitPrice.toFixed(
                            2,
                          ),
                        totalAmount:
                          entry.item.totalAmount.toFixed(
                            2,
                          ),
                      }),
                    ),
                },
              };
            }

            throw new BadRequestException(
              "You already have a pending order. Complete or cancel that payment before changing your cart.",
            );
          }
        }

        const currency =
          cart.currency;

        let subtotal =
          new Decimal(0);

        const orderItems: Array<{
          productVariantId: bigint;
          productName: string;
          sku: string;
          quantity: number;
          unitPrice: number;
          totalAmount: number;
        }> = [];

        for (const cartItem of cart.items) {
          const variant =
            cartItem.productVariant;

          if (
            variant.status !==
              "ACTIVE" ||
            variant.product.status !==
              "PUBLISHED"
          ) {
            throw new BadRequestException(
              `${variant.product.name} is no longer available`,
            );
          }

          if (
            variant.currency !==
            currency
          ) {
            throw new BadRequestException(
              "Cart contains products with different currencies",
            );
          }

          const quantity =
            cartItem.quantity;

          if (
            !Number.isInteger(
              quantity,
            ) ||
            quantity <= 0
          ) {
            throw new BadRequestException(
              "Cart contains an invalid quantity",
            );
          }

          const availableQuantity =
            this.getAvailableQuantity(
              variant.inventories,
            );

          if (
            availableQuantity <
            quantity
          ) {
            throw new BadRequestException(
              `${variant.product.name} has only ${availableQuantity} unit(s) available`,
            );
          }

          const unitPrice =
            new Decimal(
              variant.sellingPrice.toString(),
            );

          const lineTotal =
            unitPrice.mul(
              quantity,
            );

          subtotal =
            subtotal.add(lineTotal);

          orderItems.push({
            productVariantId:
              variant.id,
            productName:
              variant.product.name,
            sku:
              variant.sku,
            quantity,
            unitPrice:
              unitPrice.toNumber(),
            totalAmount:
              lineTotal.toNumber(),
          });
        }

        /*
         * Reserve inventory atomically.
         */
        for (const orderItem of orderItems) {
          let remaining =
            orderItem.quantity;

          const inventories =
            await tx.inventory.findMany({
              where: {
                productVariantId:
                  orderItem.productVariantId,
              },
              orderBy: {
                id: "asc",
              },
            });

          for (const inventory of inventories) {
            if (
              remaining <= 0
            ) {
              break;
            }

            const available =
              inventory.quantityAvailable -
              inventory.quantityReserved;

            if (
              available <= 0
            ) {
              continue;
            }

            const reserveQuantity =
              Math.min(
                remaining,
                available,
              );

            const updated =
              await tx.$queryRaw<
                Array<{
                  id: bigint;
                  quantityReserved: number;
                }>
              >`
                UPDATE "Inventory"
                SET "quantityReserved" =
                  "quantityReserved" + ${reserveQuantity}
                WHERE "id" = ${inventory.id}
                  AND (
                    "quantityAvailable" -
                    "quantityReserved"
                  ) >= ${reserveQuantity}
                RETURNING
                  "id",
                  "quantityReserved"
              `;

            if (
              updated.length === 0
            ) {
              continue;
            }

            remaining -=
              reserveQuantity;
          }

          if (
            remaining > 0
          ) {
            throw new BadRequestException(
              `Unable to reserve stock for ${orderItem.productName}`,
            );
          }
        }

        const zero = 0;

        const orderNumber =
          this.generateOrderNumber();

        const order =
          await tx.order.create({
            data: {
              customerId,
              orderNumber,
              status:
                "PENDING",
              paymentStatus:
                "PENDING",
              fulfillmentStatus:
                "UNFULFILLED",
              subtotal:
                subtotal.toFixed(2),
              discountAmount:
                zero,
              shippingAmount:
                zero,
              taxAmount:
                zero,
              totalAmount:
                subtotal.toFixed(2),
              currency,
              placedAt:
                null,
            },
          });

        await tx.orderItem.createMany({
          data:
            orderItems.map(
              (item) => ({
                orderId:
                  order.id,
                productVariantId:
                  item.productVariantId,
                productName:
                  item.productName,
                sku:
                  item.sku,
                quantity:
                  item.quantity,
                unitPrice:
                  item.unitPrice,
                discountAmount:
                  zero,
                taxAmount:
                  zero,
                totalAmount:
                  item.totalAmount,
              }),
            ),
        });

        await tx.orderStatusHistory.create({
          data: {
            orderId:
              order.id,
            oldStatus:
              null,
            newStatus:
              "PENDING",
            changedByUserId:
              null,
            notes:
              "Order created from authenticated customer checkout",
          },
        });

        /*
         * IMPORTANT:
         *
         * The cart is intentionally NOT deleted here.
         *
         * It is cleared by the successful COD / Razorpay
         * completion flow. This allows a cancelled Razorpay
         * checkout to resume safely.
         */

        return {
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
            subtotal:
              order.subtotal.toString(),
            discountAmount:
              order.discountAmount.toString(),
            shippingAmount:
              order.shippingAmount.toString(),
            taxAmount:
              order.taxAmount.toString(),
            totalAmount:
              order.totalAmount.toString(),
            currency:
              order.currency,
            createdAt:
              order.createdAt.toISOString(),
            items:
              orderItems.map(
                (item) => ({
                  productVariantId:
                    item.productVariantId.toString(),
                  productName:
                    item.productName,
                  sku:
                    item.sku,
                  quantity:
                    item.quantity,
                  unitPrice:
                    item.unitPrice.toFixed(
                      2,
                    ),
                  totalAmount:
                    item.totalAmount.toFixed(
                      2,
                    ),
                }),
              ),
          },
        };
      },
      {
        maxWait: 15000,
        timeout: 30000,
      },
    );
  }

  async cancelPendingOrder(
    customer: AuthenticatedCustomer,
    orderNumber: string,
  ) {
    const customerId =
      this.toBigInt(
        customer.customerId,
      );

    const normalizedOrderNumber =
      orderNumber.trim();

    if (!normalizedOrderNumber) {
      throw new BadRequestException(
        "Order number is required",
      );
    }

    return this.prisma.$transaction(
      async (tx) => {
        const order =
          await tx.order.findFirst({
            where: {
              customerId,
              orderNumber:
                normalizedOrderNumber,
            },
            include: {
              items: {
                orderBy: {
                  id: "asc",
                },
              },
            },
          });

        if (!order) {
          throw new NotFoundException(
            "Order not found",
          );
        }

        /*
         * Idempotent behaviour:
         * if the order is already cancelled, return
         * the current order state without changing stock again.
         */
        if (
          order.status ===
          "CANCELLED"
        ) {
          return {
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

        if (
          order.status !==
          "PENDING"
        ) {
          throw new BadRequestException(
            "Only pending orders can be cancelled",
          );
        }

        if (
          order.paymentStatus ===
          "PAID"
        ) {
          throw new BadRequestException(
            "A paid order cannot be cancelled from checkout",
          );
        }

        /*
         * Release the inventory reservation before
         * marking the pending checkout as cancelled.
         *
         * Both operations are inside the same transaction.
         */
        await this.releaseInventoryForOrder(
          tx,
          order.items,
        );

        const cancelledOrder =
          await tx.order.update({
            where: {
              id: order.id,
            },
            data: {
              status:
                "CANCELLED",
            },
          });

        await tx.orderStatusHistory.create({
          data: {
            orderId:
              order.id,
            oldStatus:
              order.status,
            newStatus:
              "CANCELLED",
            changedByUserId:
              null,
            notes:
              "Customer cancelled pending checkout; inventory reservation released",
          },
        });

        return {
          order: {
            id:
              cancelledOrder.id.toString(),
            orderNumber:
              cancelledOrder.orderNumber,
            status:
              cancelledOrder.status,
            paymentStatus:
              cancelledOrder.paymentStatus,
            fulfillmentStatus:
              cancelledOrder.fulfillmentStatus,
            totalAmount:
              cancelledOrder.totalAmount.toString(),
            currency:
              cancelledOrder.currency,
          },
        };
      },
      {
        maxWait: 15000,
        timeout: 30000,
      },
    );
  }
  private async releaseInventoryForOrder(
    tx: Parameters<
      Parameters<
        PrismaService["$transaction"]
      >[0]
    >[0],
    items: Array<{
      productVariantId:
        bigint | null;
      quantity: number;
    }>,
  ) {
    for (const item of items) {
      if (
        item.productVariantId ===
        null
      ) {
        throw new BadRequestException(
          "Cannot release inventory for an order item without a product variant",
        );
      }

      let remaining =
        item.quantity;

      const inventories =
        await tx.inventory.findMany({
          where: {
            productVariantId:
              item.productVariantId,
            quantityReserved: {
              gt: 0,
            },
          },
          orderBy: {
            id: "asc",
          },
        });

      for (const inventory of inventories) {
        if (
          remaining <= 0
        ) {
          break;
        }

        const releaseQuantity =
          Math.min(
            remaining,
            inventory.quantityReserved,
          );

        const updated =
          await tx.$queryRaw<
            Array<{
              id: bigint;
              quantityReserved: number;
            }>
          >`
            UPDATE "Inventory"
            SET "quantityReserved" =
              "quantityReserved" - ${releaseQuantity}
            WHERE "id" = ${inventory.id}
              AND "quantityReserved" >= ${releaseQuantity}
            RETURNING
              "id",
              "quantityReserved"
          `;

        if (
          updated.length === 0
        ) {
          continue;
        }

        remaining -=
          releaseQuantity;
      }

      if (
        remaining > 0
      ) {
        throw new BadRequestException(
          `Unable to fully release reserved stock for product variant ${item.productVariantId.toString()}`,
        );
      }
    }
  }

  private normalizeQuoteItems(
    items: CheckoutQuoteItemInput[],
  ) {
    const seen =
      new Set<string>();

    return items.map(
      (item) => {
        if (
          typeof item.variantId !==
            "string" ||
          item.variantId.trim() ===
            ""
        ) {
          throw new BadRequestException(
            "Every checkout item requires a variantId",
          );
        }

        const variantId =
          item.variantId.trim();

        if (
          seen.has(variantId)
        ) {
          throw new BadRequestException(
            `Duplicate variant ${variantId} is not allowed`,
          );
        }

        seen.add(
          variantId,
        );

        const quantity =
          this.parseQuantity(
            item.quantity,
          );

        return {
          variantId,
          quantity,
        };
      },
    );
  }

  private getAvailableQuantity(
    inventories: Array<{
      quantityAvailable: number;
      quantityReserved: number;
    }>,
  ) {
    return inventories.reduce(
      (
        total,
        inventory,
      ) =>
        total +
        Math.max(
          inventory.quantityAvailable -
            inventory.quantityReserved,
          0,
        ),
      0,
    );
  }

  private parseQuantity(
    value: unknown,
  ): number {
    const quantity =
      typeof value ===
      "number"
        ? value
        : Number(value);

    if (
      !Number.isInteger(
        quantity,
      ) ||
      quantity <= 0
    ) {
      throw new BadRequestException(
        "Quantity must be a positive integer",
      );
    }

    return quantity;
  }

  private toBigInt(
    value: string,
  ): bigint {
    try {
      const result =
        BigInt(value);

      if (
        result <= 0n
      ) {
        throw new Error(
          "Must be positive",
        );
      }

      return result;
    } catch {
      throw new BadRequestException(
        "Invalid identifier",
      );
    }
  }

  private generateOrderNumber(): string {
    const timestamp =
      new Date()
        .toISOString()
        .replace(/\D/g, "")
        .slice(0, 14);

    const suffix =
      randomUUID()
        .replace(/-/g, "")
        .slice(0, 8)
        .toUpperCase();

    return `KLR-${timestamp}-${suffix}`;
  }
}