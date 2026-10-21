import { Module } from "@nestjs/common";
import { PrismaModule } from "../../database/prisma.module";
import { AuditModule } from "../audit/audit.module";
import { StaffAuthModule } from "../staff-auth/staff-auth.module";
import { StaffManagementController } from "./staff-management.controller";
import { StaffManagementService } from "./staff-management.service";

@Module({
  imports: [PrismaModule, AuditModule, StaffAuthModule],
  controllers: [StaffManagementController],
  providers: [StaffManagementService],
  exports: [StaffManagementService],
})
export class StaffManagementModule {}
