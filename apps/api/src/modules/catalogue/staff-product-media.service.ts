
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { STORAGE_PROVIDER } from "../../common/storage/storage.factory";
import type { IStorageProvider } from "../../common/storage/storage-provider.interface";

const MAX_FILE_SIZE = 8 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
]);

@Injectable()
export class StaffProductMediaService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_PROVIDER)
    private readonly storageProvider: IStorageProvider,
  ) {}

  // Convert BigInt identifiers to strings for JSON-safe API responses.
  // Keep BigInt values unchanged in Prisma queries and mutations.
  private serializeMedia<
    T extends {
      id: bigint;
      productId: bigint | null;
      productVariantId: bigint | null;
    },
  >(media: T) {
    return {
      ...media,
      id: media.id.toString(),
      productId: media.productId?.toString() ?? null,
      productVariantId: media.productVariantId?.toString() ?? null,
    };
  }

  private async ensureProduct(productId: bigint) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });

    if (!product) {
      throw new NotFoundException("Product not found.");
    }

    return product;
  }

  async list(productId: bigint) {
    await this.ensureProduct(productId);

    const media = await this.prisma.productMedia.findMany({
      where: { productId },
      orderBy: [{ displayOrder: "asc" }, { id: "asc" }],
    });

    return media.map((item) => this.serializeMedia(item));
  }

  async upload(
    productId: bigint,
    file: Express.Multer.File,
    variantId?: string,
    altText?: string,
  ) {
    await this.ensureProduct(productId);

    if (!file) {
      throw new BadRequestException("An image file is required.");
    }

    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException(
        "Only JPEG, PNG, WebP, and AVIF images are supported.",
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException("Image size must not exceed 8 MB.");
    }

    let productVariantId: bigint | null = null;

    if (variantId !== undefined && variantId !== "") {
      if (!/^\d+$/.test(variantId) || BigInt(variantId) <= 0n) {
        throw new BadRequestException(
          "Variant id must be a positive integer.",
        );
      }

      productVariantId = BigInt(variantId);

      const variant = await this.prisma.productVariant.findFirst({
        where: { id: productVariantId, productId },
        select: { id: true },
      });

      if (!variant) {
        throw new BadRequestException(
          "The selected variant does not belong to this product.",
        );
      }
    }

    const uploadResult = await this.storageProvider.upload({
      folder: `klarone/products/${productId.toString()}`,
      filename: file.originalname,
      buffer: file.buffer,
      mimetype: file.mimetype,
    });

    try {
      const mediaCount = await this.prisma.productMedia.count({
        where: { productId },
      });

      const media = await this.prisma.productMedia.create({
        data: {
          productId,
          productVariantId,
          mediaType: "IMAGE",
          storageKey: uploadResult.key,
          url: uploadResult.url,
          altText: altText?.trim() || null,
          width: uploadResult.width ?? null,
          height: uploadResult.height ?? null,
          displayOrder: mediaCount,
          isPrimary: mediaCount === 0,
        },
      });

      return this.serializeMedia(media);
    } catch (error) {
      await this.storageProvider.delete(uploadResult.key);
      throw error;
    }
  }

  async setPrimary(productId: bigint, mediaId: bigint) {
    await this.ensureProduct(productId);

    const media = await this.prisma.productMedia.findFirst({
      where: { id: mediaId, productId },
      select: { id: true },
    });

    if (!media) {
      throw new NotFoundException("Product image not found.");
    }

    await this.prisma.$transaction([
      this.prisma.productMedia.updateMany({
        where: { productId },
        data: { isPrimary: false },
      }),
      this.prisma.productMedia.update({
        where: { id: mediaId },
        data: { isPrimary: true },
      }),
    ]);

    return this.list(productId);
  }

  async reorder(productId: bigint, orderedIds: string[]) {
    await this.ensureProduct(productId);

    if (
      !Array.isArray(orderedIds) ||
      orderedIds.some(
        (id) => typeof id !== "string" || !/^\d+$/.test(id) || BigInt(id) <= 0n,
      ) ||
      new Set(orderedIds).size !== orderedIds.length
    ) {
      throw new BadRequestException(
        "Provide a unique ordered list of valid media ids.",
      );
    }

    const existing = await this.prisma.productMedia.findMany({
      where: { productId },
      select: { id: true },
    });

    const existingIds = new Set(
      existing.map((item) => item.id.toString()),
    );

    if (
      existingIds.size !== orderedIds.length ||
      orderedIds.some((id) => !existingIds.has(id))
    ) {
      throw new BadRequestException(
        "The ordered ids must include every image for this product exactly once.",
      );
    }

    await this.prisma.$transaction(
      orderedIds.map((id, index) =>
        this.prisma.productMedia.update({
          where: { id: BigInt(id) },
          data: { displayOrder: index },
        }),
      ),
    );

    return this.list(productId);
  }

  async updateAltText(
    productId: bigint,
    mediaId: bigint,
    altText: string | null,
  ) {
    await this.ensureProduct(productId);

    const media = await this.prisma.productMedia.findFirst({
      where: { id: mediaId, productId },
      select: { id: true },
    });

    if (!media) {
      throw new NotFoundException("Product image not found.");
    }

    const updated = await this.prisma.productMedia.update({
      where: { id: mediaId },
      data: { altText: altText?.trim() || null },
    });

    return this.serializeMedia(updated);
  }

  async remove(productId: bigint, mediaId: bigint) {
    await this.ensureProduct(productId);

    const media = await this.prisma.productMedia.findFirst({
      where: { id: mediaId, productId },
    });

    if (!media) {
      throw new NotFoundException("Product image not found.");
    }

    try {
      await this.storageProvider.delete(media.storageKey);
    } catch {
      throw new ServiceUnavailableException(
        "Could not remove the image from storage. The record was kept.",
      );
    }

    await this.prisma.productMedia.delete({
      where: { id: mediaId },
    });

    const remaining = await this.prisma.productMedia.findMany({
      where: { productId },
      orderBy: [{ displayOrder: "asc" }, { id: "asc" }],
      select: { id: true, isPrimary: true },
    });

    await this.prisma.$transaction(
      remaining.map((item, index) =>
        this.prisma.productMedia.update({
          where: { id: item.id },
          data: {
            displayOrder: index,
            isPrimary: remaining.every((entry) => !entry.isPrimary)
              ? index === 0
              : item.isPrimary,
          },
        }),
      ),
    );

    return this.list(productId);
  }
}