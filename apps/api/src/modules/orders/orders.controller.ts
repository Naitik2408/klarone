import {
  Controller,
  Get,
  Param,
  UseGuards,
} from "@nestjs/common";

import { CurrentCustomer } from "../customer-auth/current-customer.decorator";
import { CustomerAuthGuard } from "../customer-auth/guards/customer-auth.guard";
import type { AuthenticatedCustomer } from "../customer-auth/types/customer-session.types";
import { OrdersService } from "./orders.service";

@Controller("orders")
@UseGuards(CustomerAuthGuard)
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
  ) {}

  @Get()
  async listOrders(
    @CurrentCustomer()
    customer: AuthenticatedCustomer,
  ) {
    return this.ordersService.listOrders(
      customer,
    );
  }

  @Get(":orderNumber")
  async getOrder(
    @CurrentCustomer()
    customer: AuthenticatedCustomer,
    @Param("orderNumber")
    orderNumber: string,
  ) {
    return this.ordersService.getOrder(
      customer,
      orderNumber,
    );
  }
}