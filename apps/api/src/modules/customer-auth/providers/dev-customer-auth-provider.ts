import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type {
  CustomerAuthProvider,
  CustomerOtpRequestResult,
  CustomerOtpVerificationInput,
} from "./customer-auth-provider";
import type { VerifiedCustomerIdentity } from "../types/customer-identity.types";

interface DemoOtpChallenge {
  challengeId: string;
  phone: string;
  code: string;
  expiresAt: number;
  verified: boolean;
}

@Injectable()
export class DevCustomerAuthProvider
  implements CustomerAuthProvider
{
  readonly providerName = "DEV_OTP";

  private readonly demoOtp = "1234";
  private readonly challengeLifetimeMs =
    5 * 60 * 1000;

  private readonly challenges = new Map<
    string,
    DemoOtpChallenge
  >();

  async requestOtp(
    phone: string,
  ): Promise<CustomerOtpRequestResult> {
    const normalizedPhone =
      this.normalizePhone(phone);

    const challengeId = randomUUID();

    this.challenges.set(challengeId, {
      challengeId,
      phone: normalizedPhone,
      code: this.demoOtp,
      expiresAt:
        Date.now() + this.challengeLifetimeMs,
      verified: false,
    });

    return {
      challengeId,
      expiresInSeconds:
        this.challengeLifetimeMs / 1000,
      maskedPhone:
        this.maskPhone(normalizedPhone),
    };
  }

  async verifyOtp(
    input: CustomerOtpVerificationInput,
  ): Promise<VerifiedCustomerIdentity> {
    const challenge =
      this.challenges.get(input.challengeId);

    if (!challenge) {
      throw new UnauthorizedException(
        "Invalid or expired OTP challenge",
      );
    }

    const normalizedPhone =
      this.normalizePhone(input.phone);

    if (challenge.phone !== normalizedPhone) {
      throw new UnauthorizedException(
        "OTP challenge does not match phone number",
      );
    }

    if (
      challenge.verified ||
      Date.now() > challenge.expiresAt
    ) {
      this.challenges.delete(
        input.challengeId,
      );

      throw new UnauthorizedException(
        "Invalid or expired OTP challenge",
      );
    }

    if (input.code.trim() !== this.demoOtp) {
      throw new UnauthorizedException(
        "Invalid OTP",
      );
    }

    challenge.verified = true;

    this.challenges.delete(input.challengeId);

    return {
      provider: this.providerName,
      externalAuthId: normalizedPhone,
      identifierType: "PHONE",
      identifierValue: normalizedPhone,
      firstName: null,
      lastName: null,
      email: null,
      phone: normalizedPhone,
      metadata: {
        source: "development",
        otpMode: "demo",
      },
    };
  }

  private normalizePhone(
    phone: string,
  ): string {
    const normalized = phone
      .trim()
      .replace(/[^\d+]/g, "");

    if (!normalized) {
      throw new BadRequestException(
        "Phone number is required",
      );
    }

    return normalized;
  }

  private maskPhone(phone: string): string {
    if (phone.length <= 4) {
      return phone;
    }

    const visibleDigits = 4;
    const hiddenCount =
      phone.length - visibleDigits;

    return `${"*".repeat(hiddenCount)}${phone.slice(
      -visibleDigits,
    )}`;
  }
}