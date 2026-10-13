import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
} from "@nestjs/common";

import { CustomerAuthService } from "./customer-auth.service";
import type { RequestOtpDto } from "./dto/request-otp.dto";
import type { VerifyOtpDto } from "./dto/verify-otp.dto";
import { CurrentCustomer } from "./current-customer.decorator";
import { CustomerAuthGuard } from "./guards/customer-auth.guard";
import type { AuthenticatedCustomer } from "./types/customer-session.types";

@Controller("customer-auth")
export class CustomerAuthController {
  constructor(
    private readonly customerAuthService: CustomerAuthService,
  ) {}

  @Post("request-otp")
  async requestOtp(@Body() body: RequestOtpDto) {
    return this.customerAuthService.requestOtp(body.phone);
  }

  @Post("verify-otp")
  async verifyOtp(@Body() body: VerifyOtpDto) {
    return this.customerAuthService.verifyOtp(body);
  }

  @Get("me")
  @UseGuards(CustomerAuthGuard)
  async me(
    @CurrentCustomer() customer: AuthenticatedCustomer,
  ): Promise<{
    authenticated: true;
    customer: AuthenticatedCustomer;
  }> {
    return {
      authenticated: true,
      customer,
    };
  }

  @Post("profile")
  @UseGuards(CustomerAuthGuard)
  async updateProfile(
    @CurrentCustomer() customer: AuthenticatedCustomer,
    @Body() body: { firstName?: string; lastName?: string; phone?: string; email?: string },
  ) {
    await this.customerAuthService.updateProfile(customer.personId, body);
    return { success: true };
  }
}