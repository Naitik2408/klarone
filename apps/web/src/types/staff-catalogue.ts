export interface StaffCatalogueBrand {
  id: number;
  name: string;
  slug: string;
  logoUrl: string | null;
}

export interface StaffCatalogueCategory {
  id: number;
  parentId: number | null;
  name: string;
  slug: string;
  description: string | null;
}

/* ---------- Products list ---------- */

export interface StaffCatalogueProduct {
  id: string;
  name: string;
  slug: string;
  modelNumber: string | null;
  manufacturerPartNumber: string | null;
  productType: string;
  status: string;
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
  variantCount: number;
  activeVariantCount: number;
  lowestSellingPrice: string | null;
  quantityAvailable: number;
  quantityReserved: number;
  imageUrl?: string | null;
  variants?: Array<{
    id: string;
    sku: string;
    variantName: string | null;
    color: string | null;
    ramGb: number | null;
    storageGb: number | null;
    operatingSystem: string | null;
    sellingPrice: string;
    status: string;
    quantityAvailable: number;
    quantityReserved: number;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface StaffCatalogueProductsResponse {
  items: StaffCatalogueProduct[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

/* ---------- Variant inputs / shared shape ---------- */

export interface StaffPort {
  id?: string;
  portType: string;
  quantity: number;
  version?: string | null;
  supportsCharging?: boolean | null;
  supportsDisplay?: boolean | null;
}

export interface StaffFeature {
  id?: string;
  featureType: string;
  featureName: string;
  description?: string | null;
  score?: number | string | null;
}

export interface StaffTagRef {
  tag: {
    id: number;
    name: string;
    slug: string;
  };
}

export interface StaffVariantSpecification {
  id?: string;
  cpuBrand?: string | null;
  cpuModel?: string | null;
  cpuGeneration?: string | null;
  cpuCores?: number | null;
  cpuThreads?: number | null;
  gpuBrand?: string | null;
  gpuModel?: string | null;
  gpuVramGb?: number | null;
  ramType?: string | null;
  ramSpeedMhz?: number | null;
  maxRamGb?: number | null;
  ramSlots?: number | null;
  storageType?: string | null;
  storageInterface?: string | null;
  storageSlots?: number | null;
  maxStorageGb?: number | null;
  displaySizeInches?: string | number | null;
  displayResolution?: string | null;
  displayPanelType?: string | null;
  displayRefreshRateHz?: number | null;
  displayBrightnessNits?: number | null;
  displayColorGamut?: string | null;
  batteryCapacityWh?: string | number | null;
  weightKg?: string | number | null;
  widthMm?: string | number | null;
  depthMm?: string | number | null;
  heightMm?: string | number | null;
  webcamResolution?: string | null;
  wifiVersion?: string | null;
  bluetoothVersion?: string | null;
  keyboardType?: string | null;
  keyboardBacklight?: boolean | null;
  fingerprintSensor?: boolean | null;
}

export interface StaffVariant {
  id: string;
  sku: string;
  variantName: string | null;
  color: string | null;
  ramGb: number | null;
  storageGb: number | null;
  operatingSystem: string | null;
  basePrice: string;
  sellingPrice: string;
  compareAtPrice: string | null;
  currency: string;
  warrantyMonths: number | null;
  status: string;
  specification: StaffVariantSpecification | null;
  ports: StaffPort[];
  features: StaffFeature[];
  tags: StaffTagRef[];
}

export interface StaffProductDetail {
  id: string;
  brandId: number;
  categoryId: number;
  name: string;
  slug: string;
  modelNumber: string | null;
  manufacturerPartNumber: string | null;
  shortDescription: string | null;
  description: string | null;
  productType: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  brand: { id: number; name: string; slug: string } | null;
  category: { id: number; name: string; slug: string } | null;
  variants: StaffVariant[];
}

/* ---------- Create product ---------- */

export interface StaffVariantSpecificationInput {
  cpuBrand?: string | null;
  cpuModel?: string | null;
  cpuGeneration?: string | null;
  cpuCores?: number | null;
  cpuThreads?: number | null;
  gpuBrand?: string | null;
  gpuModel?: string | null;
  gpuVramGb?: number | null;
  ramType?: string | null;
  ramSpeedMhz?: number | null;
  maxRamGb?: number | null;
  ramSlots?: number | null;
  storageType?: string | null;
  storageInterface?: string | null;
  storageSlots?: number | null;
  maxStorageGb?: number | null;
  displaySizeInches?: number | string | null;
  displayResolution?: string | null;
  displayPanelType?: string | null;
  displayRefreshRateHz?: number | null;
  displayBrightnessNits?: number | null;
  displayColorGamut?: string | null;
  batteryCapacityWh?: number | string | null;
  weightKg?: number | string | null;
  widthMm?: number | string | null;
  depthMm?: number | string | null;
  heightMm?: number | string | null;
  webcamResolution?: string | null;
  wifiVersion?: string | null;
  bluetoothVersion?: string | null;
  keyboardType?: string | null;
  keyboardBacklight?: boolean | null;
  fingerprintSensor?: boolean | null;
}

export interface CreateStaffProductInput {
  brandId: number;
  categoryId: number;
  name: string;
  slug?: string;
  modelNumber?: string | null;
  manufacturerPartNumber?: string | null;
  shortDescription?: string | null;
  description?: string | null;
  productType?: string;

  variant: {
    sku: string;
    variantName?: string | null;
    color?: string | null;
    ramGb?: number | null;
    storageGb?: number | null;
    operatingSystem?: string | null;
    basePrice: number | string;
    sellingPrice: number | string;
    compareAtPrice?: number | string | null;
    currency?: string;
    warrantyMonths?: number | null;

    specification?: StaffVariantSpecificationInput | null;

    ports?: StaffPort[];
    features?: StaffFeature[];
    tags?: string[];
  };
}

/* ---------- Update product ---------- */

export interface UpdateStaffProductInput {
  brandId?: number;
  categoryId?: number;
  name?: string;
  modelNumber?: string | null;
  manufacturerPartNumber?: string | null;
  shortDescription?: string | null;
  description?: string | null;
  productType?: string;

  variantId: string;

  variant?: {
    sku?: string;
    variantName?: string | null;
    color?: string | null;
    ramGb?: number | null;
    storageGb?: number | null;
    operatingSystem?: string | null;
    basePrice?: number | string;
    sellingPrice?: number | string;
    compareAtPrice?: number | string | null;
    currency?: string;
    warrantyMonths?: number | null;

    specification?: StaffVariantSpecificationInput | null;

    ports?: StaffPort[];
    features?: StaffFeature[];
    tags?: string[];
  };
}

/* ---------- Create variant ---------- */

export interface CreateStaffVariantInput {
  sku: string;
  variantName?: string | null;
  color?: string | null;
  ramGb?: number | null;
  storageGb?: number | null;
  operatingSystem?: string | null;
  basePrice: number | string;
  sellingPrice: number | string;
  compareAtPrice?: number | string | null;
  currency?: string | null;
  warrantyMonths?: number | null;
  specification?: StaffVariantSpecificationInput | null;

  ports?: StaffPort[];
  features?: StaffFeature[];
  tags?: string[];
}

/* ---------- Taxonomy (staff) ---------- */

export interface StaffBrandListItem {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  websiteUrl: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  productCount: number;
}

export interface StaffBrandsResponse {
  items: StaffBrandListItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateStaffBrandInput {
  name: string;
  slug?: string;
  description?: string | null;
  logoUrl?: string | null;
  websiteUrl?: string | null;
}

export interface UpdateStaffBrandInput {
  name?: string;
  slug?: string;
  description?: string | null;
  logoUrl?: string | null;
  websiteUrl?: string | null;
  status?: string;
}

export interface StaffCategoryNode {
  id: number;
  parentId: number | null;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  displayOrder: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  productCount: number;
  childCount: number;
  children: StaffCategoryNode[];
}

export interface CreateStaffCategoryInput {
  name: string;
  slug?: string;
  description?: string | null;
  imageUrl?: string | null;
  parentId?: number | null;
  displayOrder?: number;
}

export interface UpdateStaffCategoryInput {
  name?: string;
  slug?: string;
  description?: string | null;
  imageUrl?: string | null;
  parentId?: number | null;
  displayOrder?: number;
  status?: string;
}


/* ---------- Product options + variant matrix ---------- */

export interface StaffProductOptionMetaobjectEntry {
  id: string;
  handle: string;
  displayName: string;
  fields: Record<string, unknown>;
}

export interface StaffProductOptionValue {
  id: string;
  value: string;
  displayOrder: number;
  metaobjectEntryId: string | null;
  metaobjectEntry: StaffProductOptionMetaobjectEntry | null;
}

export interface StaffProductOption {
  id: string;
  name: string;
  displayOrder: number;
  values: StaffProductOptionValue[];
}

export interface StaffVariantOptionLink {
  productOptionId: string;
  productOptionValueId: string;
  productOptionName: string;
  value: string;
  metaobjectEntryId: string | null;
  metaobjectEntry: StaffProductOptionMetaobjectEntry | null;
}

export interface StaffMatrixVariant {
  id: string;
  sku: string;
  variantName: string | null;
  sellingPrice: string;
  compareAtPrice: string | null;
  currency: string;
  status: string;
  imageUrl: string | null;
  quantityAvailable: number;
  optionValues: StaffVariantOptionLink[];
}

export interface SyncStaffVariantMatrixResponse {
  options: StaffProductOption[];
  variants: StaffMatrixVariant[];
  created: number;
  removed: number;
  deactivated: number;
  skipped: number;
}