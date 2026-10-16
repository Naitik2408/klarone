import { config } from "dotenv";
import { resolve } from "node:path";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

config({ path: resolve(__dirname, "../../../.env") });
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
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
  if (!gpu) return "Integrated Graphics";
  return gpu
    .replace(/ Laptop GPU/g, "")
    .replace(/ GDDR6/g, "")
    .trim();
}

function cleanDisplay(v: any): string {
  const panel = v.specification?.displayPanelType?.trim() || "";
  const res = v.specification?.displayResolution?.trim() || "";
  if (panel.includes("OLED")) return res.includes("2.8K") ? "2.8K OLED" : "OLED";
  if (panel.includes("IPS")) return res.includes("WUXGA") ? "WUXGA IPS" : (res.includes("2.2K") ? "2.2K IPS" : "IPS");
  return panel || res || "Standard Display";
}

async function linkAllProductOptions() {
  console.log("Starting Modular Product Options Linking (RAM, Storage, Graphics, CPU, Color)...");

  // 1. Remove orphaned pre-seed variants
  const oldSkus = ["ZEPHYRUS-G14-R9-32-1TB-RTX4070-EG", "SPECTRE-X360-14-U7-32-1TB-NB"];
  const deleted = await prisma.productVariant.deleteMany({
    where: { sku: { in: oldSkus } },
  });
  if (deleted.count > 0) {
    console.log(`Cleaned up ${deleted.count} orphaned legacy variants.`);
  }

  // 2. Fetch color metaobject entries
  const colorEntries = await prisma.metaobjectEntry.findMany({
    where: { definition: { type: "color" } },
    select: { id: true, handle: true },
  });
  const colorMap = new Map<string, bigint>();
  for (const entry of colorEntries) {
    colorMap.set(entry.handle.toLowerCase(), entry.id);
  }

  // 3. Remove obsolete "Configuration" options so we have clean separate parameters
  const removedConfigOpts = await prisma.productOption.deleteMany({
    where: { name: "Configuration" },
  });
  if (removedConfigOpts.count > 0) {
    console.log(`Removed ${removedConfigOpts.count} old bundled 'Configuration' options.`);
  }

  // 4. Fetch all products with variants
  const products = await prisma.product.findMany({
    include: {
      variants: {
        include: { specification: true },
      },
    },
  });

  console.log(`Processing ${products.length} products...`);

  let totalOptionsCreated = 0;
  let totalValuesCreated = 0;
  let totalLinksCreated = 0;

  for (const p of products) {
    if (p.variants.length === 0) continue;

    const distinctDisplays = new Set(
      p.variants.map((v) => v.specification?.displayPanelType?.trim()).filter(Boolean)
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

    // Upsert Options and Values for this product
    for (const optDef of optionDefs) {
      const option = await prisma.productOption.upsert({
        where: {
          productId_name: {
            productId: p.id,
            name: optDef.name,
          },
        },
        update: {
          displayOrder: optDef.displayOrder,
        },
        create: {
          productId: p.id,
          name: optDef.name,
          displayOrder: optDef.displayOrder,
        },
      });
      totalOptionsCreated++;

      // Distinct values for this option
      const distinctVals = [...new Set(p.variants.map(optDef.getValue))];

      for (let i = 0; i < distinctVals.length; i++) {
        const valStr = distinctVals[i];
        let metaentryId: bigint | null = null;
        if (optDef.isColor) {
          const handle = matchColorToHandle(valStr);
          if (handle && colorMap.has(handle)) {
            metaentryId = colorMap.get(handle)!;
          }
        }

        const optionValue = await prisma.productOptionValue.upsert({
          where: {
            productOptionId_value: {
              productOptionId: option.id,
              value: valStr,
            },
          },
          update: {
            displayOrder: i,
            metaobjectEntryId: metaentryId,
          },
          create: {
            productOptionId: option.id,
            value: valStr,
            displayOrder: i,
            metaobjectEntryId: metaentryId,
          },
        });
        totalValuesCreated++;

        // Link variants that have this option value
        for (const variant of p.variants) {
          if (optDef.getValue(variant) === valStr) {
            await prisma.productVariantOptionValue.upsert({
              where: {
                productVariantId_productOptionId: {
                  productVariantId: variant.id,
                  productOptionId: option.id,
                },
              },
              update: {
                productOptionValueId: optionValue.id,
              },
              create: {
                productVariantId: variant.id,
                productOptionId: option.id,
                productOptionValueId: optionValue.id,
              },
            });
            totalLinksCreated++;
          }
        }
      }
    }
  }

  console.log(`Modular linking completed!`);
  console.log(`- Options processed: ${totalOptionsCreated}`);
  console.log(`- Values processed: ${totalValuesCreated}`);
  console.log(`- Variant-Option links: ${totalLinksCreated}`);
}

linkAllProductOptions().finally(() => prisma.$disconnect());
