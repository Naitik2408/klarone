# Klarone catalogue service recovery
# Run from: D:\Contribution\Klarone2
# This script only edits apps/api/src/modules/catalogue/catalogue.service.ts.
# It creates a timestamped backup first and refuses to operate on an empty/unexpected file.

$ErrorActionPreference = "Stop"

$root = (Get-Location).Path
$servicePath = Join-Path $root "apps\api\src\modules\catalogue\catalogue.service.ts"

if (-not (Test-Path $servicePath)) {
  throw "Could not find catalogue.service.ts at $servicePath"
}

$original = Get-Content $servicePath -Raw

if ([string]::IsNullOrWhiteSpace($original)) {
  throw "catalogue.service.ts is empty. Stop here and restore the Git baseline first."
}

if ($original -notmatch 'export class CatalogueService') {
  throw "catalogue.service.ts does not contain CatalogueService. No changes made."
}

if ($original -match 'async findStaffProducts\(' -or
    $original -match 'async createStaffProduct\(' -or
    $original -match 'async publishStaffProduct\(') {
  Write-Host "Staff catalogue methods already appear to exist. No changes made." -ForegroundColor Yellow
  exit 0
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupPath = "$servicePath.bak-$timestamp"
Copy-Item $servicePath $backupPath -Force
Write-Host "Backup created: $backupPath" -ForegroundColor Cyan

# Add required imports.
$original = $original.Replace(
'  Injectable,
  NotFoundException,
} from "@nestjs/common";',
'  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";'
)

if ($original -notmatch 'AuditService') {
  $original = $original.Replace(
'import { toJsonSafe } from "../../common/serialization/json-safe";',
'import { toJsonSafe } from "../../common/serialization/json-safe";
import { AuditService } from "../audit/audit.service";'
)
}

if ($original -notmatch 'dto-create-staff-product') {
  $original = $original.Replace(
'import { toJsonSafe } from "../../common/serialization/json-safe";',
'import { toJsonSafe } from "../../common/serialization/json-safe";
import type { CreateStaffProductInput } from "./dto-create-staff-product";'
)
}

if ($original -notmatch 'dto-update-staff-product') {
  $original = $original.Replace(
'import type { CreateStaffProductInput } from "./dto-create-staff-product";',
'import type { CreateStaffProductInput } from "./dto-create-staff-product";
import type { UpdateStaffProductInput } from "./dto-update-staff-product";'
)
}

# Update constructor.
$original = $original.Replace(
'export class CatalogueService {
  constructor(private readonly prisma: PrismaService) {}',
'export class CatalogueService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}'
)

$methods = @'
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
        orderBy: {
          updatedAt: "desc",
        },
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
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          _count: {
            select: {
              variants: true,
            },
          },
          variants: {
            where: {
              status: "ACTIVE",
            },
            select: {
              id: true,
              sku: true,
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
      this.prisma.product.count({
        where,
      }),
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

      return {
        id: item.id.toString(),
        name: item.name,
        slug: item.slug,
        modelNumber: item.modelNumber,
        manufacturerPartNumber: item.manufacturerPartNumber,
        productType: item.productType,
        status: item.status,
        brand: item.brand,
        category: item.category,
        variantCount: item._count.variants,
        activeVariantCount: item.variants.length,
        lowestSellingPrice:
          sellingPrices.length > 0
            ? Math.min(...sellingPrices)
            : null,
        quantityAvailable,
        quantityReserved,
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

    const [brand, category, existingSlug, existingSku] =
      await Promise.all([
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

    const duplicateGeneratedSlug =
      await this.prisma.product.findUnique({
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
          displayRefreshRateHz:
            specification.displayRefreshRateHz ?? null,
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
          keyboardBacklight:
            specification.keyboardBacklight ?? null,
          fingerprintSensor:
            specification.fingerprintSensor ?? null,
        }
      : undefined;

    const created = await this.prisma.$transaction(async (tx) => {
      return tx.product.create({
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
              variantName:
                input.variant.variantName?.trim() || null,
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
              currency:
                input.variant.currency?.trim() || "INR",
              warrantyMonths:
                input.variant.warrantyMonths ?? null,
              status: "ACTIVE",
              ...(specificationData
                ? {
                    specification: {
                      create: specificationData,
                    },
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
          brand: {
            select: {
              id: true,
              name: true,
            },
          },
          category: {
            select: {
              id: true,
              name: true,
            },
          },
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
        createdAt: true,
        updatedAt: true,
        brand: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
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
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException("Product not found.");
    }

    return toJsonSafe(product);
  }

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
          ...(input.name !== undefined
            ? { name: nextName }
            : {}),
          ...(input.modelNumber !== undefined
            ? {
                modelNumber:
                  input.modelNumber?.trim() ?? null,
              }
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
            ? {
                description:
                  input.description?.trim() ?? null,
              }
            : {}),
          ...(input.productType !== undefined
            ? {
                productType:
                  input.productType?.trim() || "LAPTOP",
              }
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
            ? {
                color:
                  input.variant.color?.trim() ?? null,
              }
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
          ...(input.variant?.basePrice !== undefined
            ? {
                basePrice: String(
                  Number(input.variant.basePrice),
                ),
              }
            : {}),
          ...(input.variant?.sellingPrice !== undefined
            ? {
                sellingPrice: String(
                  Number(input.variant.sellingPrice),
                ),
              }
            : {}),
          ...(input.variant?.compareAtPrice !== undefined
            ? {
                compareAtPrice:
                  input.variant.compareAtPrice === null
                    ? null
                    : String(
                        Number(
                          input.variant.compareAtPrice,
                        ),
                      ),
              }
            : {}),
          ...(input.variant?.currency !== undefined
            ? {
                currency:
                  input.variant.currency?.trim() || "INR",
              }
            : {}),
          ...(input.variant?.warrantyMonths !== undefined
            ? {
                warrantyMonths:
                  input.variant.warrantyMonths,
              }
            : {}),
        },
      });

      const incomingSpecification =
        input.variant?.specification;

      if (incomingSpecification !== undefined) {
        const current =
          variant.specification;

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

        const { productVariantId: _productVariantId, ...specificationUpdateData } =
          specificationData;

        await tx.productSpecification.upsert({
          where: {
            productVariantId: variant.id,
          },
          create: specificationData,
          update: specificationUpdateData,
        });
      }

      return tx.product.findUnique({
        where: { id: productId },
        select: {
          id: true,
          name: true,
          slug: true,
          brand: {
            select: {
              id: true,
              name: true,
            },
          },
          category: {
            select: {
              id: true,
              name: true,
            },
          },
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
      oldData: toJsonSafe({
        product,
        variant,
      }),
      newData: toJsonSafe(result),
    });

    return toJsonSafe(result);
  }

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
          brand: {
            select: {
              id: true,
              name: true,
            },
          },
          category: {
            select: {
              id: true,
              name: true,
            },
          },
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
'@

$anchor = '  async findProductBySlug(slug: string) {'

if ($original -notmatch [regex]::Escape($anchor)) {
  throw "Could not find the catalogue service insertion point. No changes were made."
}

$updated = $original.Replace($anchor, $methods + "`r`n" + $anchor)

if ($updated.Length -lt 10000) {
  throw "Recovered catalogue.service.ts looks suspiciously small. Backup retained at $backupPath"
}

[System.IO.File]::WriteAllText(
  [System.IO.Path]::GetFullPath($servicePath),
  $updated,
  (New-Object System.Text.UTF8Encoding($false))
)

Write-Host ""
Write-Host "Catalogue service recovery completed." -ForegroundColor Green
Write-Host "Backup: $backupPath" -ForegroundColor Cyan
Write-Host ""

# Quick structural verification.
$verify = Get-Content $servicePath -Raw
$checks = @(
  "async findStaffProducts(",
  "async createStaffProduct(",
  "async findStaffProductById(",
  "async updateStaffProduct(",
  "async publishStaffProduct(",
  "private readonly auditService: AuditService",
  "import type { UpdateStaffProductInput }"
)

foreach ($check in $checks) {
  if ($verify.Contains($check)) {
    Write-Host "OK  $check" -ForegroundColor Green
  } else {
    Write-Host "MISSING  $check" -ForegroundColor Red
  }
}

Write-Host ""
Write-Host "Next: cd apps\api ; pnpm exec nest build" -ForegroundColor Yellow
