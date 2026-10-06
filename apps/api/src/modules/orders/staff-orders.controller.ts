import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";

import { CurrentStaff } from "../staff-auth/decorators/current-staff.decorator";
import { RequirePermission } from "../staff-auth/decorators/require-permission.decorator";
import { StaffPermissionGuard } from "../staff-auth/guards/permission.guard";
import { StaffAuthGuard } from "../staff-auth/guards/staff-auth.guard";
import type { AuthenticatedStaff } from "../staff-auth/staff-auth.types";
import type { UpdateStaffOrderStatusInput } from "./staff-orders.dto";
import { OrdersService } from "./orders.service";

@Controller("staff/orders")
@UseGuards(StaffAuthGuard, StaffPermissionGuard)
export class StaffOrdersController {
  constructor(
    private readonly ordersService: OrdersService,
  ) {}

  @Get()
  @RequirePermission("orders.read")
  async listOrders(
    @Query("search") search?: string,
    @Query("status") status?: string,
    @Query("paymentStatus") paymentStatus?: string,
    @Query("fulfillmentStatus") fulfillmentStatus?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ) {
    return this.ordersService.listStaffOrders({
      search,
      status,
      paymentStatus,
      fulfillmentStatus,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @Get(":orderNumber")
  @RequirePermission("orders.read")
  async getOrder(
    @Param("orderNumber") orderNumber: string,
  ) {
    return this.ordersService.getStaffOrder(orderNumber);
  }

  @Post(":orderNumber/status")
  @RequirePermission("orders.update")
  async updateStatus(
    @Param("orderNumber") orderNumber: string,
    @Body() body: UpdateStaffOrderStatusInput,
    @CurrentStaff() staff: AuthenticatedStaff,
  ) {
    if (!body || typeof body.status !== "string") {
      throw new BadRequestException("Order status is required.");
    }

    return this.ordersService.updateStaffOrderStatus(
      orderNumber,
      body,
      staff.userAccountId,
    );
  }
}