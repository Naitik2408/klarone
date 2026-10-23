import { config } from "dotenv";
import { resolve } from "node:path";
import { v2 as cloudinary } from "cloudinary";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { AUTHENTIC_LAPTOP_ASSETS } from "./authentic-cdn-assets";

config({ path: resolve(__dirname, "../../../.env") });

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

const connectionString = requiredEnv("DATABASE_URL");
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "dfjzdnuec",
  api_key: process.env.CLOUDINARY_API_KEY || "437489839269232",
  api_secret: process.env.CLOUDINARY_API_SECRET || "R0eVlU7G486JAyqf_eD8obuMD7s",
  secure: true,
});

async function uploadToCloudinary(
  url: string,
  folder: string,
  publicId: string
): Promise<{ secure_url: string; public_id: string; bytes: number; width: number; height: number } | null> {
  try {
    const res = await cloudinary.uploader.upload(url, {
      folder,
      public_id: publicId,
      overwrite: true,
      resource_type: "image",
      format: "webp",
      transformation: [{ width: 1200, crop: "limit", quality: "auto" }],
    });

    if (!res || res.bytes < 10000) {
      console.warn(`  [WARN] Upload resulted in suspicious size (${res?.bytes ?? 0} bytes) for: ${url}`);
      return null;
    }

    return {
      secure_url: res.secure_url,
      public_id: res.public_id,
      bytes: res.bytes,
      width: res.width,
      height: res.height,
    };
  } catch (error) {
    console.error(`  [ERROR] Failed to upload ${url}:`, error instanceof Error ? error.message : error);
    return null;
  }
}

async function main() {
  console.log("======================================================");
  console.log("KLARONE CLOUDINARY IMAGE SYNC FOR ALL 50 PRODUCTS");
  console.log("======================================================");

  const products = await prisma.product.findMany({
    select: { id: true, name: true, slug: true },
    orderBy: { id: "asc" },
  });

  console.log(`Found ${products.length} products in DB.`);

  const assetMap = new Map<string, (typeof AUTHENTIC_LAPTOP_ASSETS)[0]>();
  for (const asset of AUTHENTIC_LAPTOP_ASSETS) {
    assetMap.set(asset.slug, asset);
  }

  let successCount = 0;
  let skippedCount = 0;

  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    const asset = assetMap.get(product.slug);

    if (!asset) {
      console.warn(`[${i + 1}/${products.length}] No asset mapping for slug: ${product.slug}`);
      skippedCount++;
      continue;
    }

    console.log(`[${i + 1}/${products.length}] Processing "${product.name}" (${product.slug})...`);

    const folder = `klarone/products/${product.id.toString()}`;

    // 1. Upload Hero image
    const heroResult = await uploadToCloudinary(asset.heroUrl, folder, "hero");
    if (!heroResult) {
      console.error(`  ✕ Hero upload failed for ${product.slug}`);
      continue;
    }

    // Clear old media for this product
    await prisma.productMedia.deleteMany({
      where: { productId: product.id },
    });

    // Insert hero media
    await prisma.productMedia.create({
      data: {
        productId: product.id,
        mediaType: "IMAGE",
        storageKey: heroResult.public_id,
        url: heroResult.secure_url,
        altText: `${product.name} Hero View`,
        width: heroResult.width,
        height: heroResult.height,
        displayOrder: 0,
        isPrimary: true,
      },
    });

    console.log(`  ✓ Hero uploaded: ${heroResult.secure_url} (${Math.round(heroResult.bytes / 1024)} KB)`);

    // 2. Upload gallery images if distinct from hero
    let galleryOrder = 1;
    for (let g = 0; g < asset.galleryUrls.length; g++) {
      const gUrl = asset.galleryUrls[g];
      if (gUrl === asset.heroUrl) continue; // Don't duplicate hero

      const galleryResult = await uploadToCloudinary(gUrl, folder, `gallery_${galleryOrder}`);
      if (galleryResult) {
        await prisma.productMedia.create({
          data: {
            productId: product.id,
            mediaType: "IMAGE",
            storageKey: galleryResult.public_id,
            url: galleryResult.secure_url,
            altText: `${product.name} Gallery View ${galleryOrder}`,
            width: galleryResult.width,
            height: galleryResult.height,
            displayOrder: galleryOrder,
            isPrimary: false,
          },
        });
        console.log(`  ✓ Gallery ${galleryOrder} uploaded: ${Math.round(galleryResult.bytes / 1024)} KB`);
        galleryOrder++;
      }
    }

    successCount++;
  }

  console.log("======================================================");
  console.log(`SYNC COMPLETE: ${successCount} products updated with authentic Cloudinary media.`);
  if (skippedCount > 0) {
    console.log(`Skipped: ${skippedCount} products.`);
  }
  console.log("======================================================");
}

main()
  .catch((e) => {
    console.error("Fatal error during image sync:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
