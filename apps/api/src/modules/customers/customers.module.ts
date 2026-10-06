import { Module } from "@nestjs/common";

import { PrismaModule } from "../../database/prisma.module";
import { CustomerAuthModule } from "../customer-auth/customer-auth.module";
import { CustomersController } from "./customers.controller";
import { StaffCustomersController } from "./staff-customers.controller";
import { CustomersService } from "./customers.service";

@Module({
  imports: [
    PrismaModule,
    CustomerAuthModule,
  ],
  controllers: [
    CustomersController,
    StaffCustomersController,
  ],
  providers: [
    CustomersService,
  ],
  exports: [
    CustomersService,
  ],
})
export class CustomersModule {}