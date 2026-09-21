import path from "node:path";
import dotenv from "dotenv";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../database/prisma.service";
import { CustomerAuthService } from "./customer-auth.service";
import { DevCustomerAuthProvider } from "./providers/dev-customer-auth-provider";

dotenv.config({
  path: path.resolve(process.cwd(), "../../.env"),
});

async function main(): Promise<void> {
  const configService = new ConfigService();

  const prisma = new PrismaService(configService);

  await prisma.$connect();

  try {
    const authProvider =
      new DevCustomerAuthProvider();

    const service = new CustomerAuthService(
      prisma,
      authProvider,
    );

    const first =
      await service.resolveCredential(
        "dev-customer-provider-test",
      );

    const second =
      await service.resolveCredential(
        "dev-customer-provider-test",
      );

    console.log(
      JSON.stringify(
        {
          first,
          second,
          sameUserAccount:
            first.userAccountId ===
            second.userAccountId,
          sameCustomer:
            first.customerId ===
            second.customerId,
          samePerson:
            first.personId ===
            second.personId,
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
    "Customer identity development test failed:",
  );
  console.error(error);

  process.exitCode = 1;
});