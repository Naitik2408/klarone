import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
} from "@nestjs/common";
import { StaffAuthService } from "./staff-auth.service";
import { StaffAuthGuard } from "./guards/staff-auth.guard";
import { StaffPermissionGuard } from "./guards/permission.guard";
import { CurrentStaff } from "./decorators/current-staff.decorator";
import { RequirePermission } from "./decorators/require-permission.decorator";
import type { AuthenticatedStaff } from "./staff-auth.types";

interface StaffLoginBody {
  email: string;
  password: string;
}

@Controller("staff-auth")
export class StaffAuthController {
  constructor(
    private readonly staffAuthService: StaffAuthService,
  ) {}

  @Post("login")
  async login(@Body() body: StaffLoginBody) {
    return this.staffAuthService.login(
      body.email,
      body.password,
    );
  }

  @Get("me")
  @UseGuards(StaffAuthGuard)
  async getCurrentStaff(
    @CurrentStaff() staff: AuthenticatedStaff,
  ) {
    return this.staffAuthService.getStaffProfileWithPermissions(staff.userAccountId);
  }

  @Get("permission-test")
  @UseGuards(StaffAuthGuard, StaffPermissionGuard)
  @RequirePermission("platform.settings.read")
  getPermissionTest() {
    return {
      ok: true,
      permission: "platform.settings.read",
    };
  }
}