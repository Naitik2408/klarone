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
    @Query("brandSlugs") brandSlugs?: string | string[],
    @Query("categorySlug") categorySlug?: string,
    @Query("collectionSlug") collectionSlug?: string,
    @Query("minPrice") minPrice?: string,
    @Query("maxPrice") maxPrice?: string,
    @Query("ramGb") ramGb?: string | string[],
    @Query("storageGb") storageGb?: string | string[],
    @Query("inStockOnly") inStockOnly?: string,
    @Query("sortBy") sortBy?: "featured" | "price-asc" | "price-desc" | "newest",
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ) {
    const parseNumberArray = (val?: string | string[]) => {
      if (!val) return undefined;
      const arr = Array.isArray(val) ? val : val.split(",");
      return arr.map(Number).filter((n) => Number.isFinite(n) && n > 0);
    };

    const parseStringArray = (val?: string | string[]) => {
      if (!val) return undefined;
      const arr = Array.isArray(val) ? val : val.split(",");
      return arr.map((s) => s.trim()).filter(Boolean);
    };

    return this.catalogueService.findProducts({
      search,
      brandSlug,
      brandSlugs: parseStringArray(brandSlugs),
      categorySlug,
      collectionSlug,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      ramGb: parseNumberArray(ramGb),
      storageGb: parseNumberArray(storageGb),
      inStockOnly: inStockOnly === "true",
      sortBy,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @Get("facets")
  async getProductFacets(
    @Query("categorySlug") categorySlug?: string,
    @Query("collectionSlug") collectionSlug?: string,
  ) {
    return this.catalogueService.findProductFacets({
      categorySlug,
      collectionSlug,
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

  @Get("collections")
  async getCollections() {
    return this.catalogueService.findCollections();
  }
}