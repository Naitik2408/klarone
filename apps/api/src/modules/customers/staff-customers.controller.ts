import {
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

import { CustomersService } from "./customers.service";
import { StaffAuthGuard } from "../staff-auth/guards/staff-auth.guard";
import { StaffPermissionGuard } from "../staff-auth/guards/permission.guard";
import { RequirePermission } from "../staff-auth/decorators/require-permission.decorator";

import type {
  CreateStaffCustomerInput,
  UpdateStaffCustomerInput,
} from "./dto-create-staff-customer";

@Controller("staff/customers")
@UseGuards(StaffAuthGuard, StaffPermissionGuard)
export class StaffCustomersController {
  constructor(
    private readonly customersService: CustomersService,
  ) {}

  @Get()
  @RequirePermission("customers.read")
  async listCustomers(
    @Query("search") search?: string,
    @Query("status") status?: string,
    @Query("customerType") customerType?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ) {
    return this.customersService.listStaffCustomers({
      search,
      status,
      customerType,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @Get(":customerCode")
  @RequirePermission("customers.read")
  async getCustomer(
    @Param("customerCode") customerCode: string,
  ) {
    return this.customersService.getStaffCustomer(
      customerCode,
    );
  }

  @Post()
  @RequirePermission("customers.create")
  async createCustomer(
    @Body() body: CreateStaffCustomerInput,
  ) {
    return this.customersService.createStaffCustomer(body);
  }

  @Patch(":customerCode")
  @RequirePermission("customers.update")
  async updateCustomer(
    @Param("customerCode") customerCode: string,
    @Body() body: UpdateStaffCustomerInput,
  ) {
    return this.customersService.updateStaffCustomer(
      customerCode,
      body,
    );
  }

  @Delete(":customerCode")
  @RequirePermission("customers.delete")
  async deleteCustomer(
    @Param("customerCode") customerCode: string,
  ) {
    return this.customersService.deleteStaffCustomer(
      customerCode,
    );
  }
}