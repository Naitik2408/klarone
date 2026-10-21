import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { StaffManagementService } from "./staff-management.service";
import { StaffAuthGuard } from "../staff-auth/guards/staff-auth.guard";
import { StaffPermissionGuard } from "../staff-auth/guards/permission.guard";
import { RequirePermission } from "../staff-auth/decorators/require-permission.decorator";
import { CurrentStaff } from "../staff-auth/decorators/current-staff.decorator";
import type { AuthenticatedStaff } from "../staff-auth/staff-auth.types";
import type {
  CreateStaffMemberDto,
  ListStaffQueryDto,
  UpdateStaffMemberDto,
} from "./dto/staff-member.dto";

@Controller("staff/users")
@UseGuards(StaffAuthGuard, StaffPermissionGuard)
export class StaffManagementController {
  constructor(
    private readonly staffManagementService: StaffManagementService,
  ) {}

  @Get("roles")
  @RequirePermission("roles.read")
  async listRoles() {
    return this.staffManagementService.listRoles();
  }

  @Get("permissions")
  @RequirePermission("permissions.read")
  async listPermissions() {
    return this.staffManagementService.listPermissions();
  }

  @Get()
  @RequirePermission("users.read")
  async listStaff(@Query() query: ListStaffQueryDto) {
    return this.staffManagementService.listStaff(query);
  }

  @Get(":id")
  @RequirePermission("users.read")
  async getStaff(@Param("id") id: string) {
    return this.staffManagementService.getStaff(id);
  }

  @Post()
  @RequirePermission("users.create")
  async createStaff(
    @Body() dto: CreateStaffMemberDto,
    @CurrentStaff() actor: AuthenticatedStaff,
  ) {
    const actorId = actor ? BigInt(actor.userAccountId) : undefined;
    return this.staffManagementService.createStaff(dto, actorId);
  }

  @Patch(":id")
  @RequirePermission("users.update")
  async updateStaff(
    @Param("id") id: string,
    @Body() dto: UpdateStaffMemberDto,
    @CurrentStaff() actor: AuthenticatedStaff,
  ) {
    const actorId = actor ? BigInt(actor.userAccountId) : undefined;
    return this.staffManagementService.updateStaff(id, dto, actorId);
  }

  @Delete(":id")
  @RequirePermission("users.disable")
  async deleteStaff(
    @Param("id") id: string,
    @CurrentStaff() actor: AuthenticatedStaff,
  ) {
    const actorId = actor ? BigInt(actor.userAccountId) : undefined;
    return this.staffManagementService.deleteStaff(id, actorId);
  }
}
