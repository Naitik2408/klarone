import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { emailOTP, bearer, jwt } from "better-auth/plugins";
import { dash, sendEmail } from "@better-auth/infra";
import type { PrismaClient } from "@klarone/db";
import * as nodemailer from "nodemailer";

export function createBetterAuth(prisma: PrismaClient) {
  const secret =
    process.env.BETTER_AUTH_SECRET ||
    process.env.JWT_SECRET ||
    "klarone-better-auth-secret-super-secure-key-24082408";
  const baseURL = process.env.BETTER_AUTH_URL || "http://localhost:3000";

  // Gmail / SMTP Transporter for actual email dispatch
  const smtpUser = process.env.SMTP_USER || process.env.EMAIL_USER;
  const smtpPass = process.env.SMTP_PASS || process.env.EMAIL_PASS;
  const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
  const smtpPort = Number(process.env.SMTP_PORT || 587);

  let transporter: nodemailer.Transporter | null = null;
  if (smtpUser && smtpPass) {
    transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });
  }

  // Google OAuth Credentials
  const googleClientId = process.env.GOOGLE_CLIENT_ID || "";
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET || "";

  return betterAuth({
    database: prismaAdapter(prisma, {
      provider: "postgresql",
    }),
    secret,
    baseURL,
    basePath: "/api/auth",
    trustedOrigins: [
      "http://localhost:3001",
      "http://127.0.0.1:3001",
      "https://klarone-web.onrender.com",
      ...(process.env.WEB_ORIGINS ? process.env.WEB_ORIGINS.split(",").map((s) => s.trim()) : []),
    ],
    advanced: {
      useSecureCookies: process.env.NODE_ENV === "production",
      crossSubDomainCookies: {
        enabled: false,
      },
      ipAddress: {
        ipAddressHeaders: ["x-forwarded-for", "cf-connecting-ip", "x-real-ip"],
      },
    },
    emailAndPassword: {
      enabled: true,
      autoSignIn: true,
    },
    socialProviders: {
      ...(googleClientId && googleClientSecret
        ? {
            google: {
              clientId: googleClientId,
              clientSecret: googleClientSecret,
            },
          }
        : {}),
    },
    plugins: [
      dash(),
      emailOTP({
        async sendVerificationOTP({ email, otp, type }) {
          console.log("=================================================");
          console.log(`[Better Auth Email OTP] Sending to: ${email} | Code: ${otp} | Type: ${type}`);
          console.log("=================================================");

          // 1. Try sending via Better Auth Infra Cloud
          try {
            const infraRes = await sendEmail(
              {
                to: email,
                subject: `Your Klarone Verification Code: ${otp}`,
                template: "sign-in-otp",
                variables: { otpCode: otp, userEmail: email, appName: "Klarone" },
              },
              {
                apiKey: process.env.BETTER_AUTH_API_KEY,
              },
            );
            if (infraRes?.success) {
              console.log("[Better Auth Infra] Email dispatched successfully to:", email);
              return;
            }
          } catch (infraErr) {
            console.warn("[Better Auth Infra] Send notice:", infraErr);
          }

          // 2. Try sending via Nodemailer SMTP (e.g. Gmail App Password)
          if (transporter && smtpUser) {
            try {
              await transporter.sendMail({
                from: `"Klarone" <${smtpUser}>`,
                to: email,
                subject: `${otp} is your Klarone verification code`,
                html: `
                  <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; rounded: 16px;">
                    <h2 style="color: #0f172a; margin-top: 0;">Sign in to Klarone</h2>
                    <p style="color: #475569; font-size: 15px;">Use the verification code below to complete your login:</p>
                    <div style="background-color: #f1f5f9; padding: 16px; border-radius: 12px; text-align: center; margin: 24px 0;">
                      <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #0f172a;">${otp}</span>
                    </div>
                    <p style="color: #94a3b8; font-size: 13px;">This code will expire in 5 minutes. If you did not request this, you can safely ignore this email.</p>
                  </div>
                `,
              });
              console.log("[Nodemailer SMTP] Email successfully delivered to:", email);
              return;
            } catch (smtpErr) {
              console.error("[Nodemailer SMTP] Error sending mail:", smtpErr);
            }
          }
        },
      }),
      jwt({
        jwt: {
          expirationTime: "30d",
        },
      }),
      bearer(),
    ],
  });
}

export type BetterAuthInstance = ReturnType<typeof createBetterAuth>;
