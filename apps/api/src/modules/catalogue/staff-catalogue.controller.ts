import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
  BadRequestException,
} from "@nestjs/common";
import { CatalogueService } from "./catalogue.service";
import { StaffAuthGuard } from "../staff-auth/guards/staff-auth.guard";
import { StaffPermissionGuard } from "../staff-auth/guards/permission.guard";
import { RequirePermission } from "../staff-auth/decorators/require-permission.decorator";
import { CurrentStaff } from "../staff-auth/decorators/current-staff.decorator";
import type { AuthenticatedStaff } from "../staff-auth/staff-auth.types";
import type { CreateStaffProductInput } from "./dto-create-staff-product";
import type { UpdateStaffProductInput } from "./dto-update-staff-product";
import type { CreateStaffVariantInput } from "./dto-create-staff-variant";

@Controller("staff/catalogue")
@UseGuards(StaffAuthGuard, StaffPermissionGuard)
export class StaffCatalogueController {
  constructor(
    private readonly catalogueService: CatalogueService,
  ) {}

  @Get("products")
  @RequirePermission("catalogue.read")
  async getProducts(
    @Query("search") search?: string,
    @Query("status") status?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ) {
    return this.catalogueService.findStaffProducts({
      search,
      status,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @Post("products")
  @RequirePermission("catalogue.create")
  async createProduct(
    @Body() body: CreateStaffProductInput,
    @CurrentStaff() staff: AuthenticatedStaff,
  ) {
    return this.catalogueService.createStaffProduct(
      body,
      staff.userAccountId,
    );
  }

  @Get("products/:id")
  @RequirePermission("catalogue.read")
  async getProduct(
    @Param("id") id: string,
  ) {
    if (!/^\d+$/.test(id)) {
      throw new BadRequestException(
        "Product id must be a positive integer.",
      );
    }

    return this.catalogueService.findStaffProductById(
      BigInt(id),
    );
  }

  @Post("products/:id/update")
  @RequirePermission("catalogue.update")
  async updateProduct(
    @Param("id") id: string,
    @Body() body: UpdateStaffProductInput,
    @CurrentStaff() staff: AuthenticatedStaff,
  ) {
    if (!/^\d+$/.test(id)) {
      throw new BadRequestException(
        "Product id must be a positive integer.",
      );
    }

    return this.catalogueService.updateStaffProduct(
      BigInt(id),
      body,
      staff.userAccountId,
    );
  }

  @Post("products/:id/variants")
  @RequirePermission("catalogue.update")
  async createVariant(
    @Param("id") id: string,
    @Body() body: CreateStaffVariantInput,
    @CurrentStaff() staff: AuthenticatedStaff,
  ) {
    if (!/^\d+$/.test(id)) {
      throw new BadRequestException(
        "Product id must be a positive integer.",
      );
    }

    return this.catalogueService.createStaffVariant(
      BigInt(id),
      body,
      staff.userAccountId,
    );
  }

  @Post("products/:id/variants/:variantId/deactivate")
  @RequirePermission("catalogue.update")
  async deactivateVariant(
    @Param("id") id: string,
    @Param("variantId") variantId: string,
    @CurrentStaff() staff: AuthenticatedStaff,
  ) {
    if (!/^\d+$/.test(id) || !/^\d+$/.test(variantId)) {
      throw new BadRequestException(
        "Product and variant ids must be positive integers.",
      );
    }

    return this.catalogueService.deactivateStaffVariant(
      BigInt(id),
      BigInt(variantId),
      staff.userAccountId,
    );
  }

  @Post("products/:id/variants/:variantId/activate")
  @RequirePermission("catalogue.update")
  async activateVariant(
    @Param("id") id: string,
    @Param("variantId") variantId: string,
    @CurrentStaff() staff: AuthenticatedStaff,
  ) {
    if (!/^\d+$/.test(id) || !/^\d+$/.test(variantId)) {
      throw new BadRequestException(
        "Product and variant ids must be positive integers.",
      );
    }

    return this.catalogueService.activateStaffVariant(
      BigInt(id),
      BigInt(variantId),
      staff.userAccountId,
    );
  }

  @Post("products/:id/publish")
  @RequirePermission("catalogue.publish")
  async publishProduct(
    @Param("id") id: string,
    @CurrentStaff() staff: AuthenticatedStaff,
  ) {
    if (!/^\d+$/.test(id)) {
      throw new BadRequestException(
        "Product id must be a positive integer.",
      );
    }

    return this.catalogueService.publishStaffProduct(
      BigInt(id),
      staff.userAccountId,
    );
  }
}