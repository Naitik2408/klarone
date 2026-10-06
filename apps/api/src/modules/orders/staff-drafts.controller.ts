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

import { DraftOrdersService } from "./draft-orders.service";
import { StaffAuthGuard } from "../staff-auth/guards/staff-auth.guard";
import { StaffPermissionGuard } from "../staff-auth/guards/permission.guard";
import { RequirePermission } from "../staff-auth/decorators/require-permission.decorator";
import { CurrentStaff } from "../staff-auth/decorators/current-staff.decorator";
import type { AuthenticatedStaff } from "../staff-auth/staff-auth.types";

import type {
  AddDraftOrderItemInput,
  CompleteDraftOrderInput,
  CreateDraftOrderInput,
  UpdateDraftOrderInput,
  UpdateDraftOrderItemInput,
} from "./dto-draft-orders";

@Controller("staff/drafts")
@UseGuards(StaffAuthGuard, StaffPermissionGuard)
export class StaffDraftsController {
  constructor(private readonly draftOrdersService: DraftOrdersService) {}

  @Get()
  @RequirePermission("orders.read")
  async list(
    @Query("search") search?: string,
    @Query("status") status?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ) {
    return this.draftOrdersService.listDrafts({
      search,
      status,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @Post()
  @RequirePermission("orders.create")
  async create(
    @Body() body: CreateDraftOrderInput,
    @CurrentStaff() staff: AuthenticatedStaff,
  ) {
    return this.draftOrdersService.createDraft(
      body,
      this.toBigIntOrNull(staff.userAccountId),
    );
  }

  @Get(":draftNumber")
  @RequirePermission("orders.read")
  async get(@Param("draftNumber") draftNumber: string) {
    return this.draftOrdersService.getDraft(draftNumber);
  }

  @Patch(":draftNumber")
  @RequirePermission("orders.drafts.manage")
  async update(
    @Param("draftNumber") draftNumber: string,
    @Body() body: UpdateDraftOrderInput,
    @CurrentStaff() staff: AuthenticatedStaff,
  ) {
    return this.draftOrdersService.updateDraft(
      draftNumber,
      body,
      this.toBigIntOrNull(staff.userAccountId),
    );
  }

  @Post(":draftNumber/items")
  @RequirePermission("orders.drafts.manage")
  async addItem(
    @Param("draftNumber") draftNumber: string,
    @Body() body: AddDraftOrderItemInput,
    @CurrentStaff() staff: AuthenticatedStaff,
  ) {
    return this.draftOrdersService.addItem(
      draftNumber,
      body,
      this.toBigIntOrNull(staff.userAccountId),
    );
  }

  @Patch(":draftNumber/items/:itemId")
  @RequirePermission("orders.drafts.manage")
  async updateItem(
    @Param("draftNumber") draftNumber: string,
    @Param("itemId") itemId: string,
    @Body() body: UpdateDraftOrderItemInput,
    @CurrentStaff() staff: AuthenticatedStaff,
  ) {
    return this.draftOrdersService.updateItem(
      draftNumber,
      itemId,
      body,
      this.toBigIntOrNull(staff.userAccountId),
    );
  }

  @Delete(":draftNumber/items/:itemId")
  @RequirePermission("orders.drafts.manage")
  async removeItem(
    @Param("draftNumber") draftNumber: string,
    @Param("itemId") itemId: string,
    @CurrentStaff() staff: AuthenticatedStaff,
  ) {
    return this.draftOrdersService.removeItem(
      draftNumber,
      itemId,
      this.toBigIntOrNull(staff.userAccountId),
    );
  }

  @Post(":draftNumber/complete")
  @RequirePermission("orders.create")
  async complete(
    @Param("draftNumber") draftNumber: string,
    @Body() body: CompleteDraftOrderInput,
    @CurrentStaff() staff: AuthenticatedStaff,
  ) {
    return this.draftOrdersService.completeDraft(
      draftNumber,
      body,
      this.toBigIntOrNull(staff.userAccountId),
    );
  }

  @Post(":draftNumber/cancel")
  @RequirePermission("orders.drafts.manage")
  async cancel(
    @Param("draftNumber") draftNumber: string,
    @CurrentStaff() staff: AuthenticatedStaff,
  ) {
    return this.draftOrdersService.cancelDraft(
      draftNumber,
      this.toBigIntOrNull(staff.userAccountId),
    );
  }

  private toBigIntOrNull(value: string | bigint | null | undefined): bigint | null {
    if (value === null || value === undefined) return null;
    if (typeof value === "bigint") return value > 0n ? value : null;
    try {
      const n = BigInt(value);
      return n > 0n ? n : null;
    } catch {
      return null;
    }
  }
}