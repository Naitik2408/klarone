import {
  Body,
  Controller,
  Post,
} from "@nestjs/common";
import { CheckoutService } from "./checkout.service";
import type { CheckoutQuoteDto } from "./dto/checkout-quote.dto";

@Controller("checkout")
export class CheckoutController {
  constructor(
    private readonly checkoutService: CheckoutService,
  ) {}

  @Post("quote")
  async createQuote(
    @Body() body: CheckoutQuoteDto,
  ) {
    return this.checkoutService.createQuote(body);
  }
}