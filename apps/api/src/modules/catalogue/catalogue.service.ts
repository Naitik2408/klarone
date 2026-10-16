import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { toJsonSafe } from "../../common/serialization/json-safe";
import type { CreateStaffProductInput } from "./dto-create-staff-product";
import type { UpdateStaffProductInput } from "./dto-update-staff-product";
import type { CreateStaffVariantInput } from "./dto-create-staff-variant";
import type {
  StaffPortInput,
  StaffFeatureInput,
} from "./dto-create-staff-product";
import type {
  AddStaffProductOptionValueInput,
  BulkEditVariantsInput,
  CreateStaffProductOptionInput,
  SetVariantOptionValuesInput,
  UpdateStaffProductOptionInput,
  UpdateStaffProductOptionValueInput,
  SyncVariantMatrixResult
} from "./dto-options";
import type {
  ArchiveProductInput,
  DeleteVariantInput,
  DuplicateProductInput,
} from "./dto-duplicate-product";
import { AuditService } from "../audit/audit.service";
import { Inject } from "@nestjs/common";
import { STORAGE_PROVIDER } from "../../common/storage/storage.factory";
import type { IStorageProvider } from "../../common/storage/storage-provider.interface";

type Tx = Parameters<
  Parameters<PrismaService["$transaction"]>[0]
>[0];

@Injectable()
export class CatalogueService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    @Inject(STORAGE_PROVIDER)
    private readonly storageProvider: IStorageProvider,
  ) { }

  /* ---------------------------------------------------------------
   * Helpers
   * --------------------------------------------------------------- */

  private slugify(value: string): string {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  private normalizeTagNames(tags?: string[]): string[] {
    if (!tags) return [];
    const seen = new Set<string>();
    const out: string[] = [];
    for (const raw of tags) {
      if (typeof raw !== "string") continue;
      const trimmed = raw.trim();
      if (!trimmed) continue;
      const key = trimmed.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(trimmed);
    }
    return out;
  }

  private assertPortsInput(ports?: StaffPortInput[]) {
    if (ports === undefined) return;
    if (!Array.isArray(ports)) {
      throw new BadRequestException("ports must be an array.");
    }
    for (const [index, port] of ports.entries()) {
      if (!port || typeof port !== "object") {
        throw new BadRequestException(
          `ports[${index}] must be an object.`,
        );
      }
      const portType =
        typeof port.portType === "string" ? port.portType.trim() : "";
      if (!portType) {
        throw new BadRequestException(
          `ports[${index}].portType is required.`,
        );
      }
      const quantity = Number(port.quantity);
      if (!Number.isInteger(quantity) || quantity <= 0) {
        throw new BadRequestException(
          `ports[${index}].quantity must be a positive integer.`,
        );
      }
      if (
        port.version !== undefined &&
        port.version !== null &&
        typeof port.version !== "string"
      ) {
        throw new BadRequestException(
          `ports[${index}].version must be a string or null.`,
        );
      }
    }
  }

  private assertFeaturesInput(features?: StaffFeatureInput[]) {
    if (features === undefined) return;
    if (!Array.isArray(features)) {
      throw new BadRequestException("features must be an array.");
    }
    for (const [index, feature] of features.entries()) {
      if (!feature || typeof feature !== "object") {
        throw new BadRequestException(
          `features[${index}] must be an object.`,
        );
      }
      const featureType =
        typeof feature.featureType === "string"
          ? feature.featureType.trim()
          : "";
      const featureName =
        typeof feature.featureName === "string"
          ? feature.featureName.trim()
          : "";
      if (!featureType) {
        throw new BadRequestException(
          `features[${index}].featureType is required.`,
        );
      }
      if (!featureName) {
        throw new BadRequestException(
          `features[${index}].featureName is required.`,
        );
      }
      if (
        feature.score !== undefined &&
        feature.score !== null &&
        !Number.isFinite(Number(feature.score))
      ) {
        throw new BadRequestException(
          `features[${index}].score must be a number or null.`,
        );
      }
    }
  }

  private async syncPortsForVariant(
    tx: Tx,
    variantId: bigint,
    ports: StaffPortInput[] | undefined,
  ) {
    if (ports === undefined) return;

    await tx.productPort.deleteMany({
      where: { productVariantId: variantId },
    });

    if (ports.length === 0) return;

    await tx.productPort.createMany({
      data: ports.map((port) => ({
        productVariantId: variantId,
        portType: port.portType.trim(),
        quantity: Number(port.quantity),
        version:
          port.version !== undefined && port.version !== null
            ? port.version.trim() || null
            : null,
        supportsCharging: port.supportsCharging ?? false,
        supportsDisplay: port.supportsDisplay ?? false,
      })),
    });
  }

  private async syncFeaturesForVariant(
    tx: Tx,
    variantId: bigint,
    features: StaffFeatureInput[] | undefined,
  ) {
    if (features === undefined) return;

    await tx.productFeature.deleteMany({
      where: { productVariantId: variantId },
    });

    if (features.length === 0) return;

    await tx.productFeature.createMany({
      data: features.map((feature) => ({
        productVariantId: variantId,
        featureType: feature.featureType.trim(),
        featureName: feature.featureName.trim(),
        description:
          feature.description !== undefined && feature.description !== null
            ? feature.description.trim() || null
            : null,
        score:
          feature.score === undefined || feature.score === null
            ? null
            : String(Number(feature.score)),
      })),
    });
  }

  private async syncTagsForVariant(
    tx: Tx,
    variantId: bigint,
    tags: string[] | undefined,
  ) {
    if (tags === undefined) return;

    await tx.productTag.deleteMany({
      where: { productVariantId: variantId },
    });

    const names = this.normalizeTagNames(tags);
    if (names.length === 0) return;

    const tagIds: number[] = [];

    for (const name of names) {
      const slug = this.slugify(name);
      if (!slug) continue;

      const existing = await tx.tag.findUnique({
        where: { slug },
        select: { id: true },
      });

      if (existing) {
        tagIds.push(existing.id);
        continue;
      }

      const created = await tx.tag.create({
        data: { name, slug, status: "ACTIVE" },
        select: { id: true },
      });
      tagIds.push(created.id);
    }

    if (tagIds.length === 0) return;

    await tx.productTag.createMany({
      data: tagIds.map((tagId) => ({
        productVariantId: variantId,
        tagId,
      })),
    });
  }

  private async recordPriceChangeIfNeeded(
    tx: Tx,
    variantId: bigint,
    oldBasePrice: string,
    oldSellingPrice: string,
    newBasePrice: string | undefined,
    newSellingPrice: string | undefined,
    changedByUserId: bigint,
    reason?: string,
  ) {
    const baseChanged =
      newBasePrice !== undefined && newBasePrice !== oldBasePrice;
    const sellingChanged =
      newSellingPrice !== undefined &&
      newSellingPrice !== oldSellingPrice;

    if (!baseChanged && !sellingChanged) return;

    await tx.productVariantPriceHistory.create({
      data: {
        productVariantId: variantId,
        oldBasePrice: baseChanged ? oldBasePrice : null,
        newBasePrice: baseChanged ? newBasePrice : null,
        oldSellingPrice: sellingChanged ? oldSellingPrice : null,
        newSellingPrice: sellingChanged ? newSellingPrice : null,
        currency: "INR",
        reason: reason ?? null,
        changedByUserId,
      },
    });
  }

  private parseBigIntId(
    value: string | number,
    label: string,
  ): bigint {
    let id: bigint;
    try {
      id = BigInt(value);
    } catch {
      throw new BadRequestException(`${label} must be a valid integer.`);
    }
    if (id <= 0n) {
      throw new BadRequestException(`${label} must be positive.`);
    }
    return id;
  }

  /**
   * Serialize a Prisma ProductOption (+ values + metaobjectEntry) to the
   * shape the frontend expects. Always returns `values` as an array.
   */
  private serializeProductOption(option: {
    id: bigint;
    name: string;
    displayOrder: number;
    values: Array<{
      id: bigint;
      value: string;
      displayOrder: number;
      metaobjectEntryId: bigint | null;
      metaobjectEntry: {
        id: bigint;
        handle: string;
        displayName: string;
        fields: unknown;
      } | null;
    }>;
  }) {
    return {
      id: String(option.id),
      name: option.name,
      displayOrder: option.displayOrder,
      values: (option.values ?? []).map((value) => ({
        id: String(value.id),
        value: value.value,
        displayOrder: value.displayOrder,
        metaobjectEntryId:
          value.metaobjectEntryId != null
            ? String(value.metaobjectEntryId)
            : null,
        metaobjectEntry: value.metaobjectEntry
          ? {
            id: String(value.metaobjectEntry.id),
            handle: value.metaobjectEntry.handle,
            displayName: value.metaobjectEntry.displayName,
            fields: (value.metaobjectEntry.fields ?? {}) as Record<
              string,
              unknown
            >,
          }
          : null,
      })),
    };
  }

  /* ---------------------------------------------------------------
   * Public + staff catalogue reads
   * --------------------------------------------------------------- */

  async findProducts(params: {
    search?: string;
    brandSlug?: string;
    brandSlugs?: string[];
    categorySlug?: string;
    collectionSlug?: string;
    minPrice?: number;
    maxPrice?: number;
    ramGb?: number[];
    storageGb?: number[];
    inStockOnly?: boolean;
    sortBy?: "featured" | "price-asc" | "price-desc" | "newest";
    page?: number;
    pageSize?: number;
  }) {
    const page = Math.max(params.page ?? 1, 1);
    const pageSize = Math.min(
      Math.max(params.pageSize ?? 24, 1),
      100,
    );

    const search = params.search?.trim();

    // Variant-level conditions (for price, ram, storage, inStock)
    const variantWhere: Record<string, unknown> = {
      status: "ACTIVE",
    };

    if (params.minPrice !== undefined || params.maxPrice !== undefined) {
      variantWhere.sellingPrice = {
        ...(params.minPrice !== undefined ? { gte: params.minPrice } : {}),
        ...(params.maxPrice !== undefined ? { lte: params.maxPrice } : {}),
      };
    }

    if (params.ramGb && params.ramGb.length > 0) {
      variantWhere.ramGb = { in: params.ramGb };
    }

    if (params.storageGb && params.storageGb.length > 0) {
      variantWhere.storageGb = { in: params.storageGb };
    }

    if (params.inStockOnly) {
      variantWhere.inventories = {
        some: { quantityAvailable: { gt: 0 } },
      };
    }

    // Brands condition (single or multiple)
    let brandCondition: Record<string, unknown> | undefined = undefined;
    if (params.brandSlugs && params.brandSlugs.length > 0) {
      brandCondition = {
        slug: { in: params.brandSlugs },
        status: "ACTIVE",
      };
    } else if (params.brandSlug) {
      brandCondition = {
        slug: params.brandSlug,
        status: "ACTIVE",
      };
    }

    const where: Record<string, unknown> = {
      status: "PUBLISHED",
      ...(search
        ? {
          OR: [
            {
              name: {
                contains: search,
                mode: "insensitive" as const,
              },
            },
            {
              shortDescription: {
                contains: search,
                mode: "insensitive" as const,
              },
            },
            {
              brand: {
                name: {
                  contains: search,
                  mode: "insensitive" as const,
                },
              },
            },
          ],
        }
        : {}),
      ...(brandCondition ? { brand: brandCondition } : {}),
      ...(params.categorySlug
        ? {
          category: {
            slug: params.categorySlug,
            status: "ACTIVE",
          },
        }
        : {}),
      ...(params.collectionSlug
        ? {
          collections: {
            some: {
              collection: {
                slug: params.collectionSlug,
                status: "ACTIVE",
              },
            },
          },
        }
        : {}),
      variants: {
        some: variantWhere,
      },
    };

    // Determine sorting
    let orderBy: Record<string, "asc" | "desc"> = { name: "asc" };
    if (params.sortBy === "newest") {
      orderBy = { createdAt: "desc" };
    }

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          name: true,
          slug: true,
          shortDescription: true,
          productType: true,
          brand: {
            select: { id: true, name: true, slug: true },
          },
          category: {
            select: { id: true, name: true, slug: true },
          },
          media: {
            where: { isPrimary: true },
            orderBy: { displayOrder: "asc" },
            take: 1,
            select: {
              id: true,
              mediaType: true,
              url: true,
              storageKey: true,
              altText: true,
            },
          },
          variants: {
            where: { status: "ACTIVE" },
            orderBy: { sellingPrice: "asc" },
            select: {
              id: true,
              sku: true,
              variantName: true,
              ramGb: true,
              storageGb: true,
              operatingSystem: true,
              sellingPrice: true,
              compareAtPrice: true,
              currency: true,
              inventories: {
                select: {
                  quantityAvailable: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    // In-memory sorting for price if needed (since price lives on variant)
    if (params.sortBy === "price-asc") {
      items.sort((a, b) => {
        const pA = a.variants[0] ? Number(a.variants[0].sellingPrice.toString()) : 0;
        const pB = b.variants[0] ? Number(b.variants[0].sellingPrice.toString()) : 0;
        return pA - pB;
      });
    } else if (params.sortBy === "price-desc") {
      items.sort((a, b) => {
        const pA = a.variants[0] ? Number(a.variants[0].sellingPrice.toString()) : 0;
        const pB = b.variants[0] ? Number(b.variants[0].sellingPrice.toString()) : 0;
        return pB - pA;
      });
    }

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

  async findProductFacets(params: {
    categorySlug?: string;
    collectionSlug?: string;
  }) {
    // Fetch all published products within scope to aggregate faceted counts
    const baseWhere: Record<string, unknown> = {
      status: "PUBLISHED",
      ...(params.categorySlug
        ? {
          category: {
            slug: params.categorySlug,
            status: "ACTIVE",
          },
        }
        : {}),
      ...(params.collectionSlug
        ? {
          collections: {
            some: {
              collection: {
                slug: params.collectionSlug,
                status: "ACTIVE",
              },
            },
          },
        }
        : {}),
    };

    const products = await this.prisma.product.findMany({
      where: baseWhere,
      select: {
        brand: {
          select: { id: true, name: true, slug: true },
        },
        category: {
          select: { id: true, name: true, slug: true },
        },
        collections: {
          where: {
            collection: { status: "ACTIVE" },
          },
          select: {
            collection: {
              select: { id: true, title: true, slug: true },
            },
          },
        },
        variants: {
          where: { status: "ACTIVE" },
          select: {
            sellingPrice: true,
            ramGb: true,
            storageGb: true,
            collectionVariants: {
              where: {
                collection: { status: "ACTIVE" },
              },
              select: {
                collection: {
                  select: { id: true, title: true, slug: true },
                },
              },
            },
            inventories: {
              select: {
                quantityAvailable: true,
              },
            },
          },
        },
      },
    });

    const brandCounts = new Map<string, { id: number; name: string; slug: string; count: number }>();
    const collectionCounts = new Map<string, { id: number; title: string; slug: string; count: number }>();
    const ramCounts = new Map<number, number>();
    const storageCounts = new Map<number, number>();
    let inStockCount = 0;
    let outOfStockCount = 0;
    let minPrice = Infinity;
    let maxPrice = 0;

    for (const p of products) {
      // Brands
      const bKey = p.brand.slug;
      const existingB = brandCounts.get(bKey);
      if (existingB) {
        existingB.count += 1;
      } else {
        brandCounts.set(bKey, { ...p.brand, count: 1 });
      }

      // Collections (collect unique collections for this product)
      const seenProductColSlugs = new Set<string>();
      for (const cp of p.collections) {
        if (cp.collection && !seenProductColSlugs.has(cp.collection.slug)) {
          seenProductColSlugs.add(cp.collection.slug);
          const col = cp.collection;
          const existingCol = collectionCounts.get(col.slug);
          if (existingCol) {
            existingCol.count += 1;
          } else {
            collectionCounts.set(col.slug, { id: col.id, title: col.title, slug: col.slug, count: 1 });
          }
        }
      }

      // Stock check
      const isProductInStock = p.variants.some((v) =>
        v.inventories.some((inv) => inv.quantityAvailable > 0),
      );
      if (isProductInStock) {
        inStockCount += 1;
      } else {
        outOfStockCount += 1;
      }

      // Variants
      for (const v of p.variants) {
        // Also capture collection links at variant level if any
        for (const cv of v.collectionVariants || []) {
          if (cv.collection && !seenProductColSlugs.has(cv.collection.slug)) {
            seenProductColSlugs.add(cv.collection.slug);
            const col = cv.collection;
            const existingCol = collectionCounts.get(col.slug);
            if (existingCol) {
              existingCol.count += 1;
            } else {
              collectionCounts.set(col.slug, { id: col.id, title: col.title, slug: col.slug, count: 1 });
            }
          }
        }

        const price = Number(v.sellingPrice.toString());
        if (price < minPrice) minPrice = price;
        if (price > maxPrice) maxPrice = price;

        if (v.ramGb) {
          ramCounts.set(v.ramGb, (ramCounts.get(v.ramGb) ?? 0) + 1);
        }
        if (v.storageGb) {
          storageCounts.set(v.storageGb, (storageCounts.get(v.storageGb) ?? 0) + 1);
        }
      }
    }

    if (minPrice === Infinity) minPrice = 0;

    return toJsonSafe({
      brands: Array.from(brandCounts.values()).sort((a, b) => b.count - a.count),
      collections: Array.from(collectionCounts.values()).sort((a, b) => b.count - a.count),
      priceRange: {
        min: minPrice,
        max: maxPrice,
      },
      ramOptions: Array.from(ramCounts.entries())
        .map(([ramGb, count]) => ({ ramGb, count }))
        .sort((a, b) => a.ramGb - b.ramGb),
      storageOptions: Array.from(storageCounts.entries())
        .map(([storageGb, count]) => ({ storageGb, count }))
        .sort((a, b) => a.storageGb - b.storageGb),
      availability: {
        inStockCount,
        outOfStockCount,
      },
    });
  }

  async findStaffProducts(params: {
    search?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  }) {
    const page = Math.max(params.page ?? 1, 1);
    const pageSize = Math.min(
      Math.max(params.pageSize ?? 24, 1),
      100,
    );

    const search = params.search?.trim();
    const status = params.status?.trim().toUpperCase();

    const where = {
      ...(status ? { status } : {}),
      ...(search
        ? {
          OR: [
            {
              name: {
                contains: search,
                mode: "insensitive" as const,
              },
            },
            {
              slug: {
                contains: search,
                mode: "insensitive" as const,
              },
            },
            {
              modelNumber: {
                contains: search,
                mode: "insensitive" as const,
              },
            },
            {
              manufacturerPartNumber: {
                contains: search,
                mode: "insensitive" as const,
              },
            },
            {
              brand: {
                name: {
                  contains: search,
                  mode: "insensitive" as const,
                },
              },
            },
            {
              variants: {
                some: {
                  sku: {
                    contains: search,
                    mode: "insensitive" as const,
                  },
                },
              },
            },
          ],
        }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          name: true,
          slug: true,
          modelNumber: true,
          manufacturerPartNumber: true,
          productType: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          brand: {
            select: { id: true, name: true, slug: true },
          },
          category: {
            select: { id: true, name: true, slug: true },
          },
          _count: { select: { variants: true } },
          media: {
            where: { isPrimary: true },
            take: 1,
            select: { url: true, altText: true },
          },
          variants: {
            where: { status: "ACTIVE" },
            orderBy: { id: "asc" },
            select: {
              id: true,
              sku: true,
              variantName: true,
              color: true,
              ramGb: true,
              storageGb: true,
              operatingSystem: true,
              sellingPrice: true,
              status: true,
              inventories: {
                select: {
                  quantityAvailable: true,
                  quantityReserved: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    const normalizedItems = items.map((item) => {
      const sellingPrices = item.variants.map((variant) =>
        Number(variant.sellingPrice.toString()),
      );

      const quantityAvailable = item.variants.reduce(
        (total, variant) =>
          total +
          variant.inventories.reduce(
            (sum, inventory) => sum + inventory.quantityAvailable,
            0,
          ),
        0,
      );

      const quantityReserved = item.variants.reduce(
        (total, variant) =>
          total +
          variant.inventories.reduce(
            (sum, inventory) => sum + inventory.quantityReserved,
            0,
          ),
        0,
      );

      const primaryImage = item.media[0]?.url || null;

      const variants = item.variants.map((v) => {
        const available = v.inventories.reduce(
          (sum, inv) => sum + inv.quantityAvailable,
          0,
        );
        const reserved = v.inventories.reduce(
          (sum, inv) => sum + inv.quantityReserved,
          0,
        );

        return {
          id: v.id.toString(),
          sku: v.sku,
          variantName: v.variantName,
          color: v.color,
          ramGb: v.ramGb,
          storageGb: v.storageGb,
          operatingSystem: v.operatingSystem,
          sellingPrice: v.sellingPrice.toString(),
          status: v.status,
          quantityAvailable: available,
          quantityReserved: reserved,
        };
      });

      return {
        id: item.id.toString(),
        name: item.name,
        slug: item.slug,
        modelNumber: item.modelNumber,
        manufacturerPartNumber: item.manufacturerPartNumber,
        productType: item.productType,
        status: item.status,
        imageUrl: primaryImage,
        brand: item.brand,
        category: item.category,
        variantCount: item._count.variants,
        activeVariantCount: item.variants.length,
        lowestSellingPrice:
          sellingPrices.length > 0 ? Math.min(...sellingPrices) : null,
        quantityAvailable,
        quantityReserved,
        variants,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      };
    });

    return toJsonSafe({
      items: normalizedItems,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  }

  /* ---------------------------------------------------------------
   * Create product
   * --------------------------------------------------------------- */

  async createStaffProduct(
    input: CreateStaffProductInput,
    createdByUserId: bigint,
  ) {
    const name = input.name?.trim();

    if (!name) {
      throw new BadRequestException("Product name is required.");
    }

    if (!Number.isInteger(input.brandId) || input.brandId <= 0) {
      throw new BadRequestException("A valid brandId is required.");
    }

    if (!Number.isInteger(input.categoryId) || input.categoryId <= 0) {
      throw new BadRequestException("A valid categoryId is required.");
    }

    const sku = input.variant?.sku?.trim();

    if (!sku) {
      throw new BadRequestException("Variant SKU is required.");
    }

    const basePrice = Number(input.variant.basePrice);
    const sellingPrice = Number(input.variant.sellingPrice);

    if (!Number.isFinite(basePrice) || basePrice < 0) {
      throw new BadRequestException(
        "Variant basePrice must be a valid non-negative number.",
      );
    }

    if (!Number.isFinite(sellingPrice) || sellingPrice < 0) {
      throw new BadRequestException(
        "Variant sellingPrice must be a valid non-negative number.",
      );
    }

    if (
      input.variant.compareAtPrice !== undefined &&
      input.variant.compareAtPrice !== null &&
      (!Number.isFinite(Number(input.variant.compareAtPrice)) ||
        Number(input.variant.compareAtPrice) < 0)
    ) {
      throw new BadRequestException(
        "Variant compareAtPrice must be a valid non-negative number.",
      );
    }

    this.assertPortsInput(input.variant.ports);
    this.assertFeaturesInput(input.variant.features);

    const [brand, category, existingSlug, existingSku] = await Promise.all([
      this.prisma.brand.findUnique({
        where: { id: input.brandId },
        select: { id: true, name: true },
      }),
      this.prisma.category.findUnique({
        where: { id: input.categoryId },
        select: { id: true, name: true },
      }),
      input.slug
        ? this.prisma.product.findUnique({
          where: { slug: input.slug.trim() },
          select: { id: true },
        })
        : null,
      this.prisma.productVariant.findUnique({
        where: { sku },
        select: { id: true },
      }),
    ]);

    if (!brand) {
      throw new NotFoundException("Brand not found.");
    }

    if (!category) {
      throw new NotFoundException("Category not found.");
    }

    if (existingSlug) {
      throw new ConflictException(
        "A product with this slug already exists.",
      );
    }

    if (existingSku) {
      throw new ConflictException(
        "A variant with this SKU already exists.",
      );
    }

    const slug =
      input.slug?.trim() ||
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

    if (!slug) {
      throw new BadRequestException(
        "A valid product slug could not be generated.",
      );
    }

    const duplicateGeneratedSlug = await this.prisma.product.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (duplicateGeneratedSlug) {
      throw new ConflictException(
        "A product with the generated slug already exists. Provide a unique slug.",
      );
    }

    const specification = input.variant.specification;

    const specificationData = specification
      ? {
        cpuBrand: specification.cpuBrand ?? null,
        cpuModel: specification.cpuModel ?? null,
        cpuGeneration: specification.cpuGeneration ?? null,
        cpuCores: specification.cpuCores ?? null,
        cpuThreads: specification.cpuThreads ?? null,
        gpuBrand: specification.gpuBrand ?? null,
        gpuModel: specification.gpuModel ?? null,
        gpuVramGb: specification.gpuVramGb ?? null,
        ramType: specification.ramType ?? null,
        ramSpeedMhz: specification.ramSpeedMhz ?? null,
        maxRamGb: specification.maxRamGb ?? null,
        ramSlots: specification.ramSlots ?? null,
        storageType: specification.storageType ?? null,
        storageInterface: specification.storageInterface ?? null,
        storageSlots: specification.storageSlots ?? null,
        maxStorageGb: specification.maxStorageGb ?? null,
        displaySizeInches:
          specification.displaySizeInches === undefined ||
            specification.displaySizeInches === null
            ? null
            : String(specification.displaySizeInches),
        displayResolution: specification.displayResolution ?? null,
        displayPanelType: specification.displayPanelType ?? null,
        displayRefreshRateHz: specification.displayRefreshRateHz ?? null,
        displayBrightnessNits:
          specification.displayBrightnessNits ?? null,
        displayColorGamut: specification.displayColorGamut ?? null,
        batteryCapacityWh:
          specification.batteryCapacityWh === undefined ||
            specification.batteryCapacityWh === null
            ? null
            : String(specification.batteryCapacityWh),
        weightKg:
          specification.weightKg === undefined ||
            specification.weightKg === null
            ? null
            : String(specification.weightKg),
        widthMm:
          specification.widthMm === undefined ||
            specification.widthMm === null
            ? null
            : String(specification.widthMm),
        depthMm:
          specification.depthMm === undefined ||
            specification.depthMm === null
            ? null
            : String(specification.depthMm),
        heightMm:
          specification.heightMm === undefined ||
            specification.heightMm === null
            ? null
            : String(specification.heightMm),
        webcamResolution: specification.webcamResolution ?? null,
        wifiVersion: specification.wifiVersion ?? null,
        bluetoothVersion: specification.bluetoothVersion ?? null,
        keyboardType: specification.keyboardType ?? null,
        keyboardBacklight: specification.keyboardBacklight ?? null,
        fingerprintSensor: specification.fingerprintSensor ?? null,
      }
      : undefined;

    const created = await this.prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          brandId: input.brandId,
          categoryId: input.categoryId,
          name,
          slug,
          modelNumber: input.modelNumber?.trim() || null,
          manufacturerPartNumber:
            input.manufacturerPartNumber?.trim() || null,
          shortDescription: input.shortDescription?.trim() || null,
          description: input.description?.trim() || null,
          productType: input.productType?.trim() || "LAPTOP",
          status: "DRAFT",
          createdByUserId,
          updatedByUserId: createdByUserId,
          variants: {
            create: {
              sku,
              variantName: input.variant.variantName?.trim() || null,
              color: input.variant.color?.trim() || null,
              ramGb: input.variant.ramGb ?? null,
              storageGb: input.variant.storageGb ?? null,
              operatingSystem:
                input.variant.operatingSystem?.trim() || null,
              basePrice: String(basePrice),
              sellingPrice: String(sellingPrice),
              compareAtPrice:
                input.variant.compareAtPrice === null ||
                  input.variant.compareAtPrice === undefined
                  ? null
                  : String(Number(input.variant.compareAtPrice)),
              currency: input.variant.currency?.trim() || "INR",
              warrantyMonths: input.variant.warrantyMonths ?? null,
              status: "ACTIVE",
              ...(specificationData
                ? {
                  specification: { create: specificationData },
                }
                : {}),
            },
          },
        },
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          brand: { select: { id: true, name: true } },
          category: { select: { id: true, name: true } },
          variants: {
            select: {
              id: true,
              sku: true,
              sellingPrice: true,
              status: true,
            },
          },
        },
      });

      const variantId = product.variants[0]?.id;

      if (variantId) {
        await this.syncPortsForVariant(tx, variantId, input.variant.ports);
        await this.syncFeaturesForVariant(
          tx,
          variantId,
          input.variant.features,
        );
        await this.syncTagsForVariant(tx, variantId, input.variant.tags);

        // Seed initial inventory row for all active warehouses
        const activeWarehouses = await tx.warehouse.findMany({
          where: { status: "ACTIVE" },
          select: { id: true },
        });

        if (activeWarehouses.length > 0) {
          await tx.inventory.createMany({
            data: activeWarehouses.map((w) => ({
              warehouseId: w.id,
              productVariantId: variantId,
              quantityAvailable: 0,
              quantityReserved: 0,
            })),
            skipDuplicates: true,
          });
        }
      }

      return product;
    });

    await this.auditService.log({
      userAccountId: createdByUserId,
      action: "CREATE",
      module: "catalogue",
      entityType: "Product",
      entityId: created.id.toString(),
      description: `Created catalogue product ${created.name}.`,
      newData: {
        id: created.id.toString(),
        name: created.name,
        slug: created.slug,
        status: created.status,
        brand: created.brand,
        category: created.category,
        variants: created.variants.map((variant) => ({
          id: variant.id.toString(),
          sku: variant.sku,
          sellingPrice: variant.sellingPrice.toString(),
          status: variant.status,
        })),
      },
    });

    return toJsonSafe(created);
  }

  /* ---------------------------------------------------------------
   * Read single staff product
   * --------------------------------------------------------------- */

  async findStaffProductById(productId: bigint) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        brandId: true,
        categoryId: true,
        name: true,
        slug: true,
        modelNumber: true,
        manufacturerPartNumber: true,
        shortDescription: true,
        description: true,
        productType: true,
        status: true,
        // ← Product-level media (unchanged)
        media: {
          orderBy: [{ isPrimary: "desc" }, { displayOrder: "asc" }],
          select: {
            id: true,
            mediaType: true,
            url: true,
            storageKey: true,
            altText: true,
            isPrimary: true,
            displayOrder: true,
          },
        },
        // ← DO NOT put `inventories` here. Product has no inventories.
        createdAt: true,
        updatedAt: true,
        brand: { select: { id: true, name: true, slug: true } },
        category: { select: { id: true, name: true, slug: true } },
        options: {
          orderBy: { displayOrder: "asc" },
          select: {
            id: true,
            name: true,
            displayOrder: true,
            values: {
              orderBy: { displayOrder: "asc" },
              select: {
                id: true,
                value: true,
                displayOrder: true,
              },
            },
          },
        },
        variants: {
          orderBy: { id: "asc" },
          select: {
            id: true,
            sku: true,
            variantName: true,
            color: true,
            ramGb: true,
            storageGb: true,
            operatingSystem: true,
            basePrice: true,
            sellingPrice: true,
            compareAtPrice: true,
            currency: true,
            warrantyMonths: true,
            status: true,
            specification: {
              select: {
                id: true,
                cpuBrand: true,
                cpuModel: true,
                cpuGeneration: true,
                cpuCores: true,
                cpuThreads: true,
                gpuBrand: true,
                gpuModel: true,
                gpuVramGb: true,
                ramType: true,
                ramSpeedMhz: true,
                maxRamGb: true,
                ramSlots: true,
                storageType: true,
                storageInterface: true,
                storageSlots: true,
                maxStorageGb: true,
                displaySizeInches: true,
                displayResolution: true,
                displayPanelType: true,
                displayRefreshRateHz: true,
                displayBrightnessNits: true,
                displayColorGamut: true,
                batteryCapacityWh: true,
                weightKg: true,
                widthMm: true,
                depthMm: true,
                heightMm: true,
                webcamResolution: true,
                wifiVersion: true,
                bluetoothVersion: true,
                keyboardType: true,
                keyboardBacklight: true,
                fingerprintSensor: true,
              },
            },
            ports: {
              orderBy: { portType: "asc" },
              select: {
                id: true,
                portType: true,
                quantity: true,
                version: true,
                supportsCharging: true,
                supportsDisplay: true,
              },
            },
            features: {
              orderBy: { featureType: "asc" },
              select: {
                id: true,
                featureType: true,
                featureName: true,
                description: true,
                score: true,
              },
            },
            tags: {
              select: {
                tag: {
                  select: { id: true, name: true, slug: true },
                },
              },
            },
            optionValues: {
              select: {
                productOptionId: true,
                productOptionValueId: true,
                productOption: {
                  select: { id: true, name: true, displayOrder: true },
                },
                productOptionValue: {
                  select: {
                    id: true,
                    value: true,
                    displayOrder: true,
                    metaobjectEntryId: true,
                    metaobjectEntry: {
                      select: {
                        id: true,
                        handle: true,
                        displayName: true,
                        fields: true,
                      },
                    },
                  },
                },
              },
            },
            // ← These two belong HERE, inside the variant select
            media: {
              orderBy: [{ isPrimary: "desc" }, { displayOrder: "asc" }],
              select: {
                id: true,
                mediaType: true,
                url: true,
                storageKey: true,
                altText: true,
                isPrimary: true,
                displayOrder: true,
              },
            },
            inventories: {
              select: {
                id: true,
                quantityAvailable: true,
                quantityReserved: true,
                warehouse: {
                  select: { id: true, name: true, code: true },
                },
              },
            },
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException("Product not found.");
    }

    return toJsonSafe(product);
  }

  /* ---------------------------------------------------------------
   * Update product + variant
   * --------------------------------------------------------------- */

  async updateStaffProduct(
    productId: bigint,
    input: UpdateStaffProductInput,
    updatedByUserId: bigint,
  ) {
    let variantId: bigint;
    try {
      variantId = BigInt(input.variantId);
    } catch {
      throw new BadRequestException("variantId must be a valid integer.");
    }

    if (variantId <= 0n) {
      throw new BadRequestException("variantId must be positive.");
    }

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        brandId: true,
        categoryId: true,
        name: true,
        slug: true,
        modelNumber: true,
        manufacturerPartNumber: true,
        shortDescription: true,
        description: true,
        productType: true,
        status: true,
        variants: {
          where: { status: "ACTIVE" },
          orderBy: { id: "asc" },
          select: {
            id: true,
            sku: true,
            variantName: true,
            color: true,
            ramGb: true,
            storageGb: true,
            operatingSystem: true,
            basePrice: true,
            sellingPrice: true,
            compareAtPrice: true,
            currency: true,
            warrantyMonths: true,
            specification: {
              select: {
                id: true,
                productVariantId: true,
                cpuBrand: true,
                cpuModel: true,
                cpuGeneration: true,
                cpuCores: true,
                cpuThreads: true,
                gpuBrand: true,
                gpuModel: true,
                gpuVramGb: true,
                ramType: true,
                ramSpeedMhz: true,
                maxRamGb: true,
                ramSlots: true,
                storageType: true,
                storageInterface: true,
                storageSlots: true,
                maxStorageGb: true,
                displaySizeInches: true,
                displayResolution: true,
                displayPanelType: true,
                displayRefreshRateHz: true,
                displayBrightnessNits: true,
                displayColorGamut: true,
                batteryCapacityWh: true,
                weightKg: true,
                widthMm: true,
                depthMm: true,
                heightMm: true,
                webcamResolution: true,
                wifiVersion: true,
                bluetoothVersion: true,
                keyboardType: true,
                keyboardBacklight: true,
                fingerprintSensor: true,
              },
            },
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException("Product not found.");
    }

    const variant = product.variants.find(
      (item) => item.id === variantId,
    );

    if (!variant) {
      throw new NotFoundException(
        "Active product variant not found for this product.",
      );
    }

    const nextName =
      input.name !== undefined ? input.name.trim() : product.name;

    if (!nextName) {
      throw new BadRequestException(
        "Product name cannot be empty.",
      );
    }

    const nextSku =
      input.variant?.sku !== undefined
        ? input.variant.sku.trim()
        : variant.sku;

    if (!nextSku) {
      throw new BadRequestException("Variant SKU cannot be empty.");
    }

    if (
      input.brandId !== undefined &&
      (!Number.isInteger(input.brandId) || input.brandId <= 0)
    ) {
      throw new BadRequestException(
        "brandId must be a positive integer.",
      );
    }

    if (
      input.categoryId !== undefined &&
      (!Number.isInteger(input.categoryId) || input.categoryId <= 0)
    ) {
      throw new BadRequestException(
        "categoryId must be a positive integer.",
      );
    }

    if (
      input.variant?.basePrice !== undefined &&
      (!Number.isFinite(Number(input.variant.basePrice)) ||
        Number(input.variant.basePrice) < 0)
    ) {
      throw new BadRequestException(
        "Variant basePrice must be a valid non-negative number.",
      );
    }

    if (
      input.variant?.sellingPrice !== undefined &&
      (!Number.isFinite(Number(input.variant.sellingPrice)) ||
        Number(input.variant.sellingPrice) < 0)
    ) {
      throw new BadRequestException(
        "Variant sellingPrice must be a valid non-negative number.",
      );
    }

    if (
      input.variant?.compareAtPrice !== undefined &&
      input.variant.compareAtPrice !== null &&
      (!Number.isFinite(Number(input.variant.compareAtPrice)) ||
        Number(input.variant.compareAtPrice) < 0)
    ) {
      throw new BadRequestException(
        "Variant compareAtPrice must be a valid non-negative number.",
      );
    }

    this.assertPortsInput(input.variant?.ports);
    this.assertFeaturesInput(input.variant?.features);

    const [brand, category, duplicateSku] = await Promise.all([
      input.brandId !== undefined
        ? this.prisma.brand.findUnique({
          where: { id: input.brandId },
          select: { id: true },
        })
        : null,
      input.categoryId !== undefined
        ? this.prisma.category.findUnique({
          where: { id: input.categoryId },
          select: { id: true },
        })
        : null,
      nextSku !== variant.sku
        ? this.prisma.productVariant.findUnique({
          where: { sku: nextSku },
          select: { id: true },
        })
        : null,
    ]);

    if (input.brandId !== undefined && !brand) {
      throw new NotFoundException("Brand not found.");
    }

    if (input.categoryId !== undefined && !category) {
      throw new NotFoundException("Category not found.");
    }

    if (duplicateSku) {
      throw new ConflictException(
        "A variant with this SKU already exists.",
      );
    }

    const nextBasePrice =
      input.variant?.basePrice !== undefined
        ? String(Number(input.variant.basePrice))
        : undefined;
    const nextSellingPrice =
      input.variant?.sellingPrice !== undefined
        ? String(Number(input.variant.sellingPrice))
        : undefined;

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id: productId },
        data: {
          ...(input.brandId !== undefined
            ? { brandId: input.brandId }
            : {}),
          ...(input.categoryId !== undefined
            ? { categoryId: input.categoryId }
            : {}),
          ...(input.name !== undefined ? { name: nextName } : {}),
          ...(input.modelNumber !== undefined
            ? { modelNumber: input.modelNumber?.trim() ?? null }
            : {}),
          ...(input.manufacturerPartNumber !== undefined
            ? {
              manufacturerPartNumber:
                input.manufacturerPartNumber?.trim() ?? null,
            }
            : {}),
          ...(input.shortDescription !== undefined
            ? {
              shortDescription:
                input.shortDescription?.trim() ?? null,
            }
            : {}),
          ...(input.description !== undefined
            ? { description: input.description?.trim() ?? null }
            : {}),
          ...(input.productType !== undefined
            ? { productType: input.productType?.trim() || "LAPTOP" }
            : {}),
          updatedByUserId,
        },
      });

      await tx.productVariant.update({
        where: { id: variant.id },
        data: {
          ...(input.variant?.sku !== undefined
            ? { sku: nextSku }
            : {}),
          ...(input.variant?.variantName !== undefined
            ? {
              variantName:
                input.variant.variantName?.trim() ?? null,
            }
            : {}),
          ...(input.variant?.color !== undefined
            ? { color: input.variant.color?.trim() ?? null }
            : {}),
          ...(input.variant?.ramGb !== undefined
            ? { ramGb: input.variant.ramGb }
            : {}),
          ...(input.variant?.storageGb !== undefined
            ? { storageGb: input.variant.storageGb }
            : {}),
          ...(input.variant?.operatingSystem !== undefined
            ? {
              operatingSystem:
                input.variant.operatingSystem?.trim() ?? null,
            }
            : {}),
          ...(nextBasePrice !== undefined
            ? { basePrice: nextBasePrice }
            : {}),
          ...(nextSellingPrice !== undefined
            ? { sellingPrice: nextSellingPrice }
            : {}),
          ...(input.variant?.compareAtPrice !== undefined
            ? {
              compareAtPrice:
                input.variant.compareAtPrice === null
                  ? null
                  : String(
                    Number(input.variant.compareAtPrice),
                  ),
            }
            : {}),
          ...(input.variant?.currency !== undefined
            ? { currency: input.variant.currency?.trim() || "INR" }
            : {}),
          ...(input.variant?.warrantyMonths !== undefined
            ? { warrantyMonths: input.variant.warrantyMonths }
            : {}),
        },
      });

      const incomingSpecification = input.variant?.specification;

      if (
        incomingSpecification !== undefined &&
        incomingSpecification !== null
      ) {
        const current = variant.specification;

        const specificationData = {
          productVariantId: variant.id,
          cpuBrand:
            incomingSpecification.cpuBrand !== undefined
              ? incomingSpecification.cpuBrand
              : current?.cpuBrand ?? null,
          cpuModel:
            incomingSpecification.cpuModel !== undefined
              ? incomingSpecification.cpuModel
              : current?.cpuModel ?? null,
          cpuGeneration:
            incomingSpecification.cpuGeneration !== undefined
              ? incomingSpecification.cpuGeneration
              : current?.cpuGeneration ?? null,
          cpuCores:
            incomingSpecification.cpuCores !== undefined
              ? incomingSpecification.cpuCores
              : current?.cpuCores ?? null,
          cpuThreads:
            incomingSpecification.cpuThreads !== undefined
              ? incomingSpecification.cpuThreads
              : current?.cpuThreads ?? null,
          gpuBrand:
            incomingSpecification.gpuBrand !== undefined
              ? incomingSpecification.gpuBrand
              : current?.gpuBrand ?? null,
          gpuModel:
            incomingSpecification.gpuModel !== undefined
              ? incomingSpecification.gpuModel
              : current?.gpuModel ?? null,
          gpuVramGb:
            incomingSpecification.gpuVramGb !== undefined
              ? incomingSpecification.gpuVramGb
              : current?.gpuVramGb ?? null,
          ramType:
            incomingSpecification.ramType !== undefined
              ? incomingSpecification.ramType
              : current?.ramType ?? null,
          ramSpeedMhz:
            incomingSpecification.ramSpeedMhz !== undefined
              ? incomingSpecification.ramSpeedMhz
              : current?.ramSpeedMhz ?? null,
          maxRamGb:
            incomingSpecification.maxRamGb !== undefined
              ? incomingSpecification.maxRamGb
              : current?.maxRamGb ?? null,
          ramSlots:
            incomingSpecification.ramSlots !== undefined
              ? incomingSpecification.ramSlots
              : current?.ramSlots ?? null,
          storageType:
            incomingSpecification.storageType !== undefined
              ? incomingSpecification.storageType
              : current?.storageType ?? null,
          storageInterface:
            incomingSpecification.storageInterface !== undefined
              ? incomingSpecification.storageInterface
              : current?.storageInterface ?? null,
          storageSlots:
            incomingSpecification.storageSlots !== undefined
              ? incomingSpecification.storageSlots
              : current?.storageSlots ?? null,
          maxStorageGb:
            incomingSpecification.maxStorageGb !== undefined
              ? incomingSpecification.maxStorageGb
              : current?.maxStorageGb ?? null,
          displaySizeInches:
            incomingSpecification.displaySizeInches !== undefined
              ? incomingSpecification.displaySizeInches === null
                ? null
                : String(incomingSpecification.displaySizeInches)
              : current?.displaySizeInches ?? null,
          displayResolution:
            incomingSpecification.displayResolution !== undefined
              ? incomingSpecification.displayResolution
              : current?.displayResolution ?? null,
          displayPanelType:
            incomingSpecification.displayPanelType !== undefined
              ? incomingSpecification.displayPanelType
              : current?.displayPanelType ?? null,
          displayRefreshRateHz:
            incomingSpecification.displayRefreshRateHz !== undefined
              ? incomingSpecification.displayRefreshRateHz
              : current?.displayRefreshRateHz ?? null,
          displayBrightnessNits:
            incomingSpecification.displayBrightnessNits !== undefined
              ? incomingSpecification.displayBrightnessNits
              : current?.displayBrightnessNits ?? null,
          displayColorGamut:
            incomingSpecification.displayColorGamut !== undefined
              ? incomingSpecification.displayColorGamut
              : current?.displayColorGamut ?? null,
          batteryCapacityWh:
            incomingSpecification.batteryCapacityWh !== undefined
              ? incomingSpecification.batteryCapacityWh === null
                ? null
                : String(incomingSpecification.batteryCapacityWh)
              : current?.batteryCapacityWh ?? null,
          weightKg:
            incomingSpecification.weightKg !== undefined
              ? incomingSpecification.weightKg === null
                ? null
                : String(incomingSpecification.weightKg)
              : current?.weightKg ?? null,
          widthMm:
            incomingSpecification.widthMm !== undefined
              ? incomingSpecification.widthMm === null
                ? null
                : String(incomingSpecification.widthMm)
              : current?.widthMm ?? null,
          depthMm:
            incomingSpecification.depthMm !== undefined
              ? incomingSpecification.depthMm === null
                ? null
                : String(incomingSpecification.depthMm)
              : current?.depthMm ?? null,
          heightMm:
            incomingSpecification.heightMm !== undefined
              ? incomingSpecification.heightMm === null
                ? null
                : String(incomingSpecification.heightMm)
              : current?.heightMm ?? null,
          webcamResolution:
            incomingSpecification.webcamResolution !== undefined
              ? incomingSpecification.webcamResolution
              : current?.webcamResolution ?? null,
          wifiVersion:
            incomingSpecification.wifiVersion !== undefined
              ? incomingSpecification.wifiVersion
              : current?.wifiVersion ?? null,
          bluetoothVersion:
            incomingSpecification.bluetoothVersion !== undefined
              ? incomingSpecification.bluetoothVersion
              : current?.bluetoothVersion ?? null,
          keyboardType:
            incomingSpecification.keyboardType !== undefined
              ? incomingSpecification.keyboardType
              : current?.keyboardType ?? null,
          keyboardBacklight:
            incomingSpecification.keyboardBacklight !== undefined
              ? incomingSpecification.keyboardBacklight
              : current?.keyboardBacklight ?? null,
          fingerprintSensor:
            incomingSpecification.fingerprintSensor !== undefined
              ? incomingSpecification.fingerprintSensor
              : current?.fingerprintSensor ?? null,
        };

        const {
          productVariantId: _productVariantId,
          ...specificationUpdateData
        } = specificationData;

        await tx.productSpecification.upsert({
          where: { productVariantId: variant.id },
          create: specificationData,
          update: specificationUpdateData,
        });
      }

      await this.syncPortsForVariant(
        tx,
        variant.id,
        input.variant?.ports,
      );
      await this.syncFeaturesForVariant(
        tx,
        variant.id,
        input.variant?.features,
      );
      await this.syncTagsForVariant(
        tx,
        variant.id,
        input.variant?.tags,
      );

      await this.recordPriceChangeIfNeeded(
        tx,
        variant.id,
        variant.basePrice.toString(),
        variant.sellingPrice.toString(),
        nextBasePrice,
        nextSellingPrice,
        updatedByUserId,
        "Updated from catalogue editor",
      );

      return tx.product.findUnique({
        where: { id: productId },
        select: {
          id: true,
          name: true,
          slug: true,
          brand: { select: { id: true, name: true } },
          category: { select: { id: true, name: true } },
          status: true,
          variants: {
            where: { status: "ACTIVE" },
            select: {
              id: true,
              sku: true,
              sellingPrice: true,
              status: true,
              specification: true,
            },
          },
        },
      });
    });

    if (!result) {
      throw new NotFoundException(
        "Product could not be loaded after update.",
      );
    }

    await this.auditService.log({
      userAccountId: updatedByUserId,
      action: "UPDATE",
      module: "catalogue",
      entityType: "Product",
      entityId: productId.toString(),
      description: `Updated catalogue product ${result.name}.`,
      oldData: toJsonSafe({ product, variant }),
      newData: toJsonSafe(result),
    });

    return toJsonSafe(result);
  }

  /* ---------------------------------------------------------------
   * Create variant (attached to existing product)
   * --------------------------------------------------------------- */

  async createStaffVariant(
    productId: bigint,
    input: CreateStaffVariantInput,
    createdByUserId: bigint,
  ) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, name: true },
    });

    if (!product) {
      throw new NotFoundException("Product not found.");
    }

    const sku = input.sku?.trim();

    if (!sku) {
      throw new BadRequestException("Variant SKU is required.");
    }

    const basePrice = Number(input.basePrice);
    const sellingPrice = Number(input.sellingPrice);

    if (!Number.isFinite(basePrice) || basePrice < 0) {
      throw new BadRequestException(
        "Variant basePrice must be a valid non-negative number.",
      );
    }

    if (!Number.isFinite(sellingPrice) || sellingPrice < 0) {
      throw new BadRequestException(
        "Variant sellingPrice must be a valid non-negative number.",
      );
    }

    if (
      input.compareAtPrice !== undefined &&
      input.compareAtPrice !== null &&
      (!Number.isFinite(Number(input.compareAtPrice)) ||
        Number(input.compareAtPrice) < 0)
    ) {
      throw new BadRequestException(
        "Variant compareAtPrice must be a valid non-negative number.",
      );
    }

    this.assertPortsInput(input.ports);
    this.assertFeaturesInput(input.features);

    const existingSku = await this.prisma.productVariant.findUnique({
      where: { sku },
      select: { id: true },
    });

    if (existingSku) {
      throw new ConflictException(
        "A variant with this SKU already exists.",
      );
    }

    const specification = input.specification;

    const created = await this.prisma.$transaction(async (tx) => {
      const variant = await tx.productVariant.create({
        data: {
          productId,
          sku,
          variantName: input.variantName?.trim() || null,
          color: input.color?.trim() || null,
          ramGb: input.ramGb ?? null,
          storageGb: input.storageGb ?? null,
          operatingSystem: input.operatingSystem?.trim() || null,
          basePrice: String(basePrice),
          sellingPrice: String(sellingPrice),
          compareAtPrice:
            input.compareAtPrice === undefined ||
              input.compareAtPrice === null
              ? null
              : String(Number(input.compareAtPrice)),
          currency: input.currency?.trim() || "INR",
          warrantyMonths: input.warrantyMonths ?? null,
          status: "ACTIVE",
        },
        select: {
          id: true,
          productId: true,
          sku: true,
          variantName: true,
          color: true,
          ramGb: true,
          storageGb: true,
          operatingSystem: true,
          basePrice: true,
          sellingPrice: true,
          compareAtPrice: true,
          currency: true,
          warrantyMonths: true,
          status: true,
        },
      });

      if (specification) {
        await tx.productSpecification.create({
          data: {
            productVariantId: variant.id,
            cpuBrand: specification.cpuBrand ?? null,
            cpuModel: specification.cpuModel ?? null,
            cpuGeneration: specification.cpuGeneration ?? null,
            cpuCores: specification.cpuCores ?? null,
            cpuThreads: specification.cpuThreads ?? null,
            gpuBrand: specification.gpuBrand ?? null,
            gpuModel: specification.gpuModel ?? null,
            gpuVramGb: specification.gpuVramGb ?? null,
            ramType: specification.ramType ?? null,
            ramSpeedMhz: specification.ramSpeedMhz ?? null,
            maxRamGb: specification.maxRamGb ?? null,
            ramSlots: specification.ramSlots ?? null,
            storageType: specification.storageType ?? null,
            storageInterface: specification.storageInterface ?? null,
            storageSlots: specification.storageSlots ?? null,
            maxStorageGb: specification.maxStorageGb ?? null,
            displaySizeInches:
              specification.displaySizeInches === undefined ||
                specification.displaySizeInches === null ||
                specification.displaySizeInches === ""
                ? null
                : String(specification.displaySizeInches),
            displayResolution: specification.displayResolution ?? null,
            displayPanelType: specification.displayPanelType ?? null,
            displayRefreshRateHz:
              specification.displayRefreshRateHz ?? null,
            displayBrightnessNits:
              specification.displayBrightnessNits ?? null,
            displayColorGamut: specification.displayColorGamut ?? null,
            batteryCapacityWh:
              specification.batteryCapacityWh === undefined ||
                specification.batteryCapacityWh === null ||
                specification.batteryCapacityWh === ""
                ? null
                : String(specification.batteryCapacityWh),
            weightKg:
              specification.weightKg === undefined ||
                specification.weightKg === null ||
                specification.weightKg === ""
                ? null
                : String(specification.weightKg),
            widthMm:
              specification.widthMm === undefined ||
                specification.widthMm === null ||
                specification.widthMm === ""
                ? null
                : String(specification.widthMm),
            depthMm:
              specification.depthMm === undefined ||
                specification.depthMm === null ||
                specification.depthMm === ""
                ? null
                : String(specification.depthMm),
            heightMm:
              specification.heightMm === undefined ||
                specification.heightMm === null ||
                specification.heightMm === ""
                ? null
                : String(specification.heightMm),
            webcamResolution: specification.webcamResolution ?? null,
            wifiVersion: specification.wifiVersion ?? null,
            bluetoothVersion: specification.bluetoothVersion ?? null,
            keyboardType: specification.keyboardType ?? null,
            keyboardBacklight:
              typeof specification.keyboardBacklight === "boolean"
                ? specification.keyboardBacklight
                : specification.keyboardBacklight === null ||
                  specification.keyboardBacklight === undefined ||
                  specification.keyboardBacklight === ""
                  ? null
                  : String(specification.keyboardBacklight).toLowerCase() ===
                  "true",
            fingerprintSensor:
              typeof specification.fingerprintSensor === "boolean"
                ? specification.fingerprintSensor
                : specification.fingerprintSensor === null ||
                  specification.fingerprintSensor === undefined ||
                  specification.fingerprintSensor === ""
                  ? null
                  : String(specification.fingerprintSensor).toLowerCase() ===
                  "true",
          },
        });
      }

      await this.syncPortsForVariant(tx, variant.id, input.ports);
      await this.syncFeaturesForVariant(tx, variant.id, input.features);
      await this.syncTagsForVariant(tx, variant.id, input.tags);

      // Seed initial inventory row for all active warehouses
      const activeWarehouses = await tx.warehouse.findMany({
        where: { status: "ACTIVE" },
        select: { id: true },
      });

      if (activeWarehouses.length > 0) {
        await tx.inventory.createMany({
          data: activeWarehouses.map((w) => ({
            warehouseId: w.id,
            productVariantId: variant.id,
            quantityAvailable: 0,
            quantityReserved: 0,
          })),
          skipDuplicates: true,
        });
      }

      return tx.product.findUnique({
        where: { id: productId },
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          variants: {
            where: { status: "ACTIVE" },
            orderBy: { id: "asc" },
            include: {
              specification: true,
              ports: true,
              features: true,
              tags: { include: { tag: true } },
            },
          },
        },
      });
    });

    if (!created) {
      throw new NotFoundException(
        "Product disappeared while creating the variant.",
      );
    }

    const createdVariant = created.variants.find(
      (variant) => variant.sku === sku,
    );

    await this.auditService.log({
      userAccountId: createdByUserId,
      action: "CREATE",
      module: "catalogue",
      entityType: "ProductVariant",
      entityId:
        createdVariant?.id.toString() ?? productId.toString(),
      description: `Created catalogue variant ${sku} for ${product.name}.`,
      newData: {
        productId: productId.toString(),
        variantId: createdVariant?.id.toString() ?? null,
        sku,
        status: "ACTIVE",
      },
    });

    return toJsonSafe(created);
  }

  /* ---------------------------------------------------------------
   * Variant lifecycle
   * --------------------------------------------------------------- */

  async deactivateStaffVariant(
    productId: bigint,
    variantId: bigint,
    updatedByUserId: bigint,
  ) {
    const variant = await this.prisma.productVariant.findFirst({
      where: { id: variantId, productId, status: "ACTIVE" },
      select: {
        id: true,
        sku: true,
        status: true,
        product: { select: { id: true, name: true, status: true } },
        inventories: { select: { quantityReserved: true } },
      },
    });

    if (!variant) {
      throw new NotFoundException(
        "Active product variant not found.",
      );
    }

    const activeVariantCount = await this.prisma.productVariant.count({
      where: { productId, status: "ACTIVE" },
    });

    if (activeVariantCount <= 1) {
      throw new BadRequestException(
        "Cannot deactivate the last active variant. Create another variant first.",
      );
    }

    const reservedQuantity = variant.inventories.reduce(
      (total, inventory) => total + inventory.quantityReserved,
      0,
    );

    if (reservedQuantity > 0) {
      throw new ConflictException(
        "Cannot deactivate a variant with reserved inventory.",
      );
    }

    const updated = await this.prisma.productVariant.update({
      where: { id: variantId },
      data: { status: "INACTIVE" },
      select: {
        id: true,
        productId: true,
        sku: true,
        variantName: true,
        status: true,
      },
    });

    await this.auditService.log({
      userAccountId: updatedByUserId,
      action: "UPDATE",
      module: "catalogue",
      entityType: "ProductVariant",
      entityId: variantId.toString(),
      description: `Deactivated catalogue variant ${variant.sku} for ${variant.product.name}.`,
      oldData: {
        productId: productId.toString(),
        sku: variant.sku,
        status: "ACTIVE",
      },
      newData: {
        productId: productId.toString(),
        sku: variant.sku,
        status: "INACTIVE",
      },
    });

    return toJsonSafe(updated);
  }

  async activateStaffVariant(
    productId: bigint,
    variantId: bigint,
    updatedByUserId: bigint,
  ) {
    const variant = await this.prisma.productVariant.findFirst({
      where: { id: variantId, productId, status: "INACTIVE" },
      select: {
        id: true,
        sku: true,
        status: true,
        product: { select: { id: true, name: true, status: true } },
      },
    });

    if (!variant) {
      throw new NotFoundException(
        "Inactive product variant not found.",
      );
    }

    const updated = await this.prisma.productVariant.update({
      where: { id: variantId },
      data: { status: "ACTIVE" },
      select: {
        id: true,
        productId: true,
        sku: true,
        variantName: true,
        status: true,
      },
    });

    await this.auditService.log({
      userAccountId: updatedByUserId,
      action: "UPDATE",
      module: "catalogue",
      entityType: "ProductVariant",
      entityId: variantId.toString(),
      description: `Activated catalogue variant ${variant.sku} for ${variant.product.name}.`,
      oldData: {
        productId: productId.toString(),
        sku: variant.sku,
        status: "INACTIVE",
      },
      newData: {
        productId: productId.toString(),
        sku: variant.sku,
        status: "ACTIVE",
      },
    });

    return toJsonSafe(updated);
  }

  /* ---------------------------------------------------------------
   * Publish
   * --------------------------------------------------------------- */

  async publishStaffProduct(
    productId: bigint,
    publishedByUserId: bigint,
  ) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        variants: {
          where: { status: "ACTIVE" },
          select: {
            id: true,
            sku: true,
            sellingPrice: true,
            status: true,
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException("Product not found.");
    }

    if (product.variants.length === 0) {
      throw new BadRequestException(
        "Product must have at least one active variant before publishing.",
      );
    }

    if (product.status === "PUBLISHED") {
      throw new ConflictException("Product is already published.");
    }

    const updated = await this.prisma.$transaction((tx) =>
      tx.product.update({
        where: { id: productId },
        data: {
          status: "PUBLISHED",
          updatedByUserId: publishedByUserId,
        },
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          updatedAt: true,
          brand: { select: { id: true, name: true } },
          category: { select: { id: true, name: true } },
          variants: {
            where: { status: "ACTIVE" },
            select: {
              id: true,
              sku: true,
              sellingPrice: true,
              status: true,
            },
          },
        },
      }),
    );

    await this.auditService.log({
      userAccountId: publishedByUserId,
      action: "PUBLISH",
      module: "catalogue",
      entityType: "Product",
      entityId: productId.toString(),
      description: `Published catalogue product ${updated.name}.`,
      oldData: toJsonSafe(product),
      newData: toJsonSafe(updated),
    });

    return toJsonSafe(updated);
  }

  /* ---------------------------------------------------------------
   * Public reads
   * --------------------------------------------------------------- */

  async findProductBySlug(slug: string) {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        modelNumber: true,
        manufacturerPartNumber: true,
        shortDescription: true,
        description: true,
        productType: true,
        status: true,
        brand: {
          select: { id: true, name: true, slug: true, logoUrl: true },
        },
        category: { select: { id: true, name: true, slug: true } },
        media: {
          orderBy: { displayOrder: "asc" },
          select: {
            id: true,
            mediaType: true,
            url: true,
            storageKey: true,
            altText: true,
            width: true,
            height: true,
            displayOrder: true,
            isPrimary: true,
          },
        },
        options: {
          orderBy: { displayOrder: "asc" },
          select: {
            id: true,
            name: true,
            displayOrder: true,
            values: {
              orderBy: { displayOrder: "asc" },
              select: {
                id: true,
                value: true,
                displayOrder: true,
                metaobjectEntry: {
                  select: {
                    id: true,
                    handle: true,
                    displayName: true,
                    fields: true,
                  },
                },
              },
            },
          },
        },
        variants: {
          where: { status: "ACTIVE" },
          orderBy: { sellingPrice: "asc" },
          select: {
            id: true,
            sku: true,
            variantName: true,
            color: true,
            ramGb: true,
            storageGb: true,
            operatingSystem: true,
            basePrice: true,
            sellingPrice: true,
            compareAtPrice: true,
            currency: true,
            warrantyMonths: true,
            specification: true,
            optionValues: {
              select: {
                productOptionId: true,
                productOptionValueId: true,
                productOption: {
                  select: { id: true, name: true },
                },
                productOptionValue: {
                  select: { id: true, value: true },
                },
              },
            },
            inventories: {
              select: {
                quantityAvailable: true,
              },
            },
            ports: {
              orderBy: { portType: "asc" },
              select: {
                id: true,
                portType: true,
                quantity: true,
                version: true,
                supportsCharging: true,
                supportsDisplay: true,
              },
            },
            features: {
              orderBy: { featureType: "asc" },
              select: {
                id: true,
                featureType: true,
                featureName: true,
                description: true,
                score: true,
              },
            },
          },
        },
      },
    });

    if (!product || product.status !== "PUBLISHED") {
      throw new NotFoundException("Product not found");
    }

    return toJsonSafe(product);
  }

  async findBrands() {
    const brands = await this.prisma.brand.findMany({
      where: { status: "ACTIVE" },
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true, logoUrl: true },
    });

    return toJsonSafe(brands);
  }

  async findCategories() {
    const categories = await this.prisma.category.findMany({
      where: { status: "ACTIVE" },
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        parentId: true,
        name: true,
        slug: true,
        description: true,
        imageUrl: true,
      },
    });

    return toJsonSafe(categories);
  }

  async findCollections() {
    const collections = await this.prisma.collection.findMany({
      where: { status: "ACTIVE" },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        bannerImage: true,
      },
    });

    return toJsonSafe(collections);
  }

  /* ---------------------------------------------------------------
   * Taxonomy — brands
   * --------------------------------------------------------------- */

  async findStaffBrands(params: {
    search?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  }) {
    const page = Math.max(params.page ?? 1, 1);
    const pageSize = Math.min(
      Math.max(params.pageSize ?? 24, 1),
      100,
    );
    const search = params.search?.trim();
    const status = params.status?.trim().toUpperCase();

    const where = {
      ...(status ? { status } : {}),
      ...(search
        ? {
          OR: [
            {
              name: {
                contains: search,
                mode: "insensitive" as const,
              },
            },
            {
              slug: {
                contains: search,
                mode: "insensitive" as const,
              },
            },
          ],
        }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.brand.findMany({
        where,
        orderBy: { name: "asc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          logoUrl: true,
          websiteUrl: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          _count: { select: { products: true } },
        },
      }),
      this.prisma.brand.count({ where }),
    ]);

    return toJsonSafe({
      items: items.map((item) => ({
        ...item,
        productCount: item._count.products,
        _count: undefined,
      })),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  }

  async createStaffBrand(
    input: {
      name: string;
      slug?: string;
      description?: string | null;
      logoUrl?: string | null;
      websiteUrl?: string | null;
    },
    createdByUserId: bigint,
  ) {
    const name = input.name?.trim();

    if (!name) {
      throw new BadRequestException("Brand name is required.");
    }

    const slug = input.slug?.trim() || this.slugify(name);

    if (!slug) {
      throw new BadRequestException("A valid brand slug is required.");
    }

    const existingSlug = await this.prisma.brand.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (existingSlug) {
      throw new ConflictException(
        "A brand with this slug already exists.",
      );
    }

    const existingName = await this.prisma.brand.findFirst({
      where: {
        name: {
          equals: name,
          mode: "insensitive",
        },
      },
      select: { id: true },
    });

    if (existingName) {
      throw new ConflictException(
        "A brand with this name already exists.",
      );
    }

    const description = input.description?.trim() || null;
    if (description && description.length > 500) {
      throw new BadRequestException(
        "Brand description must not exceed 500 characters.",
      );
    }

    const created = await this.prisma.brand.create({
      data: {
        name,
        slug,
        description,
        logoUrl: input.logoUrl?.trim() || null,
        websiteUrl: input.websiteUrl?.trim() || null,
        status: "ACTIVE",
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        logoUrl: true,
        websiteUrl: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await this.auditService.log({
      userAccountId: createdByUserId,
      action: "CREATE",
      module: "catalogue",
      entityType: "Brand",
      entityId: created.id.toString(),
      description: `Created brand ${created.name}.`,
      newData: toJsonSafe(created),
    });

    return toJsonSafe(created);
  }

  async updateStaffBrand(
    brandId: number,
    input: {
      name?: string;
      slug?: string;
      description?: string | null;
      logoUrl?: string | null;
      websiteUrl?: string | null;
      status?: string;
    },
    updatedByUserId: bigint,
  ) {
    if (!Number.isInteger(brandId) || brandId <= 0) {
      throw new BadRequestException("brandId must be a positive integer.");
    }

    const brand = await this.prisma.brand.findUnique({
      where: { id: brandId },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        logoUrl: true,
        websiteUrl: true,
        status: true,
      },
    });

    if (!brand) {
      throw new NotFoundException("Brand not found.");
    }

    let nextSlug: string | undefined;

    let nextName: string | undefined;
    if (input.name !== undefined) {
      const candidateName = input.name.trim();
      if (!candidateName) {
        throw new BadRequestException("Brand name cannot be empty.");
      }
      if (candidateName.toLowerCase() !== brand.name.toLowerCase()) {
        const conflictName = await this.prisma.brand.findFirst({
          where: {
            id: { not: brandId },
            name: {
              equals: candidateName,
              mode: "insensitive",
            },
          },
          select: { id: true },
        });
        if (conflictName) {
          throw new ConflictException(
            "A brand with this name already exists.",
          );
        }
      }
      nextName = candidateName;
    }

    if (input.slug !== undefined) {
      const candidate = input.slug.trim();
      if (!candidate) {
        throw new BadRequestException("Brand slug cannot be empty.");
      }
      if (candidate !== brand.slug) {
        const conflict = await this.prisma.brand.findUnique({
          where: { slug: candidate },
          select: { id: true },
        });
        if (conflict) {
          throw new ConflictException(
            "A brand with this slug already exists.",
          );
        }
      }
      nextSlug = candidate;
    }

    let nextDescription: string | null | undefined;
    if (input.description !== undefined) {
      const trimmedDesc = input.description?.trim() || null;
      if (trimmedDesc && trimmedDesc.length > 500) {
        throw new BadRequestException(
          "Brand description must not exceed 500 characters.",
        );
      }
      nextDescription = trimmedDesc;
    }

    const updated = await this.prisma.brand.update({
      where: { id: brandId },
      data: {
        ...(nextName !== undefined ? { name: nextName } : {}),
        ...(nextSlug !== undefined ? { slug: nextSlug } : {}),
        ...(input.description !== undefined
          ? { description: nextDescription }
          : {}),
        ...(input.logoUrl !== undefined
          ? { logoUrl: input.logoUrl?.trim() || null }
          : {}),
        ...(input.websiteUrl !== undefined
          ? { websiteUrl: input.websiteUrl?.trim() || null }
          : {}),
        ...(input.status !== undefined
          ? { status: input.status.trim().toUpperCase() }
          : {}),
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        logoUrl: true,
        websiteUrl: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await this.auditService.log({
      userAccountId: updatedByUserId,
      action: "UPDATE",
      module: "catalogue",
      entityType: "Brand",
      entityId: brandId.toString(),
      description: `Updated brand ${updated.name}.`,
      oldData: toJsonSafe(brand),
      newData: toJsonSafe(updated),
    });

    return toJsonSafe(updated);
  }

  async deactivateStaffBrand(
    brandId: number,
    updatedByUserId: bigint,
  ) {
    if (!Number.isInteger(brandId) || brandId <= 0) {
      throw new BadRequestException("brandId must be a positive integer.");
    }

    const brand = await this.prisma.brand.findUnique({
      where: { id: brandId },
      select: { id: true, name: true, status: true },
    });

    if (!brand) {
      throw new NotFoundException("Brand not found.");
    }

    if (brand.status === "INACTIVE") {
      throw new ConflictException("Brand is already inactive.");
    }

    const productCount = await this.prisma.product.count({
      where: { brandId },
    });

    const updated = await this.prisma.brand.update({
      where: { id: brandId },
      data: { status: "INACTIVE" },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
      },
    });

    await this.auditService.log({
      userAccountId: updatedByUserId,
      action: "UPDATE",
      module: "catalogue",
      entityType: "Brand",
      entityId: brandId.toString(),
      description: `Deactivated brand ${updated.name}${productCount > 0
        ? ` (still referenced by ${productCount} product${productCount === 1 ? "" : "s"
        })`
        : ""
        }.`,
      oldData: { status: brand.status },
      newData: { status: updated.status },
    });

    return toJsonSafe(updated);
  }

  async deleteStaffBrand(
    brandId: number,
    deletedByUserId: bigint,
  ) {
    if (!Number.isInteger(brandId) || brandId <= 0) {
      throw new BadRequestException("brandId must be a positive integer.");
    }

    const brand = await this.prisma.brand.findUnique({
      where: { id: brandId },
      select: {
        id: true,
        name: true,
        slug: true,
        _count: {
          select: { products: true },
        },
      },
    });

    if (!brand) {
      throw new NotFoundException("Brand not found.");
    }

    if (brand._count.products > 0) {
      throw new ConflictException(
        `Cannot delete brand "${brand.name}" because it is currently assigned to ${brand._count.products} product${
          brand._count.products === 1 ? "" : "s"
        }. Please reassign or delete those products first, or deactivate the brand instead.`,
      );
    }

    await this.prisma.brand.delete({
      where: { id: brandId },
    });

    await this.auditService.log({
      userAccountId: deletedByUserId,
      action: "DELETE",
      module: "catalogue",
      entityType: "Brand",
      entityId: brandId.toString(),
      description: `Deleted brand ${brand.name}.`,
      oldData: toJsonSafe(brand),
    });

    return { id: brandId, deleted: true };
  }

  /* ---------------------------------------------------------------
   * Taxonomy — categories
   * --------------------------------------------------------------- */

  async findStaffCategories() {
    const rows = await this.prisma.category.findMany({
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        parentId: true,
        name: true,
        slug: true,
        description: true,
        imageUrl: true,
        displayOrder: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { products: true, children: true } },
      },
    });

    type CategoryRow = (typeof rows)[number];
    type Node = ReturnType<typeof serialize> & { children: Node[] };

    const serialize = (row: CategoryRow) => ({
      id: row.id,
      parentId: row.parentId,
      name: row.name,
      slug: row.slug,
      description: row.description,
      imageUrl: row.imageUrl,
      displayOrder: row.displayOrder,
      status: row.status,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      productCount: row._count.products,
      childCount: row._count.children,
    });

    const byId = new Map<number, Node>();
    for (const row of rows) {
      byId.set(row.id, { ...serialize(row), children: [] });
    }

    const roots: Node[] = [];
    for (const node of byId.values()) {
      if (node.parentId && byId.has(node.parentId)) {
        byId.get(node.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }

    return toJsonSafe(roots);
  }

  async createStaffCategory(
    input: {
      name: string;
      slug?: string;
      description?: string | null;
      imageUrl?: string | null;
      parentId?: number | null;
      displayOrder?: number;
    },
    createdByUserId: bigint,
  ) {
    const name = input.name?.trim();

    if (!name) {
      throw new BadRequestException("Category name is required.");
    }

    const slug = input.slug?.trim() || this.slugify(name);

    if (!slug) {
      throw new BadRequestException(
        "A valid category slug is required.",
      );
    }

    const existing = await this.prisma.category.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException(
        "A category with this slug already exists.",
      );
    }

    if (input.parentId !== undefined && input.parentId !== null) {
      if (!Number.isInteger(input.parentId) || input.parentId <= 0) {
        throw new BadRequestException(
          "parentId must be a positive integer or null.",
        );
      }
      const parent = await this.prisma.category.findUnique({
        where: { id: input.parentId },
        select: { id: true },
      });
      if (!parent) {
        throw new NotFoundException("Parent category not found.");
      }
    }

    const description = input.description?.trim() || null;
    if (description && description.length > 500) {
      throw new BadRequestException(
        "Category description must not exceed 500 characters.",
      );
    }

    const created = await this.prisma.category.create({
      data: {
        name,
        slug,
        description,
        imageUrl: input.imageUrl?.trim() || null,
        parentId: input.parentId ?? null,
        displayOrder: input.displayOrder ?? 0,
        status: "ACTIVE",
      },
      select: {
        id: true,
        parentId: true,
        name: true,
        slug: true,
        description: true,
        imageUrl: true,
        displayOrder: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await this.auditService.log({
      userAccountId: createdByUserId,
      action: "CREATE",
      module: "catalogue",
      entityType: "Category",
      entityId: created.id.toString(),
      description: `Created category ${created.name}.`,
      newData: toJsonSafe(created),
    });

    return toJsonSafe(created);
  }

  private async assertNoCategoryCycle(
    categoryId: number,
    nextParentId: number | null | undefined,
  ) {
    if (nextParentId === undefined || nextParentId === null) return;

    let cursor: number | null = nextParentId;
    const visited = new Set<number>([categoryId]);

    while (cursor !== null) {
      if (visited.has(cursor)) {
        throw new BadRequestException(
          "Category parent assignment would create a cycle.",
        );
      }
      visited.add(cursor);

      const parent: { parentId: number | null } | null =
        await this.prisma.category.findUnique({
          where: { id: cursor },
          select: { parentId: true },
        });

      if (!parent) return;
      cursor = parent.parentId;
    }
  }

  async updateStaffCategory(
    categoryId: number,
    input: {
      name?: string;
      slug?: string;
      description?: string | null;
      imageUrl?: string | null;
      parentId?: number | null;
      displayOrder?: number;
      status?: string;
    },
    updatedByUserId: bigint,
  ) {
    if (!Number.isInteger(categoryId) || categoryId <= 0) {
      throw new BadRequestException(
        "categoryId must be a positive integer.",
      );
    }

    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
      select: {
        id: true,
        parentId: true,
        name: true,
        slug: true,
        description: true,
        imageUrl: true,
        displayOrder: true,
        status: true,
      },
    });

    if (!category) {
      throw new NotFoundException("Category not found.");
    }

    let nextSlug: string | undefined;

    if (input.slug !== undefined) {
      const candidate = input.slug.trim();
      if (!candidate) {
        throw new BadRequestException(
          "Category slug cannot be empty.",
        );
      }
      if (candidate !== category.slug) {
        const conflict = await this.prisma.category.findUnique({
          where: { slug: candidate },
          select: { id: true },
        });
        if (conflict) {
          throw new ConflictException(
            "A category with this slug already exists.",
          );
        }
      }
      nextSlug = candidate;
    }

    if (input.parentId !== undefined) {
      if (input.parentId === categoryId) {
        throw new BadRequestException(
          "A category cannot be its own parent.",
        );
      }
      if (input.parentId !== null) {
        if (!Number.isInteger(input.parentId) || input.parentId <= 0) {
          throw new BadRequestException(
            "parentId must be a positive integer or null.",
          );
        }
        const parent = await this.prisma.category.findUnique({
          where: { id: input.parentId },
          select: { id: true },
        });
        if (!parent) {
          throw new NotFoundException("Parent category not found.");
        }
        await this.assertNoCategoryCycle(categoryId, input.parentId);
      }
    }

    let nextDescription: string | null | undefined;
    if (input.description !== undefined) {
      const trimmedDesc = input.description?.trim() || null;
      if (trimmedDesc && trimmedDesc.length > 500) {
        throw new BadRequestException(
          "Category description must not exceed 500 characters.",
        );
      }
      nextDescription = trimmedDesc;
    }

    const updated = await this.prisma.category.update({
      where: { id: categoryId },
      data: {
        ...(input.name !== undefined
          ? { name: input.name.trim() || category.name }
          : {}),
        ...(nextSlug !== undefined ? { slug: nextSlug } : {}),
        ...(input.description !== undefined
          ? { description: nextDescription }
          : {}),
        ...(input.imageUrl !== undefined
          ? { imageUrl: input.imageUrl?.trim() || null }
          : {}),
        ...(input.parentId !== undefined
          ? { parentId: input.parentId }
          : {}),
        ...(input.displayOrder !== undefined
          ? { displayOrder: input.displayOrder }
          : {}),
        ...(input.status !== undefined
          ? { status: input.status.trim().toUpperCase() }
          : {}),
      },
      select: {
        id: true,
        parentId: true,
        name: true,
        slug: true,
        description: true,
        imageUrl: true,
        displayOrder: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await this.auditService.log({
      userAccountId: updatedByUserId,
      action: "UPDATE",
      module: "catalogue",
      entityType: "Category",
      entityId: categoryId.toString(),
      description: `Updated category ${updated.name}.`,
      oldData: toJsonSafe(category),
      newData: toJsonSafe(updated),
    });

    return toJsonSafe(updated);
  }

  async deactivateStaffCategory(
    categoryId: number,
    updatedByUserId: bigint,
  ) {
    if (!Number.isInteger(categoryId) || categoryId <= 0) {
      throw new BadRequestException(
        "categoryId must be a positive integer.",
      );
    }

    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
      select: { id: true, name: true, status: true },
    });

    if (!category) {
      throw new NotFoundException("Category not found.");
    }

    if (category.status === "INACTIVE") {
      throw new ConflictException("Category is already inactive.");
    }

    const [childCount, productCount] = await Promise.all([
      this.prisma.category.count({ where: { parentId: categoryId } }),
      this.prisma.product.count({ where: { categoryId } }),
    ]);

    const updated = await this.prisma.category.update({
      where: { id: categoryId },
      data: { status: "INACTIVE" },
      select: {
        id: true,
        parentId: true,
        name: true,
        slug: true,
        status: true,
      },
    });

    await this.auditService.log({
      userAccountId: updatedByUserId,
      action: "UPDATE",
      module: "catalogue",
      entityType: "Category",
      entityId: categoryId.toString(),
      description: `Deactivated category ${updated.name}${productCount > 0 || childCount > 0
        ? ` (still referenced by ${productCount} product${productCount === 1 ? "" : "s"
        }, ${childCount} child categor${childCount === 1 ? "y" : "ies"
        })`
        : ""
        }.`,
      oldData: { status: category.status },
      newData: { status: updated.status },
    });

    return toJsonSafe(updated);
  }

  async deleteStaffCategory(
    categoryId: number,
    deletedByUserId: bigint,
  ) {
    if (!Number.isInteger(categoryId) || categoryId <= 0) {
      throw new BadRequestException(
        "categoryId must be a positive integer.",
      );
    }

    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
      select: {
        id: true,
        name: true,
        slug: true,
        _count: {
          select: { products: true, children: true },
        },
      },
    });

    if (!category) {
      throw new NotFoundException("Category not found.");
    }

    if (category._count.children > 0) {
      throw new ConflictException(
        `Cannot delete category "${category.name}" because it contains ${category._count.children} child categor${
          category._count.children === 1 ? "y" : "ies"
        }. Please reassign or delete the subcategories first.`,
      );
    }

    if (category._count.products > 0) {
      throw new ConflictException(
        `Cannot delete category "${category.name}" because it is currently assigned to ${category._count.products} product${
          category._count.products === 1 ? "" : "s"
        }. Please reassign or delete those products first, or deactivate the category instead.`,
      );
    }

    await this.prisma.category.delete({
      where: { id: categoryId },
    });

    await this.auditService.log({
      userAccountId: deletedByUserId,
      action: "DELETE",
      module: "catalogue",
      entityType: "Category",
      entityId: categoryId.toString(),
      description: `Deleted category ${category.name}.`,
      oldData: toJsonSafe(category),
    });

    return { id: categoryId, deleted: true };
  }

  /* ===============================================================
   * PRODUCT OPTIONS
   * =============================================================== */

  async findStaffProductOptions(productId: bigint) {
    const options = await this.prisma.productOption.findMany({
      where: { productId },
      orderBy: [{ displayOrder: "asc" }, { id: "asc" }],
      include: {
        values: {
          orderBy: [{ displayOrder: "asc" }, { id: "asc" }],
          include: {
            metaobjectEntry: {
              select: {
                id: true,
                handle: true,
                displayName: true,
                fields: true,
              },
            },
          },
        },
      },
    });

    return options.map((option) => this.serializeProductOption(option));
  }

  async createStaffProductOption(
    productId: bigint,
    input: CreateStaffProductOptionInput,
    createdByUserId: bigint,
  ) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, name: true },
    });

    if (!product) {
      throw new NotFoundException("Product not found.");
    }

    const name = input.name?.trim();
    if (!name) {
      throw new BadRequestException("Option name is required.");
    }

    const existing = await this.prisma.productOption.findFirst({
      where: { productId, name: { equals: name, mode: "insensitive" } },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException(
        "An option with this name already exists on this product.",
      );
    }

    const maxOrder = await this.prisma.productOption.aggregate({
      where: { productId },
      _max: { displayOrder: true },
    });

    const created = await this.prisma.$transaction(async (tx) => {
      const option = await tx.productOption.create({
        data: {
          productId,
          name,
          displayOrder:
            input.displayOrder ?? (maxOrder._max.displayOrder ?? -1) + 1,
        },
        select: { id: true },
      });

      const values = Array.isArray(input.values)
        ? input.values
          .map((v) => (typeof v === "string" ? v.trim() : ""))
          .filter((v) => v.length > 0)
        : [];

      if (values.length > 0) {
        await tx.productOptionValue.createMany({
          data: values.map((value, index) => ({
            productOptionId: option.id,
            value,
            displayOrder: index,
          })),
        });
      }

      const withValues = await tx.productOption.findUniqueOrThrow({
        where: { id: option.id },
        include: {
          values: {
            orderBy: [{ displayOrder: "asc" }, { id: "asc" }],
            include: {
              metaobjectEntry: {
                select: {
                  id: true,
                  handle: true,
                  displayName: true,
                  fields: true,
                },
              },
            },
          },
        },
      });

      return withValues;
    });

    await this.auditService.log({
      userAccountId: createdByUserId,
      action: "CREATE",
      module: "catalogue",
      entityType: "ProductOption",
      entityId: created.id.toString(),
      description: `Created option ${created.name} on ${product.name}.`,
      newData: {
        productId: productId.toString(),
        optionId: created.id.toString(),
        name: created.name,
      },
    });

    return this.serializeProductOption(created);
  }

  async updateStaffProductOption(
    productId: bigint,
    optionId: bigint,
    input: UpdateStaffProductOptionInput,
    updatedByUserId: bigint,
  ) {
    const option = await this.prisma.productOption.findFirst({
      where: { id: optionId, productId },
      select: { id: true, name: true, displayOrder: true },
    });

    if (!option) {
      throw new NotFoundException("Option not found.");
    }

    const nextName =
      input.name !== undefined ? input.name.trim() : option.name;

    if (!nextName) {
      throw new BadRequestException("Option name cannot be empty.");
    }

    if (nextName !== option.name) {
      const conflict = await this.prisma.productOption.findFirst({
        where: { productId, name: nextName, id: { not: optionId } },
        select: { id: true },
      });
      if (conflict) {
        throw new ConflictException(
          "Another option on this product already has that name.",
        );
      }
    }

    const updated = await this.prisma.productOption.update({
      where: { id: optionId },
      data: {
        ...(input.name !== undefined ? { name: nextName } : {}),
        ...(input.displayOrder !== undefined
          ? { displayOrder: input.displayOrder }
          : {}),
      },
      include: {
        values: {
          orderBy: [{ displayOrder: "asc" }, { id: "asc" }],
          include: {
            metaobjectEntry: {
              select: {
                id: true,
                handle: true,
                displayName: true,
                fields: true,
              },
            },
          },
        },
      },
    });

    await this.auditService.log({
      userAccountId: updatedByUserId,
      action: "UPDATE",
      module: "catalogue",
      entityType: "ProductOption",
      entityId: optionId.toString(),
      description: `Updated option ${nextName}.`,
      oldData: { name: option.name, displayOrder: option.displayOrder },
      newData: { name: nextName, displayOrder: input.displayOrder },
    });

    return this.serializeProductOption(updated);
  }

  async deleteStaffProductOption(
    productId: bigint,
    optionId: bigint,
    deletedByUserId: bigint,
  ) {
    const option = await this.prisma.productOption.findFirst({
      where: { id: optionId, productId },
      select: { id: true, name: true },
    });

    if (!option) {
      throw new NotFoundException("Option not found.");
    }

    await this.prisma.productOption.delete({
      where: { id: optionId },
    });

    await this.auditService.log({
      userAccountId: deletedByUserId,
      action: "DELETE",
      module: "catalogue",
      entityType: "ProductOption",
      entityId: optionId.toString(),
      description: `Deleted option ${option.name}.`,
      oldData: { productId: productId.toString(), name: option.name },
    });

    return this.findStaffProductOptions(productId);
  }

  async addStaffProductOptionValue(
    productId: bigint,
    optionId: bigint,
    input: AddStaffProductOptionValueInput,
    userId: bigint,
  ) {
    const option = await this.prisma.productOption.findFirst({
      where: { id: optionId, productId },
    });
    if (!option) {
      throw new NotFoundException("Option not found on this product.");
    }

    const value = input.value.trim();
    if (!value) {
      throw new BadRequestException("Value is required.");
    }

    let metaobjectEntryId: bigint | null = null;
    if (input.metaobjectEntryId != null && input.metaobjectEntryId !== "") {
      metaobjectEntryId = BigInt(String(input.metaobjectEntryId));

      const entry = await this.prisma.metaobjectEntry.findUnique({
        where: { id: metaobjectEntryId },
        select: { id: true },
      });
      if (!entry) {
        throw new NotFoundException("Metaobject entry not found.");
      }
    }

    const existing = await this.prisma.productOptionValue.findFirst({
      where: { productOptionId: option.id, value: { equals: value, mode: "insensitive" } },
    });
    if (existing) {
      throw new BadRequestException(
        `Value "${value}" already exists on this option.`,
      );
    }

    const nextDisplayOrder =
      input.displayOrder ??
      ((await this.prisma.productOptionValue.count({
        where: { productOptionId: option.id },
      })) + 1);

    const created = await this.prisma.productOptionValue.create({
      data: {
        productOptionId: option.id,
        value,
        displayOrder: nextDisplayOrder,
        metaobjectEntryId,
      },
      include: {
        metaobjectEntry: {
          select: {
            id: true,
            handle: true,
            displayName: true,
            fields: true,
          },
        },
      },
    });

    return {
      id: String(created.id),
      value: created.value,
      displayOrder: created.displayOrder,
      metaobjectEntryId:
        created.metaobjectEntryId != null
          ? String(created.metaobjectEntryId)
          : null,
      metaobjectEntry: created.metaobjectEntry
        ? {
          id: String(created.metaobjectEntry.id),
          handle: created.metaobjectEntry.handle,
          displayName: created.metaobjectEntry.displayName,
          fields: created.metaobjectEntry.fields,
        }
        : null,
    };
  }

  async updateStaffProductOptionValue(
    productId: bigint,
    optionId: bigint,
    valueId: bigint,
    input: UpdateStaffProductOptionValueInput,
    userId: bigint,
  ) {
    const existing = await this.prisma.productOptionValue.findFirst({
      where: {
        id: valueId,
        productOptionId: optionId,
        productOption: { productId },
      },
    });
    if (!existing) {
      throw new NotFoundException("Option value not found.");
    }

    const data: Record<string, unknown> = {};

    if (input.value !== undefined) {
      const trimmed = input.value.trim();
      if (!trimmed) {
        throw new BadRequestException("Value cannot be empty.");
      }
      data.value = trimmed;
    }

    if (input.displayOrder !== undefined) {
      data.displayOrder = input.displayOrder;
    }

    if (input.metaobjectEntryId !== undefined) {
      if (
        input.metaobjectEntryId === null ||
        input.metaobjectEntryId === ""
      ) {
        data.metaobjectEntryId = null;
      } else {
        data.metaobjectEntryId = BigInt(String(input.metaobjectEntryId));
      }
    }

    const updated = await this.prisma.productOptionValue.update({
      where: { id: existing.id },
      data,
      include: {
        metaobjectEntry: {
          select: {
            id: true,
            handle: true,
            displayName: true,
            fields: true,
          },
        },
      },
    });

    return {
      id: String(updated.id),
      value: updated.value,
      displayOrder: updated.displayOrder,
      metaobjectEntryId:
        updated.metaobjectEntryId != null
          ? String(updated.metaobjectEntryId)
          : null,
      metaobjectEntry: updated.metaobjectEntry
        ? {
          id: String(updated.metaobjectEntry.id),
          handle: updated.metaobjectEntry.handle,
          displayName: updated.metaobjectEntry.displayName,
          fields: updated.metaobjectEntry.fields,
        }
        : null,
    };
  }

  async deleteStaffProductOptionValue(
    productId: bigint,
    optionId: bigint,
    valueId: bigint,
    deletedByUserId: bigint,
  ) {
    const value = await this.prisma.productOptionValue.findFirst({
      where: { id: valueId, productOptionId: optionId },
      select: {
        id: true,
        value: true,
        productOption: {
          select: { id: true, productId: true, name: true },
        },
        _count: { select: { variantLinks: true } },
      },
    });

    if (!value || value.productOption.productId !== productId) {
      throw new NotFoundException("Option value not found.");
    }

    if (value._count.variantLinks > 0) {
      throw new ConflictException(
        `This value is still linked to ${value._count.variantLinks} variant${value._count.variantLinks === 1 ? "" : "s"
        }. Remove it from those variants first.`,
      );
    }

    await this.prisma.productOptionValue.delete({
      where: { id: valueId },
    });

    await this.auditService.log({
      userAccountId: deletedByUserId,
      action: "DELETE",
      module: "catalogue",
      entityType: "ProductOptionValue",
      entityId: valueId.toString(),
      description: `Deleted value ${value.value} from option ${value.productOption.name}.`,
      oldData: {
        productId: productId.toString(),
        optionId: optionId.toString(),
        value: value.value,
      },
    });

    return this.findStaffProductOptions(productId);
  }


  /* ===============================================================
 * VARIANT MATRIX GENERATION
 * =============================================================== */

  /**
   * Reads the product's options + values, computes the cartesian product,
   * and creates/deactivates/removes variants so the product has exactly
   * one variant per combination of option values.
   *
   * Policy:
   *  - Create: missing combinations inherit from variants[0].
   *  - Remove: variants whose combination no longer exists are deleted IF
   *    they're not referenced by order/cart/device/inventory; otherwise
   *    they are set to INACTIVE.
   *  - Cap: 200 variants per product, to prevent accidental blowups.
   */
  async syncStaffVariantMatrix(
    productId: bigint,
    updatedByUserId: bigint,
  ): Promise<SyncVariantMatrixResult> {
    const MAX_VARIANTS = 200;

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        name: true,
        options: {
          orderBy: [{ displayOrder: "asc" }, { id: "asc" }],
          select: {
            id: true,
            name: true,
            displayOrder: true,
            values: {
              orderBy: [{ displayOrder: "asc" }, { id: "asc" }],
              select: {
                id: true,
                value: true,
                displayOrder: true,
                metaobjectEntryId: true,
                metaobjectEntry: {
                  select: {
                    id: true,
                    handle: true,
                    displayName: true,
                    fields: true,
                  },
                },
              },
            },
          },
        },
        variants: {
          orderBy: { id: "asc" },
          select: {
            id: true,
            sku: true,
            variantName: true,
            color: true,
            ramGb: true,
            storageGb: true,
            operatingSystem: true,
            basePrice: true,
            sellingPrice: true,
            compareAtPrice: true,
            currency: true,
            warrantyMonths: true,
            status: true,
            specification: true,
            ports: true,
            features: true,
            tags: { select: { tagId: true } },
            optionValues: {
              select: {
                productOptionId: true,
                productOptionValueId: true,
              },
            },
            inventories: {
              select: {
                quantityAvailable: true,
                quantityReserved: true,
              },
            },
            _count: {
              select: {
                orderItems: true,
                cartItems: true,
                deviceAssets: true,
              },
            },
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException("Product not found.");
    }

    // ---- Compute the cartesian product of option values ----
    type Combination = Map<bigint, bigint>; // optionId -> valueId

    const optionsWithValues = product.options.filter(
      (o) => o.values.length > 0,
    );

    if (optionsWithValues.length === 0) {
      throw new BadRequestException(
        "Add at least one option with values before generating variants.",
      );
    }

    let combinations: Combination[] = [new Map()];
    for (const option of optionsWithValues) {
      const next: Combination[] = [];
      for (const partial of combinations) {
        for (const value of option.values) {
          const copy = new Map(partial);
          copy.set(option.id, value.id);
          next.push(copy);
        }
      }
      combinations = next;
      if (combinations.length > MAX_VARIANTS) {
        throw new BadRequestException(
          `This option set would create ${combinations.length} variants, which exceeds the ${MAX_VARIANTS}-variant cap. Reduce option values or split into multiple products.`,
        );
      }
    }

    // ---- Build signature keys for existing variants ----
    const optionIdsSorted = optionsWithValues.map((o) => o.id);

    const signatureFor = (links: { productOptionId: bigint; productOptionValueId: bigint }[]) => {
      const map = new Map<bigint, bigint>();
      for (const l of links) map.set(l.productOptionId, l.productOptionValueId);
      return optionIdsSorted
        .map((oid) => `${oid.toString()}:${(map.get(oid) ?? 0n).toString()}`)
        .join("|");
    };

    const existingBySignature = new Map<
      string,
      (typeof product.variants)[number]
    >();
    const duplicateVariantsToRemove: (typeof product.variants)[number][] = [];
    for (const v of product.variants) {
      if (v.optionValues.length === 0) continue;
      const sig = signatureFor(v.optionValues);
      if (!existingBySignature.has(sig)) {
        existingBySignature.set(sig, v);
      } else {
        // More than one variant shares this combination signature (e.g. after an option was deleted)
        duplicateVariantsToRemove.push(v);
      }
    }

    // ---- Determine which combinations to create / keep ----
    const toCreate: Combination[] = [];
    const keptSignatures = new Set<string>();
    for (const combo of combinations) {
      const sig = signatureFor(
        [...combo.entries()].map(([productOptionId, productOptionValueId]) => ({
          productOptionId,
          productOptionValueId,
        })),
      );
      keptSignatures.add(sig);
      if (!existingBySignature.has(sig)) {
        toCreate.push(combo);
      }
    }

    // ---- Determine which variants to remove ----
    const toRemove = [
      ...duplicateVariantsToRemove,
      ...product.variants.filter((v) => {
        if (v.optionValues.length === 0) return false; // never touch legacy flat variants
        if (duplicateVariantsToRemove.some((dup) => dup.id === v.id)) return false;
        const sig = signatureFor(v.optionValues);
        return !keptSignatures.has(sig);
      }),
    ];

    // ---- Value name mapping for friendly variant naming ----
    const valueMap = new Map<bigint, string>();
    for (const opt of optionsWithValues) {
      for (const val of opt.values) {
        valueMap.set(val.id, val.value);
      }
    }
    const nameForCombo = (combo: Combination) => {
      const parts = [...combo.values()]
        .map((vid) => valueMap.get(vid))
        .filter((v): v is string => Boolean(v));
      return parts.length > 0 ? parts.join(" / ") : null;
    };

    // ---- Absorb a legacy base variant into one of the new combinations ----
    // When a product was created, the backend made one "Default" variant with
    // no option links. If it's safe to repurpose, we reuse it as one of the
    // combinations instead of orphaning it. This avoids the "5 variants when
    // it should be 4" problem.
    let absorbedLegacyVariantId: bigint | null = null;
    const legacyCandidates = product.variants.filter(
      (v) =>
        v.optionValues.length === 0 &&
        v.status === "ACTIVE" &&
        v._count.orderItems === 0 &&
        v._count.cartItems === 0 &&
        v._count.deviceAssets === 0 &&
        v.inventories.every((inv) => inv.quantityReserved === 0),
    );

    const absorbable =
      legacyCandidates.length === 1 && toCreate.length > 0
        ? legacyCandidates[0]
        : null;

    if (absorbable) {
      absorbedLegacyVariantId = absorbable.id;
    }

    // ---- Copy source: first active variant that is NOT in toRemove.
    // If there is only the legacy/absorbable variant, we copy defaults from it!
    const copySource =
      product.variants.find(
        (v) =>
          v.status === "ACTIVE" &&
          v.id !== absorbedLegacyVariantId &&
          !toRemove.some((r) => r.id === v.id),
      ) ??
      product.variants.find((v) => v.id !== absorbedLegacyVariantId) ??
      absorbable ??
      product.variants[0];

    if (toCreate.length > 0 && !copySource) {
      throw new BadRequestException(
        "Cannot generate variants — no source variant to copy defaults from.",
      );
    }

    // ---- Pre-generate unique SKUs ----
    const baseSku = (copySource?.sku ?? "VARIANT").replace(/\s+/g, "-");
    const newSkus = new Map<number, string>();
    let skuCounter = 1;
    for (let i = 0; i < toCreate.length; i += 1) {
      let candidate = `${baseSku}-${skuCounter}`;
      // eslint-disable-next-line no-await-in-loop
      while (
        await this.prisma.productVariant.findUnique({
          where: { sku: candidate },
          select: { id: true },
        })
      ) {
        skuCounter += 1;
        candidate = `${baseSku}-${skuCounter}`;
      }
      newSkus.set(i, candidate);
      skuCounter += 1;
    }

    const activeWarehouses = await this.prisma.warehouse.findMany({
      where: { status: "ACTIVE" },
      select: { id: true },
    });

    // ---- Run the sync in one transaction ----
    let removedCount = 0;
    let deactivatedCount = 0;
    let skippedCount = 0;

    await this.prisma.$transaction(async (tx) => {
      // 1. Remove (delete if safe, deactivate otherwise)
      for (const v of toRemove) {
        const hasReferences =
          v._count.orderItems > 0 ||
          v._count.cartItems > 0 ||
          v._count.deviceAssets > 0;
        const reserved = v.inventories.reduce(
          (sum, inv) => sum + inv.quantityReserved,
          0,
        );

        if (hasReferences || reserved > 0) {
          if (v.status === "ACTIVE") {
            await tx.productVariant.update({
              where: { id: v.id },
              data: { status: "INACTIVE" },
            });
            deactivatedCount += 1;
          } else {
            skippedCount += 1;
          }
        } else {
          await tx.productVariant.delete({ where: { id: v.id } });
          removedCount += 1;
        }
      }

      // 1b. Absorb legacy base variants into new combinations or remove unreferenced ones.
      let absorbedAny = false;
      for (const legacy of legacyCandidates) {
        if (toCreate.length > 0) {
          const absorbedCombo = toCreate.shift()!;
          const absorbedSku = newSkus.get(0)!;
          // Shift newSkus down
          for (let k = 0; k < toCreate.length; k += 1) {
            newSkus.set(k, newSkus.get(k + 1)!);
          }
          newSkus.delete(toCreate.length);

          const absorbedName = nameForCombo(absorbedCombo);
          await tx.productVariant.update({
            where: { id: legacy.id },
            data: {
              sku: absorbedSku,
              ...(absorbedName ? { variantName: absorbedName } : {}),
            },
          });

          await tx.productVariantOptionValue.createMany({
            data: [...absorbedCombo.entries()].map(
              ([productOptionId, productOptionValueId]) => ({
                productVariantId: legacy.id,
                productOptionId,
                productOptionValueId,
              }),
            ),
          });

          // Ensure inventory records exist for active warehouses
          for (const w of activeWarehouses) {
            await tx.inventory.upsert({
              where: {
                warehouseId_productVariantId: {
                  warehouseId: w.id,
                  productVariantId: legacy.id,
                },
              },
              create: {
                warehouseId: w.id,
                productVariantId: legacy.id,
                quantityAvailable: 0,
                quantityReserved: 0,
              },
              update: {},
            });
          }

          absorbedAny = true;
        } else {
          // No more combinations to create, safe to delete this orphaned unlinked variant
          await tx.productVariant.delete({ where: { id: legacy.id } });
          removedCount += 1;
        }
      }

      // 2. Create missing combinations
      for (let i = 0; i < toCreate.length; i += 1) {
        const combo = toCreate[i];
        const sku = newSkus.get(i)!;
        const comboVariantName = nameForCombo(combo) ?? copySource?.variantName ?? null;

        const newVariant = await tx.productVariant.create({
          data: {
            productId,
            sku,
            variantName: comboVariantName,
            color: copySource?.color ?? null,
            ramGb: copySource?.ramGb ?? null,
            storageGb: copySource?.storageGb ?? null,
            operatingSystem: copySource?.operatingSystem ?? null,
            basePrice: copySource?.basePrice ?? "0",
            sellingPrice: copySource?.sellingPrice ?? "0",
            compareAtPrice: copySource?.compareAtPrice ?? null,
            currency: copySource?.currency ?? "INR",
            warrantyMonths: copySource?.warrantyMonths ?? null,
            status: "ACTIVE",
          },
          select: { id: true },
        });

        // Copy specification
        if (copySource?.specification) {
          const {
            id: _id,
            productVariantId: _pv,
            createdAt: _c,
            updatedAt: _u,
            ...spec
          } = copySource.specification;
          await tx.productSpecification.create({
            data: { ...spec, productVariantId: newVariant.id },
          });
        }

        // Copy ports
        if (copySource?.ports && copySource.ports.length > 0) {
          await tx.productPort.createMany({
            data: copySource.ports.map((p) => ({
              productVariantId: newVariant.id,
              portType: p.portType,
              quantity: p.quantity,
              version: p.version,
              supportsCharging: p.supportsCharging,
              supportsDisplay: p.supportsDisplay,
            })),
          });
        }

        // Copy features
        if (copySource?.features && copySource.features.length > 0) {
          await tx.productFeature.createMany({
            data: copySource.features.map((f) => ({
              productVariantId: newVariant.id,
              featureType: f.featureType,
              featureName: f.featureName,
              description: f.description,
              score: f.score,
            })),
          });
        }

        // Copy tags
        if (copySource?.tags && copySource.tags.length > 0) {
          await tx.productTag.createMany({
            data: copySource.tags.map((t) => ({
              productVariantId: newVariant.id,
              tagId: t.tagId,
            })),
          });
        }

        // Link option values
        await tx.productVariantOptionValue.createMany({
          data: [...combo.entries()].map(
            ([productOptionId, productOptionValueId]) => ({
              productVariantId: newVariant.id,
              productOptionId,
              productOptionValueId,
            }),
          ),
        });

        // Seed initial inventory row for all active warehouses
        if (activeWarehouses.length > 0) {
          await tx.inventory.createMany({
            data: activeWarehouses.map((w) => ({
              warehouseId: w.id,
              productVariantId: newVariant.id,
              quantityAvailable: 0,
              quantityReserved: 0,
            })),
            skipDuplicates: true,
          });
        }
      }
    });

    await this.auditService.log({
      userAccountId: updatedByUserId,
      action: "UPDATE",
      module: "catalogue",
      entityType: "ProductVariantMatrix",
      entityId: productId.toString(),
      description: `Synced variant matrix on ${product.name}: created ${toCreate.length}, removed ${removedCount}, deactivated ${deactivatedCount}, skipped ${skippedCount}.`,
      newData: {
        productId: productId.toString(),
        optionCount: optionsWithValues.length,
        combinationCount: combinations.length,
        created: toCreate.length,
        removed: removedCount,
        deactivated: deactivatedCount,
        skipped: skippedCount,
      },
    });

    return this.buildVariantMatrixResponse(
      productId,
      toCreate.length,
      removedCount,
      deactivatedCount,
      skippedCount,
    );
  }

  /**
   * Re-reads a product after a matrix sync and returns the shape the
   * frontend matrix table expects.
   */
  private async buildVariantMatrixResponse(
    productId: bigint,
    created: number,
    removed: number,
    deactivated: number,
    skipped: number,
  ): Promise<SyncVariantMatrixResult> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: {
        options: {
          orderBy: [{ displayOrder: "asc" }, { id: "asc" }],
          select: {
            id: true,
            name: true,
            displayOrder: true,
            values: {
              orderBy: [{ displayOrder: "asc" }, { id: "asc" }],
              select: {
                id: true,
                value: true,
                displayOrder: true,
                metaobjectEntryId: true,
                metaobjectEntry: {
                  select: {
                    id: true,
                    handle: true,
                    displayName: true,
                    fields: true,
                  },
                },
              },
            },
          },
        },
        variants: {
          orderBy: { id: "asc" },
          select: {
            id: true,
            sku: true,
            variantName: true,
            sellingPrice: true,
            compareAtPrice: true,
            currency: true,
            status: true,
            media: {
              orderBy: [{ isPrimary: "desc" }, { displayOrder: "asc" }],
              take: 1,
              select: {
                id: true,
                mediaType: true,
                url: true,
                storageKey: true,
                altText: true,
              },
            },
            inventories: {
              select: { quantityAvailable: true, quantityReserved: true },
            },
            optionValues: {
              select: {
                productOptionId: true,
                productOptionValueId: true,
                productOption: {
                  select: { id: true, name: true, displayOrder: true },
                },
                productOptionValue: {
                  select: {
                    id: true,
                    value: true,
                    displayOrder: true,
                    metaobjectEntryId: true,
                    metaobjectEntry: {
                      select: {
                        id: true,
                        handle: true,
                        displayName: true,
                        fields: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException("Product disappeared during sync.");
    }

    return {
      options: product.options.map((o) => this.serializeProductOption(o)),
      variants: product.variants.map((v) => {
        const primaryMedia = v.media?.[0];
        const imageUrl =
          primaryMedia?.url ??
          (primaryMedia?.storageKey
            ? `https://res.cloudinary.com/klarone/image/upload/${primaryMedia.storageKey}`
            : null);

        return {
          id: String(v.id),
          sku: v.sku,
          variantName: v.variantName,
          sellingPrice: v.sellingPrice.toString(),
          compareAtPrice: v.compareAtPrice
            ? v.compareAtPrice.toString()
            : null,
          currency: v.currency,
          status: v.status,
          quantityAvailable: v.inventories.reduce(
            (sum, inv) => sum + inv.quantityAvailable,
            0,
          ),
          imageUrl,
          optionValues: v.optionValues.map((link) => ({
            productOptionId: String(link.productOptionId),
            productOptionValueId: String(link.productOptionValueId),
            productOptionName: link.productOption.name,
            value: link.productOptionValue.value,
            metaobjectEntryId:
              link.productOptionValue.metaobjectEntryId != null
                ? String(link.productOptionValue.metaobjectEntryId)
                : null,
            metaobjectEntry: link.productOptionValue.metaobjectEntry
              ? {
                id: String(link.productOptionValue.metaobjectEntry.id),
                handle: link.productOptionValue.metaobjectEntry.handle,
                displayName:
                  link.productOptionValue.metaobjectEntry.displayName,
                fields: link.productOptionValue.metaobjectEntry
                  .fields as Record<string, unknown>,
              }
              : null,
          })),
        };
      }),
      created,
      removed,
      deactivated,
      skipped,
    };
  }

  /* ===============================================================
   * VARIANT ↔ OPTION VALUE LINKS
   * =============================================================== */

  async getVariantOptionValues(productId: bigint, variantId: bigint) {
    const variant = await this.prisma.productVariant.findFirst({
      where: { id: variantId, productId },
      select: {
        id: true,
        sku: true,
        optionValues: {
          select: {
            productOptionId: true,
            productOptionValueId: true,
            productOption: {
              select: { id: true, name: true, displayOrder: true },
            },
            productOptionValue: {
              select: { id: true, value: true, displayOrder: true },
            },
          },
        },
      },
    });

    if (!variant) {
      throw new NotFoundException("Variant not found.");
    }

    return toJsonSafe({
      variantId: variant.id.toString(),
      sku: variant.sku,
      optionValues: variant.optionValues.map((link) => ({
        productOptionId: link.productOptionId.toString(),
        productOptionName: link.productOption.name,
        productOptionValueId: link.productOptionValueId.toString(),
        value: link.productOptionValue.value,
      })),
    });
  }

  async setVariantOptionValues(
    productId: bigint,
    variantId: bigint,
    input: SetVariantOptionValuesInput,
    updatedByUserId: bigint,
  ) {
    const variant = await this.prisma.productVariant.findFirst({
      where: { id: variantId, productId },
      select: { id: true, sku: true },
    });

    if (!variant) {
      throw new NotFoundException("Variant not found.");
    }

    if (!Array.isArray(input.optionValues)) {
      throw new BadRequestException("optionValues must be an array.");
    }

    // Dedupe by option — one value per option per variant.
    const byOption = new Map<bigint, bigint>();
    for (const entry of input.optionValues) {
      const optionId = this.parseBigIntId(
        entry.productOptionId,
        "productOptionId",
      );
      const valueId = this.parseBigIntId(
        entry.productOptionValueId,
        "productOptionValueId",
      );
      if (byOption.has(optionId)) {
        throw new BadRequestException(
          `Duplicate productOptionId ${optionId.toString()} in payload.`,
        );
      }
      byOption.set(optionId, valueId);
    }

    if (byOption.size > 0) {
      // Verify all option ids belong to this product.
      const optionIds = [...byOption.keys()];
      const validOptions = await this.prisma.productOption.findMany({
        where: { id: { in: optionIds }, productId },
        select: { id: true },
      });
      if (validOptions.length !== optionIds.length) {
        throw new BadRequestException(
          "One or more options do not belong to this product.",
        );
      }

      // Verify all value ids belong to their respective options.
      const valueIds = [...byOption.values()];
      const validValues = await this.prisma.productOptionValue.findMany({
        where: { id: { in: valueIds } },
        select: { id: true, productOptionId: true },
      });

      for (const [optionId, valueId] of byOption) {
        const matched = validValues.find(
          (v) => v.id === valueId && v.productOptionId === optionId,
        );
        if (!matched) {
          throw new BadRequestException(
            `Value ${valueId.toString()} does not belong to option ${optionId.toString()}.`,
          );
        }
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.productVariantOptionValue.deleteMany({
        where: { productVariantId: variantId },
      });

      if (byOption.size > 0) {
        await tx.productVariantOptionValue.createMany({
          data: [...byOption.entries()].map(([optionId, valueId]) => ({
            productVariantId: variantId,
            productOptionId: optionId,
            productOptionValueId: valueId,
          })),
        });
      }
    });

    await this.auditService.log({
      userAccountId: updatedByUserId,
      action: "UPDATE",
      module: "catalogue",
      entityType: "ProductVariantOptionValue",
      entityId: variantId.toString(),
      description: `Updated option values for variant ${variant.sku}.`,
      newData: {
        productId: productId.toString(),
        variantId: variantId.toString(),
        optionValues: [...byOption.entries()].map(([optionId, valueId]) => ({
          productOptionId: optionId.toString(),
          productOptionValueId: valueId.toString(),
        })),
      },
    });

    return this.getVariantOptionValues(productId, variantId);
  }

  /* ===============================================================
   * ADVANCED PRODUCT OPERATIONS
   * =============================================================== */

  async duplicateStaffProduct(
    productId: bigint,
    input: DuplicateProductInput,
    createdByUserId: bigint,
  ) {
    const source = await this.prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        brandId: true,
        categoryId: true,
        name: true,
        slug: true,
        modelNumber: true,
        manufacturerPartNumber: true,
        shortDescription: true,
        description: true,
        productType: true,
        variants: {
          orderBy: { id: "asc" },
          select: {
            id: true,
            sku: true,
            variantName: true,
            color: true,
            ramGb: true,
            storageGb: true,
            operatingSystem: true,
            basePrice: true,
            sellingPrice: true,
            compareAtPrice: true,
            currency: true,
            warrantyMonths: true,
            status: true,
            specification: true,
            ports: true,
            features: true,
            tags: { select: { tagId: true } },
            optionValues: {
              select: {
                productOptionId: true,
                productOptionValueId: true,
              },
            },
          },
        },
        options: {
          orderBy: { displayOrder: "asc" },
          select: {
            id: true,
            name: true,
            displayOrder: true,
            values: {
              orderBy: { displayOrder: "asc" },
              select: {
                id: true,
                value: true,
                displayOrder: true,
              },
            },
          },
        },
        media: {
          orderBy: { displayOrder: "asc" },
          select: {
            mediaType: true,
            storageKey: true,
            url: true,
            altText: true,
            width: true,
            height: true,
            displayOrder: true,
            isPrimary: true,
          },
        },
      },
    });

    if (!source) {
      throw new NotFoundException("Product not found.");
    }

    const nextName = (input.name?.trim() || `${source.name} (Copy)`).trim();

    // Build a unique slug — auto-suffix on conflict.
    const desiredSlugBase =
      input.slug?.trim() ||
      this.slugify(nextName) ||
      `${source.slug}-copy`;

    let slug = desiredSlugBase;
    let suffix = 1;
    while (
      await this.prisma.product.findUnique({
        where: { slug },
        select: { id: true },
      })
    ) {
      slug = `${desiredSlugBase}-${suffix}`;
      suffix += 1;
    }

    const nextStatus =
      input.status === "PUBLISHED" ? "PUBLISHED" : "DRAFT";

    const copyOptions = input.copyOptions !== false;
    const copyVariants = input.copyVariants !== false;
    const copyMedia = input.copyMedia === true;
    const copyPorts = input.copyPorts !== false;
    const copyFeatures = input.copyFeatures !== false;
    const copyTags = input.copyTags !== false;
    const copySpecifications = input.copySpecifications !== false;

    // Pre-generate a unique SKU per source variant.
    const skuMap = new Map<bigint, string>();
    for (const v of source.variants) {
      let candidate = `${v.sku}-COPY`;
      let n = 1;
      while (
        await this.prisma.productVariant.findUnique({
          where: { sku: candidate },
          select: { id: true },
        })
      ) {
        candidate = `${v.sku}-COPY-${n}`;
        n += 1;
      }
      skuMap.set(v.id, candidate);
    }

    const duplicated = await this.prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          brandId: source.brandId,
          categoryId: source.categoryId,
          name: nextName,
          slug,
          modelNumber: source.modelNumber,
          manufacturerPartNumber: source.manufacturerPartNumber,
          shortDescription: source.shortDescription,
          description: source.description,
          productType: source.productType,
          status: nextStatus,
          createdByUserId,
          updatedByUserId: createdByUserId,
        },
        select: { id: true },
      });

      // Copy options + values, remember the mapping from old → new ids.
      const optionIdMap = new Map<bigint, bigint>();
      const valueIdMap = new Map<bigint, bigint>();

      if (copyOptions) {
        for (const option of source.options) {
          const newOption = await tx.productOption.create({
            data: {
              productId: product.id,
              name: option.name,
              displayOrder: option.displayOrder,
            },
            select: { id: true },
          });
          optionIdMap.set(option.id, newOption.id);

          for (const value of option.values) {
            const newValue = await tx.productOptionValue.create({
              data: {
                productOptionId: newOption.id,
                value: value.value,
                displayOrder: value.displayOrder,
              },
              select: { id: true },
            });
            valueIdMap.set(value.id, newValue.id);
          }
        }
      }

      // Copy variants.
      if (copyVariants) {
        for (const v of source.variants) {
          const newSku = skuMap.get(v.id) ?? `${v.sku}-COPY`;
          const newVariant = await tx.productVariant.create({
            data: {
              productId: product.id,
              sku: newSku,
              variantName: v.variantName,
              color: v.color,
              ramGb: v.ramGb,
              storageGb: v.storageGb,
              operatingSystem: v.operatingSystem,
              basePrice: v.basePrice,
              sellingPrice: v.sellingPrice,
              compareAtPrice: v.compareAtPrice,
              currency: v.currency,
              warrantyMonths: v.warrantyMonths,
              status: v.status,
            },
            select: { id: true },
          });

          if (copySpecifications && v.specification) {
            const { id: _id, productVariantId: _pv, createdAt: _c, updatedAt: _u, ...spec } = v.specification;
            await tx.productSpecification.create({
              data: { ...spec, productVariantId: newVariant.id },
            });
          }

          if (copyPorts && v.ports.length > 0) {
            await tx.productPort.createMany({
              data: v.ports.map((p) => ({
                productVariantId: newVariant.id,
                portType: p.portType,
                quantity: p.quantity,
                version: p.version,
                supportsCharging: p.supportsCharging,
                supportsDisplay: p.supportsDisplay,
              })),
            });
          }

          if (copyFeatures && v.features.length > 0) {
            await tx.productFeature.createMany({
              data: v.features.map((f) => ({
                productVariantId: newVariant.id,
                featureType: f.featureType,
                featureName: f.featureName,
                description: f.description,
                score: f.score,
              })),
            });
          }

          if (copyTags && v.tags.length > 0) {
            await tx.productTag.createMany({
              data: v.tags.map((t) => ({
                productVariantId: newVariant.id,
                tagId: t.tagId,
              })),
            });
          }

          if (copyOptions && v.optionValues.length > 0) {
            const links = v.optionValues
              .map((link) => {
                const newOptionId = optionIdMap.get(link.productOptionId);
                const newValueId = valueIdMap.get(link.productOptionValueId);
                if (!newOptionId || !newValueId) return null;
                return {
                  productVariantId: newVariant.id,
                  productOptionId: newOptionId,
                  productOptionValueId: newValueId,
                };
              })
              .filter((x): x is NonNullable<typeof x> => x !== null);

            if (links.length > 0) {
              await tx.productVariantOptionValue.createMany({ data: links });
            }
          }
        }
      }

      if (copyMedia && source.media.length > 0) {
        await tx.productMedia.createMany({
          data: source.media.map((m) => ({
            productId: product.id,
            mediaType: m.mediaType,
            storageKey: m.storageKey,
            url: m.url,
            altText: m.altText,
            width: m.width,
            height: m.height,
            displayOrder: m.displayOrder,
            isPrimary: m.isPrimary,
          })),
        });
      }

      return product;
    });

    await this.auditService.log({
      userAccountId: createdByUserId,
      action: "CREATE",
      module: "catalogue",
      entityType: "Product",
      entityId: duplicated.id.toString(),
      description: `Duplicated product ${source.name} as ${nextName}.`,
      newData: {
        sourceProductId: productId.toString(),
        newProductId: duplicated.id.toString(),
        name: nextName,
        slug,
        status: nextStatus,
      },
    });

    return this.findStaffProductById(duplicated.id);
  }

  async archiveStaffProduct(
    productId: bigint,
    input: ArchiveProductInput,
    updatedByUserId: bigint,
  ) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, name: true, status: true },
    });

    if (!product) {
      throw new NotFoundException("Product not found.");
    }

    if (product.status === "ARCHIVED") {
      throw new ConflictException("Product is already archived.");
    }

    const updated = await this.prisma.product.update({
      where: { id: productId },
      data: { status: "ARCHIVED", updatedByUserId },
      select: { id: true, name: true, slug: true, status: true, updatedAt: true },
    });

    await this.auditService.log({
      userAccountId: updatedByUserId,
      action: "UPDATE",
      module: "catalogue",
      entityType: "Product",
      entityId: productId.toString(),
      description: `Archived catalogue product ${product.name}${input.reason ? ` (${input.reason})` : ""
        }.`,
      oldData: { status: product.status },
      newData: { status: updated.status, reason: input.reason ?? null },
    });

    return toJsonSafe(updated);
  }

  async unarchiveStaffProduct(
    productId: bigint,
    updatedByUserId: bigint,
  ) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, name: true, status: true },
    });

    if (!product) {
      throw new NotFoundException("Product not found.");
    }

    if (product.status !== "ARCHIVED") {
      throw new ConflictException("Product is not archived.");
    }

    const updated = await this.prisma.product.update({
      where: { id: productId },
      data: { status: "DRAFT", updatedByUserId },
      select: { id: true, name: true, slug: true, status: true, updatedAt: true },
    });

    await this.auditService.log({
      userAccountId: updatedByUserId,
      action: "UPDATE",
      module: "catalogue",
      entityType: "Product",
      entityId: productId.toString(),
      description: `Unarchived catalogue product ${product.name}.`,
      oldData: { status: product.status },
      newData: { status: updated.status },
    });

    return toJsonSafe(updated);
  }

  async deleteStaffProduct(
    productId: bigint,
    deletedByUserId: bigint,
  ) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
      },
    });

    if (!product) {
      throw new NotFoundException("Product not found.");
    }

    const orderedVariantCount = await this.prisma.orderItem.count({
      where: {
        productVariant: {
          productId,
        },
      },
    });

    if (orderedVariantCount > 0) {
      throw new ConflictException(
        "This product has been ordered and cannot be deleted. Archive it instead.",
      );
    }

    // Fetch media to clean up storage (Cloudinary / S3 / R2)
    const mediaToDelete = await this.prisma.productMedia.findMany({
      where: { productId },
      select: { storageKey: true },
    });

    await this.prisma.$transaction(async (tx) => {
      // 1. Delete collection relations
      await tx.collectionProduct.deleteMany({
        where: { productId },
      });
      await tx.collectionVariant.deleteMany({
        where: { productVariant: { productId } },
      });

      // 2. Delete inventory records and transactions
      await tx.inventoryTransaction.deleteMany({
        where: { productVariant: { productId } },
      });
      await tx.inventory.deleteMany({
        where: { productVariant: { productId } },
      });

      // 3. Delete cart items
      await tx.cartItem.deleteMany({
        where: { productVariant: { productId } },
      });

      // 4. Delete option links on variants
      await tx.productVariantOptionValue.deleteMany({
        where: { productVariant: { productId } },
      });

      // 5. Delete variant children
      await tx.productSpecification.deleteMany({
        where: { productVariant: { productId } },
      });
      await tx.productPort.deleteMany({
        where: { productVariant: { productId } },
      });
      await tx.productFeature.deleteMany({
        where: { productVariant: { productId } },
      });
      await tx.productTag.deleteMany({
        where: { productVariant: { productId } },
      });
      await tx.productMedia.deleteMany({
        where: { productId },
      });

      // 6. Delete options & values
      await tx.productOptionValue.deleteMany({
        where: { productOption: { productId } },
      });
      await tx.productOption.deleteMany({
        where: { productId },
      });

      // 7. Delete variants
      await tx.productVariant.deleteMany({
        where: { productId },
      });

      // 8. Delete product
      await tx.product.delete({ where: { id: productId } });
    });

    // Clean up physical images from Cloudinary / storage provider
    for (const m of mediaToDelete) {
      if (m.storageKey) {
        try {
          await this.storageProvider.delete(m.storageKey);
        } catch {
          // Log or ignore non-blocking storage cleanup failure
        }
      }
    }

    await this.auditService.log({
      userAccountId: deletedByUserId,
      action: "DELETE",
      module: "catalogue",
      entityType: "Product",
      entityId: productId.toString(),
      description: `Deleted catalogue product ${product.name}.`,
      oldData: {
        name: product.name,
        slug: product.slug,
        status: product.status,
      },
    });

    return { id: productId.toString(), deleted: true };
  }

  /* ===============================================================
   * BULK VARIANT OPERATIONS
   * =============================================================== */

  async bulkEditStaffVariants(
    productId: bigint,
    input: BulkEditVariantsInput,
    updatedByUserId: bigint,
  ) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, name: true },
    });

    if (!product) {
      throw new NotFoundException("Product not found.");
    }

    if (!Array.isArray(input.variantIds) || input.variantIds.length === 0) {
      throw new BadRequestException("variantIds must be a non-empty array.");
    }

    const ids = input.variantIds.map((id) =>
      this.parseBigIntId(id, "variantId"),
    );

    const variants = await this.prisma.productVariant.findMany({
      where: { id: { in: ids }, productId },
      select: {
        id: true,
        sku: true,
        basePrice: true,
        sellingPrice: true,
        status: true,
      },
    });

    if (variants.length !== ids.length) {
      throw new BadRequestException(
        "One or more variants do not belong to this product.",
      );
    }

    // Validate price fields.
    const priceFields: Array<"basePrice" | "sellingPrice" | "compareAtPrice"> =
      ["basePrice", "sellingPrice", "compareAtPrice"];

    for (const field of priceFields) {
      const raw = input[field];
      if (raw === undefined) continue;
      if (raw === null) continue;
      const num = Number(raw);
      if (!Number.isFinite(num) || num < 0) {
        throw new BadRequestException(
          `${field} must be a non-negative number or null.`,
        );
      }
    }

    if (input.status !== undefined) {
      const s = input.status.toUpperCase();
      if (s !== "ACTIVE" && s !== "INACTIVE") {
        throw new BadRequestException(
          "status must be ACTIVE or INACTIVE.",
        );
      }
    }

    const result = await this.prisma.$transaction(async (tx) => {
      let updatedCount = 0;

      for (const variant of variants) {
        const nextBase =
          input.basePrice !== undefined && input.basePrice !== null
            ? String(Number(input.basePrice))
            : undefined;
        const nextSelling =
          input.sellingPrice !== undefined && input.sellingPrice !== null
            ? String(Number(input.sellingPrice))
            : undefined;

        await tx.productVariant.update({
          where: { id: variant.id },
          data: {
            ...(nextBase !== undefined ? { basePrice: nextBase } : {}),
            ...(nextSelling !== undefined
              ? { sellingPrice: nextSelling }
              : {}),
            ...(input.compareAtPrice !== undefined
              ? {
                compareAtPrice:
                  input.compareAtPrice === null
                    ? null
                    : String(Number(input.compareAtPrice)),
              }
              : {}),
            ...(input.currency !== undefined
              ? { currency: input.currency.trim() || "INR" }
              : {}),
            ...(input.warrantyMonths !== undefined
              ? { warrantyMonths: input.warrantyMonths }
              : {}),
            ...(input.status !== undefined
              ? { status: input.status.toUpperCase() }
              : {}),
          },
        });

        if (nextBase !== undefined || nextSelling !== undefined) {
          await this.recordPriceChangeIfNeeded(
            tx,
            variant.id,
            variant.basePrice.toString(),
            variant.sellingPrice.toString(),
            nextBase,
            nextSelling,
            updatedByUserId,
            "Bulk edit",
          );
        }

        updatedCount += 1;
      }

      return updatedCount;
    });

    await this.auditService.log({
      userAccountId: updatedByUserId,
      action: "UPDATE",
      module: "catalogue",
      entityType: "ProductVariant",
      entityId: productId.toString(),
      description: `Bulk edited ${result} variant${result === 1 ? "" : "s"} on ${product.name}.`,
      newData: {
        productId: productId.toString(),
        variantIds: variants.map((v) => v.id.toString()),
        changes: {
          basePrice: input.basePrice ?? null,
          sellingPrice: input.sellingPrice ?? null,
          compareAtPrice: input.compareAtPrice ?? null,
          currency: input.currency ?? null,
          warrantyMonths: input.warrantyMonths ?? null,
          status: input.status ?? null,
        },
      },
    });

    return toJsonSafe({
      updatedCount: result,
      productId: productId.toString(),
    });
  }

  async deleteStaffVariant(
    productId: bigint,
    variantId: bigint,
    input: DeleteVariantInput,
    deletedByUserId: bigint,
  ) {
    const variant = await this.prisma.productVariant.findFirst({
      where: { id: variantId, productId },
      select: {
        id: true,
        sku: true,
        status: true,
        _count: {
          select: {
            orderItems: true,
            cartItems: true,
            inventories: true,
            deviceAssets: true,
          },
        },
        inventories: {
          select: { quantityReserved: true, quantityAvailable: true },
        },
      },
    });

    if (!variant) {
      throw new NotFoundException("Variant not found.");
    }

    if (variant._count.orderItems > 0) {
      throw new ConflictException(
        "This variant has been ordered and cannot be deleted. Deactivate it instead.",
      );
    }

    if (variant._count.cartItems > 0) {
      throw new ConflictException(
        "This variant is in active carts and cannot be deleted right now.",
      );
    }

    if (variant._count.deviceAssets > 0) {
      throw new ConflictException(
        "This variant is linked to physical device assets and cannot be deleted.",
      );
    }

    const reserved = variant.inventories.reduce(
      (total, inv) => total + inv.quantityReserved,
      0,
    );

    if (reserved > 0) {
      throw new ConflictException(
        "This variant has reserved inventory and cannot be deleted.",
      );
    }

    await this.prisma.productVariant.delete({ where: { id: variantId } });

    await this.auditService.log({
      userAccountId: deletedByUserId,
      action: "DELETE",
      module: "catalogue",
      entityType: "ProductVariant",
      entityId: variantId.toString(),
      description: `Deleted catalogue variant ${variant.sku}${input.reason ? ` (${input.reason})` : ""
        }.`,
      oldData: {
        productId: productId.toString(),
        sku: variant.sku,
        status: variant.status,
      },
    });

    return { id: variantId.toString(), deleted: true };
  }
}