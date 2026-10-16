import { config } from "dotenv";
import { resolve } from "node:path";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { v2: cloudinary } = require("../../../apps/api/node_modules/cloudinary");
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { FIRST_20_LAPTOP_ASSETS } from "./first-20-assets";

config({ path: resolve(__dirname, "../../../.env") });

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function uploadToCloudinary(
  url: string,
  folder: string,
  publicId: string
): Promise<{ url: string; key: string } | null> {
  try {
    const res = await cloudinary.uploader.upload(url, {
      folder,
      public_id: publicId,
      format: "webp",
      overwrite: true,
      transformation: [
        {
          width: 1400,
          height: 1400,
          crop: "limit",
          quality: "auto:good",
          fetch_format: "auto",
        },
      ],
    });
    return { url: res.secure_url, key: res.public_id };
  } catch (err: any) {
    console.warn(`  ⚠️ Cloudinary upload failed for ${publicId}:`, err?.message || err);
    return null;
  }
}

async function main() {
  console.log("🚀 Starting Cloudinary upload & catalogue media attachment for first 20 products...\n");

  for (const assetDef of FIRST_20_LAPTOP_ASSETS) {
    const product = await prisma.product.findUnique({
      where: { id: BigInt(assetDef.productId) },
      include: {
        variants: true,
      },
    });

    if (!product) {
      console.log(`❌ Product #${assetDef.productId} not found in database, skipping.`);
      continue;
    }

    console.log(`\n📦 Processing Product #${product.id}: ${product.name}`);
    const folder = `klarone/products/${product.id.toString()}`;

    // Clean existing media for this product to prevent duplicate stacking
    await prisma.productMedia.deleteMany({
      where: { productId: product.id },
    });

    let displayOrder = 0;

    // 1. Upload Product-Level Primary Hero Image
    console.log(`  📸 Uploading product hero image...`);
    const heroResult = await uploadToCloudinary(
      assetDef.productHeroUrl,
      folder,
      `hero-${assetDef.slug}`
    );

    if (heroResult) {
      await prisma.productMedia.create({
        data: {
          productId: product.id,
          productVariantId: null,
          mediaType: "IMAGE",
          storageKey: heroResult.key,
          url: heroResult.url,
          altText: `${product.name} Studio Hero`,
          displayOrder: displayOrder++,
          isPrimary: true,
        },
      });
      console.log(`  ✅ Product Hero linked: ${heroResult.url}`);
    }

    // 2. Upload Product-Level Overview / Angle Images
    for (let i = 0; i < assetDef.productOverviewUrls.length; i++) {
      const overviewUrl = assetDef.productOverviewUrls[i];
      const overviewResult = await uploadToCloudinary(
        overviewUrl,
        folder,
        `overview-${i + 1}`
      );
      if (overviewResult) {
        await prisma.productMedia.create({
          data: {
            productId: product.id,
            productVariantId: null,
            mediaType: "IMAGE",
            storageKey: overviewResult.key,
            url: overviewResult.url,
            altText: `${product.name} Overview ${i + 1}`,
            displayOrder: displayOrder++,
            isPrimary: false,
          },
        });
        console.log(`  ✅ Overview ${i + 1} linked: ${overviewResult.url}`);
      }
    }

    // 3. Upload Variant-Specific Images (per color)
    for (const colorGroup of assetDef.colorVariants) {
      const colorNorm = colorGroup.color.toLowerCase().trim();
      const matchingVariants = product.variants.filter(
        (v) => v.color && v.color.toLowerCase().trim() === colorNorm
      );

      if (matchingVariants.length === 0) {
        console.log(`  ℹ️ No active variants found with color "${colorGroup.color}"`);
        continue;
      }

      console.log(
        `  🎨 Processing Color "${colorGroup.color}" for ${matchingVariants.length} variants...`
      );

      for (let vIdx = 0; vIdx < colorGroup.variantUrls.length; vIdx++) {
        const vUrl = colorGroup.variantUrls[vIdx];
        const vKey = `variants/${slugify(colorGroup.color)}-${vIdx + 1}`;
        const vUpload = await uploadToCloudinary(vUrl, folder, vKey);

        if (vUpload) {
          // Link this color image to each matching variant of this product
          for (const variant of matchingVariants) {
            await prisma.productMedia.create({
              data: {
                productId: product.id,
                productVariantId: variant.id,
                mediaType: "IMAGE",
                storageKey: vUpload.key,
                url: vUpload.url,
                altText: `${product.name} - ${variant.color || "Color"} Finish`,
                displayOrder: vIdx,
                isPrimary: vIdx === 0,
              },
            });
          }
          console.log(`    ✅ Color "${colorGroup.color}" variant image attached: ${vUpload.url}`);
        }
      }
    }
  }

  console.log("\n🎉 Finished uploading and attaching all first 20 products!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
