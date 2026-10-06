import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import { CatalogueService } from "./catalogue.service";
import { StaffAuthGuard } from "../staff-auth/guards/staff-auth.guard";
import { StaffPermissionGuard } from "../staff-auth/guards/permission.guard";
import { RequirePermission } from "../staff-auth/decorators/require-permission.decorator";
import { CurrentStaff } from "../staff-auth/decorators/current-staff.decorator";
import type { AuthenticatedStaff } from "../staff-auth/staff-auth.types";
import type {
  ArchiveProductInput,
  DeleteVariantInput,
  DuplicateProductInput,
} from "./dto-duplicate-product";
import type { BulkEditVariantsInput } from "./dto-options";

@Controller("staff/catalogue/products")
@UseGuards(StaffAuthGuard, StaffPermissionGuard)
export class StaffCatalogueProductsAdvancedController {
  constructor(private readonly catalogueService: CatalogueService) {}

  private parseId(value: string, label: string): bigint {
    if (!/^\d+$/.test(value) || BigInt(value) <= 0n) {
      throw new BadRequestException(`${label} must be a positive integer.`);
    }
    return BigInt(value);
  }

  /* ---------------- Duplicate / archive / unarchive / delete ---------------- */

  @Post(":id/duplicate")
  @RequirePermission("catalogue.create")
  duplicateProduct(
    @Param("id") id: string,
    @Body() body: DuplicateProductInput,
    @CurrentStaff() staff: AuthenticatedStaff,
  ) {
    return this.catalogueService.duplicateStaffProduct(
      this.parseId(id, "Product id"),
      body,
      staff.userAccountId,
    );
  }

  @Post(":id/archive")
  @RequirePermission("catalogue.update")
  archiveProduct(
    @Param("id") id: string,
    @Body() body: ArchiveProductInput,
    @CurrentStaff() staff: AuthenticatedStaff,
  ) {
    return this.catalogueService.archiveStaffProduct(
      this.parseId(id, "Product id"),
      body,
      staff.userAccountId,
    );
  }

  @Post(":id/unarchive")
  @RequirePermission("catalogue.update")
  unarchiveProduct(
    @Param("id") id: string,
    @CurrentStaff() staff: AuthenticatedStaff,
  ) {
    return this.catalogueService.unarchiveStaffProduct(
      this.parseId(id, "Product id"),
      staff.userAccountId,
    );
  }

  @Delete(":id")
  @RequirePermission("catalogue.delete")
  deleteProduct(
    @Param("id") id: string,
    @CurrentStaff() staff: AuthenticatedStaff,
  ) {
    return this.catalogueService.deleteStaffProduct(
      this.parseId(id, "Product id"),
      staff.userAccountId,
    );
  }

  /* ---------------- Variant bulk ops ---------------- */

  @Post(":id/variants/bulk")
  @RequirePermission("catalogue.update")
  bulkEditVariants(
    @Param("id") id: string,
    @Body() body: BulkEditVariantsInput,
    @CurrentStaff() staff: AuthenticatedStaff,
  ) {
    return this.catalogueService.bulkEditStaffVariants(
      this.parseId(id, "Product id"),
      body,
      staff.userAccountId,
    );
  }

  @Delete(":id/variants/:variantId")
  @RequirePermission("catalogue.delete")
  deleteVariant(
    @Param("id") id: string,
    @Param("variantId") variantId: string,
    @Body() body: DeleteVariantInput,
    @CurrentStaff() staff: AuthenticatedStaff,
  ) {
    return this.catalogueService.deleteStaffVariant(
      this.parseId(id, "Product id"),
      this.parseId(variantId, "Variant id"),
      body,
      staff.userAccountId,
    );
  }
}