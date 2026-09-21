import { Module } from "@nestjs/common";
import { PrismaModule } from "../../database/prisma.module";
import { CustomerAuthService } from "./customer-auth.service";
import { CUSTOMER_AUTH_PROVIDER } from "./providers/customer-auth-provider";
import { DevCustomerAuthProvider } from "./providers/dev-customer-auth-provider";

@Module({
  imports: [PrismaModule],
  providers: [
    CustomerAuthService,
    DevCustomerAuthProvider,
    {
      provide: CUSTOMER_AUTH_PROVIDER,
      useExisting: DevCustomerAuthProvider,
    },
  ],
  exports: [
    CustomerAuthService,
    CUSTOMER_AUTH_PROVIDER,
  ],
})
export class CustomerAuthModule {}