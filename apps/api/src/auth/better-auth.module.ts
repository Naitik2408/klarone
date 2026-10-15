import { Global, Module } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { createBetterAuth } from "./better-auth.config";
import { BETTER_AUTH_INSTANCE } from "./better-auth.constants";
import { BetterAuthController } from "./better-auth.controller";

@Global()
@Module({
  controllers: [BetterAuthController],
  providers: [
    {
      provide: BETTER_AUTH_INSTANCE,
      useFactory: (prisma: PrismaService) => {
        return createBetterAuth(prisma);
      },
      inject: [PrismaService],
    },
  ],
  exports: [BETTER_AUTH_INSTANCE],
})
export class BetterAuthModule {}
