import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";

loadEnv({ path: resolve(__dirname, "../../../.env") });

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required to run the collections script.");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

/**
 * Use-case based collections aligned with Klarone Vision (01-KLARONE-VISION.md):
 * Helping users choose the best laptop for their real requirements:
 * 1. Coding & Software Engineering (coding-development)
 * 2. High-Performance Gaming (gaming-esports)
 * 3. College & Student Life (student-college)
 * 4. Business & Workplace Productivity (business-productivity)
 * 5. Video Editing & Content Creation (content-creation)
 * 6. Ultra-Portable & All-Day Battery (thin-light-travel)
 */
const USE_CASE_COLLECTIONS = [
  {
    title: "Coding & Software Engineering",
    slug: "coding-development",
    description: "High-core CPUs, minimum 16GB RAM, fast NVMe compilation speeds, and developer-friendly keyboards.",
  },
  {
    title: "Gaming & Esports",
    slug: "gaming-esports",
    description: "Dedicated RTX GPUs, high-refresh displays (144Hz+), and dual-channel cooling for peak FPS.",
  },
  {
    title: "College & Student Life",
    slug: "student-college",
    description: "Long-lasting battery life, lightweight backpacks fit, durable builds, and reliable everyday study performance.",
  },
  {
    title: "Business & Workplace Productivity",
    slug: "business-productivity",
    description: "Crisp displays, executive chassis, enterprise security, smooth multitasking, and quiet cooling.",
  },
  {
    title: "Video Editing & Content Creation",
    slug: "content-creation",
    description: "Color-accurate 100% sRGB/DCI-P3 panels, dedicated GPU acceleration, and fast media export speeds.",
  },
  {
    title: "Ultra-Portable & All-Day Battery",
    slug: "thin-light-travel",
    description: "Sub-1.5kg ultrabooks with 10+ hour battery life designed for hybrid professionals and digital nomads.",
  },
  {
    title: "Top Rated & Flagship Picks",
    slug: "top-picks",
    description: "Our handpicked industry benchmark laptops known for uncompromising build quality, top performance, and high user satisfaction.",
  },
];

async function main() {
  console.log("Upserting Klarone use-case collections...");

  const collectionMap = new Map<string, number>();

  for (const c of USE_CASE_COLLECTIONS) {
    const record = await prisma.collection.upsert({
      where: { slug: c.slug },
      update: {
        title: c.title,
        description: c.description,
        status: "ACTIVE",
      },
      create: {
        title: c.title,
        slug: c.slug,
        description: c.description,
        status: "ACTIVE",
      },
    });
    collectionMap.set(c.slug, record.id);
    console.log(`✓ Collection ready: "${record.title}" (${record.slug})`);
  }

  // Fetch all published products with their variants
  const products = await prisma.product.findMany({
    include: {
      category: true,
      variants: {
        where: { status: "ACTIVE" },
      },
    },
  });

  console.log(`\nEvaluating ${products.length} products against use-case criteria...`);

  // Clear existing collection mappings for clean categorization
  await prisma.collectionProduct.deleteMany({});
  await prisma.collectionVariant.deleteMany({});

  const linksToCreate: Array<{ collectionId: number; productId: bigint }> = [];
  const variantLinksToCreate: Array<{ collectionId: number; productVariantId: bigint }> = [];

  for (const p of products) {
    const catSlug = p.category?.slug?.toLowerCase() || "";
    const nameLower = p.name.toLowerCase();
    const shortDescLower = (p.shortDescription || "").toLowerCase();

    // Aggregate variant specs
    const maxRam = Math.max(...p.variants.map((v) => v.ramGb ?? 0), 0);
    const minPrice = Math.min(...p.variants.map((v) => Number(v.sellingPrice) || 999999));
    const hasDedicatedGpu = p.variants.some(
      (v) => (v.gpuVramGb && v.gpuVramGb > 0) || (v.gpuModel && /rtx|geforce|radeon rx/i.test(v.gpuModel)),
    );
    const isMacBook = nameLower.includes("macbook") || nameLower.includes("apple");
    const isGaming = catSlug.includes("gaming") || nameLower.includes("tuf") || nameLower.includes("rog") || nameLower.includes("legion") || nameLower.includes("predator") || nameLower.includes("victus") || nameLower.includes("loq") || nameLower.includes("alienware") || hasDedicatedGpu;

    const matchedSlugs = new Set<string>();

    // 1. Coding & Software Development
    // High RAM (>= 16GB), strong CPU, or MacBook / ThinkPad / XPS
    if (
      maxRam >= 16 ||
      isMacBook ||
      nameLower.includes("thinkpad") ||
      nameLower.includes("xps") ||
      nameLower.includes("zenbook") ||
      nameLower.includes("spectre") ||
      catSlug.includes("workstation") ||
      catSlug.includes("creator")
    ) {
      matchedSlugs.add("coding-development");
    }

    // 2. Gaming & Esports
    if (isGaming) {
      matchedSlugs.add("gaming-esports");
    }

    // 3. College & Student Life
    // Accessible price (< ₹90,000) or lightweight student favorite (Air, Vivobook, IdeaPad, Inspiron, Swift)
    if (
      minPrice <= 90000 ||
      nameLower.includes("air") ||
      nameLower.includes("vivobook") ||
      nameLower.includes("ideapad") ||
      nameLower.includes("inspiron") ||
      nameLower.includes("swift") ||
      nameLower.includes("pavilion")
    ) {
      matchedSlugs.add("student-college");
    }

    // 4. Business & Workplace Productivity
    if (
      nameLower.includes("thinkpad") ||
      nameLower.includes("latitude") ||
      nameLower.includes("elitebook") ||
      nameLower.includes("macbook") ||
      nameLower.includes("expertbook") ||
      catSlug.includes("ultrabook") ||
      catSlug.includes("business") ||
      (!isGaming && minPrice > 50000)
    ) {
      matchedSlugs.add("business-productivity");
    }

    // 5. Video Editing & Content Creation
    if (
      catSlug.includes("creator") ||
      catSlug.includes("workstation") ||
      isMacBook ||
      nameLower.includes("creator") ||
      nameLower.includes("proart") ||
      nameLower.includes("zenbook pro") ||
      nameLower.includes("yoga pro") ||
      (isGaming && maxRam >= 16)
    ) {
      matchedSlugs.add("content-creation");
    }

    // 6. Ultra-Portable & All-Day Battery
    if (
      catSlug.includes("ultrabook") ||
      nameLower.includes("air") ||
      nameLower.includes("slim") ||
      nameLower.includes("zenbook") ||
      nameLower.includes("gram") ||
      nameLower.includes("xps 13") ||
      nameLower.includes("swift") ||
      shortDescLower.includes("lightweight") ||
      shortDescLower.includes("portable")
    ) {
      matchedSlugs.add("thin-light-travel");
    }

    // 7. Top Rated & Flagship Picks (Benchmark models across each category)
    if (
      nameLower.includes("macbook pro") ||
      nameLower.includes("macbook air") ||
      nameLower.includes("thinkpad x1") ||
      nameLower.includes("xps 14") ||
      nameLower.includes("xps 16") ||
      nameLower.includes("rog zephyrus") ||
      nameLower.includes("legion pro") ||
      nameLower.includes("razer blade") ||
      nameLower.includes("zenbook pro") ||
      nameLower.includes("galaxy book") ||
      (maxRam >= 32 && hasDedicatedGpu)
    ) {
      matchedSlugs.add("top-picks");
    }

    // Link matched collections
    for (const slug of matchedSlugs) {
      const colId = collectionMap.get(slug);
      if (colId) {
        linksToCreate.push({ collectionId: colId, productId: p.id });
        // Also link primary variants so both CollectionProduct & CollectionVariant are populated
        for (const v of p.variants) {
          variantLinksToCreate.push({ collectionId: colId, productVariantId: v.id });
        }
      }
    }
  }

  if (linksToCreate.length > 0) {
    await prisma.collectionProduct.createMany({
      data: linksToCreate,
      skipDuplicates: true,
    });
  }

  if (variantLinksToCreate.length > 0) {
    await prisma.collectionVariant.createMany({
      data: variantLinksToCreate,
      skipDuplicates: true,
    });
  }

  console.log(`\nAssigned ${linksToCreate.length} product-collection links and ${variantLinksToCreate.length} variant-collection links.`);

  // Print counts for each collection
  const summary = await prisma.collection.findMany({
    include: {
      _count: {
        select: { products: true, variants: true },
      },
    },
  });

  console.log("\n--- Collection Summary ---");
  for (const s of summary) {
    console.log(`${s.title}: ${s._count.products} products (${s._count.variants} variants)`);
  }
}

main()
  .catch((err) => {
    console.error("Failed to seed use-case collections:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
