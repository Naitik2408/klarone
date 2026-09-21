import {
  Body,
  Controller,
  Get,
  Param,
  Put,
  UseGuards,
} from "@nestjs/common";
import { PlatformSettingsService } from "./platform-settings.service";
import { StaffAuthGuard } from "../staff-auth/guards/staff-auth.guard";
import { StaffPermissionGuard } from "../staff-auth/guards/permission.guard";
import { RequirePermission } from "../staff-auth/decorators/require-permission.decorator";
import { CurrentStaff } from "../staff-auth/decorators/current-staff.decorator";
import type { AuthenticatedStaff } from "../staff-auth/staff-auth.types";

interface UpdatePlatformSettingBody {
  settingValue: string;
  description?: string;
}

@Controller("admin/settings")
@UseGuards(StaffAuthGuard)
export class PlatformSettingsController {
  constructor(
    private readonly platformSettingsService: PlatformSettingsService,
  ) {}

  @Get()
  @UseGuards(StaffAuthGuard, StaffPermissionGuard)
  @RequirePermission("platform.settings.read")
  async findAll() {
    return this.platformSettingsService.findAll();
  }

  @Get(":key")
  @UseGuards(StaffAuthGuard, StaffPermissionGuard)
  @RequirePermission("platform.settings.read")
  async findByKey(@Param("key") key: string) {
    return this.platformSettingsService.findByKey(key);
  }

  @Put(":key")
  @UseGuards(StaffAuthGuard, StaffPermissionGuard)
  @RequirePermission("platform.settings.write")
  async update(
    @Param("key") key: string,
    @Body() body: UpdatePlatformSettingBody,
    @CurrentStaff() staff: AuthenticatedStaff,
  ) {
    return this.platformSettingsService.update(
      key,
      body.settingValue,
      body.description,
      staff.userAccountId,
    );
  }
}