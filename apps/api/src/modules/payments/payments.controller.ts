import {
  Body,
  Controller,
  Post,
  UseGuards,
} from "@nestjs/common";

import { CurrentCustomer } from "../customer-auth/current-customer.decorator";
import { CustomerAuthGuard } from "../customer-auth/guards/customer-auth.guard";
import type { AuthenticatedCustomer } from "../customer-auth/types/customer-session.types";
import type { InitiatePaymentDto } from "./dto/initiate-payment.dto";
import type { VerifyRazorpayPaymentDto } from "./dto/verify-razorpay-payment.dto";
import { PaymentsService } from "./payments.service";

@Controller("payments")
@UseGuards(CustomerAuthGuard)
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
  ) {}

  @Post("initiate")
  async initiatePayment(
    @CurrentCustomer()
    customer: AuthenticatedCustomer,
    @Body()
    body: InitiatePaymentDto,
  ) {
    return this.paymentsService.initiatePayment(
      customer,
      body,
    );
  }

  @Post("razorpay/verify")
  async verifyRazorpayPayment(
    @CurrentCustomer()
    customer: AuthenticatedCustomer,
    @Body()
    body: VerifyRazorpayPaymentDto,
  ) {
    return this.paymentsService.verifyRazorpayPayment(
      customer,
      body,
    );
  }
}
