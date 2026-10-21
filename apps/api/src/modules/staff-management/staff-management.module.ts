import { Module } from "@nestjs/common";
import { PrismaModule } from "../../database/prisma.module";
import { AuditModule } from "../audit/audit.module";
import { StaffManagementController } from "./staff-management.controller";
import { StaffManagementService } from "./staff-management.service";

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [StaffManagementController],
  providers: [StaffManagementService],
  exports: [StaffManagementService],
})
export class StaffManagementModule {}
