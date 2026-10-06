import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
} from "@nestjs/common";
import { InventoryService } from "./inventory.service";
import { StaffAuthGuard } from "../staff-auth/guards/staff-auth.guard";
import { StaffPermissionGuard } from "../staff-auth/guards/permission.guard";
import { RequirePermission } from "../staff-auth/decorators/require-permission.decorator";
import { CurrentStaff } from "../staff-auth/decorators/current-staff.decorator";
import type { AuthenticatedStaff } from "../staff-auth/staff-auth.types";
import type { AdjustInventoryInput } from "./dto-adjust-inventory";
import type { InitializeInventoryInput } from "./dto-initialize-inventory";

@Controller("staff/inventory")
@UseGuards(StaffAuthGuard, StaffPermissionGuard)
export class InventoryController {
  constructor(
    private readonly inventoryService: InventoryService,
  ) {}

  @Get()
  @RequirePermission("inventory.read")
  async getInventory(
    @Query("search") search?: string,
    @Query("warehouseId") warehouseId?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ) {
    return this.inventoryService.findStaffInventory({
      search,
      warehouseId: warehouseId
        ? Number(warehouseId)
        : undefined,
      page: page ? Number(page) : undefined,
      pageSize: pageSize
        ? Number(pageSize)
        : undefined,
    });
  }

  @Get("warehouses")
  @RequirePermission("inventory.read")
  async getWarehouses() {
    return this.inventoryService.findWarehouses();
  }

  @Get("variants")
  @RequirePermission("inventory.read")
  async getInitializationCandidates(
    @Query("warehouseId") warehouseId?: string,
    @Query("search") search?: string,
  ) {
    return this.inventoryService.findInitializationCandidates({
      warehouseId: warehouseId
        ? Number(warehouseId)
        : undefined,
      search,
    });
  }
  @Post("initialize")
  @RequirePermission("inventory.adjust")
  async initializeInventory(
    @Body() body: InitializeInventoryInput,
    @CurrentStaff() staff: AuthenticatedStaff,
  ) {
    return this.inventoryService.initializeInventory(
      body,
      staff.userAccountId,
    );
  }
  @Post("adjust")
  @RequirePermission("inventory.adjust")
  async adjustInventory(
    @Body() body: AdjustInventoryInput,
    @CurrentStaff() staff: AuthenticatedStaff,
  ) {
    return this.inventoryService.adjustInventory(
      body,
      staff.userAccountId,
    );
  }
}


