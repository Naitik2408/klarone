import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "./database/prisma.module";
import { StaffAuthModule } from "./modules/staff-auth/staff-auth.module";
import { PlatformSettingsModule } from "./modules/platform-settings/platform-settings.module";
import { AuditModule } from "./modules/audit/audit.module";
import { CustomersModule } from "./modules/customers/customers.module";
import { CatalogueModule } from "./modules/catalogue/catalogue.module";
import { CheckoutModule } from "./modules/checkout/checkout.module";
import { CustomerAuthModule } from "./modules/customer-auth/customer-auth.module";
import { CartModule } from "./modules/cart/cart.module";
import { OrdersModule } from "./modules/orders/orders.module";
import { PaymentsModule } from "./modules/payments/payments.module";
import { RecommendationsModule } from "./modules/recommendations/recommendations.module";
import { InventoryModule } from "./modules/inventory/inventory.module";
import { MetaobjectsModule } from "./modules/metaobjects/metaobjects.module";

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
    InventoryModule,
    CheckoutModule,
    CustomerAuthModule,
    CartModule,
    OrdersModule,
    PaymentsModule,
    RecommendationsModule,
    MetaobjectsModule,
  ],
})
export class AppModule {}
