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
  identifier: string;
  isEmail: boolean;
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
    identifier: string,
  ): Promise<CustomerOtpRequestResult> {
    const { normalized, isEmail } =
      this.normalizeIdentifier(identifier);

    const challengeId = randomUUID();

    this.challenges.set(challengeId, {
      challengeId,
      identifier: normalized,
      isEmail,
      code: this.demoOtp,
      expiresAt:
        Date.now() + this.challengeLifetimeMs,
      verified: false,
    });

    return {
      challengeId,
      expiresInSeconds:
        this.challengeLifetimeMs / 1000,
      maskedPhone: isEmail
        ? this.maskEmail(normalized)
        : this.maskPhone(normalized),
    };
  }

  async verifyOtp(
    input: CustomerOtpVerificationInput,
  ): Promise<VerifiedCustomerIdentity> {
    const challenge =
      this.challenges.get(input.challengeId);

    if (!challenge) {
      throw new UnauthorizedException(
        "Invalid or expired verification challenge",
      );
    }

    const { normalized } =
      this.normalizeIdentifier(input.phone);

    if (challenge.identifier !== normalized) {
      throw new UnauthorizedException(
        "Verification code does not match provided identifier",
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
        "Invalid or expired verification code",
      );
    }

    if (input.code.trim() !== this.demoOtp) {
      throw new UnauthorizedException(
        "Invalid verification code",
      );
    }

    challenge.verified = true;

    this.challenges.delete(input.challengeId);

    return {
      provider: this.providerName,
      externalAuthId: normalized,
      identifierType: challenge.isEmail ? "EMAIL" : "PHONE",
      identifierValue: normalized,
      firstName: null,
      lastName: null,
      email: challenge.isEmail ? normalized : null,
      phone: challenge.isEmail ? null : normalized,
      metadata: {
        source: "development",
        otpMode: "demo",
      },
    };
  }

  private normalizeIdentifier(
    input: string,
  ): { normalized: string; isEmail: boolean } {
    const trimmed = (input || "").trim();

    if (!trimmed) {
      throw new BadRequestException(
        "Email or phone number is required",
      );
    }

    if (trimmed.includes("@")) {
      return {
        normalized: trimmed.toLowerCase(),
        isEmail: true,
      };
    }

    const normalizedPhone = trimmed.replace(/[^\d+]/g, "");
    if (!normalizedPhone) {
      throw new BadRequestException(
        "Please provide a valid email or phone number",
      );
    }

    return {
      normalized: normalizedPhone,
      isEmail: false,
    };
  }

  private maskEmail(email: string): string {
    const [user, domain] = email.split("@");
    if (!user || !domain) return email;
    if (user.length <= 2) return `${user[0]}*@${domain}`;
    return `${user.slice(0, 2)}${"*".repeat(Math.max(1, user.length - 2))}@${domain}`;
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