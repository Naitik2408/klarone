import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";

import { CustomerAuthGuard } from "../customer-auth/guards/customer-auth.guard";
import { CurrentCustomer } from "../customer-auth/current-customer.decorator";
import type { AuthenticatedCustomer } from "../customer-auth/types/customer-session.types";
import type { CheckoutQuoteDto } from "./dto/checkout-quote.dto";
import { CheckoutService } from "./checkout.service";

@Controller("checkout")
export class CheckoutController {
  constructor(
    private readonly checkoutService: CheckoutService,
  ) {}

  @Post("quote")
  async quote(
    @Body() body: CheckoutQuoteDto,
  ) {
    return this.checkoutService.quote(body);
  }

  @Post("order")
  @UseGuards(CustomerAuthGuard)
  async createOrder(
    @CurrentCustomer()
    customer: AuthenticatedCustomer,
    @Body() body?: import("./dto/create-order.dto").CreateOrderDto,
  ) {
    return this.checkoutService.createOrder(
      customer,
      body,
    );
  }

  @Post("order/:orderNumber/cancel")
  @UseGuards(CustomerAuthGuard)
  async cancelPendingOrder(
    @CurrentCustomer()
    customer: AuthenticatedCustomer,
    @Param("orderNumber")
    orderNumber: string,
  ) {
    return this.checkoutService.cancelPendingOrder(
      customer,
      orderNumber,
    );
  }
}
