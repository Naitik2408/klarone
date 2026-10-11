import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { CatalogueService } from "./catalogue.service";
import { StaffAuthGuard } from "../staff-auth/guards/staff-auth.guard";
import { StaffPermissionGuard } from "../staff-auth/guards/permission.guard";
import { RequirePermission } from "../staff-auth/decorators/require-permission.decorator";
import { CurrentStaff } from "../staff-auth/decorators/current-staff.decorator";
import type { AuthenticatedStaff } from "../staff-auth/staff-auth.types";
import type {
  CreateStaffBrandInput,
  CreateStaffCategoryInput,
  UpdateStaffBrandInput,
  UpdateStaffCategoryInput,
} from "./dto-taxonomy";

@Controller("staff/catalogue")
@UseGuards(StaffAuthGuard, StaffPermissionGuard)
export class StaffCatalogueTaxonomyController {
  constructor(private readonly catalogueService: CatalogueService) {}

  /* ------------------------- Brands ------------------------- */

  @Get("brands")
  @RequirePermission("catalogue.read")
  async listBrands(
    @Query("search") search?: string,
    @Query("status") status?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ) {
    return this.catalogueService.findStaffBrands({
      search,
      status,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @Post("brands")
  @RequirePermission("catalogue.create")
  async createBrand(
    @Body() body: CreateStaffBrandInput,
    @CurrentStaff() staff: AuthenticatedStaff,
  ) {
    return this.catalogueService.createStaffBrand(
      body,
      staff.userAccountId,
    );
  }

  @Patch("brands/:brandId")
  @RequirePermission("catalogue.update")
  async updateBrand(
    @Param("brandId") brandId: string,
    @Body() body: UpdateStaffBrandInput,
    @CurrentStaff() staff: AuthenticatedStaff,
  ) {
    if (!/^\d+$/.test(brandId)) {
      throw new BadRequestException(
        "Brand id must be a positive integer.",
      );
    }

    return this.catalogueService.updateStaffBrand(
      Number(brandId),
      body,
      staff.userAccountId,
    );
  }

  @Post("brands/:brandId/deactivate")
  @RequirePermission("catalogue.delete")
  async deactivateBrand(
    @Param("brandId") brandId: string,
    @CurrentStaff() staff: AuthenticatedStaff,
  ) {
    if (!/^\d+$/.test(brandId)) {
      throw new BadRequestException(
        "Brand id must be a positive integer.",
      );
    }

    return this.catalogueService.deactivateStaffBrand(
      Number(brandId),
      staff.userAccountId,
    );
  }

  @Delete("brands/:brandId")
  @RequirePermission("catalogue.delete")
  async deleteBrand(
    @Param("brandId") brandId: string,
    @CurrentStaff() staff: AuthenticatedStaff,
  ) {
    if (!/^\d+$/.test(brandId)) {
      throw new BadRequestException(
        "Brand id must be a positive integer.",
      );
    }

    return this.catalogueService.deleteStaffBrand(
      Number(brandId),
      staff.userAccountId,
    );
  }

  /* ----------------------- Categories ----------------------- */

  @Get("categories")
  @RequirePermission("catalogue.read")
  async listCategories() {
    return this.catalogueService.findStaffCategories();
  }

  @Post("categories")
  @RequirePermission("catalogue.create")
  async createCategory(
    @Body() body: CreateStaffCategoryInput,
    @CurrentStaff() staff: AuthenticatedStaff,
  ) {
    return this.catalogueService.createStaffCategory(
      body,
      staff.userAccountId,
    );
  }

  @Patch("categories/:categoryId")
  @RequirePermission("catalogue.update")
  async updateCategory(
    @Param("categoryId") categoryId: string,
    @Body() body: UpdateStaffCategoryInput,
    @CurrentStaff() staff: AuthenticatedStaff,
  ) {
    if (!/^\d+$/.test(categoryId)) {
      throw new BadRequestException(
        "Category id must be a positive integer.",
      );
    }

    return this.catalogueService.updateStaffCategory(
      Number(categoryId),
      body,
      staff.userAccountId,
    );
  }

  @Post("categories/:categoryId/deactivate")
  @RequirePermission("catalogue.delete")
  async deactivateCategory(
    @Param("categoryId") categoryId: string,
    @CurrentStaff() staff: AuthenticatedStaff,
  ) {
    if (!/^\d+$/.test(categoryId)) {
      throw new BadRequestException(
        "Category id must be a positive integer.",
      );
    }

    return this.catalogueService.deactivateStaffCategory(
      Number(categoryId),
      staff.userAccountId,
    );
  }

  @Delete("categories/:categoryId")
  @RequirePermission("catalogue.delete")
  async deleteCategory(
    @Param("categoryId") categoryId: string,
    @CurrentStaff() staff: AuthenticatedStaff,
  ) {
    if (!/^\d+$/.test(categoryId)) {
      throw new BadRequestException(
        "Category id must be a positive integer.",
      );
    }

    return this.catalogueService.deleteStaffCategory(
      Number(categoryId),
      staff.userAccountId,
    );
  }
}