import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import type { Request } from "express";
import { fromNodeHeaders } from "better-auth/node";

import { CustomerAuthService } from "./customer-auth.service";
import type { RequestOtpDto } from "./dto/request-otp.dto";
import type { VerifyOtpDto } from "./dto/verify-otp.dto";
import { CurrentCustomer } from "./current-customer.decorator";
import { CustomerAuthGuard } from "./guards/customer-auth.guard";
import type { AuthenticatedCustomer } from "./types/customer-session.types";
import { BETTER_AUTH_INSTANCE } from "../../auth/better-auth.constants";
import type { BetterAuthInstance } from "../../auth/better-auth.config";

@Controller("customer-auth")
export class CustomerAuthController {
  constructor(
    private readonly customerAuthService: CustomerAuthService,
    @Inject(BETTER_AUTH_INSTANCE)
    private readonly auth: BetterAuthInstance,
  ) {}

  @Post("request-otp")
  async requestOtp(@Body() body: RequestOtpDto) {
    return this.customerAuthService.requestOtp(body.phone);
  }

  @Post("verify-otp")
  async verifyOtp(@Body() body: VerifyOtpDto) {
    return this.customerAuthService.verifyOtp(body);
  }

  /**
   * Cryptographically secure session sync endpoint:
   * Validates the caller's server-side session cookie via Better Auth.
   * Untrusted client bodies cannot forge an arbitrary user identity.
   */
  @Post("sync-session")
  async syncSession(@Req() req: Request) {
    const session = await this.auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session || !session.user || !session.user.email) {
      throw new UnauthorizedException(
        "Invalid or expired Better Auth session. Please sign in again.",
      );
    }

    return this.customerAuthService.syncBetterAuthSession({
      email: session.user.email,
      name: session.user.name || undefined,
      betterAuthUserId: session.user.id,
    });
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
}
