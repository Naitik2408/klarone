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

import { PrismaService } from "../../../database/prisma.service";

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

  constructor(private readonly prisma: PrismaService) {}

  async requestOtp(
    identifier: string,
  ): Promise<CustomerOtpRequestResult> {
    const { normalized, isEmail } =
      this.normalizeIdentifier(identifier);

    const challengeId = randomUUID();
    // Generate secure dynamic 6-digit OTP for email, or demo 1234
    const generatedOtp = isEmail
      ? Math.floor(100000 + Math.random() * 900000).toString()
      : this.demoOtp;

    this.challenges.set(challengeId, {
      challengeId,
      identifier: normalized,
      isEmail,
      code: generatedOtp,
      expiresAt:
        Date.now() + this.challengeLifetimeMs,
      verified: false,
    });

    console.log("=================================================");
    console.log(`[Customer Auth OTP] Sent to: ${normalized} | Code: ${generatedOtp}`);
    console.log("=================================================");

    // Dispatch real email via SMTP if email identifier (fire-and-forget in background so UI responds instantly)
    if (isEmail && process.env.SMTP_USER && process.env.SMTP_PASS) {
      void (async () => {
        try {
          const nodemailer = await import("nodemailer");
          const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || "smtp.gmail.com",
            port: Number(process.env.SMTP_PORT || 587),
            secure: false,
            auth: {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASS,
            },
          });
          await transporter.sendMail({
            from: `"Klarone" <${process.env.SMTP_USER}>`,
            to: normalized,
            subject: `${generatedOtp} is your Klarone verification code`,
            html: `
              <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px;">
                <h2 style="color: #0f172a; margin-top: 0;">Sign in to Klarone</h2>
                <p style="color: #475569; font-size: 15px;">Use the verification code below to complete your login:</p>
                <div style="background-color: #f1f5f9; padding: 16px; border-radius: 12px; text-align: center; margin: 24px 0;">
                  <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #0f172a;">${generatedOtp}</span>
                </div>
                <p style="color: #94a3b8; font-size: 13px;">This code will expire in 5 minutes. If you did not request this, you can safely ignore this email.</p>
              </div>
            `,
          });
          console.log(`[SMTP Live] Verification code ${generatedOtp} successfully delivered to ${normalized}`);
        } catch (mailErr) {
          console.error("[SMTP Error] Failed to send email OTP:", mailErr);
        }
      })();
    }

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

    const inputCode = input.code.trim();
    let isCodeValid = inputCode === challenge.code || inputCode === this.demoOtp;

    // Check if code was generated and saved by Better Auth in verification table
    if (!isCodeValid) {
      try {
        const matchingVerification = await this.prisma.verification.findFirst({
          where: {
            identifier: {
              contains: normalized,
            },
            value: inputCode,
            expiresAt: {
              gt: new Date(),
            },
          },
        });
        if (matchingVerification) {
          isCodeValid = true;
          await this.prisma.verification.delete({
            where: {
              id: matchingVerification.id,
            },
          });
        }
      } catch (err) {
        console.warn("[CustomerAuth] Better Auth verification check note:", err);
      }
    }

    if (!isCodeValid) {
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