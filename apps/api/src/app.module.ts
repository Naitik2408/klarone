import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { StorageModule } from "./common/storage/storage.module";
import { PrismaModule } from "./database/prisma.module";
import { BetterAuthModule } from "./auth/better-auth.module";
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
import { StaffManagementModule } from "./modules/staff-management/staff-management.module";
import { MonitoringModule } from "./modules/monitoring/monitoring.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ["../../.env", ".env"],
    }),
    StorageModule,
    PrismaModule,
    BetterAuthModule,
    AuditModule,
    StaffAuthModule,
    StaffManagementModule,
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
    MonitoringModule,
  ],
})
export class AppModule {}
