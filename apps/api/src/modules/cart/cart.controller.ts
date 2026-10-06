import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";

import { CurrentCustomer } from "../customer-auth/current-customer.decorator";
import { CustomerAuthGuard } from "../customer-auth/guards/customer-auth.guard";
import type { AuthenticatedCustomer } from "../customer-auth/types/customer-session.types";
import type { AddCartItemDto } from "./dto/add-cart-item.dto";
import type { UpdateCartItemDto } from "./dto/update-cart-item.dto";
import { CartService } from "./cart.service";

@Controller("cart")
@UseGuards(CustomerAuthGuard)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  async getCart(
    @CurrentCustomer() customer: AuthenticatedCustomer,
  ) {
    return this.cartService.getCart(customer);
  }

  @Post("items")
  async addItem(
    @CurrentCustomer() customer: AuthenticatedCustomer,
    @Body() body: AddCartItemDto,
  ) {
    return this.cartService.addItem(customer, body);
  }

  @Patch("items/:itemId")
  async updateItem(
    @CurrentCustomer() customer: AuthenticatedCustomer,
    @Param("itemId") itemId: string,
    @Body() body: UpdateCartItemDto,
  ) {
    return this.cartService.updateItem(
      customer,
      itemId,
      body,
    );
  }

  @Delete("items/:itemId")
  async removeItem(
    @CurrentCustomer() customer: AuthenticatedCustomer,
    @Param("itemId") itemId: string,
  ) {
    return this.cartService.removeItem(
      customer,
      itemId,
    );
  }

  @Delete("items")
  async clearCart(
    @CurrentCustomer() customer: AuthenticatedCustomer,
  ) {
    return this.cartService.clearCart(customer);
  }
}