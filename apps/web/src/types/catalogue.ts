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

  variants: Array<
    CatalogueVariantSummary & {
      color: string | null;
      basePrice: string;
      warrantyMonths: number | null;
      specification: Record<string, unknown> | null;

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