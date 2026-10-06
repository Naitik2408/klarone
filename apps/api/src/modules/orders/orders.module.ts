import { Module } from "@nestjs/common";

import { PrismaModule } from "../../database/prisma.module";
import { CustomerAuthModule } from "../customer-auth/customer-auth.module";
import { OrdersController } from "./orders.controller";
import { StaffOrdersController } from "./staff-orders.controller";
import { StaffDraftsController } from "./staff-drafts.controller";
import { OrdersService } from "./orders.service";
import { DraftOrdersService } from "./draft-orders.service";

@Module({
  imports: [
    PrismaModule,
    CustomerAuthModule,
  ],
  controllers: [
    OrdersController,
    StaffOrdersController,
    StaffDraftsController,
  ],
  providers: [
    OrdersService,
    DraftOrdersService,
  ],
  exports: [
    OrdersService,
    DraftOrdersService,
  ],
})
export class OrdersModule {}