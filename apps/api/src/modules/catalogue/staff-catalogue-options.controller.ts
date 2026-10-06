import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
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
  AddStaffProductOptionValueInput,
  CreateStaffProductOptionInput,
  SetVariantOptionValuesInput,
  UpdateStaffProductOptionInput,
  UpdateStaffProductOptionValueInput,
} from "./dto-options";

@Controller("staff/catalogue/products/:id")
@UseGuards(StaffAuthGuard, StaffPermissionGuard)
export class StaffCatalogueOptionsController {
  constructor(private readonly catalogueService: CatalogueService) { }

  private parseId(value: string, label: string): bigint {
    if (!/^\d+$/.test(value) || BigInt(value) <= 0n) {
      throw new BadRequestException(`${label} must be a positive integer.`);
    }
    return BigInt(value);
  }

  /* ---------------- Options ---------------- */

  @Get("options")
  @RequirePermission("catalogue.read")
  listOptions(@Param("id") id: string) {
    return this.catalogueService.findStaffProductOptions(
      this.parseId(id, "Product id"),
    );
  }

  @Post("options")
  @RequirePermission("catalogue.update")
  createOption(
    @Param("id") id: string,
    @Body() body: CreateStaffProductOptionInput,
    @CurrentStaff() staff: AuthenticatedStaff,
  ) {
    return this.catalogueService.createStaffProductOption(
      this.parseId(id, "Product id"),
      body,
      staff.userAccountId,
    );
  }

  @Patch("options/:optionId")
  @RequirePermission("catalogue.update")
  updateOption(
    @Param("id") id: string,
    @Param("optionId") optionId: string,
    @Body() body: UpdateStaffProductOptionInput,
    @CurrentStaff() staff: AuthenticatedStaff,
  ) {
    return this.catalogueService.updateStaffProductOption(
      this.parseId(id, "Product id"),
      this.parseId(optionId, "Option id"),
      body,
      staff.userAccountId,
    );
  }

  @Delete("options/:optionId")
  @RequirePermission("catalogue.delete")
  deleteOption(
    @Param("id") id: string,
    @Param("optionId") optionId: string,
    @CurrentStaff() staff: AuthenticatedStaff,
  ) {
    return this.catalogueService.deleteStaffProductOption(
      this.parseId(id, "Product id"),
      this.parseId(optionId, "Option id"),
      staff.userAccountId,
    );
  }

  /* ---------------- Option values ---------------- */

  @Post("options/:optionId/values")
  @RequirePermission("catalogue.update")
  addOptionValue(
    @Param("id") id: string,
    @Param("optionId") optionId: string,
    @Body() body: AddStaffProductOptionValueInput,
    @CurrentStaff() staff: AuthenticatedStaff,
  ) {
    return this.catalogueService.addStaffProductOptionValue(
      this.parseId(id, "Product id"),
      this.parseId(optionId, "Option id"),
      body,
      staff.userAccountId,
    );
  }

  @Patch("options/:optionId/values/:valueId")
  @RequirePermission("catalogue.update")
  updateOptionValue(
    @Param("id") id: string,
    @Param("optionId") optionId: string,
    @Param("valueId") valueId: string,
    @Body() body: UpdateStaffProductOptionValueInput,
    @CurrentStaff() staff: AuthenticatedStaff,
  ) {
    return this.catalogueService.updateStaffProductOptionValue(
      this.parseId(id, "Product id"),
      this.parseId(optionId, "Option id"),
      this.parseId(valueId, "Value id"),
      body,
      staff.userAccountId,
    );
  }

  @Delete("options/:optionId/values/:valueId")
  @RequirePermission("catalogue.delete")
  deleteOptionValue(
    @Param("id") id: string,
    @Param("optionId") optionId: string,
    @Param("valueId") valueId: string,
    @CurrentStaff() staff: AuthenticatedStaff,
  ) {
    return this.catalogueService.deleteStaffProductOptionValue(
      this.parseId(id, "Product id"),
      this.parseId(optionId, "Option id"),
      this.parseId(valueId, "Value id"),
      staff.userAccountId,
    );
  }

  @Post("options/sync-matrix")
  @RequirePermission("catalogue.update")
  syncVariantMatrix(
    @Param("id") id: string,
    @CurrentStaff() staff: AuthenticatedStaff,
  ) {
    return this.catalogueService.syncStaffVariantMatrix(
      this.parseId(id, "Product id"),
      staff.userAccountId,
    );
  }

  /* ---------------- Variant ↔ option value links ---------------- */

  @Get("variants/:variantId/option-values")
  @RequirePermission("catalogue.read")
  getVariantOptionValues(
    @Param("id") id: string,
    @Param("variantId") variantId: string,
  ) {
    return this.catalogueService.getVariantOptionValues(
      this.parseId(id, "Product id"),
      this.parseId(variantId, "Variant id"),
    );
  }

  @Post("variants/:variantId/option-values")
  @RequirePermission("catalogue.update")
  setVariantOptionValues(
    @Param("id") id: string,
    @Param("variantId") variantId: string,
    @Body() body: SetVariantOptionValuesInput,
    @CurrentStaff() staff: AuthenticatedStaff,
  ) {
    return this.catalogueService.setVariantOptionValues(
      this.parseId(id, "Product id"),
      this.parseId(variantId, "Variant id"),
      body,
      staff.userAccountId,
    );
  }
}