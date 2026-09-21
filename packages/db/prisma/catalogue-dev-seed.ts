import path from "node:path";
import dotenv from "dotenv";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

dotenv.config({
  path: path.resolve(process.cwd(), "../../.env"),
});

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}

const connectionString = requiredEnv("DATABASE_URL");

const adapter = new PrismaPg({
  connectionString,
});

const prisma = new PrismaClient({
  adapter,
});

async function seedBrand(
  name: string,
  slug: string,
) {
  return prisma.brand.upsert({
    where: {
      slug,
    },
    update: {
      name,
      status: "ACTIVE",
    },
    create: {
      name,
      slug,
      status: "ACTIVE",
    },
  });
}

async function seedCategory(
  name: string,
  slug: string,
) {
  return prisma.category.upsert({
    where: {
      slug,
    },
    update: {
      name,
      status: "ACTIVE",
    },
    create: {
      name,
      slug,
      status: "ACTIVE",
      displayOrder: 1,
    },
  });
}

interface ProductSeedData {
  brandId: number;
  categoryId: number;
  name: string;
  slug: string;
  shortDescription: string;
  variant: {
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
    cpuGeneration: string;
    cpuCores: number;
    cpuThreads: number;
    gpuBrand: string;
    gpuModel: string;
    gpuVramGb: number;
    ramType: string;
    ramSpeedMhz: number;
    maxRamGb: number;
    ramSlots: number;
    storageType: string;
    storageInterface: string;
    storageSlots: number;
    maxStorageGb: number;
    displaySizeInches: string;
    displayResolution: string;
    displayPanelType: string;
    displayRefreshRateHz: number;
    batteryCapacityWh: string;
    weightKg: string;
    wifiVersion: string;
    bluetoothVersion: string;
  };
}

async function seedProduct(data: ProductSeedData) {
  const product = await prisma.product.upsert({
    where: {
      slug: data.slug,
    },
    update: {
      brandId: data.brandId,
      categoryId: data.categoryId,
      name: data.name,
      shortDescription: data.shortDescription,
      productType: "LAPTOP",
      status: "PUBLISHED",
    },
    create: {
      brandId: data.brandId,
      categoryId: data.categoryId,
      name: data.name,
      slug: data.slug,
      shortDescription: data.shortDescription,
      productType: "LAPTOP",
      status: "PUBLISHED",
    },
  });

  const variant = await prisma.productVariant.upsert({
    where: {
      sku: data.variant.sku,
    },
    update: {
      productId: product.id,
      variantName: data.variant.variantName,
      color: data.variant.color,
      ramGb: data.variant.ramGb,
      storageGb: data.variant.storageGb,
      operatingSystem: data.variant.operatingSystem,
      basePrice: data.variant.basePrice,
      sellingPrice: data.variant.sellingPrice,
      compareAtPrice: data.variant.compareAtPrice,
      warrantyMonths: data.variant.warrantyMonths,
      status: "ACTIVE",
    },
    create: {
      productId: product.id,
      sku: data.variant.sku,
      variantName: data.variant.variantName,
      color: data.variant.color,
      ramGb: data.variant.ramGb,
      storageGb: data.variant.storageGb,
      operatingSystem: data.variant.operatingSystem,
      basePrice: data.variant.basePrice,
      sellingPrice: data.variant.sellingPrice,
      compareAtPrice: data.variant.compareAtPrice,
      warrantyMonths: data.variant.warrantyMonths,
      status: "ACTIVE",
    },
  });

  await prisma.productSpecification.upsert({
    where: {
      productVariantId: variant.id,
    },
    update: {
      cpuBrand: data.variant.cpuBrand,
      cpuModel: data.variant.cpuModel,
      cpuGeneration: data.variant.cpuGeneration,
      cpuCores: data.variant.cpuCores,
      cpuThreads: data.variant.cpuThreads,
      gpuBrand: data.variant.gpuBrand,
      gpuModel: data.variant.gpuModel,
      gpuVramGb: data.variant.gpuVramGb,
      ramType: data.variant.ramType,
      ramSpeedMhz: data.variant.ramSpeedMhz,
      maxRamGb: data.variant.maxRamGb,
      ramSlots: data.variant.ramSlots,
      storageType: data.variant.storageType,
      storageInterface: data.variant.storageInterface,
      storageSlots: data.variant.storageSlots,
      maxStorageGb: data.variant.maxStorageGb,
      displaySizeInches: data.variant.displaySizeInches,
      displayResolution: data.variant.displayResolution,
      displayPanelType: data.variant.displayPanelType,
      displayRefreshRateHz: data.variant.displayRefreshRateHz,
      batteryCapacityWh: data.variant.batteryCapacityWh,
      weightKg: data.variant.weightKg,
      wifiVersion: data.variant.wifiVersion,
      bluetoothVersion: data.variant.bluetoothVersion,
    },
    create: {
      productVariantId: variant.id,
      cpuBrand: data.variant.cpuBrand,
      cpuModel: data.variant.cpuModel,
      cpuGeneration: data.variant.cpuGeneration,
      cpuCores: data.variant.cpuCores,
      cpuThreads: data.variant.cpuThreads,
      gpuBrand: data.variant.gpuBrand,
      gpuModel: data.variant.gpuModel,
      gpuVramGb: data.variant.gpuVramGb,
      ramType: data.variant.ramType,
      ramSpeedMhz: data.variant.ramSpeedMhz,
      maxRamGb: data.variant.maxRamGb,
      ramSlots: data.variant.ramSlots,
      storageType: data.variant.storageType,
      storageInterface: data.variant.storageInterface,
      storageSlots: data.variant.storageSlots,
      maxStorageGb: data.variant.maxStorageGb,
      displaySizeInches: data.variant.displaySizeInches,
      displayResolution: data.variant.displayResolution,
      displayPanelType: data.variant.displayPanelType,
      displayRefreshRateHz: data.variant.displayRefreshRateHz,
      batteryCapacityWh: data.variant.batteryCapacityWh,
      weightKg: data.variant.weightKg,
      wifiVersion: data.variant.wifiVersion,
      bluetoothVersion: data.variant.bluetoothVersion,
    },
  });

  await prisma.productFeature.deleteMany({
    where: {
      productVariantId: variant.id,
    },
  });

  await prisma.productFeature.createMany({
    data: [
      {
        productVariantId: variant.id,
        featureType: "USE_CASE",
        featureName: "Everyday productivity",
        description:
          "Suitable for office, study and browsing workloads.",
      },
      {
        productVariantId: variant.id,
        featureType: "KLARONE_DEMO",
        featureName: "Development catalogue item",
        description:
          "Demo data for Klarone development only.",
      },
    ],
  });

  return variant;
}

async function main(): Promise<void> {
  console.log("Starting Klarone development catalogue seed...");

  const hp = await seedBrand("HP", "hp");
  const lenovo = await seedBrand("Lenovo", "lenovo");
  const asus = await seedBrand("ASUS", "asus");

  const laptops = await seedCategory(
    "Laptops",
    "laptops",
  );

  const createdVariants = [];

  createdVariants.push(
    await seedProduct({
      brandId: hp.id,
      categoryId: laptops.id,
      name: "HP DemoBook 15",
      slug: "hp-demobook-15",
      shortDescription:
        "Demo everyday laptop for Klarone catalogue development.",
      variant: {
        sku: "DEMO-HP-15-16-512",
        variantName: "16GB / 512GB",
        color: "Natural Silver",
        ramGb: 16,
        storageGb: 512,
        operatingSystem: "Windows 11",
        basePrice: "64990",
        sellingPrice: "59990",
        compareAtPrice: "64990",
        warrantyMonths: 12,
        cpuBrand: "Intel",
        cpuModel: "Core i5 Demo",
        cpuGeneration: "Demo Gen",
        cpuCores: 10,
        cpuThreads: 12,
        gpuBrand: "Intel",
        gpuModel: "Integrated Demo Graphics",
        gpuVramGb: 0,
        ramType: "DDR4",
        ramSpeedMhz: 3200,
        maxRamGb: 32,
        ramSlots: 2,
        storageType: "SSD",
        storageInterface: "NVMe",
        storageSlots: 1,
        maxStorageGb: 2048,
        displaySizeInches: "15.6",
        displayResolution: "1920x1080",
        displayPanelType: "IPS",
        displayRefreshRateHz: 60,
        batteryCapacityWh: "41.0",
        weightKg: "1.69",
        wifiVersion: "Wi-Fi 6",
        bluetoothVersion: "5.3",
      },
    }),
  );

  createdVariants.push(
    await seedProduct({
      brandId: lenovo.id,
      categoryId: laptops.id,
      name: "Lenovo DemoBook Slim 14",
      slug: "lenovo-demobook-slim-14",
      shortDescription:
        "Demo lightweight productivity laptop for Klarone development.",
      variant: {
        sku: "DEMO-LEN-SLIM14-16-512",
        variantName: "16GB / 512GB",
        color: "Arctic Grey",
        ramGb: 16,
        storageGb: 512,
        operatingSystem: "Windows 11",
        basePrice: "69990",
        sellingPrice: "64990",
        compareAtPrice: "69990",
        warrantyMonths: 12,
        cpuBrand: "AMD",
        cpuModel: "Ryzen 5 Demo",
        cpuGeneration: "Demo Series",
        cpuCores: 6,
        cpuThreads: 12,
        gpuBrand: "AMD",
        gpuModel: "Integrated Demo Graphics",
        gpuVramGb: 0,
        ramType: "LPDDR5",
        ramSpeedMhz: 4800,
        maxRamGb: 32,
        ramSlots: 0,
        storageType: "SSD",
        storageInterface: "NVMe",
        storageSlots: 1,
        maxStorageGb: 2048,
        displaySizeInches: "14.0",
        displayResolution: "1920x1200",
        displayPanelType: "IPS",
        displayRefreshRateHz: 60,
        batteryCapacityWh: "56.6",
        weightKg: "1.39",
        wifiVersion: "Wi-Fi 6",
        bluetoothVersion: "5.2",
      },
    }),
  );

  createdVariants.push(
    await seedProduct({
      brandId: asus.id,
      categoryId: laptops.id,
      name: "ASUS DemoGame 16",
      slug: "asus-demogame-16",
      shortDescription:
        "Demo performance laptop for gaming and heavier workloads.",
      variant: {
        sku: "DEMO-ASUS-GAME16-16-1TB",
        variantName: "16GB / 1TB",
        color: "Graphite Black",
        ramGb: 16,
        storageGb: 1024,
        operatingSystem: "Windows 11",
        basePrice: "89990",
        sellingPrice: "84990",
        compareAtPrice: "89990",
        warrantyMonths: 12,
        cpuBrand: "AMD",
        cpuModel: "Ryzen 7 Demo",
        cpuGeneration: "Demo Series",
        cpuCores: 8,
        cpuThreads: 16,
        gpuBrand: "NVIDIA",
        gpuModel: "RTX Demo",
        gpuVramGb: 8,
        ramType: "DDR5",
        ramSpeedMhz: 4800,
        maxRamGb: 64,
        ramSlots: 2,
        storageType: "SSD",
        storageInterface: "NVMe",
        storageSlots: 2,
        maxStorageGb: 4096,
        displaySizeInches: "16.0",
        displayResolution: "1920x1200",
        displayPanelType: "IPS",
        displayRefreshRateHz: 165,
        batteryCapacityWh: "90.0",
        weightKg: "2.10",
        wifiVersion: "Wi-Fi 6",
        bluetoothVersion: "5.2",
      },
    }),
  );

  const warehouse = await prisma.warehouse.upsert({
    where: {
      code: "KOL-DEMO",
    },
    update: {
      name: "Kolkata Demo Warehouse",
      status: "ACTIVE",
      city: "Kolkata",
      state: "West Bengal",
      postalCode: "700001",
      country: "India",
    },
    create: {
      name: "Kolkata Demo Warehouse",
      code: "KOL-DEMO",
      status: "ACTIVE",
      country: "India",
      city: "Kolkata",
      state: "West Bengal",
      postalCode: "700001",
    },
  });

  for (const variant of createdVariants) {
    await prisma.inventory.upsert({
      where: {
        warehouseId_productVariantId: {
          warehouseId: warehouse.id,
          productVariantId: variant.id,
        },
      },
      update: {
        quantityAvailable: 10,
        quantityReserved: 0,
      },
      create: {
        warehouseId: warehouse.id,
        productVariantId: variant.id,
        quantityAvailable: 10,
        quantityReserved: 0,
      },
    });
  }

  console.log(
    `Created/updated ${createdVariants.length} development catalogue variants.`,
  );

  console.log("Development catalogue seed completed successfully.");
}

main()
  .catch((error: unknown) => {
    console.error(
      "Development catalogue seed failed:",
      error,
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });