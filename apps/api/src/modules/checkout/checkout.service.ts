import {
  BadRequestException,
  Injectable,
} from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { toJsonSafe } from "../../common/serialization/json-safe";
import type { CheckoutQuoteDto } from "./dto/checkout-quote.dto";

@Injectable()
export class CheckoutService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async createQuote(body: CheckoutQuoteDto) {
    if (!body || !Array.isArray(body.items)) {
      throw new BadRequestException(
        "Checkout items are required",
      );
    }

    if (body.items.length === 0) {
      throw new BadRequestException(
        "Checkout cart cannot be empty",
      );
    }

    const normalizedItems = body.items.map(
      (item, index) => {
        if (!item?.variantId) {
          throw new BadRequestException(
            `Item ${index + 1}: variantId is required`,
          );
        }

        const variantId = this.parseBigInt(
          item.variantId,
        );

        const quantity = Number(item.quantity);

        if (!Number.isInteger(quantity) || quantity < 1) {
          throw new BadRequestException(
            `Item ${index + 1}: quantity must be a positive integer`,
          );
        }

        return {
          variantId,
          quantity,
        };
      },
    );

    const variantIds = normalizedItems.map(
      (item) => item.variantId,
    );

    const uniqueVariantIds = new Set(
      variantIds.map((id) => id.toString()),
    );

    if (
      uniqueVariantIds.size !== variantIds.length
    ) {
      throw new BadRequestException(
        "Duplicate product variants are not allowed in a checkout quote",
      );
    }

    const variants =
      await this.prisma.productVariant.findMany({
        where: {
          id: {
            in: variantIds,
          },
          status: "ACTIVE",
        },
        select: {
          id: true,
          sku: true,
          variantName: true,
          sellingPrice: true,
          compareAtPrice: true,
          currency: true,
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              status: true,
              brand: {
                select: {
                  name: true,
                  slug: true,
                },
              },
            },
          },
          inventories: {
            select: {
              quantityAvailable: true,
              quantityReserved: true,
            },
          },
        },
      });

    if (variants.length !== variantIds.length) {
      const foundIds = new Set(
        variants.map((variant) =>
          variant.id.toString(),
        ),
      );

      const missingVariantIds =
        normalizedItems
          .filter(
            (item) =>
              !foundIds.has(
                item.variantId.toString(),
              ),
          )
          .map((item) =>
            item.variantId.toString(),
          );

      throw new BadRequestException({
        message:
          "One or more products are unavailable",
        unavailableVariantIds:
          missingVariantIds,
      });
    }

    const items = normalizedItems.map((input) => {
      const variant = variants.find(
        (item) =>
          item.id === input.variantId,
      );

      if (!variant) {
        throw new BadRequestException(
          "Unable to resolve checkout item",
        );
      }

      if (variant.product.status !== "PUBLISHED") {
        throw new BadRequestException(
          `${variant.product.name} is not currently available`,
        );
      }

      const stock = variant.inventories.reduce(
        (total, inventory) =>
          total +
          Math.max(
            inventory.quantityAvailable -
              inventory.quantityReserved,
            0,
          ),
        0,
      );

      if (input.quantity > stock) {
        throw new BadRequestException({
          message: `${variant.product.name} does not have enough stock`,
          variantId: variant.id.toString(),
          requestedQuantity: input.quantity,
          availableQuantity: stock,
        });
      }

      const lineTotal =
        variant.sellingPrice.mul(input.quantity);

      return {
        variantId: variant.id.toString(),
        productId: variant.product.id.toString(),
        productSlug: variant.product.slug,
        productName: variant.product.name,
        brandName: variant.product.brand.name,
        sku: variant.sku,
        variantName: variant.variantName,
        quantity: input.quantity,
        unitPrice: variant.sellingPrice.toString(),
        compareAtPrice:
          variant.compareAtPrice?.toString() ?? null,
        lineTotal: lineTotal.toString(),
        currency: variant.currency,
        availableQuantity: stock,
      };
    });

    const currencySet = new Set(
      items.map((item) => item.currency),
    );

    if (currencySet.size !== 1) {
      throw new BadRequestException(
        "All checkout items must use the same currency",
      );
    }

    const subtotal = variants.reduce(
      (total, variant) => {
        const input = normalizedItems.find(
          (item) =>
            item.variantId === variant.id,
        );

        if (!input) {
          return total;
        }

        return total.add(
          variant.sellingPrice.mul(
            input.quantity,
          ),
        );
      },
      variants[0].sellingPrice.mul(0),
    );

    const currency =
      items[0]?.currency ?? "INR";

    return toJsonSafe({
      items,
      pricing: {
        currency,
        subtotal: subtotal.toString(),
        discountAmount: "0",
        shippingAmount: "0",
        taxAmount: "0",
        totalAmount: subtotal.toString(),
      },
    });
  }

  private parseBigInt(value: string): bigint {
    if (!/^\d+$/.test(value)) {
      throw new BadRequestException(
        `Invalid variantId: ${value}`,
      );
    }

    try {
      const parsed = BigInt(value);

      if (parsed <= 0n) {
        throw new Error();
      }

      return parsed;
    } catch {
      throw new BadRequestException(
        `Invalid variantId: ${value}`,
      );
    }
  }
}