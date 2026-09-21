import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "./database/prisma.module";
import { StaffAuthModule } from "./modules/staff-auth/staff-auth.module";
import { PlatformSettingsModule } from "./modules/platform-settings/platform-settings.module";
import { AuditModule } from "./modules/audit/audit.module";
import { CustomersModule } from "./modules/customers/customers.module";
import { CatalogueModule } from "./modules/catalogue/catalogue.module";
import { CheckoutModule } from "./modules/checkout/checkout.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ["../../.env", ".env"],
    }),
    PrismaModule,
    AuditModule,
    StaffAuthModule,
    PlatformSettingsModule,
    CustomersModule,
    CatalogueModule,
    CheckoutModule,
  ],
})
export class AppModule {}