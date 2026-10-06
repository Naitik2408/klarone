import { Module } from "@nestjs/common";
import {
  ConfigModule,
  ConfigService,
} from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";

import { PrismaModule } from "../../database/prisma.module";
import { CustomerAuthController } from "./customer-auth.controller";
import { CustomerAuthService } from "./customer-auth.service";
import { CUSTOMER_AUTH_PROVIDER } from "./providers/customer-auth-provider";
import { DevCustomerAuthProvider } from "./providers/dev-customer-auth-provider";
import { CustomerAuthGuard } from "./guards/customer-auth.guard";

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (
        configService: ConfigService,
      ) => ({
        secret:
          configService.getOrThrow<string>(
            "CUSTOMER_AUTH_JWT_SECRET",
          ),
        signOptions: {
          expiresIn: "30m",
          issuer:
            configService.get<string>(
              "CUSTOMER_AUTH_JWT_ISSUER",
              "klarone-api",
            ),
          audience:
            configService.get<string>(
              "CUSTOMER_AUTH_JWT_AUDIENCE",
              "klarone-customer",
            ),
        },
      }),
    }),
  ],
  controllers: [
    CustomerAuthController,
  ],
  providers: [
    CustomerAuthService,
    CustomerAuthGuard,
    DevCustomerAuthProvider,
    {
      provide: CUSTOMER_AUTH_PROVIDER,
      useExisting:
        DevCustomerAuthProvider,
    },
  ],
  exports: [
    CustomerAuthService,
    CustomerAuthGuard,
    JwtModule,
    CUSTOMER_AUTH_PROVIDER,
  ],
})
export class CustomerAuthModule {}