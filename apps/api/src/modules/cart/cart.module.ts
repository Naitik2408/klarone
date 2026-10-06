import { Module } from "@nestjs/common";

import { PrismaModule } from "../../database/prisma.module";
import { CustomerAuthModule } from "../customer-auth/customer-auth.module";
import { CartController } from "./cart.controller";
import { CartService } from "./cart.service";

@Module({
  imports: [
    PrismaModule,
    CustomerAuthModule,
  ],
  controllers: [CartController],
  providers: [CartService],
  exports: [CartService],
})
export class CartModule {}