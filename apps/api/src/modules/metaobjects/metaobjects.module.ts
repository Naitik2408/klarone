import { Module } from "@nestjs/common";
import { PrismaModule } from "../../database/prisma.module";
import { StaffAuthModule } from "../staff-auth/staff-auth.module";
import { MetaobjectsService } from "./metaobjects.service";
import {
  MetaobjectsController,
  StaffProductMetafieldsController,
} from "./metaobjects.controller";

@Module({
  imports: [PrismaModule, StaffAuthModule],
  controllers: [
    MetaobjectsController,
    StaffProductMetafieldsController,
  ],
  providers: [MetaobjectsService],
  exports: [MetaobjectsService],
})
export class MetaobjectsModule {}