import { config } from "dotenv";
import { resolve } from "node:path";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

config({ path: resolve(__dirname, "../../../.env") });
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// Sample images in public/sample: 1.png, 2.png, ..., 9.png
const SAMPLE_IMAGES = [
  "/sample/1.png",
  "/sample/2.png",
  "/sample/3.png",
  "/sample/4.png",
  "/sample/5.png",
  "/sample/6.png",
  "/sample/7.png",
  "/sample/8.png",
  "/sample/9.png",
];

async function main() {
  console.log("🚀 Attaching sample images (/sample/1.png to 9.png) to all products in order...");

  const products = await prisma.product.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
    },
    orderBy: { id: "asc" },
  });

  console.log(`Found ${products.length} products to update.\n`);

  for (const product of products) {
    // 1. Remove existing product-level and variant-level media to have a clean, consistent set
    await prisma.productMedia.deleteMany({
      where: { productId: product.id },
    });

    // 2. Insert all 9 sample images for the product in order 1 to 9
    const mediaData = SAMPLE_IMAGES.map((imgUrl, idx) => ({
      productId: product.id,
      productVariantId: null,
      mediaType: "IMAGE",
      storageKey: `sample-${idx + 1}`,
      url: imgUrl,
      altText: `${product.name} - View ${idx + 1}`,
      displayOrder: idx,
      isPrimary: idx === 0,
    }));

    await prisma.productMedia.createMany({
      data: mediaData,
    });

    console.log(`✅ Product #${product.id} (${product.name}): Added ${mediaData.length} sample images`);
  }

  console.log("\n🎉 All products have been updated with /sample images 1 to 9!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
