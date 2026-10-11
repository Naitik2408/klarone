import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from "@nestjs/common";
import { MetaobjectsService } from "./metaobjects.service";
import { StaffAuthGuard } from "../staff-auth/guards/staff-auth.guard";
import { StaffPermissionGuard } from "../staff-auth/guards/permission.guard";
import { RequirePermission } from "../staff-auth/decorators/require-permission.decorator";
import { CurrentStaff } from "../staff-auth/decorators/current-staff.decorator";
import type { AuthenticatedStaff } from "../staff-auth/staff-auth.types";
import type {
  CreateMetaobjectEntryInput,
  UpdateMetaobjectEntryInput,
  SetProductMetafieldsInput,
} from "./dto/metaobjects.dto";

@Controller("staff/metaobjects")
@UseGuards(StaffAuthGuard, StaffPermissionGuard)
export class MetaobjectsController {
  constructor(private readonly metaobjectsService: MetaobjectsService) {}

  /* ---------------- Metafield definitions ---------------- */

  @Get("definitions")
  @RequirePermission("catalogue.read")
  listMetafieldDefinitions(
    @Query("categoryId") categoryId?: string,
  ) {
    return this.metaobjectsService.listMetafieldDefinitions({ categoryId });
  }

  @Post("definitions")
  @RequirePermission("catalogue.update")
  createMetafieldDefinition(
    @Body() body: any,
  ) {
    return this.metaobjectsService.createMetafieldDefinition(body);
  }

  @Patch("definitions/:id")
  @RequirePermission("catalogue.update")
  deleteMetafieldDefinition(
    @Param("id") id: string,
  ) {
    return this.metaobjectsService.deleteMetafieldDefinition(Number(id));
  }

  @Get("definitions/:id/delete")
  @RequirePermission("catalogue.update")
  removeMetafieldDefinition(
    @Param("id") id: string,
  ) {
    return this.metaobjectsService.deleteMetafieldDefinition(Number(id));
  }

  /* ---------------- Entries ---------------- */

  @Get(":type/entries")
  @RequirePermission("catalogue.read")
  listEntries(
    @Param("type") type: string,
    @Query("q") q?: string,
    @Query("groupId") groupId?: string,
    @Query("take") take?: string,
    @Query("skip") skip?: string,
  ) {
    return this.metaobjectsService.listEntries(type, {
      q,
      groupId,
      take,
      skip,
    });
  }

  @Get(":type/entries/:id")
  @RequirePermission("catalogue.read")
  getEntry(
    @Param("type") type: string,
    @Param("id") id: string,
  ) {
    return this.metaobjectsService.getEntry(type, id);
  }

  @Post(":type/entries")
  @RequirePermission("catalogue.update")
  createEntry(
    @Param("type") type: string,
    @Body() body: CreateMetaobjectEntryInput,
    @CurrentStaff() _staff: AuthenticatedStaff,
  ) {
    return this.metaobjectsService.createEntry(type, body);
  }

  @Patch(":type/entries/:id")
  @RequirePermission("catalogue.update")
  updateEntry(
    @Param("type") type: string,
    @Param("id") id: string,
    @Body() body: UpdateMetaobjectEntryInput,
    @CurrentStaff() _staff: AuthenticatedStaff,
  ) {
    return this.metaobjectsService.updateEntry(type, id, body);
  }
}

@Controller("staff/products/:id/metafields")
@UseGuards(StaffAuthGuard, StaffPermissionGuard)
export class StaffProductMetafieldsController {
  constructor(private readonly metaobjectsService: MetaobjectsService) {}

  private parseId(value: string): bigint {
    if (!/^\d+$/.test(value) || BigInt(value) <= 0n) {
      throw new BadRequestException("Product id must be a positive integer.");
    }
    return BigInt(value);
  }

  @Get()
  @RequirePermission("catalogue.read")
  getMetafields(@Param("id") id: string) {
    return this.metaobjectsService.getProductMetafields(this.parseId(id));
  }

  @Put()
  @RequirePermission("catalogue.update")
  setMetafields(
    @Param("id") id: string,
    @Body() body: SetProductMetafieldsInput,
    @CurrentStaff() _staff: AuthenticatedStaff,
  ) {
    return this.metaobjectsService.setProductMetafields(
      this.parseId(id),
      body,
    );
  }
}