import { chromium } from "playwright";
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

/**
 * Upload an image URL or buffer to Cloudinary
 */
async function uploadToCloudinary(
  urlOrPath: string,
  folder: string,
  publicId: string
): Promise<{ url: string; key: string } | null> {
  try {
    const res = await cloudinary.uploader.upload(urlOrPath, {
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
    console.warn(`  ⚠️ Cloudinary upload warning for ${publicId}:`, err?.message || err);
    return null;
  }
}

/**
 * Playwright helper to scrape images directly from an official product page
 */
export async function scrapeOfficialProductImages(pageUrl: string): Promise<string[]> {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    });
    const page = await context.newPage();
    await page.goto(pageUrl, { waitUntil: "domcontentloaded", timeout: 25000 });
    await page.waitForTimeout(1500);

    const images: string[] = await page.$$eval("img", (imgs) =>
      imgs
        .map((img) => img.src)
        .filter(
          (src) =>
            src.startsWith("http") &&
            !src.includes("logo") &&
            !src.includes("icon") &&
            !src.includes("badge") &&
            (src.endsWith(".png") || src.endsWith(".jpg") || src.endsWith(".webp") || src.includes("format=png"))
        )
    );
    return images.slice(0, 8);
  } catch (e) {
    return [];
  } finally {
    await browser.close();
  }
}

async function main() {
  console.log("===================================================================");
  console.log("PLAYWRIGHT & CLOUDINARY REAL IMAGE PIPELINE");
  console.log("Uploading authentic model images directly to Cloudinary CDN...");
  console.log("===================================================================\n");

  const products = await prisma.product.findMany({
    include: {
      variants: true,
      media: true,
    },
    orderBy: { id: "asc" },
  });

  console.log(`Found ${products.length} products in database to process.`);

  // Build lookup from curated asset definitions by slug substring or name
  const assetMap = new Map<string, typeof FIRST_20_LAPTOP_ASSETS[0]>();
  for (const a of FIRST_20_LAPTOP_ASSETS) {
    assetMap.set(a.slug, a);
  }

  for (const product of products) {
    console.log(`\n📦 Processing Product #${product.id}: ${product.name}`);

    // Find best match in asset catalog
    const matchedAsset =
      assetMap.get(product.slug) ||
      FIRST_20_LAPTOP_ASSETS.find(
        (a) =>
          product.slug.includes(a.slug) ||
          a.slug.includes(product.slug) ||
          product.name.toLowerCase().includes(a.name.toLowerCase().slice(0, 15))
      );

    const folder = `klarone/products/${product.id.toString()}`;

    // Collect list of authentic URLs to upload to Cloudinary for this product
    const urlsToUpload: { url: string; alt: string; isPrimary: boolean }[] = [];

    if (matchedAsset) {
      if (matchedAsset.productHeroUrl) {
        urlsToUpload.push({
          url: matchedAsset.productHeroUrl,
          alt: `${product.name} Official Studio Hero`,
          isPrimary: true,
        });
      }
      for (let i = 0; i < (matchedAsset.productOverviewUrls || []).length; i++) {
        urlsToUpload.push({
          url: matchedAsset.productOverviewUrls[i],
          alt: `${product.name} Gallery View ${i + 1}`,
          isPrimary: false,
        });
      }
      for (const cv of matchedAsset.colorVariants || []) {
        for (let i = 0; i < (cv.variantUrls || []).length; i++) {
          urlsToUpload.push({
            url: cv.variantUrls[i],
            alt: `${product.name} ${cv.color} View ${i + 1}`,
            isPrimary: false,
          });
        }
      }
    }

    if (urlsToUpload.length === 0) {
      console.log(`  ℹ️ No direct external asset definition for ${product.name}, skipping.`);
      continue;
    }

    // Clean existing media to avoid duplicate stacking
    await prisma.productMedia.deleteMany({
      where: { productId: product.id },
    });

    let uploadedCount = 0;
    for (let i = 0; i < urlsToUpload.length; i++) {
      const item = urlsToUpload[i];
      const publicId = `img-${i + 1}`;

      console.log(`  📸 Uploading to Cloudinary [${i + 1}/${urlsToUpload.length}]: ${item.alt}`);
      const uploaded = await uploadToCloudinary(item.url, folder, publicId);

      if (uploaded) {
        await prisma.productMedia.create({
          data: {
            productId: product.id,
            productVariantId: null,
            mediaType: "IMAGE",
            storageKey: uploaded.key,
            url: uploaded.url,
            altText: item.alt,
            displayOrder: i,
            isPrimary: i === 0,
          },
        });
        uploadedCount++;
      }
    }

    console.log(`  ✓ Successfully uploaded ${uploadedCount} Cloudinary images for ${product.name}`);
  }

  console.log("\n===================================================================");
  console.log("CLOUDINARY PIPELINE COMPLETE!");
  console.log("===================================================================");
}

main()
  .catch((e) => {
    console.error("Cloudinary sync error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
