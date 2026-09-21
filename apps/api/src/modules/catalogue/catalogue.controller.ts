import {
  Controller,
  Get,
  Param,
  Query,
} from "@nestjs/common";
import { CatalogueService } from "./catalogue.service";

@Controller("catalogue")
export class CatalogueController {
  constructor(
    private readonly catalogueService: CatalogueService,
  ) {}

  @Get("products")
  async getProducts(
    @Query("search") search?: string,
    @Query("brandSlug") brandSlug?: string,
    @Query("categorySlug") categorySlug?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ) {
    return this.catalogueService.findProducts({
      search,
      brandSlug,
      categorySlug,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @Get("products/:slug")
  async getProductBySlug(
    @Param("slug") slug: string,
  ) {
    return this.catalogueService.findProductBySlug(slug);
  }

  @Get("brands")
  async getBrands() {
    return this.catalogueService.findBrands();
  }

  @Get("categories")
  async getCategories() {
    return this.catalogueService.findCategories();
  }
}