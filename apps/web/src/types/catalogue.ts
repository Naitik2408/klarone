export interface CatalogueBrand {
  id: number;
  name: string;
  slug: string;
  logoUrl: string | null;
}

export interface CatalogueCategory {
  id: number;
  parentId: number | null;
  name: string;
  slug: string;
  description: string | null;
  imageUrl?: string | null;
}

export interface CatalogueCollection {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  bannerImage: string | null;
}

export interface CatalogueFacets {
  brands: Array<{ id: number; name: string; slug: string; count: number }>;
  collections?: Array<{ id: number; title: string; slug: string; count: number }>;
  priceRange: { min: number; max: number };
  ramOptions: Array<{ ramGb: number; count: number }>;
  storageOptions: Array<{ storageGb: number; count: number }>;
  availability: { inStockCount: number; outOfStockCount: number };
}

export interface CatalogueVariantSummary {
  id: string;
  sku: string;
  variantName: string | null;
  ramGb: number | null;
  storageGb: number | null;
  operatingSystem: string | null;
  sellingPrice: string;
  compareAtPrice: string | null;
  currency: string;
}

export interface CatalogueProduct {
  id: string;
  name: string;
  slug: string;
  shortDescription: string | null;
  productType: string;

  brand: {
    id: number;
    name: string;
    slug: string;
  };

  category: {
    id: number;
    name: string;
    slug: string;
  };

  media: Array<{
    id: string;
    mediaType: string;
    url: string;
    storageKey: string | null;
    altText: string | null;
  }>;

  variants: CatalogueVariantSummary[];
}

export interface CatalogueProductDetail extends CatalogueProduct {
  modelNumber: string | null;
  manufacturerPartNumber: string | null;
  description: string | null;
  status: string;

  brand: CatalogueBrand;

  media: Array<{
    id: string;
    mediaType: string;
    url: string;
    storageKey: string | null;
    altText: string | null;
    width: number | null;
    height: number | null;
    displayOrder: number;
    isPrimary: boolean;
  }>;

  options?: Array<{
    id: string | number;
    name: string;
    displayOrder: number;
    values: Array<{
      id: string | number;
      value: string;
      displayOrder: number;
      metaobjectEntry?: {
        id: string | number;
        handle: string;
        displayName: string;
        fields?: Record<string, unknown>;
      } | null;
    }>;
  }>;

  variants: Array<
    CatalogueVariantSummary & {
      color: string | null;
      basePrice: string;
      warrantyMonths: number | null;
      specification: Record<string, unknown> | null;
      optionValues?: Array<{
        productOptionId: string | number;
        productOptionValueId: string | number;
        productOption: { id: string | number; name: string };
        productOptionValue: { id: string | number; value: string };
      }>;
      media?: Array<{
        id: string;
        mediaType: string;
        url: string;
        storageKey: string | null;
        altText: string | null;
        width: number | null;
        height: number | null;
        displayOrder: number;
        isPrimary: boolean;
      }>;
      inventories?: Array<{
        quantityAvailable: number;
      }>;

      ports: Array<Record<string, unknown>>;

      features: Array<{
        id: string;
        featureType: string;
        featureName: string;
        description: string | null;
        score: string | null;
      }>;
    }
  >;
}

export interface CatalogueProductsResponse {
  items: CatalogueProduct[];

  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}