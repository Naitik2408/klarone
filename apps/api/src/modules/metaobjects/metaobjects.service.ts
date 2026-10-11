import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import type {
  CreateMetafieldDefinitionInput,
  CreateMetaobjectEntryInput,
  ListMetaobjectEntriesQuery,
  ListMetafieldDefinitionsQuery,
  SetProductMetafieldsInput,
  UpdateMetaobjectEntryInput,
} from "./dto/metaobjects.dto";

@Injectable()
export class MetaobjectsService {
  constructor(private readonly prisma: PrismaService) {}

  /* -------------------------------------------------------------- */
  /* Helpers                                                         */
  /* -------------------------------------------------------------- */

  private slugify(value: string): string {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  /**
   * Prisma returns BigInt for id columns; Express cannot serialize BigInt.
   * Convert to string on the way out.
   */
  private serializeEntry(entry: {
    id: bigint;
    definitionId: number;
    handle: string;
    displayName: string;
    fields: unknown;
    status: string;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: String(entry.id),
      definitionId: entry.definitionId,
      handle: entry.handle,
      displayName: entry.displayName,
      fields: entry.fields,
      status: entry.status,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    };
  }

  private async findDefinitionByTypeOrThrow(type: string) {
    const definition = await this.prisma.metaobjectDefinition.findUnique({
      where: { type },
    });
    if (!definition || definition.status !== "ACTIVE") {
      throw new NotFoundException(
        `Metaobject definition "${type}" not found.`,
      );
    }
    return definition;
  }

  private async findDefinitionByIdOrThrow(id: number) {
    const definition = await this.prisma.metaobjectDefinition.findUnique({
      where: { id },
    });
    if (!definition || definition.status !== "ACTIVE") {
      throw new NotFoundException(
        `Metaobject definition ${id} not found.`,
      );
    }
    return definition;
  }

  /* -------------------------------------------------------------- */
  /* Definitions                                                     */
  /* -------------------------------------------------------------- */

  /**
   * Metafield definitions pinned to a category. If categoryId is omitted,
   * returns only global definitions (categoryId = null).
   */
  async listMetafieldDefinitions(query: ListMetafieldDefinitionsQuery) {
    let categoryId: number | null = null;
    if (query.categoryId !== undefined && query.categoryId !== "") {
      if (!/^\d+$/.test(query.categoryId)) {
        throw new BadRequestException("categoryId must be an integer.");
      }
      categoryId = Number(query.categoryId);
    }

    const definitions = await this.prisma.metafieldDefinition.findMany({
      where: {
        status: "ACTIVE",
        categoryId,
      },
      orderBy: { displayOrder: "asc" },
    });

    return { items: definitions };
  }

  async createMetafieldDefinition(input: CreateMetafieldDefinitionInput) {
    const name = input.name?.trim();
    if (!name) {
      throw new BadRequestException("Metafield definition name is required.");
    }

    const key =
      input.key?.trim() ||
      name
        .toLowerCase()
        .replace(/[^a-z0-9_]+/g, "_")
        .replace(/^_+|_+$/g, "");

    const namespace = input.namespace?.trim() || "kis";
    const ownerType = input.ownerType || "PRODUCT";
    const categoryId = input.categoryId ? Number(input.categoryId) : null;

    if (categoryId) {
      const cat = await this.prisma.category.findUnique({
        where: { id: categoryId },
        select: { id: true },
      });
      if (!cat) throw new NotFoundException(`Category ${categoryId} not found.`);
    }

    const existing = await this.prisma.metafieldDefinition.findFirst({
      where: {
        namespace,
        key,
        categoryId: categoryId ?? null,
        ownerType,
      },
      select: { id: true },
    });

    if (existing) {
      throw new BadRequestException(
        `Metafield with key '${key}' already exists in namespace '${namespace}' for this category.`,
      );
    }

    const created = await this.prisma.metafieldDefinition.create({
      data: {
        namespace,
        key,
        name,
        ownerType,
        type: input.type,
        metaobjectType: input.metaobjectType ?? null,
        multiple: Boolean(input.multiple),
        options: input.options ? input.options : undefined,
        displayOrder: input.displayOrder ?? 0,
        categoryId,
        status: "ACTIVE",
      },
    });

    return created;
  }

  async deleteMetafieldDefinition(id: number) {
    const existing = await this.prisma.metafieldDefinition.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`Metafield definition ${id} not found.`);
    }

    await this.prisma.metafieldDefinition.delete({
      where: { id },
    });

    return { success: true, id };
  }

  /* -------------------------------------------------------------- */
  /* Entries                                                         */
  /* -------------------------------------------------------------- */

  async listEntries(type: string, query: ListMetaobjectEntriesQuery) {
    const definition = await this.findDefinitionByTypeOrThrow(type);

    const take = Math.min(
      Math.max(query.take ? Number(query.take) : 50, 1),
      200,
    );
    const skip = Math.max(query.skip ? Number(query.skip) : 0, 0);

    const where: Record<string, unknown> = {
      definitionId: definition.id,
      status: "ACTIVE",
    };

    if (query.q && query.q.trim() !== "") {
      where.displayName = { contains: query.q.trim(), mode: "insensitive" };
    }

    // Filter by group in JS after fetching. The entry catalog is small
    // (a few hundred rows) and Postgres JSON path filtering is unreliable
    // across Prisma versions.
    let items = await this.prisma.metaobjectEntry.findMany({
      where,
      orderBy: [{ displayName: "asc" }],
    });

    if (query.groupId && query.groupId.trim() !== "") {
      const group = query.groupId.trim();
      items = items.filter((entry) => {
        const fields = entry.fields as Record<string, unknown> | null;
        return fields != null && fields.group === group;
      });
    }

    const total = items.length;
    const page = items.slice(skip, skip + take);

    return {
      definition: {
        id: definition.id,
        type: definition.type,
        name: definition.name,
        fieldSchema: definition.fieldSchema,
      },
      items: page.map((entry) => this.serializeEntry(entry)),
      pagination: { take, skip, total },
    };
  }

  async getEntry(type: string, id: string) {
    const definition = await this.findDefinitionByTypeOrThrow(type);
    if (!/^\d+$/.test(id)) {
      throw new BadRequestException("Entry id must be an integer.");
    }
    const entry = await this.prisma.metaobjectEntry.findFirst({
      where: { id: BigInt(id), definitionId: definition.id },
    });
    if (!entry) {
      throw new NotFoundException(`Entry ${id} not found.`);
    }
    return this.serializeEntry(entry);
  }

  async createEntry(type: string, input: CreateMetaobjectEntryInput) {
    const definition = await this.findDefinitionByTypeOrThrow(type);

    const displayName = input.displayName?.trim();
    if (!displayName) {
      throw new BadRequestException("displayName is required.");
    }

    const handle = this.slugify(input.handle?.trim() || displayName);
    if (!handle) {
      throw new BadRequestException(
        "handle could not be derived from displayName.",
      );
    }

    const existing = await this.prisma.metaobjectEntry.findUnique({
      where: {
        definitionId_handle: { definitionId: definition.id, handle },
      },
    });
    if (existing) {
      throw new BadRequestException(
        `An entry with handle "${handle}" already exists.`,
      );
    }

    const created = await this.prisma.metaobjectEntry.create({
      data: {
        definitionId: definition.id,
        handle,
        displayName,
        fields: (input.fields ?? {}) as object,
      },
    });

    return this.serializeEntry(created);
  }

  async updateEntry(
    type: string,
    id: string,
    input: UpdateMetaobjectEntryInput,
  ) {
    const definition = await this.findDefinitionByTypeOrThrow(type);
    if (!/^\d+$/.test(id)) {
      throw new BadRequestException("Entry id must be an integer.");
    }

    const existing = await this.prisma.metaobjectEntry.findFirst({
      where: { id: BigInt(id), definitionId: definition.id },
    });
    if (!existing) {
      throw new NotFoundException(`Entry ${id} not found.`);
    }

    const data: Record<string, unknown> = {};
    if (input.displayName !== undefined) {
      const trimmed = input.displayName.trim();
      if (!trimmed) {
        throw new BadRequestException("displayName cannot be empty.");
      }
      data.displayName = trimmed;
    }
    if (input.fields !== undefined) {
      data.fields = input.fields;
    }

    const updated = await this.prisma.metaobjectEntry.update({
      where: { id: existing.id },
      data,
    });

    return this.serializeEntry(updated);
  }

  /* -------------------------------------------------------------- */
  /* Product metafields                                              */
  /* -------------------------------------------------------------- */

  async getProductMetafields(productId: bigint) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, categoryId: true },
    });
    if (!product) {
      throw new NotFoundException(`Product ${productId} not found.`);
    }

    const definitions = await this.prisma.metafieldDefinition.findMany({
      where: {
        status: "ACTIVE",
        ownerType: "PRODUCT",
        OR: [
          { categoryId: null },
          { categoryId: product.categoryId },
        ],
      },
      orderBy: { displayOrder: "asc" },
    });

    const values = await this.prisma.metafieldValue.findMany({
      where: {
        ownerType: "PRODUCT",
        ownerId: String(product.id),
      },
    });

    const byDefinitionId = new Map(
      values.map((v) => [v.definitionId, v]),
    );

    return {
      productId: String(product.id),
      categoryId: product.categoryId,
      definitions: definitions.map((def) => {
        const value = byDefinitionId.get(def.id);
        return {
          id: def.id,
          namespace: def.namespace,
          key: def.key,
          name: def.name,
          type: def.type,
          metaobjectType: def.metaobjectType,
          multiple: def.multiple,
          options: def.options,
          displayOrder: def.displayOrder,
          categoryId: def.categoryId,
          value: value?.value ?? null,
          metaobjectEntryId:
            value?.metaobjectEntryId != null
              ? String(value.metaobjectEntryId)
              : null,
        };
      }),
    };
  }

  async setProductMetafields(
    productId: bigint,
    input: SetProductMetafieldsInput,
  ) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, categoryId: true },
    });
    if (!product) {
      throw new NotFoundException(`Product ${productId} not found.`);
    }

    const allowedDefs = await this.prisma.metafieldDefinition.findMany({
      where: {
        status: "ACTIVE",
        ownerType: "PRODUCT",
        OR: [
          { categoryId: null },
          { categoryId: product.categoryId },
        ],
      },
      select: { id: true, type: true, multiple: true, metaobjectType: true },
    });
    const allowed = new Map(allowedDefs.map((d) => [d.id, d]));

    for (const item of input.values) {
      if (!allowed.has(item.definitionId)) {
        throw new BadRequestException(
          `Metafield definition ${item.definitionId} is not applicable to this product.`,
        );
      }
    }

    const ownerId = String(product.id);

    await this.prisma.$transaction(async (tx) => {
      const incomingIds = input.values.map((v) => v.definitionId);
      await tx.metafieldValue.deleteMany({
        where: {
          ownerType: "PRODUCT",
          ownerId,
          definitionId: { notIn: incomingIds },
        },
      });

      for (const item of input.values) {
        const def = allowed.get(item.definitionId)!;

        let metaobjectEntryId: bigint | null = null;
        let rawValue: unknown = item.value;

        if (def.type === "metaobject" && !def.multiple) {
          if (
            item.value &&
            typeof item.value === "object" &&
            "entryId" in (item.value as Record<string, unknown>)
          ) {
            const entryId = (item.value as { entryId?: unknown }).entryId;
            if (entryId != null) {
              metaobjectEntryId = BigInt(String(entryId));
            }
          }
        }

        if (def.type === "metaobject" && def.multiple) {
          const ids = this.extractEntryIds(item.value);
          rawValue = { entryIds: ids.map((n) => String(n)) };
        }

        await tx.metafieldValue.upsert({
          where: {
            definitionId_ownerType_ownerId: {
              definitionId: item.definitionId,
              ownerType: "PRODUCT",
              ownerId,
            },
          },
          update: {
            value: (rawValue ?? null) as object,
            metaobjectEntryId,
          },
          create: {
            definitionId: item.definitionId,
            ownerType: "PRODUCT",
            ownerId,
            value: (rawValue ?? null) as object,
            metaobjectEntryId,
          },
        });
      }
    });

    return this.getProductMetafields(productId);
  }

  private extractEntryIds(value: unknown): number[] {
    if (!value) return [];
    if (Array.isArray(value)) {
      return value
        .map((v) => Number(v))
        .filter((n) => Number.isFinite(n) && n > 0);
    }
    if (typeof value === "object" && "entryIds" in (value as object)) {
      const ids = (value as { entryIds?: unknown }).entryIds;
      if (Array.isArray(ids)) {
        return ids
          .map((v) => Number(v))
          .filter((n) => Number.isFinite(n) && n > 0);
      }
    }
    return [];
  }
}