import path from "node:path";
import dotenv from "dotenv";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

dotenv.config({
  path: path.resolve(process.cwd(), "../../.env"),
});

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

const connectionString = requiredEnv("DATABASE_URL");
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

interface CleanCategory {
  name: string;
  slug: string;
  description: string;
  displayOrder: number;
}

// Flat, clear physical categories — no marketing confusion
const FLAT_CATEGORIES: CleanCategory[] = [
  {
    name: "Laptops",
    slug: "laptops",
    description: "Portable personal computers (HSN: 84713010 | GST: 18%)",
    displayOrder: 1,
  },
  {
    name: "Desktops & All-in-Ones",
    slug: "desktops",
    description: "Desktop computers and workstations (HSN: 84715000 | GST: 18%)",
    displayOrder: 2,
  },
  {
    name: "Monitors",
    slug: "monitors",
    description: "External computer displays and panels (HSN: 85285200 | GST: 18%)",
    displayOrder: 3,
  },
  {
    name: "Memory (RAM)",
    slug: "memory-ram",
    description: "DDR4 / DDR5 SODIMM & desktop RAM (HSN: 84733020 | GST: 18%)",
    displayOrder: 4,
  },
  {
    name: "Storage (SSDs & HDDs)",
    slug: "storage-ssds-hdds",
    description: "NVMe M.2 SSDs, SATA SSDs and external drives (HSN: 84717020 | GST: 18%)",
    displayOrder: 5,
  },
  {
    name: "Batteries",
    slug: "batteries",
    description: "Internal & replacement laptop batteries (HSN: 85076000 | GST: 18%)",
    displayOrder: 6,
  },
  {
    name: "Chargers & Power Adapters",
    slug: "chargers-power-adapters",
    description: "Type-C and barrel-jack power adapters (HSN: 85044090 | GST: 18%)",
    displayOrder: 7,
  },
  {
    name: "Keyboards & Mice",
    slug: "keyboards-mice",
    description: "Replacement and external input devices (HSN: 84716040 | GST: 18%)",
    displayOrder: 8,
  },
  {
    name: "Bags & Sleeves",
    slug: "bags-sleeves",
    description: "Protective sleeves and backpacks (HSN: 420212 | GST: 18%)",
    displayOrder: 9,
  },
  {
    name: "Docks & Hubs",
    slug: "docks-hubs",
    description: "USB-C, Thunderbolt docks & multiport adapters (HSN: 84718000 | GST: 18%)",
    displayOrder: 10,
  },
  {
    name: "Services & Support",
    slug: "services-support",
    description: "Diagnostics, repairs, cleaning and upgrades (SAC: 998713 | GST: 18%)",
    displayOrder: 11,
  },
];

async function main() {
  console.log("Applying Clean & Flat Category System...");

  // 1. Point any products attached to old subcategories to the primary parent (or Laptop id: 1)
  const laptopCat = await prisma.category.upsert({
    where: { slug: "laptops" },
    update: {
      name: "Laptops",
      description: "Portable personal computers (HSN: 84713010 | GST: 18%)",
      displayOrder: 1,
      parentId: null,
      status: "ACTIVE",
    },
    create: {
      name: "Laptops",
      slug: "laptops",
      description: "Portable personal computers (HSN: 84713010 | GST: 18%)",
      displayOrder: 1,
      parentId: null,
      status: "ACTIVE",
    },
  });

  // Re-assign products from subcategories to clean laptop category if needed
  await prisma.product.updateMany({
    where: {
      category: {
        slug: {
          in: ["business-laptops", "gaming-laptops", "student-laptops", "2-in-1-laptops"],
        },
      },
    },
    data: {
      categoryId: laptopCat.id,
    },
  });

  // 2. Remove obsolete subcategories
  await prisma.category.deleteMany({
    where: {
      slug: {
        in: [
          "business-laptops",
          "gaming-laptops",
          "student-laptops",
          "2-in-1-laptops",
          "laptop-screens-displays",
          "keyboards-trackpads",
          "docking-stations-hubs",
          "mice-external-keyboards",
          "laptop-bags-sleeves",
          "laptop-diagnostics",
          "ram-ssd-upgrade-service",
          "battery-replacement-service",
          "thermal-repasting-cleaning",
          "screen-replacement-service",
          "electronics-and-computers",
          "components-and-spare-parts",
          "accessories",
        ],
      },
    },
  });

  // 3. Upsert clean flat categories
  for (const cat of FLAT_CATEGORIES) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {
        name: cat.name,
        description: cat.description,
        displayOrder: cat.displayOrder,
        parentId: null,
        status: "ACTIVE",
      },
      create: {
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        displayOrder: cat.displayOrder,
        parentId: null,
        status: "ACTIVE",
      },
    });
    console.log(`✓ Active clean category: ${cat.name}`);
  }

  console.log("Flat Category System successfully established!");
}

main()
  .catch((e) => {
    console.error("Migration failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
