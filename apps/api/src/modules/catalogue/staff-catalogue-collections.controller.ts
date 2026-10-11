import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { StaffAuthGuard } from "../staff-auth/guards/staff-auth.guard";
import { StaffPermissionGuard } from "../staff-auth/guards/permission.guard";
import { RequirePermission } from "../staff-auth/decorators/require-permission.decorator";

export interface CreateCollectionDto {
  title: string;
  slug?: string;
  description?: string;
  bannerImage?: string;
  rules?: any;
  variantIds?: string[];
}

export interface UpdateCollectionDto {
  title?: string;
  slug?: string;
  description?: string;
  bannerImage?: string;
  rules?: any;
  status?: string;
}

@Controller("staff/catalogue/collections")
@UseGuards(StaffAuthGuard, StaffPermissionGuard)
export class StaffCatalogueCollectionsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @RequirePermission("catalogue.read")
  async listCollections(
    @Query("search") search?: string,
    @Query("page") pageQuery?: string,
    @Query("pageSize") pageSizeQuery?: string,
  ) {
    const page = Math.max(pageQuery ? Number(pageQuery) : 1, 1);
    const pageSize = Math.min(
      Math.max(pageSizeQuery ? Number(pageSizeQuery) : 20, 1),
      100,
    );

    const where: any = {};
    if (search && search.trim()) {
      where.OR = [
        { title: { contains: search.trim(), mode: "insensitive" } },
        { slug: { contains: search.trim(), mode: "insensitive" } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.collection.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          _count: {
            select: { variants: true },
          },
        },
      }),
      this.prisma.collection.count({ where }),
    ]);

    const serializedItems = items.map((c) => ({
      id: c.id,
      title: c.title,
      slug: c.slug,
      description: c.description,
      bannerImage: c.bannerImage,
      rules: c.rules,
      status: c.status,
      productCount: c._count.variants,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));

    return {
      items: serializedItems,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  @Post()
  @RequirePermission("catalogue.create")
  async createCollection(@Body() body: CreateCollectionDto) {
    if (!body.title?.trim()) {
      throw new BadRequestException("Collection title is required.");
    }

    const slug =
      body.slug?.trim() ||
      body.title
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

    const collection = await this.prisma.collection.create({
      data: {
        title: body.title.trim(),
        slug,
        description: body.description?.trim() || null,
        bannerImage: body.bannerImage?.trim() || null,
        rules: body.rules ?? null,
      },
    });

    if (body.variantIds && Array.isArray(body.variantIds) && body.variantIds.length > 0) {
      await this.prisma.collectionVariant.createMany({
        data: body.variantIds.map((vid, idx) => ({
          collectionId: collection.id,
          productVariantId: BigInt(vid),
          displayOrder: idx,
        })),
        skipDuplicates: true,
      });
    }

    return this.getCollection(String(collection.id));
  }

  @Get(":id")
  @RequirePermission("catalogue.read")
  async getCollection(@Param("id") id: string) {
    const colId = Number(id);
    if (!colId) throw new BadRequestException("Invalid collection ID");

    const collection = await this.prisma.collection.findUnique({
      where: { id: colId },
      include: {
        variants: {
          orderBy: { displayOrder: "asc" },
          include: {
            productVariant: {
              include: {
                product: {
                  include: {
                    brand: true,
                    category: true,
                    media: { take: 1, orderBy: { displayOrder: "asc" } },
                  },
                },
                media: { take: 1, orderBy: { displayOrder: "asc" } },
              },
            },
          },
        },
      },
    });

    if (!collection) {
      throw new NotFoundException("Collection not found.");
    }

    return {
      id: collection.id,
      title: collection.title,
      slug: collection.slug,
      description: collection.description,
      bannerImage: collection.bannerImage,
      rules: collection.rules,
      status: collection.status,
      createdAt: collection.createdAt,
      updatedAt: collection.updatedAt,
      variants: collection.variants.map((cv) => {
        const v = cv.productVariant;
        const p = v.product;
        const img = v.media[0]?.url ?? p.media[0]?.url ?? null;

        return {
          id: String(v.id),
          productId: String(p.id),
          productName: p.name,
          variantName: v.variantName || "Standard",
          sku: v.sku,
          ramGb: v.ramGb,
          storageGb: v.storageGb,
          sellingPrice: v.sellingPrice,
          brandName: p.brand.name,
          categoryName: p.category.name,
          imageUrl: img,
          displayOrder: cv.displayOrder,
        };
      }),
    };
  }

  @Patch(":id")
  @RequirePermission("catalogue.update")
  async updateCollection(
    @Param("id") id: string,
    @Body() body: UpdateCollectionDto,
  ) {
    const colId = Number(id);
    if (!colId) throw new BadRequestException("Invalid collection ID");

    await this.prisma.collection.update({
      where: { id: colId },
      data: {
        title: body.title?.trim(),
        slug: body.slug?.trim(),
        description: body.description?.trim(),
        bannerImage: body.bannerImage,
        rules: body.rules,
        status: body.status,
      },
    });

    return this.getCollection(id);
  }

  @Delete(":id")
  @RequirePermission("catalogue.delete")
  async deleteCollection(@Param("id") id: string) {
    const colId = Number(id);
    if (!colId) throw new BadRequestException("Invalid collection ID");

    await this.prisma.collection.delete({
      where: { id: colId },
    });

    return { success: true, id: colId };
  }

  @Post(":id/variants")
  @RequirePermission("catalogue.update")
  async addVariantsToCollection(
    @Param("id") id: string,
    @Body() body: { variantIds: string[] },
  ) {
    const colId = Number(id);
    if (!colId) throw new BadRequestException("Invalid collection ID");
    if (!body.variantIds || !Array.isArray(body.variantIds)) {
      throw new BadRequestException("variantIds must be an array");
    }

    await this.prisma.collectionVariant.createMany({
      data: body.variantIds.map((vid) => ({
        collectionId: colId,
        productVariantId: BigInt(vid),
      })),
      skipDuplicates: true,
    });

    return this.getCollection(id);
  }

  @Delete(":id/variants/:variantId")
  @RequirePermission("catalogue.update")
  async removeVariantFromCollection(
    @Param("id") id: string,
    @Param("variantId") variantId: string,
  ) {
    const colId = Number(id);
    if (!colId) throw new BadRequestException("Invalid collection ID");

    await this.prisma.collectionVariant.delete({
      where: {
        collectionId_productVariantId: {
          collectionId: colId,
          productVariantId: BigInt(variantId),
        },
      },
    });

    return this.getCollection(id);
  }
}
