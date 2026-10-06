import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { PrismaService } from "../../database/prisma.service";
import type { AuthenticatedCustomer } from "../customer-auth/types/customer-session.types";
import type { AddCartItemDto } from "./dto/add-cart-item.dto";
import type { UpdateCartItemDto } from "./dto/update-cart-item.dto";

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  async getCart(customer: AuthenticatedCustomer) {
    const customerId = this.toBigInt(customer.customerId);

    const cart = await this.prisma.cart.findFirst({
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
                product: {
                  include: {
                    brand: true,
                  },
                },
                inventories: true,
              },
            },
          },
        },
      },
    });

    if (!cart) {
      return this.emptyCart();
    }

    return this.serializeCart(cart);
  }

  async addItem(
    customer: AuthenticatedCustomer,
    dto: AddCartItemDto,
  ) {
    const quantity = this.parseQuantity(dto.quantity);
    const productVariantId = this.toBigInt(dto.variantId);

    return this.prisma.$transaction(async (tx) => {
      const variant = await tx.productVariant.findFirst({
        where: {
          id: productVariantId,
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

      if (!variant) {
        throw new NotFoundException("Product variant not found");
      }

      const availableQuantity = this.getAvailableQuantity(
        variant.inventories,
      );

      if (availableQuantity < quantity) {
        throw new BadRequestException(
          `Only ${availableQuantity} unit(s) are currently available`,
        );
      }

      const customerId = this.toBigInt(customer.customerId);

      let cart = await tx.cart.findFirst({
        where: {
          customerId,
          status: "ACTIVE",
        },
      });

      if (!cart) {
        cart = await tx.cart.create({
          data: {
            customerId,
            status: "ACTIVE",
            currency: variant.currency,
          },
        });
      }

      if (cart.currency !== variant.currency) {
        throw new BadRequestException(
          "Cart currency does not match product currency",
        );
      }

      const existingItem = await tx.cartItem.findUnique({
        where: {
          cartId_productVariantId: {
            cartId: cart.id,
            productVariantId,
          },
        },
      });

      const nextQuantity =
        (existingItem?.quantity ?? 0) + quantity;

      if (nextQuantity > availableQuantity) {
        throw new BadRequestException(
          `Only ${availableQuantity} unit(s) are currently available`,
        );
      }

      await tx.cartItem.upsert({
        where: {
          cartId_productVariantId: {
            cartId: cart.id,
            productVariantId,
          },
        },
        create: {
          cartId: cart.id,
          productVariantId,
          quantity,
          unitPrice: variant.sellingPrice,
        },
        update: {
          quantity: nextQuantity,
          unitPrice: variant.sellingPrice,
        },
      });

      const updatedCart = await tx.cart.findUniqueOrThrow({
        where: {
          id: cart.id,
        },
        include: {
          items: {
            orderBy: {
              createdAt: "asc",
            },
            include: {
              productVariant: {
                include: {
                  product: {
                    include: {
                      brand: true,
                    },
                  },
                  inventories: true,
                },
              },
            },
          },
        },
      });

      return this.serializeCart(updatedCart);
    });
  }

  async updateItem(
    customer: AuthenticatedCustomer,
    itemId: string,
    dto: UpdateCartItemDto,
  ) {
    const quantity = this.parseQuantity(dto.quantity);
    const cartItemId = this.toBigInt(itemId);
    const customerId = this.toBigInt(customer.customerId);

    const existingItem = await this.prisma.cartItem.findFirst({
      where: {
        id: cartItemId,
        cart: {
          customerId,
          status: "ACTIVE",
        },
      },
      include: {
        cart: true,
        productVariant: {
          include: {
            product: true,
            inventories: true,
          },
        },
      },
    });

    if (!existingItem) {
      throw new NotFoundException("Cart item not found");
    }

    if (
      existingItem.productVariant.status !== "ACTIVE" ||
      existingItem.productVariant.product.status !== "PUBLISHED"
    ) {
      throw new BadRequestException(
        "This product is no longer available",
      );
    }

    const availableQuantity = this.getAvailableQuantity(
      existingItem.productVariant.inventories,
    );

    if (quantity > availableQuantity) {
      throw new BadRequestException(
        `Only ${availableQuantity} unit(s) are currently available`,
      );
    }

    await this.prisma.cartItem.update({
      where: {
        id: cartItemId,
      },
      data: {
        quantity,
        unitPrice: existingItem.productVariant.sellingPrice,
      },
    });

    return this.getCart(customer);
  }

  async removeItem(
    customer: AuthenticatedCustomer,
    itemId: string,
  ) {
    const cartItemId = this.toBigInt(itemId);
    const customerId = this.toBigInt(customer.customerId);

    const cartItem = await this.prisma.cartItem.findFirst({
      where: {
        id: cartItemId,
        cart: {
          customerId,
          status: "ACTIVE",
        },
      },
    });

    if (!cartItem) {
      throw new NotFoundException("Cart item not found");
    }

    await this.prisma.cartItem.delete({
      where: {
        id: cartItemId,
      },
    });

    return this.getCart(customer);
  }

  async clearCart(customer: AuthenticatedCustomer) {
    const customerId = this.toBigInt(customer.customerId);

    const cart = await this.prisma.cart.findFirst({
      where: {
        customerId,
        status: "ACTIVE",
      },
    });

    if (!cart) {
      return this.emptyCart();
    }

    await this.prisma.cartItem.deleteMany({
      where: {
        cartId: cart.id,
      },
    });

    return this.emptyCart(cart.id, cart.currency);
  }

  private serializeCart(cart: any) {
    let subtotal = 0;
    let itemCount = 0;

    const items = cart.items.map((item: any) => {
      const currentUnitPrice = Number(
        item.productVariant.sellingPrice.toString(),
      );

      const quantity = item.quantity;
      const lineTotal = currentUnitPrice * quantity;

      subtotal += lineTotal;
      itemCount += quantity;

      return {
        id: item.id.toString(),
        productVariantId: item.productVariantId.toString(),
        quantity,
        unitPrice: currentUnitPrice.toFixed(2),
        storedUnitPrice: item.unitPrice.toString(),
        lineTotal: lineTotal.toFixed(2),
        currency: item.productVariant.currency,
        product: {
          id: item.productVariant.product.id.toString(),
          name: item.productVariant.product.name,
          slug: item.productVariant.product.slug,
          brand: {
            id: item.productVariant.product.brand.id,
            name: item.productVariant.product.brand.name,
            slug: item.productVariant.product.brand.slug,
          },
        },
        variant: {
          id: item.productVariant.id.toString(),
          sku: item.productVariant.sku,
          variantName: item.productVariant.variantName,
          ramGb: item.productVariant.ramGb,
          storageGb: item.productVariant.storageGb,
          operatingSystem: item.productVariant.operatingSystem,
          sellingPrice: item.productVariant.sellingPrice.toString(),
          compareAtPrice:
            item.productVariant.compareAtPrice?.toString() ?? null,
          currency: item.productVariant.currency,
          availableQuantity: this.getAvailableQuantity(
            item.productVariant.inventories,
          ),
        },
      };
    });

    return {
      id: cart.id,
      customerId: cart.customerId?.toString() ?? null,
      status: cart.status,
      currency: cart.currency,
      itemCount,
      subtotal: subtotal.toFixed(2),
      items,
    };
  }

  private emptyCart(
    id: string | null = null,
    currency = "INR",
  ) {
    return {
      id,
      customerId: null,
      status: "ACTIVE",
      currency,
      itemCount: 0,
      subtotal: "0.00",
      items: [],
    };
  }

  private getAvailableQuantity(inventories: Array<{
    quantityAvailable: number;
    quantityReserved: number;
  }>) {
    return inventories.reduce((total, inventory) => {
      return (
        total +
        Math.max(
          inventory.quantityAvailable -
            inventory.quantityReserved,
          0,
        )
      );
    }, 0);
  }

  private parseQuantity(value: unknown): number {
    const quantity =
      typeof value === "number"
        ? value
        : Number(value);

    if (
      !Number.isInteger(quantity) ||
      quantity <= 0
    ) {
      throw new BadRequestException(
        "Quantity must be a positive integer",
      );
    }

    return quantity;
  }

  private toBigInt(value: string): bigint {
    try {
      const result = BigInt(value);

      if (result <= 0n) {
        throw new Error("Must be positive");
      }

      return result;
    } catch {
      throw new BadRequestException(
        "Invalid identifier",
      );
    }
  }
}