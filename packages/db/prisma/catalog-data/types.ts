export interface VariantData {
  sku: string;
  variantName: string;
  color: string;
  ramGb: number;
  storageGb: number;
  operatingSystem: string;
  basePrice: string;
  sellingPrice: string;
  compareAtPrice: string;
  warrantyMonths: number;
  cpuBrand: string;
  cpuModel: string;
  cpuCores: number;
  cpuThreads: number;
  gpuBrand: string;
  gpuModel: string;
  gpuVramGb?: number;
  ramType: string;
  ramSpeedMhz: number;
  maxRamGb: number;
  storageType: string;
  displaySizeInches: string;
  displayResolution: string;
  displayPanelType: string;
  displayRefreshRateHz: number;
  displayBrightnessNits: number;
  displayColorGamut: string;
  batteryCapacityWh: string;
  weightKg: string;
  widthMm: string;
  depthMm: string;
  heightMm: string;
  webcamResolution: string;
  wifiVersion: string;
  bluetoothVersion: string;
  keyboardType: string;
  keyboardBacklight: boolean;
  fingerprintSensor: boolean;
  ports: Array<{ portType: string; quantity: number; supportsCharging?: boolean; supportsDisplay?: boolean; version?: string }>;
}

export interface ProductData {
  brandSlug: string;
  categorySlug: string;
  name: string;
  slug: string;
  modelNumber: string;
  manufacturerPartNumber: string;
  shortDescription: string;
  description: string;
  productType: string;
  status: string;
  collectionSlugs?: string[];
  variants: VariantData[];
}
