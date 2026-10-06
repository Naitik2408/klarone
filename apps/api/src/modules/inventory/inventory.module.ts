import { Module } from "@nestjs/common";
import { PrismaModule } from "../../database/prisma.module";
import { StaffAuthModule } from "../staff-auth/staff-auth.module";
import { InventoryController } from "./inventory.controller";
import { InventoryService } from "./inventory.service";

@Module({
  imports: [
    PrismaModule,
    StaffAuthModule,
  ],
  controllers: [InventoryController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
