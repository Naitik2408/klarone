import { Module } from "@nestjs/common";
import { PrismaModule } from "../../database/prisma.module";
import { StaffAuthModule } from "../staff-auth/staff-auth.module";
import { PlatformSettingsController } from "./platform-settings.controller";
import { PlatformSettingsService } from "./platform-settings.service";

@Module({
  imports: [
    PrismaModule,
    StaffAuthModule,
  ],
  controllers: [PlatformSettingsController],
  providers: [PlatformSettingsService],
  exports: [PlatformSettingsService],
})
export class PlatformSettingsModule {}