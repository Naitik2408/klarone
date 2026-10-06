import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { PrismaService } from "../../database/prisma.service";

import type {
  AddDraftOrderItemInput,
  CompleteDraftOrderInput,
  CreateDraftOrderInput,
  ListDraftOrdersParams,
  UpdateDraftOrderInput,
  UpdateDraftOrderItemInput,
} from "./dto-draft-orders";

const DECIMAL_PLACES = 2;

@Injectable()
export class DraftOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  /* ---------------------------------------------------------------- */
  /* List                                                              */
  /* ---------------------------------------------------------------- */

  async listDrafts(params: ListDraftOrdersParams) {
    const page = Math.max(params.page ?? 1, 1);
    const pageSize = Math.min(Math.max(params.pageSize ?? 20, 1), 100);

    const search = params.search?.trim();
    const status = params.status?.trim().toUpperCase();

    const where: any = {
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              {
                draftNumber: {
                  contains: search,
                  mode: "insensitive",
                },
              },
              {
                poNumber: {
                  contains: search,
                  mode: "insensitive",
                },
              },
              {
                customer: {
                  person: {
                    firstName: {
                      contains: search,
                      mode: "insensitive",
                    },
                  },
                },
              },
              {
                customer: {
                  person: {
                    lastName: {
                      contains: search,
                      mode: "insensitive",
                    },
                  },
                },
              },
              {
                customer: {
                  person: {
                    email: {
                      contains: search,
                      mode: "insensitive",
                    },
                  },
                },
              },
              {
                customer: {
                  person: {
                    phone: {
                      contains: search,
                      mode: "insensitive",
                    },
                  },
                },
              },
            ],
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.draftOrder.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          draftNumber: true,
          sequenceNumber: true,
          poNumber: true,
          status: true,
          currency: true,
          subtotal: true,
          discountAmount: true,
          shippingAmount: true,
          taxAmount: true,
          totalAmount: true,
          createdAt: true,
          updatedAt: true,
          completedAt: true,
          cancelledAt: true,
          customer: {
            select: {
              id: true,
              customerCode: true,
              person: {
                select: {
                  firstName: true,
                  middleName: true,
                  lastName: true,
                  email: true,
                  phone: true,
                },
              },
            },
          },
          _count: { select: { items: true } },
        },
      }),
      this.prisma.draftOrder.count({ where }),
    ]);

    return {
      drafts: rows.map((row) => this.serializeDraftSummary(row)),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /* ---------------------------------------------------------------- */
  /* Get                                                               */
  /* ---------------------------------------------------------------- */

  async getDraft(draftNumber: string) {
    const normalized = this.normalizeDraftNumber(draftNumber);

    const draft = await this.prisma.draftOrder.findUnique({
      where: { draftNumber: normalized },
      select: {
        id: true,
        draftNumber: true,
        sequenceNumber: true,
        poNumber: true,
        status: true,
        currency: true,
        subtotal: true,
        discountAmount: true,
        shippingAmount: true,
        taxAmount: true,
        totalAmount: true,
        notes: true,
        tags: true,
        email: true,
        phone: true,
        createdAt: true,
        updatedAt: true,
        completedAt: true,
        cancelledAt: true,
        completedOrderId: true,
        createdByUserId: true,
        updatedByUserId: true,
        customer: {
          select: {
            id: true,
            customerCode: true,
            person: {
              select: {
                firstName: true,
                middleName: true,
                lastName: true,
                email: true,
                phone: true,
              },
            },
          },
        },
        shippingAddress: true,
        billingAddress: true,
        completedOrder: {
          select: { id: true, orderNumber: true, status: true },
        },
        items: {
          orderBy: { id: "asc" },
          select: {
            id: true,
            productVariantId: true,
            productName: true,
            sku: true,
            quantity: true,
            unitPrice: true,
            discountAmount: true,
            taxAmount: true,
            totalAmount: true,
            createdAt: true,
            updatedAt: true,
            productVariant: {
              select: {
                id: true,
                variantName: true,
                ramGb: true,
                storageGb: true,
                operatingSystem: true,
                currency: true,
                media: {
                  where: { isPrimary: true },
                  take: 1,
                  select: {
                    url: true,
                    storageKey: true,
                    altText: true,
                  },
                },
                product: {
                  select: {
                    id: true,
                    name: true,
                    slug: true,
                    brand: { select: { id: true, name: true, slug: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!draft) {
      throw new NotFoundException("Draft order not found");
    }

    return { draft: this.serializeDraftDetail(draft) };
  }

  /* ---------------------------------------------------------------- */
  /* Create                                                            */
  /* ---------------------------------------------------------------- */

  async createDraft(
    input: CreateDraftOrderInput,
    createdByUserId: bigint | null,
  ) {
    const currency = input.currency?.trim() || "INR";

    const customerId = this.parseOptionalId(input.customerId, "customerId");
    const shippingAddressId = this.parseOptionalId(
      input.shippingAddressId,
      "shippingAddressId",
    );
    const billingAddressId = this.parseOptionalId(
      input.billingAddressId,
      "billingAddressId",
    );

    const draft = await this.prisma.$transaction(async (tx) => {
      const next = await this.nextDraftSequence(tx);

      const created = await tx.draftOrder.create({
        data: {
          draftNumber: `#D${next}`,
          sequenceNumber: next,
          currency,
          customerId,
          shippingAddressId,
          billingAddressId,
          email: input.email?.trim() || null,
          phone: input.phone?.trim() || null,
          poNumber: input.poNumber?.trim() || null,
          notes: input.notes?.trim() || null,
          tags: input.tags ?? [],
          createdByUserId,
          status: "OPEN",
        },
        select: { id: true, draftNumber: true },
      });

      if (Array.isArray(input.items) && input.items.length > 0) {
        for (const it of input.items) {
          const qty = Math.max(1, Math.trunc(it.quantity || 1));
          let productVariantId: bigint | null = null;
          let displayName = it.productName?.trim() || "Item";
          let sku = it.sku?.trim() || "ITEM";
          let unitPrice = Math.max(0, Number(it.unitPrice || 0));

          if (it.productVariantId && it.productVariantId !== "0") {
            const rawId = this.parseOptionalId(it.productVariantId, "productVariantId");
            if (rawId !== null) {
              // Try finding variant directly
              let v = await tx.productVariant.findUnique({
                where: { id: rawId },
                select: {
                  id: true,
                  sku: true,
                  sellingPrice: true,
                  variantName: true,
                  product: { select: { name: true } },
                },
              });

              // If not found by variant id, check if it's a product id with an active variant
              if (!v) {
                v = await tx.productVariant.findFirst({
                  where: { productId: rawId, status: "ACTIVE" },
                  select: {
                    id: true,
                    sku: true,
                    sellingPrice: true,
                    variantName: true,
                    product: { select: { name: true } },
                  },
                });
              }

              if (v) {
                productVariantId = v.id;
                displayName = v.variantName
                  ? `${v.product.name} — ${v.variantName}`
                  : v.product.name;
                sku = v.sku;
                if (it.unitPrice === undefined || it.unitPrice === null) {
                  unitPrice = Number(v.sellingPrice);
                }
              }
            }
          }

          const discountAmount = Math.max(0, Number(it.discountAmount || 0));
          const taxAmount = Math.max(0, Number(it.taxAmount || 0));
          const totalAmount = this.round2(unitPrice * qty - discountAmount + taxAmount);

          await tx.draftOrderItem.create({
            data: {
              draftOrderId: created.id,
              productVariantId,
              productName: displayName,
              sku,
              quantity: qty,
              unitPrice: this.round2(unitPrice),
              discountAmount: this.round2(discountAmount),
              taxAmount: this.round2(taxAmount),
              totalAmount,
            },
          });
        }

        await this.recomputeTotals(tx, created.id);
      }

      return created;
    });

    return { id: draft.id.toString(), draftNumber: draft.draftNumber };
  }

  /* ---------------------------------------------------------------- */
  /* Update (metadata only, not items)                                 */
  /* ---------------------------------------------------------------- */

  async updateDraft(
    draftNumber: string,
    input: UpdateDraftOrderInput,
    updatedByUserId: bigint | null,
  ) {
    const normalized = this.normalizeDraftNumber(draftNumber);

    const existing = await this.prisma.draftOrder.findUnique({
      where: { draftNumber: normalized },
      select: { id: true, status: true },
    });

    if (!existing) {
      throw new NotFoundException("Draft order not found");
    }

    if (existing.status === "COMPLETED" || existing.status === "CANCELLED") {
      throw new BadRequestException(
        `Cannot edit a ${existing.status.toLowerCase()} draft.`,
      );
    }

    const data: Record<string, unknown> = {};

    if (input.customerId !== undefined) {
      data.customerId = this.parseOptionalId(input.customerId, "customerId");
    }
    if (input.shippingAddressId !== undefined) {
      data.shippingAddressId = this.parseOptionalId(
        input.shippingAddressId,
        "shippingAddressId",
      );
    }
    if (input.billingAddressId !== undefined) {
      data.billingAddressId = this.parseOptionalId(
        input.billingAddressId,
        "billingAddressId",
      );
    }
    if (input.email !== undefined) {
      data.email = input.email?.trim() || null;
    }
    if (input.phone !== undefined) {
      data.phone = input.phone?.trim() || null;
    }
    if (input.poNumber !== undefined) {
      data.poNumber = input.poNumber?.trim() || null;
    }
    if (input.notes !== undefined) {
      data.notes = input.notes?.trim() || null;
    }
    if (input.tags !== undefined) {
      data.tags = input.tags ?? [];
    }

    if (updatedByUserId !== null) {
      data.updatedByUserId = updatedByUserId;
    }

    await this.prisma.draftOrder.update({
      where: { id: existing.id },
      data,
    });

    return this.getDraft(normalized);
  }

  /* ---------------------------------------------------------------- */
  /* Items                                                             */
  /* ---------------------------------------------------------------- */

  async addItem(
    draftNumber: string,
    input: AddDraftOrderItemInput,
    updatedByUserId: bigint | null,
  ) {
    const normalized = this.normalizeDraftNumber(draftNumber);
    const productVariantId = this.parseRequiredId(
      input.productVariantId,
      "productVariantId",
    );

    const quantity = this.parsePositiveInt(input.quantity ?? 1, "quantity");

    const draft = await this.prisma.draftOrder.findUnique({
      where: { draftNumber: normalized },
      select: { id: true, status: true },
    });

    if (!draft) throw new NotFoundException("Draft order not found");
    if (draft.status !== "OPEN") {
      throw new BadRequestException(
        `Cannot add items to a ${draft.status.toLowerCase()} draft.`,
      );
    }

    let variant = await this.prisma.productVariant.findUnique({
      where: { id: productVariantId },
      select: {
        id: true,
        sku: true,
        sellingPrice: true,
        variantName: true,
        product: { select: { name: true } },
      },
    });

    if (!variant) {
      variant = await this.prisma.productVariant.findFirst({
        where: { productId: productVariantId, status: "ACTIVE" },
        select: {
          id: true,
          sku: true,
          sellingPrice: true,
          variantName: true,
          product: { select: { name: true } },
        },
      });
    }

    if (!variant) {
      throw new NotFoundException("Product variant not found");
    }

    const resolvedVariantId = variant.id;

    const unitPrice = this.decimalToNumber(
      input.unitPrice !== undefined
        ? input.unitPrice
        : Number(variant.sellingPrice),
    );
    const discountAmount = this.decimalToNumber(input.discountAmount ?? 0);
    const taxAmount = this.decimalToNumber(input.taxAmount ?? 0);
    const totalAmount = this.round2(
      unitPrice * quantity - discountAmount + taxAmount,
    );

    const displayName = variant.variantName
      ? `${variant.product.name} — ${variant.variantName}`
      : variant.product.name;

    await this.prisma.$transaction(async (tx) => {
      await tx.draftOrderItem.create({
        data: {
          draftOrderId: draft.id,
          productVariantId: resolvedVariantId,
          productName: displayName,
          sku: variant.sku,
          quantity,
          unitPrice,
          discountAmount,
          taxAmount,
          totalAmount,
        },
      });

      await this.recomputeTotals(tx, draft.id);

      if (updatedByUserId !== null) {
        await tx.draftOrder.update({
          where: { id: draft.id },
          data: { updatedByUserId },
        });
      }
    });

    return this.getDraft(normalized);
  }

  async updateItem(
    draftNumber: string,
    itemId: string,
    input: UpdateDraftOrderItemInput,
    updatedByUserId: bigint | null,
  ) {
    const normalized = this.normalizeDraftNumber(draftNumber);
    const itemIdBig = this.parseRequiredId(itemId, "itemId");

    const draft = await this.prisma.draftOrder.findUnique({
      where: { draftNumber: normalized },
      select: { id: true, status: true },
    });
    if (!draft) throw new NotFoundException("Draft order not found");
    if (draft.status !== "OPEN") {
      throw new BadRequestException(
        `Cannot edit items on a ${draft.status.toLowerCase()} draft.`,
      );
    }

    const item = await this.prisma.draftOrderItem.findFirst({
      where: { id: itemIdBig, draftOrderId: draft.id },
      select: {
        id: true,
        quantity: true,
        unitPrice: true,
        discountAmount: true,
        taxAmount: true,
      },
    });
    if (!item) throw new NotFoundException("Draft item not found");

    const quantity =
      input.quantity !== undefined
        ? this.parsePositiveInt(input.quantity, "quantity")
        : item.quantity;
    const unitPrice =
      input.unitPrice !== undefined
        ? this.decimalToNumber(input.unitPrice)
        : Number(item.unitPrice);
    const discountAmount =
      input.discountAmount !== undefined
        ? this.decimalToNumber(input.discountAmount)
        : Number(item.discountAmount);
    const taxAmount =
      input.taxAmount !== undefined
        ? this.decimalToNumber(input.taxAmount)
        : Number(item.taxAmount);
    const totalAmount = this.round2(
      unitPrice * quantity - discountAmount + taxAmount,
    );

    await this.prisma.$transaction(async (tx) => {
      await tx.draftOrderItem.update({
        where: { id: item.id },
        data: {
          quantity,
          unitPrice,
          discountAmount,
          taxAmount,
          totalAmount,
        },
      });

      await this.recomputeTotals(tx, draft.id);

      if (updatedByUserId !== null) {
        await tx.draftOrder.update({
          where: { id: draft.id },
          data: { updatedByUserId },
        });
      }
    });

    return this.getDraft(normalized);
  }

  async removeItem(
    draftNumber: string,
    itemId: string,
    updatedByUserId: bigint | null,
  ) {
    const normalized = this.normalizeDraftNumber(draftNumber);
    const itemIdBig = this.parseRequiredId(itemId, "itemId");

    const draft = await this.prisma.draftOrder.findUnique({
      where: { draftNumber: normalized },
      select: { id: true, status: true },
    });
    if (!draft) throw new NotFoundException("Draft order not found");
    if (draft.status !== "OPEN") {
      throw new BadRequestException(
        `Cannot edit items on a ${draft.status.toLowerCase()} draft.`,
      );
    }

    const item = await this.prisma.draftOrderItem.findFirst({
      where: { id: itemIdBig, draftOrderId: draft.id },
      select: { id: true },
    });
    if (!item) throw new NotFoundException("Draft item not found");

    await this.prisma.$transaction(async (tx) => {
      await tx.draftOrderItem.delete({ where: { id: item.id } });
      await this.recomputeTotals(tx, draft.id);

      if (updatedByUserId !== null) {
        await tx.draftOrder.update({
          where: { id: draft.id },
          data: { updatedByUserId },
        });
      }
    });

    return this.getDraft(normalized);
  }

  /* ---------------------------------------------------------------- */
  /* Complete (draft → real order)                                     */
  /* ---------------------------------------------------------------- */

  async completeDraft(
    draftNumber: string,
    input: CompleteDraftOrderInput,
    changedByUserId: bigint | null,
  ) {
    const normalized = this.normalizeDraftNumber(draftNumber);

    const draft = await this.prisma.draftOrder.findUnique({
      where: { draftNumber: normalized },
      include: {
        items: true,
      },
    });

    if (!draft) throw new NotFoundException("Draft order not found");
    if (draft.status === "COMPLETED") {
      throw new BadRequestException("Draft order is already completed.");
    }
    if (draft.status === "CANCELLED") {
      throw new BadRequestException("Cannot complete a cancelled draft.");
    }
    if (draft.items.length === 0) {
      throw new BadRequestException(
        "Add at least one item before completing the draft.",
      );
    }
    if (!draft.customerId) {
      throw new BadRequestException(
        "Attach a customer before completing the draft.",
      );
    }

    const markAsPaid = input.markAsPaid === true;

    const result = await this.prisma.$transaction(async (tx) => {
      const orderNumber = await this.nextOrderNumber(tx);

      const order = await tx.order.create({
        data: {
          customerId: draft.customerId!,
          orderNumber,
          status: markAsPaid ? "CONFIRMED" : "PENDING",
          paymentStatus: markAsPaid ? "PAID" : "PENDING",
          fulfillmentStatus: "UNFULFILLED",
          subtotal: draft.subtotal,
          discountAmount: draft.discountAmount,
          shippingAmount: draft.shippingAmount,
          taxAmount: draft.taxAmount,
          totalAmount: draft.totalAmount,
          currency: draft.currency,
          billingAddressId: draft.billingAddressId,
          shippingAddressId: draft.shippingAddressId,
          placedAt: new Date(),
        },
        select: { id: true, orderNumber: true },
      });

      for (const item of draft.items) {
        await tx.orderItem.create({
          data: {
            orderId: order.id,
            productVariantId: item.productVariantId,
            productName: item.productName,
            sku: item.sku,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discountAmount: item.discountAmount,
            taxAmount: item.taxAmount,
            totalAmount: item.totalAmount,
          },
        });
      }

      if (markAsPaid) {
        await tx.payment.create({
          data: {
            orderId: order.id,
            provider: "manual",
            amount: draft.totalAmount,
            currency: draft.currency,
            paymentMethod: input.paymentMethod?.trim() || "manual",
            status: "PAID",
            paidAt: new Date(),
          },
        });
      }

      if (changedByUserId !== null) {
        await tx.orderStatusHistory.create({
          data: {
            orderId: order.id,
            oldStatus: null,
            newStatus: markAsPaid ? "CONFIRMED" : "PENDING",
            changedByUserId,
            notes: `Created from draft ${draft.draftNumber}`,
          },
        });
      }

      await tx.draftOrder.update({
        where: { id: draft.id },
        data: {
          status: "COMPLETED",
          completedOrderId: order.id,
          completedAt: new Date(),
          updatedByUserId: changedByUserId,
        },
      });

      return order;
    });

    return {
      orderId: result.id.toString(),
      orderNumber: result.orderNumber,
      draftNumber: normalized,
    };
  }

  /* ---------------------------------------------------------------- */
  /* Cancel                                                            */
  /* ---------------------------------------------------------------- */

  async cancelDraft(
    draftNumber: string,
    updatedByUserId: bigint | null,
  ) {
    const normalized = this.normalizeDraftNumber(draftNumber);

    const draft = await this.prisma.draftOrder.findUnique({
      where: { draftNumber: normalized },
      select: { id: true, status: true },
    });
    if (!draft) throw new NotFoundException("Draft order not found");
    if (draft.status === "COMPLETED") {
      throw new BadRequestException("Cannot cancel a completed draft.");
    }
    if (draft.status === "CANCELLED") {
      throw new BadRequestException("Draft order is already cancelled.");
    }

    await this.prisma.draftOrder.update({
      where: { id: draft.id },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        updatedByUserId,
      },
    });

    return this.getDraft(normalized);
  }

  /* ---------------------------------------------------------------- */
  /* Internal helpers                                                  */
  /* ---------------------------------------------------------------- */

  private normalizeDraftNumber(value: string): string {
    const trimmed = value.trim();
    if (!trimmed) throw new BadRequestException("Draft number is required.");

    // Accept "1", "D1", "#D1" → normalize to "#D1"
    const digitsOnly = trimmed.replace(/^#?D?/i, "").trim();
    if (!/^\d+$/.test(digitsOnly)) {
      throw new BadRequestException("Invalid draft number.");
    }
    return `#D${Number(digitsOnly)}`;
  }

  private parseOptionalId(
    value: string | null | undefined,
    field: string,
  ): bigint | null {
    if (value === null || value === undefined) return null;
    const trimmed = String(value).trim();
    if (!trimmed) return null;
    try {
      const n = BigInt(trimmed);
      if (n <= 0n) throw new Error("non-positive");
      return n;
    } catch {
      throw new BadRequestException(`Invalid ${field}.`);
    }
  }

  private parseRequiredId(value: string, field: string): bigint {
    const parsed = this.parseOptionalId(value, field);
    if (parsed === null) {
      throw new BadRequestException(`${field} is required.`);
    }
    return parsed;
  }

  private parsePositiveInt(value: number, field: string): number {
    if (!Number.isFinite(value) || value <= 0) {
      throw new BadRequestException(`${field} must be a positive integer.`);
    }
    return Math.trunc(value);
  }

  private decimalToNumber(value: number): number {
    if (!Number.isFinite(value) || value < 0) {
      throw new BadRequestException("Invalid amount.");
    }
    return this.round2(value);
  }

  private round2(value: number): number {
    const factor = 10 ** DECIMAL_PLACES;
    return Math.round(value * factor) / factor;
  }

  private async nextDraftSequence(
    tx: Parameters<Parameters<PrismaService["$transaction"]>[0]>[0],
  ): Promise<number> {
    try {
      // Auto-create sequence if it does not exist in postgres
      await tx.$executeRawUnsafe(
        'CREATE SEQUENCE IF NOT EXISTS "DraftOrder_sequenceNumber_seq" START WITH 1;',
      ).catch(() => {});
      const rows = await tx.$queryRaw<{ nextval: bigint }[]>`
        SELECT nextval('"DraftOrder_sequenceNumber_seq"') AS nextval
      `;
      return Number(rows[0].nextval);
    } catch {
      // Fallback: find highest sequence number currently in DraftOrder table
      const last = await tx.draftOrder.findFirst({
        orderBy: { sequenceNumber: "desc" },
        select: { sequenceNumber: true },
      });
      return (last?.sequenceNumber ?? 0) + 1;
    }
  }

  private async nextOrderNumber(
    tx: Parameters<Parameters<PrismaService["$transaction"]>[0]>[0],
  ): Promise<string> {
    try {
      await tx.$executeRawUnsafe(
        'CREATE SEQUENCE IF NOT EXISTS "Order_sequenceNumber_seq" START WITH 1;',
      ).catch(() => {});
      const rows = await tx.$queryRaw<{ nextval: bigint }[]>`
        SELECT nextval('"Order_sequenceNumber_seq"') AS nextval
      `;
      const n = Number(rows[0].nextval);
      return `ORD-${String(n).padStart(6, "0")}`;
    } catch {
      const count = await tx.order.count();
      const num = count + 1;
      return `ORD-${String(num).padStart(6, "0")}`;
    }
  }

  private async recomputeTotals(
    tx: Parameters<Parameters<PrismaService["$transaction"]>[0]>[0],
    draftOrderId: bigint,
  ): Promise<void> {
    const agg = await tx.draftOrderItem.aggregate({
      where: { draftOrderId },
      _sum: {
        totalAmount: true,
        discountAmount: true,
        taxAmount: true,
      },
    });

    const subtotal = Number(agg._sum.totalAmount ?? 0);
    const discountAmount = Number(agg._sum.discountAmount ?? 0);
    const taxAmount = Number(agg._sum.taxAmount ?? 0);

    await tx.draftOrder.update({
      where: { id: draftOrderId },
      data: {
        subtotal: this.round2(subtotal),
        discountAmount: this.round2(discountAmount),
        taxAmount: this.round2(taxAmount),
        totalAmount: this.round2(subtotal),
      },
    });
  }

  /* ---------------------------------------------------------------- */
  /* Serializers                                                       */
  /* ---------------------------------------------------------------- */

  private serializeDraftSummary(row: any) {
    return {
      id: row.id.toString(),
      draftNumber: row.draftNumber,
      sequenceNumber: row.sequenceNumber,
      poNumber: row.poNumber,
      status: row.status,
      currency: row.currency,
      subtotal: String(row.subtotal),
      discountAmount: String(row.discountAmount),
      shippingAmount: String(row.shippingAmount),
      taxAmount: String(row.taxAmount),
      totalAmount: String(row.totalAmount),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      completedAt: row.completedAt?.toISOString() ?? null,
      cancelledAt: row.cancelledAt?.toISOString() ?? null,
      itemCount: row._count?.items ?? 0,
      customer: row.customer
        ? {
            id: row.customer.id.toString(),
            customerCode: row.customer.customerCode,
            person: {
              firstName: row.customer.person.firstName,
              middleName: row.customer.person.middleName,
              lastName: row.customer.person.lastName,
              email: row.customer.person.email,
              phone: row.customer.person.phone,
            },
          }
        : null,
    };
  }

  private serializeDraftDetail(draft: any) {
    return {
      id: draft.id.toString(),
      draftNumber: draft.draftNumber,
      sequenceNumber: draft.sequenceNumber,
      poNumber: draft.poNumber,
      status: draft.status,
      currency: draft.currency,
      subtotal: String(draft.subtotal),
      discountAmount: String(draft.discountAmount),
      shippingAmount: String(draft.shippingAmount),
      taxAmount: String(draft.taxAmount),
      totalAmount: String(draft.totalAmount),
      notes: draft.notes,
      tags: draft.tags,
      email: draft.email,
      phone: draft.phone,
      createdAt: draft.createdAt.toISOString(),
      updatedAt: draft.updatedAt.toISOString(),
      completedAt: draft.completedAt?.toISOString() ?? null,
      cancelledAt: draft.cancelledAt?.toISOString() ?? null,
      completedOrderId: draft.completedOrderId?.toString() ?? null,
      completedOrder: draft.completedOrder
        ? {
            id: draft.completedOrder.id.toString(),
            orderNumber: draft.completedOrder.orderNumber,
            status: draft.completedOrder.status,
          }
        : null,
      customer: draft.customer
        ? {
            id: draft.customer.id.toString(),
            customerCode: draft.customer.customerCode,
            person: {
              firstName: draft.customer.person.firstName,
              middleName: draft.customer.person.middleName,
              lastName: draft.customer.person.lastName,
              email: draft.customer.person.email,
              phone: draft.customer.person.phone,
            },
          }
        : null,
      shippingAddress: draft.shippingAddress
        ? {
            id: draft.shippingAddress.id.toString(),
            addressType: draft.shippingAddress.addressType,
            recipientName: draft.shippingAddress.recipientName,
            phone: draft.shippingAddress.phone,
            addressLine1: draft.shippingAddress.addressLine1,
            addressLine2: draft.shippingAddress.addressLine2,
            landmark: draft.shippingAddress.landmark,
            city: draft.shippingAddress.city,
            state: draft.shippingAddress.state,
            postalCode: draft.shippingAddress.postalCode,
            country: draft.shippingAddress.country,
          }
        : null,
      billingAddress: draft.billingAddress
        ? {
            id: draft.billingAddress.id.toString(),
            addressType: draft.billingAddress.addressType,
            recipientName: draft.billingAddress.recipientName,
            phone: draft.billingAddress.phone,
            addressLine1: draft.billingAddress.addressLine1,
            addressLine2: draft.billingAddress.addressLine2,
            landmark: draft.billingAddress.landmark,
            city: draft.billingAddress.city,
            state: draft.billingAddress.state,
            postalCode: draft.billingAddress.postalCode,
            country: draft.billingAddress.country,
          }
        : null,
      items: draft.items.map((item: any) => ({
        id: item.id.toString(),
        productVariantId: item.productVariantId?.toString() ?? null,
        productName: item.productName,
        sku: item.sku,
        quantity: item.quantity,
        unitPrice: String(item.unitPrice),
        discountAmount: String(item.discountAmount),
        taxAmount: String(item.taxAmount),
        totalAmount: String(item.totalAmount),
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
        productVariant: item.productVariant
          ? {
              id: item.productVariant.id.toString(),
              variantName: item.productVariant.variantName,
              ramGb: item.productVariant.ramGb,
              storageGb: item.productVariant.storageGb,
              operatingSystem: item.productVariant.operatingSystem,
              currency: item.productVariant.currency,
              media: (item.productVariant.media ?? []).map((m: any) => ({
                url: m.url,
                storageKey: m.storageKey,
                altText: m.altText,
              })),
              product: {
                id: item.productVariant.product.id.toString(),
                name: item.productVariant.product.name,
                slug: item.productVariant.product.slug,
                brand: item.productVariant.product.brand,
              },
            }
          : null,
      })),
    };
  }
}