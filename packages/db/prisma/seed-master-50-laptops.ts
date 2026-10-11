import { config } from "dotenv";
import { resolve } from "node:path";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { appleProducts } from "./catalog-data/apple";
import { dellProducts } from "./catalog-data/dell";
import { lenovoProducts } from "./catalog-data/lenovo";
import { hpProducts } from "./catalog-data/hp";
import { asusProducts } from "./catalog-data/asus";
import { remainingBrandProducts } from "./catalog-data/acer-samsung-msi-microsoft";

config({ path: resolve(__dirname, "../../../.env") });

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

const connectionString = requiredEnv("DATABASE_URL");
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Starting Master 50 Laptops Catalog Seed...");

  const adminAccount = await prisma.userAccount.findFirst({
    where: { status: "ACTIVE" },
  });
  const adminId = adminAccount?.id ?? null;

  // 1. Ensure Brands
  console.log("Ensuring all Brands are active...");
  const brands = [
    { name: "Apple", slug: "apple", description: "Apple Silicon unified architecture, Liquid Retina XDR displays.", logoUrl: "/media/catalogue/brands/apple-logo.svg", websiteUrl: "https://www.apple.com" },
    { name: "Dell", slug: "dell", description: "Precision-crafted XPS ultrabooks, Inspiron everyday laptops, Alienware gaming.", logoUrl: "/media/catalogue/brands/dell-logo.svg", websiteUrl: "https://www.dell.com" },
    { name: "Lenovo", slug: "lenovo", description: "ThinkPad engineering, Legion esports gaming, Yoga 2-in-1 convertibles.", logoUrl: "/media/catalogue/brands/lenovo-logo.svg", websiteUrl: "https://www.lenovo.com" },
    { name: "HP", slug: "hp", description: "Spectre luxury 2-in-1 convertibles, OMEN gaming, and Envy creator laptops.", logoUrl: "/media/catalogue/brands/hp-logo.svg", websiteUrl: "https://www.hp.com" },
    { name: "Asus", slug: "asus", description: "ROG Zephyrus OLED gaming, Zenbook dual-screen laptops, and TUF gaming.", logoUrl: "/media/catalogue/brands/asus-logo.svg", websiteUrl: "https://www.asus.com" },
    { name: "Acer", slug: "acer", description: "Swift Go OLED ultrabooks, Predator Helios & Nitro high-value gaming.", logoUrl: "/media/catalogue/brands/acer-logo.svg", websiteUrl: "https://www.acer.com" },
    { name: "Samsung", slug: "samsung", description: "Galaxy Book Dynamic AMOLED 2X ultrabooks and Galaxy phone ecosystem sync.", logoUrl: "/media/catalogue/brands/samsung-logo.svg", websiteUrl: "https://www.samsung.com" },
    { name: "MSI", slug: "msi", description: "Stealth AI studio creator rigs and Titan desktop-replacement gaming notebooks.", logoUrl: "/media/catalogue/brands/msi-logo.svg", websiteUrl: "https://www.msi.com" },
    { name: "Microsoft", slug: "microsoft", description: "Surface Laptop Snapdragon X Elite Copilot+ PCs with PixelSense Touch.", logoUrl: "/media/catalogue/brands/microsoft-logo.svg", websiteUrl: "https://www.microsoft.com" },
  ];

  for (const b of brands) {
    await prisma.brand.upsert({
      where: { slug: b.slug },
      update: b,
      create: b,
    });
  }

  // 2. Fetch Category IDs
  const categories = await prisma.category.findMany();
  const catMap = new Map(categories.map((c) => [c.slug, c.id]));

  // 3. Fetch Brand IDs
  const allBrands = await prisma.brand.findMany();
  const brandMap = new Map(allBrands.map((b) => [b.slug, b.id]));

  // 4. Fetch Collection IDs
  const allCollections = await prisma.collection.findMany();
  const collectionMap = new Map(allCollections.map((c) => [c.slug, c.id]));

  // 5. Seed Products and Variants
  const masterList = [
    ...appleProducts,
    ...dellProducts,
    ...lenovoProducts,
    ...hpProducts,
    ...asusProducts,
    ...remainingBrandProducts,
  ];

  console.log(`Seeding ${masterList.length} Flagship Laptop Models with 4 Variants Each...`);

  for (const item of masterList) {
    const brandId = brandMap.get(item.brandSlug);
    const categoryId = catMap.get(item.categorySlug);

    if (!brandId || !categoryId) {
      console.warn(`Skipping ${item.name}: Brand or Category not found.`);
      continue;
    }

    const product = await prisma.product.upsert({
      where: { slug: item.slug },
      update: {
        brandId,
        categoryId,
        name: item.name,
        modelNumber: item.modelNumber,
        manufacturerPartNumber: item.manufacturerPartNumber,
        shortDescription: item.shortDescription,
        description: item.description,
        productType: item.productType,
        status: item.status,
        createdByUserId: adminId,
      },
      create: {
        brandId,
        categoryId,
        name: item.name,
        slug: item.slug,
        modelNumber: item.modelNumber,
        manufacturerPartNumber: item.manufacturerPartNumber,
        shortDescription: item.shortDescription,
        description: item.description,
        productType: item.productType,
        status: item.status,
        createdByUserId: adminId,
      },
    });

    // Map to collections if specified
    if (item.collectionSlugs) {
      for (const collSlug of item.collectionSlugs) {
        const collId = collectionMap.get(collSlug);
        if (collId) {
          await prisma.collectionProduct.upsert({
            where: { collectionId_productId: { collectionId: collId, productId: product.id } },
            update: {},
            create: { collectionId: collId, productId: product.id },
          });
        }
      }
    }

    // Process Variants
    for (const v of item.variants) {
      const variant = await prisma.productVariant.upsert({
        where: { sku: v.sku },
        update: {
          productId: product.id,
          variantName: v.variantName,
          color: v.color,
          ramGb: v.ramGb,
          storageGb: v.storageGb,
          operatingSystem: v.operatingSystem,
          basePrice: v.basePrice,
          sellingPrice: v.sellingPrice,
          compareAtPrice: v.compareAtPrice,
          warrantyMonths: v.warrantyMonths,
          status: "ACTIVE",
        },
        create: {
          productId: product.id,
          sku: v.sku,
          variantName: v.variantName,
          color: v.color,
          ramGb: v.ramGb,
          storageGb: v.storageGb,
          operatingSystem: v.operatingSystem,
          basePrice: v.basePrice,
          sellingPrice: v.sellingPrice,
          compareAtPrice: v.compareAtPrice,
          warrantyMonths: v.warrantyMonths,
          status: "ACTIVE",
        },
      });

      // Upsert Specs
      await prisma.productSpecification.upsert({
        where: { productVariantId: variant.id },
        update: {
          cpuBrand: v.cpuBrand,
          cpuModel: v.cpuModel,
          cpuCores: v.cpuCores,
          cpuThreads: v.cpuThreads,
          gpuBrand: v.gpuBrand,
          gpuModel: v.gpuModel,
          gpuVramGb: v.gpuVramGb,
          ramType: v.ramType,
          ramSpeedMhz: v.ramSpeedMhz,
          maxRamGb: v.maxRamGb,
          storageType: v.storageType,
          displaySizeInches: v.displaySizeInches,
          displayResolution: v.displayResolution,
          displayPanelType: v.displayPanelType,
          displayRefreshRateHz: v.displayRefreshRateHz,
          displayBrightnessNits: v.displayBrightnessNits,
          displayColorGamut: v.displayColorGamut,
          batteryCapacityWh: v.batteryCapacityWh,
          weightKg: v.weightKg,
          widthMm: v.widthMm,
          depthMm: v.depthMm,
          heightMm: v.heightMm,
          webcamResolution: v.webcamResolution,
          wifiVersion: v.wifiVersion,
          bluetoothVersion: v.bluetoothVersion,
          keyboardType: v.keyboardType,
          keyboardBacklight: v.keyboardBacklight,
          fingerprintSensor: v.fingerprintSensor,
        },
        create: {
          productVariantId: variant.id,
          cpuBrand: v.cpuBrand,
          cpuModel: v.cpuModel,
          cpuCores: v.cpuCores,
          cpuThreads: v.cpuThreads,
          gpuBrand: v.gpuBrand,
          gpuModel: v.gpuModel,
          gpuVramGb: v.gpuVramGb,
          ramType: v.ramType,
          ramSpeedMhz: v.ramSpeedMhz,
          maxRamGb: v.maxRamGb,
          storageType: v.storageType,
          displaySizeInches: v.displaySizeInches,
          displayResolution: v.displayResolution,
          displayPanelType: v.displayPanelType,
          displayRefreshRateHz: v.displayRefreshRateHz,
          displayBrightnessNits: v.displayBrightnessNits,
          displayColorGamut: v.displayColorGamut,
          batteryCapacityWh: v.batteryCapacityWh,
          weightKg: v.weightKg,
          widthMm: v.widthMm,
          depthMm: v.depthMm,
          heightMm: v.heightMm,
          webcamResolution: v.webcamResolution,
          wifiVersion: v.wifiVersion,
          bluetoothVersion: v.bluetoothVersion,
          keyboardType: v.keyboardType,
          keyboardBacklight: v.keyboardBacklight,
          fingerprintSensor: v.fingerprintSensor,
        },
      });

      // Ports
      await prisma.productPort.deleteMany({ where: { productVariantId: variant.id } });
      for (const p of v.ports) {
        await prisma.productPort.create({
          data: {
            productVariantId: variant.id,
            portType: p.portType,
            quantity: p.quantity,
            supportsCharging: p.supportsCharging ?? false,
            supportsDisplay: p.supportsDisplay ?? false,
            version: p.version,
          },
        });
      }
    }
  }

  console.log("Master 50 Laptops Catalog Seed Completed Successfully!");
}

main()
  .catch((e) => {
    console.error("Error running master seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
