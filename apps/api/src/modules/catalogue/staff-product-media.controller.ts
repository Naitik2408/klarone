
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { StaffAuthGuard } from "../staff-auth/guards/staff-auth.guard";
import { StaffPermissionGuard } from "../staff-auth/guards/permission.guard";
import { RequirePermission } from "../staff-auth/decorators/require-permission.decorator";
import { UseGuards } from "@nestjs/common";
import { StaffProductMediaService } from "./staff-product-media.service";

@Controller("staff/catalogue/products/:id/media")
@UseGuards(StaffAuthGuard, StaffPermissionGuard)
export class StaffProductMediaController {
  constructor(
    private readonly mediaService: StaffProductMediaService,
  ) {}

  private parseId(value: string, label: string): bigint {
    if (!/^\d+$/.test(value) || BigInt(value) <= 0n) {
      throw new BadRequestException(
        `${label} must be a positive integer.`,
      );
    }

    return BigInt(value);
  }

  @Get()
  @RequirePermission("catalogue.read")
  list(@Param("id") id: string) {
    return this.mediaService.list(this.parseId(id, "Product id"));
  }

  @Post("upload")
  @RequirePermission("catalogue.update")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      limits: { fileSize: 8 * 1024 * 1024 },
    }),
  )
  upload(
    @Param("id") id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body("variantId") variantId?: string,
    @Body("altText") altText?: string,
  ) {
    return this.mediaService.upload(
      this.parseId(id, "Product id"),
      file,
      variantId,
      altText,
    );
  }

  @Post(":mediaId/primary")
  @RequirePermission("catalogue.update")
  setPrimary(
    @Param("id") id: string,
    @Param("mediaId") mediaId: string,
  ) {
    return this.mediaService.setPrimary(
      this.parseId(id, "Product id"),
      this.parseId(mediaId, "Media id"),
    );
  }

  @Post("reorder")
  @RequirePermission("catalogue.update")
  reorder(
    @Param("id") id: string,
    @Body("orderedIds") orderedIds: string[],
  ) {
    return this.mediaService.reorder(
      this.parseId(id, "Product id"),
      orderedIds,
    );
  }

  @Patch(":mediaId/alt-text")
  @RequirePermission("catalogue.update")
  updateAltText(
    @Param("id") id: string,
    @Param("mediaId") mediaId: string,
    @Body("altText") altText: string | null,
  ) {
    if (altText !== null && typeof altText !== "string") {
      throw new BadRequestException("altText must be a string or null.");
    }

    return this.mediaService.updateAltText(
      this.parseId(id, "Product id"),
      this.parseId(mediaId, "Media id"),
      altText,
    );
  }

  @Delete(":mediaId")
  @RequirePermission("catalogue.update")
  remove(
    @Param("id") id: string,
    @Param("mediaId") mediaId: string,
  ) {
    return this.mediaService.remove(
      this.parseId(id, "Product id"),
      this.parseId(mediaId, "Media id"),
    );
  }
}