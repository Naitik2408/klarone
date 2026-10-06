export type StaffPortInput = {
  portType: string;
  quantity: number;
  version?: string | null;
  supportsCharging?: boolean | null;
  supportsDisplay?: boolean | null;
};

export type StaffFeatureInput = {
  featureType: string;
  featureName: string;
  description?: string | null;
  score?: number | string | null;
};

export type StaffVariantSpecificationInput = {
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
};

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

    /**
     * Full-replace list of ports for this variant.
     * Written to ProductPort. Absent = leave empty.
     */
    ports?: StaffPortInput[];

    /**
     * Full-replace list of features for this variant.
     * Written to ProductFeature. Absent = leave empty.
     */
    features?: StaffFeatureInput[];

    /**
     * Tag names (or slugs). Each tag is upserted by slug and joined
     * to this variant via ProductTag. Absent = leave empty.
     */
    tags?: string[];
  };
}