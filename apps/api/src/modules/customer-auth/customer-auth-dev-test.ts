import path from "node:path";
import dotenv from "dotenv";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../../database/prisma.service";
import { CustomerAuthService } from "./customer-auth.service";
import { DevCustomerAuthProvider } from "./providers/dev-customer-auth-provider";

dotenv.config({
  path: path.resolve(process.cwd(), "../../.env"),
});

async function main(): Promise<void> {
  const configService = new ConfigService();

  const prisma = new PrismaService(configService);

  const jwtService = new JwtService({
    secret:
      configService.getOrThrow<string>(
        "CUSTOMER_AUTH_JWT_SECRET",
      ),
  });

  await prisma.$connect();

  try {
    const authProvider =
      new DevCustomerAuthProvider();

    const service = new CustomerAuthService(
      prisma,
      jwtService,
      configService,
      authProvider,
    );

    const phone = "+919876543210";

    const firstOtpRequest =
      await service.requestOtp(phone);

    console.log(
      "First OTP request:",
      JSON.stringify(firstOtpRequest, null, 2),
    );

    const firstLogin =
      await service.verifyOtp({
        challengeId:
          firstOtpRequest.challengeId,
        phone,
        code: "1234",
      });

    const secondOtpRequest =
      await service.requestOtp(phone);

    console.log(
      "Second OTP request:",
      JSON.stringify(secondOtpRequest, null, 2),
    );

    const secondLogin =
      await service.verifyOtp({
        challengeId:
          secondOtpRequest.challengeId,
        phone,
        code: "1234",
      });

    console.log(
      JSON.stringify(
        {
          firstLogin: {
            tokenType: firstLogin.tokenType,
            expiresIn: firstLogin.expiresIn,
            hasAccessToken:
              Boolean(firstLogin.accessToken),
            customer: firstLogin.customer,
          },
          secondLogin: {
            tokenType: secondLogin.tokenType,
            expiresIn: secondLogin.expiresIn,
            hasAccessToken:
              Boolean(secondLogin.accessToken),
            customer: secondLogin.customer,
          },
          sameUserAccount:
            firstLogin.customer.userAccountId ===
            secondLogin.customer.userAccountId,
          sameCustomer:
            firstLogin.customer.customerId ===
            secondLogin.customer.customerId,
          samePerson:
            firstLogin.customer.personId ===
            secondLogin.customer.personId,
        },
        null,
        2,
      ),
    );
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((error: unknown) => {
  console.error(
    "Customer OTP development test failed:",
  );
  console.error(error);

  process.exitCode = 1;
});