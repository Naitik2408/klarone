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

function matchColorToHandle(colorName: string): string | null {
  const c = colorName.toLowerCase();
  if (c.includes("black")) return "black";
  if (c.includes("silver")) return "silver";
  if (c.includes("white")) return "white";
  if (c.includes("grey") || c.includes("gray")) return "grey";
  if (c.includes("blue") || c.includes("navy")) return c.includes("navy") ? "navy" : "blue";
  if (c.includes("midnight")) return "navy";
  if (c.includes("starlight")) return "silver";
  if (c.includes("gold") || c.includes("dune")) return "gold";
  if (c.includes("red")) return "red";
  if (c.includes("green")) return "green";
  return null;
}

function cleanGpu(gpu: string | undefined | null): string {
  if (!gpu || /integrated|intel iris|intel arc/i.test(gpu)) return "Integrated Graphics";
  return gpu
    .replace(/ Laptop GPU/g, "")
    .replace(/ GDDR6/g, "")
    .trim();
}

function cleanDisplay(v: any): string {
  const panel = v.specification?.displayPanelType?.trim() || "";
  const res = v.specification?.displayResolution?.trim() || "";
  if (panel.includes("OLED")) return res.includes("2.8K") ? "2.8K OLED" : "OLED";
  if (panel.includes("IPS")) return res.includes("WUXGA") ? "WUXGA IPS" : res.includes("2.2K") ? "2.2K IPS" : "IPS";
  return panel || res || "Standard Display";
}

async function main() {
  console.log("======================================================");
  console.log("KLARONE FRESH RE-SEED: CLEAN TAXONOMY & VERIFIED MATRIX");
  console.log("======================================================");

  // 1. CLEAR EXISTING DATA (In safe topological foreign-key order)
  console.log("\n[1/5] Purging old catalog, orders, and draft tables...");
  await prisma.recommendationResult.deleteMany();
  await prisma.productReview.deleteMany();
  await prisma.serviceQuoteItem.deleteMany();
  await prisma.serviceJobPartUsage.deleteMany();
  await prisma.rentalItem.deleteMany();
  await prisma.deviceAsset.deleteMany();
  await prisma.draftOrderItem.deleteMany();
  await prisma.draftOrder.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.collectionVariant.deleteMany();
  await prisma.collectionProduct.deleteMany();
  await prisma.productVariantOptionValue.deleteMany();
  await prisma.productOptionValue.deleteMany();
  await prisma.productOption.deleteMany();
  await prisma.productPort.deleteMany();
  await prisma.productSpecification.deleteMany();
  await prisma.productMedia.deleteMany();
  await prisma.productFeature.deleteMany();
  await prisma.productTag.deleteMany();
  await prisma.productVariantPriceHistory.deleteMany();
  await prisma.inventoryTransaction.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.productRelation.deleteMany();
  await prisma.product.deleteMany();
  await prisma.collection.deleteMany();
  await prisma.category.deleteMany();
  await prisma.brand.deleteMany();
  console.log("✓ Existing catalog and related tables cleared successfully.");

  // 2. SEED CLEAN, SIMPLE CATEGORIES
  console.log("\n[2/5] Creating simplified Categories...");
  const simpleCategories = [
    {
      name: "Ultrabooks",
      slug: "ultrabooks",
      description: "Thin, lightweight laptops with long battery life for work and study.",
      displayOrder: 1,
    },
    {
      name: "Gaming Laptops",
      slug: "gaming-laptops",
      description: "High-performance laptops equipped with dedicated RTX graphics.",
      displayOrder: 2,
    },
    {
      name: "Workstations",
      slug: "creator-workstations",
      description: "Powerful machines built for video editing, 3D design, and coding.",
      displayOrder: 3,
    },
    {
      name: "Laptops",
      slug: "laptops",
      description: "All versatile everyday laptops.",
      displayOrder: 4,
    },
  ];

  const catMap = new Map<string, number>();
  for (const c of simpleCategories) {
    const created = await prisma.category.create({ data: c });
    catMap.set(c.slug, created.id);
  }
  console.log(`✓ Created ${simpleCategories.length} simplified categories.`);

  // 3. SEED SIMPLE, HUMAN-FRIENDLY COLLECTIONS
  console.log("\n[3/5] Creating simplified Collections...");
  const simpleCollections = [
    {
      title: "Bestsellers",
      slug: "bestsellers",
      description: "Our most popular and highest-rated laptops.",
      status: "ACTIVE",
    },
    {
      title: "Gaming",
      slug: "gaming",
      description: "Dedicated RTX laptops built for smooth, high-FPS gaming.",
      status: "ACTIVE",
    },
    {
      title: "OLED Displays",
      slug: "oled-displays",
      description: "Laptops with vivid, cinematic OLED screens.",
      status: "ACTIVE",
    },
    {
      title: "Thin & Light",
      slug: "thin-light",
      description: "Sub-1.4kg portable ultrabooks designed for travel and meetings.",
      status: "ACTIVE",
    },
    {
      title: "Students",
      slug: "student",
      description: "Great value laptops with dependable battery life for college.",
      status: "ACTIVE",
    },
    {
      title: "Flagship",
      slug: "flagship",
      description: "Premium benchmark machines with top-of-the-line build quality.",
      status: "ACTIVE",
    },
  ];

  const collectionMap = new Map<string, number>();
  for (const col of simpleCollections) {
    const created = await prisma.collection.create({ data: col });
    collectionMap.set(col.slug, created.id);
  }
  console.log(`✓ Created ${simpleCollections.length} simplified collections.`);

  // 4. SEED AUTHENTIC BRANDS
  console.log("\n[4/5] Creating Brands...");
  const cleanBrands = [
    { name: "Apple", slug: "apple", description: "MacBook Air and MacBook Pro with Apple Silicon.", websiteUrl: "https://www.apple.com" },
    { name: "Dell", slug: "dell", description: "XPS, Inspiron, and Alienware laptops.", websiteUrl: "https://www.dell.com" },
    { name: "Lenovo", slug: "lenovo", description: "ThinkPad, Legion, Yoga, and LOQ laptops.", websiteUrl: "https://www.lenovo.com" },
    { name: "HP", slug: "hp", description: "Spectre, OMEN, Envy, and Victus laptops.", websiteUrl: "https://www.hp.com" },
    { name: "ASUS", slug: "asus", description: "ROG Zephyrus, Zenbook, and TUF Gaming.", websiteUrl: "https://www.asus.com" },
    { name: "Acer", slug: "acer", description: "Swift Go OLED and Predator Helios gaming.", websiteUrl: "https://www.acer.com" },
    { name: "Samsung", slug: "samsung", description: "Galaxy Book AMOLED ultrabooks.", websiteUrl: "https://www.samsung.com" },
    { name: "MSI", slug: "msi", description: "Stealth AI Studio and performance gaming.", websiteUrl: "https://www.msi.com" },
    { name: "Microsoft", slug: "microsoft", description: "Surface Laptop with Copilot+ AI PC.", websiteUrl: "https://www.microsoft.com" },
  ];

  const brandMap = new Map<string, number>();
  for (const b of cleanBrands) {
    const created = await prisma.brand.create({ data: b });
    brandMap.set(b.slug, created.id);
  }
  console.log(`✓ Created ${cleanBrands.length} brands.`);

  // Color Swatches Metaobjects
  const colorEntries = await prisma.metaobjectEntry.findMany({
    where: { definition: { type: "color" } },
    select: { id: true, handle: true },
  });
  const colorMap = new Map<string, bigint>();
  for (const entry of colorEntries) {
    colorMap.set(entry.handle.toLowerCase(), entry.id);
  }

  // 5. SEED ALL PRODUCTS & MATRIX VARIANTS
  const masterList = [
    ...appleProducts,
    ...dellProducts,
    ...lenovoProducts,
    ...hpProducts,
    ...asusProducts,
    ...remainingBrandProducts,
  ];

  console.log(`\n[5/5] Seeding ${masterList.length} Products with full 4-Option Variant Matrix (Color, Processor, RAM, Storage, Graphics)...`);

  const adminAccount = await prisma.userAccount.findFirst({
    where: { status: "ACTIVE" },
  });
  const adminId = adminAccount?.id ?? null;

  let totalVariantsCreated = 0;

  for (const item of masterList) {
    const brandId = brandMap.get(item.brandSlug);
    const categoryId = catMap.get(item.categorySlug) ?? catMap.get("laptops")!;

    if (!brandId) continue;

    const product = await prisma.product.create({
      data: {
        brandId,
        categoryId,
        name: item.name,
        slug: item.slug,
        modelNumber: item.modelNumber,
        manufacturerPartNumber: item.manufacturerPartNumber,
        shortDescription: item.shortDescription,
        description: item.description,
        productType: item.productType || "LAPTOP",
        status: "ACTIVE",
        createdByUserId: adminId,
      },
    });

    // Auto-link to simplified collections based on model characteristics
    const targetCollections: number[] = [collectionMap.get("bestsellers")!];
    const n = item.name.toLowerCase();
    if (n.includes("gaming") || n.includes("rog") || n.includes("predator") || n.includes("omen") || n.includes("legion")) {
      targetCollections.push(collectionMap.get("gaming")!);
    }
    if (n.includes("oled")) {
      targetCollections.push(collectionMap.get("oled-displays")!);
    }
    if (n.includes("air") || n.includes("slim") || n.includes("swift") || n.includes("zenbook") || n.includes("xps")) {
      targetCollections.push(collectionMap.get("thin-light")!);
    }

    for (const cId of targetCollections) {
      if (cId) {
        await prisma.collectionProduct.create({
          data: { collectionId: cId, productId: product.id },
        });
      }
    }

    // Insert Variants
    for (const v of item.variants) {
      const variant = await prisma.productVariant.create({
        data: {
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
      totalVariantsCreated++;

      // Upsert Specs
      await prisma.productSpecification.create({
        data: {
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

    // Build Product Options & Option Values (Pill / Swatch Matrix)
    const dbVariants = await prisma.productVariant.findMany({
      where: { productId: product.id },
      include: { specification: true },
    });

    if (dbVariants.length > 0) {
      const distinctDisplays = new Set(
        dbVariants.map((v) => v.specification?.displayPanelType?.trim()).filter(Boolean)
      );
      const hasDisplayDiff = distinctDisplays.size > 1;

      type OptionDef = {
        name: string;
        displayOrder: number;
        getValue: (v: any) => string;
        isColor?: boolean;
      };

      const optionDefs: OptionDef[] = [
        {
          name: "Color",
          displayOrder: 0,
          getValue: (v) => v.color?.trim() || "Default",
          isColor: true,
        },
        {
          name: "Processor family",
          displayOrder: 1,
          getValue: (v) => v.specification?.cpuModel?.trim() || "Standard",
        },
        {
          name: "RAM",
          displayOrder: 2,
          getValue: (v) => `${v.ramGb}GB`,
        },
        {
          name: "Storage",
          displayOrder: 3,
          getValue: (v) => `${v.storageGb >= 1000 ? v.storageGb / 1000 + "TB" : v.storageGb + "GB"} SSD`,
        },
        {
          name: "Graphics",
          displayOrder: 4,
          getValue: (v) => cleanGpu(v.specification?.gpuModel),
        },
      ];

      if (hasDisplayDiff) {
        optionDefs.push({
          name: "Display",
          displayOrder: 5,
          getValue: (v) => cleanDisplay(v),
        });
      }

      for (const optDef of optionDefs) {
        const option = await prisma.productOption.create({
          data: {
            productId: product.id,
            name: optDef.name,
            displayOrder: optDef.displayOrder,
          },
        });

        const distinctVals = [...new Set(dbVariants.map(optDef.getValue))];

        for (let i = 0; i < distinctVals.length; i++) {
          const valStr = distinctVals[i];
          let metaentryId: bigint | null = null;
          if (optDef.isColor) {
            const handle = matchColorToHandle(valStr);
            if (handle && colorMap.has(handle)) {
              metaentryId = colorMap.get(handle)!;
            }
          }

          const optionValue = await prisma.productOptionValue.create({
            data: {
              productOptionId: option.id,
              value: valStr,
              displayOrder: i,
              metaobjectEntryId: metaentryId,
            },
          });

          for (const variant of dbVariants) {
            if (optDef.getValue(variant) === valStr) {
              await prisma.productVariantOptionValue.create({
                data: {
                  productVariantId: variant.id,
                  productOptionId: option.id,
                  productOptionValueId: optionValue.id,
                },
              });
            }
          }
        }
      }
    }
  }

  console.log(`\n======================================================`);
  console.log(`SUCCESS: ${masterList.length} Products and ${totalVariantsCreated} Variants Seeded.`);
  console.log(`All options, swatches, categories, and collections re-linked cleanly.`);
  console.log(`======================================================`);
}

main()
  .catch((e) => {
    console.error("Error executing clean re-seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
