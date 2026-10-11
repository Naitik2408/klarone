import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { toJsonSafe } from "../../common/serialization/json-safe";
import { AuditService } from "../audit/audit.service";
import type { AdjustInventoryInput } from "./dto-adjust-inventory";
import type { InitializeInventoryInput } from "./dto-initialize-inventory";

@Injectable()
export class InventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) { }

  async findStaffInventory(params: {
    search?: string;
    warehouseId?: number;
    page?: number;
    pageSize?: number;
  }) {
    const page = Math.max(params.page ?? 1, 1);
    const pageSize = Math.min(
      Math.max(params.pageSize ?? 24, 1),
      100,
    );

    const search = params.search?.trim();

    const where = {
      ...(params.warehouseId
        ? {
          warehouseId: params.warehouseId,
        }
        : {}),
      ...(search
        ? {
          OR: [
            {
              productVariant: {
                sku: {
                  contains: search,
                  mode: "insensitive" as const,
                },
              },
            },
            {
              productVariant: {
                product: {
                  name: {
                    contains: search,
                    mode: "insensitive" as const,
                  },
                },
              },
            },
            {
              warehouse: {
                name: {
                  contains: search,
                  mode: "insensitive" as const,
                },
              },
            },
          ],
        }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.inventory.findMany({
        where,
        orderBy: [
          {
            updatedAt: "desc",
          },
          {
            id: "desc",
          },
        ],
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          warehouseId: true,
          productVariantId: true,
          quantityAvailable: true,
          quantityReserved: true,
          reorderLevel: true,
          updatedAt: true,

          warehouse: {
            select: {
              id: true,
              name: true,
              code: true,
              city: true,
              state: true,
              status: true,
            },
          },

          productVariant: {
            select: {
              id: true,
              sku: true,
              variantName: true,
              ramGb: true,
              storageGb: true,
              sellingPrice: true,
              status: true,
              media: {
                orderBy: [{ isPrimary: "desc" }, { displayOrder: "asc" }],
                take: 1,
                select: {
                  url: true,
                  altText: true,
                },
              },
              optionValues: {
                select: {
                  productOption: {
                    select: { name: true },
                  },
                  productOptionValue: {
                    select: {
                      value: true,
                    },
                  },
                },
              },

              product: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  status: true,

                  media: {
                    where: { isPrimary: true },
                    take: 1,
                    select: {
                      url: true,
                      altText: true,
                    },
                  },

                  brand: {
                    select: {
                      id: true,
                      name: true,
                      slug: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),

      this.prisma.inventory.count({
        where,
      }),
    ]);

    return toJsonSafe({
      items,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  }

  async adjustInventory(
    input: AdjustInventoryInput,
    performedByUserId: bigint,
  ) {
    const productVariantId = this.parsePositiveBigInt(
      input.productVariantId,
      "productVariantId",
    );

    if (
      !Number.isInteger(input.warehouseId) ||
      input.warehouseId <= 0
    ) {
      throw new BadRequestException(
        "warehouseId must be a positive integer.",
      );
    }

    if (
      !Number.isInteger(input.quantityDelta) ||
      input.quantityDelta === 0
    ) {
      throw new BadRequestException(
        "quantityDelta must be a non-zero integer.",
      );
    }

    const [warehouse, variant, inventory] =
      await Promise.all([
        this.prisma.warehouse.findUnique({
          where: {
            id: input.warehouseId,
          },
          select: {
            id: true,
            name: true,
            code: true,
            status: true,
          },
        }),

        this.prisma.productVariant.findUnique({
          where: {
            id: productVariantId,
          },
          select: {
            id: true,
            sku: true,
            variantName: true,
            status: true,
            product: {
              select: {
                id: true,
                name: true,
                status: true,
              },
            },
          },
        }),

        this.prisma.inventory.findUnique({
          where: {
            warehouseId_productVariantId: {
              warehouseId: input.warehouseId,
              productVariantId,
            },
          },
          select: {
            id: true,
          },
        }),
      ]);

    if (!warehouse) {
      throw new NotFoundException(
        "Warehouse not found.",
      );
    }

    if (warehouse.status !== "ACTIVE") {
      throw new BadRequestException(
        "Warehouse is not active.",
      );
    }

    if (!variant) {
      throw new NotFoundException(
        "Product variant not found.",
      );
    }

    if (variant.status !== "ACTIVE") {
      throw new BadRequestException(
        "Product variant is not active.",
      );
    }

    const notes = input.notes?.trim() || null;

    const result =
      await this.prisma.$transaction(
        async (tx) => {
          let currentRecord: {
            id: bigint;
            quantityAvailable: number;
            quantityReserved: number;
          };

          if (!inventory) {
            // Auto-initialize inventory record if it does not exist yet
            if (input.quantityDelta < 0) {
              throw new ConflictException(
                "Cannot reduce inventory below 0 for an uninitialized variant.",
              );
            }

            const created = await tx.inventory.create({
              data: {
                warehouseId: input.warehouseId,
                productVariantId,
                quantityAvailable: input.quantityDelta,
                quantityReserved: 0,
              },
              select: {
                id: true,
                quantityAvailable: true,
                quantityReserved: true,
              },
            });

            currentRecord = {
              id: created.id,
              quantityAvailable: 0,
              quantityReserved: 0,
            };

            const transaction =
              await tx.inventoryTransaction.create({
                data: {
                  inventoryId: created.id,
                  productVariantId,
                  warehouseId: input.warehouseId,
                  transactionType: "MANUAL_IN",
                  quantity: input.quantityDelta,
                  referenceType: "STAFF_ADJUSTMENT",
                  previousQuantity: 0,
                  newQuantity: created.quantityAvailable,
                  performedByUserId,
                  notes,
                },
              });

            return {
              inventory: created,
              transaction,
              previousQuantity: 0,
            };
          }

          const locked =
            await tx.$queryRaw<
              Array<{
                id: bigint;
                quantityAvailable: number;
                quantityReserved: number;
              }>
            >`
              SELECT
                "id",
                "quantityAvailable",
                "quantityReserved"
              FROM "Inventory"
              WHERE "id" = ${inventory.id}
              FOR UPDATE
            `;

          if (locked.length === 0) {
            throw new NotFoundException(
              "Inventory record not found.",
            );
          }

          const current = locked[0];

          if (!current) {
            throw new NotFoundException(
              "Inventory record not found.",
            );
          }

          const newQuantity =
            current.quantityAvailable +
            input.quantityDelta;

          if (
            newQuantity < 0 ||
            newQuantity < current.quantityReserved
          ) {
            throw new ConflictException(
              `Inventory adjustment would leave ${Math.max(
                current.quantityReserved - newQuantity,
                0,
              )} reserved units unsupported.`,
            );
          }

          const updated =
            await tx.$queryRaw<
              Array<{
                id: bigint;
                quantityAvailable: number;
                quantityReserved: number;
              }>
            >`
              UPDATE "Inventory"
              SET
                "quantityAvailable" =
                  "quantityAvailable" + ${input.quantityDelta},
                "updatedAt" = NOW()
              WHERE "id" = ${inventory.id}
              RETURNING
                "id",
                "quantityAvailable",
                "quantityReserved"
            `;

          if (updated.length === 0) {
            throw new ConflictException(
              "Inventory could not be updated.",
            );
          }

          const updatedInventory =
            updated[0];

          if (!updatedInventory) {
            throw new ConflictException(
              "Inventory could not be updated.",
            );
          }

          const transaction =
            await tx.inventoryTransaction.create({
              data: {
                inventoryId: inventory.id,
                productVariantId,
                warehouseId: input.warehouseId,
                transactionType:
                  input.quantityDelta > 0
                    ? "MANUAL_IN"
                    : "MANUAL_OUT",
                quantity: Math.abs(
                  input.quantityDelta,
                ),
                referenceType:
                  "STAFF_ADJUSTMENT",
                previousQuantity:
                  current.quantityAvailable,
                newQuantity:
                  updatedInventory.quantityAvailable,
                performedByUserId,
                notes,
              },
            });

          return {
            inventory: updatedInventory,
            transaction,
            previousQuantity:
              current.quantityAvailable,
          };
        },
      );

    await this.auditService.log({
      userAccountId: performedByUserId,
      action: "ADJUST",
      module: "inventory",
      entityType: "Inventory",
      entityId: result.inventory.id.toString(),
      description:
        `Adjusted inventory for ${variant.product.name} / ${variant.sku} at ${warehouse.code}.`,
      oldData: {
        warehouseId:
          warehouse.id,
        warehouseCode:
          warehouse.code,
        productVariantId:
          productVariantId.toString(),
        previousQuantity:
          result.previousQuantity,
        quantityReserved:
          result.inventory.quantityReserved,
      },
      newData: {
        warehouseId:
          warehouse.id,
        warehouseCode:
          warehouse.code,
        productVariantId:
          productVariantId.toString(),
        quantityAvailable:
          result.inventory.quantityAvailable,
        quantityReserved:
          result.inventory.quantityReserved,
        quantityDelta:
          input.quantityDelta,
        transactionId:
          result.transaction.id.toString(),
        notes,
      },
    });

    return toJsonSafe({
      inventory: {
        id: result.inventory.id,
        warehouse,
        productVariant: variant,
        quantityAvailable:
          result.inventory.quantityAvailable,
        quantityReserved:
          result.inventory.quantityReserved,
      },
      transaction: result.transaction,
    });
  }

  async findInitializationCandidates(params: {
    warehouseId?: number;
    search?: string;
  }) {
    if (
      params.warehouseId !== undefined &&
      (!Number.isInteger(params.warehouseId) ||
        params.warehouseId <= 0)
    ) {
      throw new BadRequestException(
        "warehouseId must be a positive integer.",
      );
    }

    const search = params.search?.trim();

    const variants =
      await this.prisma.productVariant.findMany({
        where: {
          status: "ACTIVE",
          product: {
            status: "PUBLISHED",
          },
          ...(params.warehouseId
            ? {
              inventories: {
                none: {
                  warehouseId: params.warehouseId,
                },
              },
            }
            : {}),
          ...(search
            ? {
              OR: [
                {
                  sku: {
                    contains: search,
                    mode: "insensitive" as const,
                  },
                },
                {
                  variantName: {
                    contains: search,
                    mode: "insensitive" as const,
                  },
                },
                {
                  product: {
                    name: {
                      contains: search,
                      mode: "insensitive" as const,
                    },
                  },
                },
              ],
            }
            : {}),
        },
        orderBy: [
          {
            product: {
              name: "asc",
            },
          },
          {
            sku: "asc",
          },
        ],
        take: 200,
        select: {
          id: true,
          sku: true,
          variantName: true,
          ramGb: true,
          storageGb: true,
          sellingPrice: true,
          status: true,
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              status: true,
              brand: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                },
              },
            },
          },
        },
      });

    return toJsonSafe(variants);
  }
  async initializeInventory(
    input: InitializeInventoryInput,
    performedByUserId: bigint,
  ) {
    const productVariantId = this.parsePositiveBigInt(
      input.productVariantId,
      "productVariantId",
    );

    if (
      !Number.isInteger(input.warehouseId) ||
      input.warehouseId <= 0
    ) {
      throw new BadRequestException(
        "warehouseId must be a positive integer.",
      );
    }

    if (
      !Number.isInteger(input.initialQuantity) ||
      input.initialQuantity < 0
    ) {
      throw new BadRequestException(
        "initialQuantity must be a non-negative integer.",
      );
    }

    if (
      input.reorderLevel !== undefined &&
      input.reorderLevel !== null &&
      (!Number.isInteger(input.reorderLevel) ||
        input.reorderLevel < 0)
    ) {
      throw new BadRequestException(
        "reorderLevel must be a non-negative integer.",
      );
    }

    const [warehouse, variant] = await Promise.all([
      this.prisma.warehouse.findUnique({
        where: {
          id: input.warehouseId,
        },
        select: {
          id: true,
          name: true,
          code: true,
          city: true,
          state: true,
          status: true,
        },
      }),

      this.prisma.productVariant.findUnique({
        where: {
          id: productVariantId,
        },
        select: {
          id: true,
          sku: true,
          variantName: true,
          status: true,
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              status: true,
            },
          },
        },
      }),
    ]);

    if (!warehouse) {
      throw new NotFoundException("Warehouse not found.");
    }

    if (warehouse.status !== "ACTIVE") {
      throw new BadRequestException(
        "Warehouse is not active.",
      );
    }

    if (!variant) {
      throw new NotFoundException(
        "Product variant not found.",
      );
    }

    if (variant.status !== "ACTIVE") {
      throw new BadRequestException(
        "Product variant is not active.",
      );
    }

    // Initial inventory is allowed on DRAFT products so that new products can
    // be set up (stock, price, images) before publishing. Ongoing stock
    // adjustments (adjustInventory) still require PUBLISHED.
    if (
      variant.product.status !== "PUBLISHED" &&
      variant.product.status !== "DRAFT"
    ) {
      throw new BadRequestException(
        "Inventory can only be initialized for a draft or published product.",
      );
    }

    const existingInventory =
      await this.prisma.inventory.findUnique({
        where: {
          warehouseId_productVariantId: {
            warehouseId: input.warehouseId,
            productVariantId,
          },
        },
        select: {
          id: true,
        },
      });

    if (existingInventory) {
      throw new ConflictException(
        "Inventory is already initialized for this warehouse and product variant.",
      );
    }

    const notes = input.notes?.trim() || null;

    let result: {
      inventory: {
        id: bigint;
        warehouseId: number;
        productVariantId: bigint;
        quantityAvailable: number;
        quantityReserved: number;
        reorderLevel: number | null;
      };
      transaction: {
        id: bigint;
      };
    };

    try {
      result = await this.prisma.$transaction(
        async (tx) => {
          const inventory =
            await tx.inventory.create({
              data: {
                warehouseId: input.warehouseId,
                productVariantId,
                quantityAvailable:
                  input.initialQuantity,
                quantityReserved: 0,
                reorderLevel:
                  input.reorderLevel ?? null,
              },
              select: {
                id: true,
                warehouseId: true,
                productVariantId: true,
                quantityAvailable: true,
                quantityReserved: true,
                reorderLevel: true,
              },
            });

          const transaction =
            await tx.inventoryTransaction.create({
              data: {
                inventoryId: inventory.id,
                productVariantId,
                warehouseId: input.warehouseId,
                transactionType: "INITIAL_STOCK",
                quantity: input.initialQuantity,
                referenceType:
                  "STAFF_INITIALIZATION",
                previousQuantity: 0,
                newQuantity:
                  inventory.quantityAvailable,
                performedByUserId,
                notes,
              },
              select: {
                id: true,
              },
            });

          return {
            inventory,
            transaction,
          };
        },
      );
    } catch (error) {
      const errorWithCode = error as {
        code?: string;
      };

      if (errorWithCode.code === "P2002") {
        throw new ConflictException(
          "Inventory is already initialized for this warehouse and product variant.",
        );
      }

      throw error;
    }

    await this.auditService.log({
      userAccountId: performedByUserId,
      action: "INITIALIZE",
      module: "inventory",
      entityType: "Inventory",
      entityId: result.inventory.id.toString(),
      description:
        `Initialized inventory for ${variant.product.name} / ${variant.sku} at ${warehouse.code}.`,
      oldData: {
        warehouseId: warehouse.id,
        warehouseCode: warehouse.code,
        productVariantId:
          productVariantId.toString(),
        previousQuantity: 0,
      },
      newData: {
        warehouseId: warehouse.id,
        warehouseCode: warehouse.code,
        productVariantId:
          productVariantId.toString(),
        quantityAvailable:
          result.inventory.quantityAvailable,
        quantityReserved:
          result.inventory.quantityReserved,
        reorderLevel:
          result.inventory.reorderLevel,
        transactionId:
          result.transaction.id.toString(),
        notes,
      },
    });

    return toJsonSafe({
      inventory: {
        id: result.inventory.id,
        warehouse,
        productVariant: variant,
        quantityAvailable:
          result.inventory.quantityAvailable,
        quantityReserved:
          result.inventory.quantityReserved,
        reorderLevel:
          result.inventory.reorderLevel,
      },
      transaction: result.transaction,
    });
  }
  async findWarehouses() {
    const warehouses =
      await this.prisma.warehouse.findMany({
        where: {
          status: "ACTIVE",
        },
        orderBy: {
          name: "asc",
        },
        select: {
          id: true,
          name: true,
          code: true,
          city: true,
          state: true,
          status: true,
        },
      });

    return toJsonSafe(warehouses);
  }

  private parsePositiveBigInt(
    value: string,
    fieldName: string,
  ): bigint {
    if (!/^\d+$/.test(value)) {
      throw new BadRequestException(
        `${fieldName} must be a positive integer.`,
      );
    }

    const parsed = BigInt(value);

    if (parsed <= 0n) {
      throw new BadRequestException(
        `${fieldName} must be a positive integer.`,
      );
    }

    return parsed;
  }
}



