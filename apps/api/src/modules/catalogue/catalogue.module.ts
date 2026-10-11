import { Module } from "@nestjs/common";
import { PrismaModule } from "../../database/prisma.module";
import { StaffAuthModule } from "../staff-auth/staff-auth.module";
import { CatalogueController } from "./catalogue.controller";
import { StaffCatalogueController } from "./staff-catalogue.controller";
import { StaffCatalogueTaxonomyController } from "./staff-catalogue-taxonomy.controller";
import { StaffCatalogueOptionsController } from "./staff-catalogue-options.controller";
import { StaffCatalogueProductsAdvancedController } from "./staff-catalogue-products-advanced.controller";
import { StaffProductMediaController } from "./staff-product-media.controller";
import { StaffCatalogueCollectionsController } from "./staff-catalogue-collections.controller";
import { CatalogueService } from "./catalogue.service";
import { StaffProductMediaService } from "./staff-product-media.service";

@Module({
  imports: [PrismaModule, StaffAuthModule],
  controllers: [
    CatalogueController,
    StaffCatalogueController,
    StaffCatalogueTaxonomyController,
    StaffCatalogueOptionsController,
    StaffCatalogueProductsAdvancedController,
    StaffProductMediaController,
    StaffCatalogueCollectionsController,
  ],
  providers: [CatalogueService, StaffProductMediaService],
  exports: [CatalogueService],
})
export class CatalogueModule {}