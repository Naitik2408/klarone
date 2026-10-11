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
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

interface CategorySeedNode {
  name: string;
  slug: string;
  description?: string;
  displayOrder?: number;
  children?: CategorySeedNode[];
}

const TAXONOMY: CategorySeedNode[] = [
  {
    name: "Electronics & Computers",
    slug: "electronics-and-computers",
    description: "Computing hardware, devices and personal electronics",
    displayOrder: 1,
    children: [
      {
        name: "Laptops",
        slug: "laptops",
        description: "Portable personal computers (HSN: 84713010 | GST: 18%)",
        displayOrder: 1,
        children: [
          { name: "Business Laptops", slug: "business-laptops", displayOrder: 1 },
          { name: "Gaming Laptops", slug: "gaming-laptops", displayOrder: 2 },
          { name: "Student & Everyday Laptops", slug: "student-laptops", displayOrder: 3 },
          { name: "2-in-1 Touch Laptops", slug: "2-in-1-laptops", displayOrder: 4 },
        ],
      },
      {
        name: "Desktops & All-in-One PCs",
        slug: "desktops-and-all-in-one",
        description: "Desktop computers and workstations (HSN: 84715000 | GST: 18%)",
        displayOrder: 2,
      },
    ],
  },
  {
    name: "Components & Spare Parts",
    slug: "components-and-spare-parts",
    description: "Laptop and desktop replacement parts & internal modules",
    displayOrder: 2,
    children: [
      {
        name: "Memory (RAM)",
        slug: "memory-ram",
        description: "DDR4 / DDR5 SODIMM & desktop RAM (HSN: 84733020 | GST: 18%)",
        displayOrder: 1,
      },
      {
        name: "Storage (SSDs & HDDs)",
        slug: "storage-ssds-hdds",
        description: "NVMe M.2 SSDs, SATA SSDs and external drives (HSN: 84717020 | GST: 18%)",
        displayOrder: 2,
      },
      {
        name: "Batteries",
        slug: "laptop-batteries",
        description: "Internal and external rechargeable laptop batteries (HSN: 85076000 | GST: 18%)",
        displayOrder: 3,
      },
      {
        name: "Power Adapters & Chargers",
        slug: "power-adapters-chargers",
        description: "Type-C and barrel-jack laptop power supplies (HSN: 85044090 | GST: 18%)",
        displayOrder: 4,
      },
      {
        name: "Screens & Displays",
        slug: "laptop-screens-displays",
        description: "Replacement LCD, LED and OLED laptop panels (HSN: 85285200 | GST: 18%)",
        displayOrder: 5,
      },
      {
        name: "Keyboards & Trackpads",
        slug: "keyboards-trackpads",
        description: "Internal replacement keyboards & palmrests (HSN: 84716040 | GST: 18%)",
        displayOrder: 6,
      },
    ],
  },
  {
    name: "Accessories",
    slug: "accessories",
    description: "Peripherals, bags, docks and connectivity accessories",
    displayOrder: 3,
    children: [
      {
        name: "Laptop Bags & Sleeves",
        slug: "laptop-bags-sleeves",
        description: "Protective sleeves, backpacks and messenger bags (HSN: 420212 | GST: 18%)",
        displayOrder: 1,
      },
      {
        name: "Docking Stations & Hubs",
        slug: "docking-stations-hubs",
        description: "USB-C, Thunderbolt docks and multiport adapters (HSN: 84718000 | GST: 18%)",
        displayOrder: 2,
      },
      {
        name: "Mice & External Keyboards",
        slug: "mice-external-keyboards",
        description: "Wireless and wired peripherals (HSN: 84716040 | GST: 18%)",
        displayOrder: 3,
      },
    ],
  },
  {
    name: "Services & Support",
    slug: "services-and-support",
    description: "Technical diagnostics, upgrades, repairs and care plans (SAC: 998713 | GST: 18%)",
    displayOrder: 4,
    children: [
      { name: "Laptop Diagnostics & Health Check", slug: "laptop-diagnostics", displayOrder: 1 },
      { name: "RAM & SSD Upgrade Service", slug: "ram-ssd-upgrade-service", displayOrder: 2 },
      { name: "Battery Replacement Service", slug: "battery-replacement-service", displayOrder: 3 },
      { name: "Thermal Repasting & Deep Cleaning", slug: "thermal-repasting-cleaning", displayOrder: 4 },
      { name: "Screen Replacement Service", slug: "screen-replacement-service", displayOrder: 5 },
    ],
  },
];

async function seedCategoryTree(nodes: CategorySeedNode[], parentId: number | null = null) {
  for (const node of nodes) {
    const category = await prisma.category.upsert({
      where: { slug: node.slug },
      update: {
        name: node.name,
        description: node.description ?? null,
        displayOrder: node.displayOrder ?? 0,
        parentId,
        status: "ACTIVE",
      },
      create: {
        name: node.name,
        slug: node.slug,
        description: node.description ?? null,
        displayOrder: node.displayOrder ?? 0,
        parentId,
        status: "ACTIVE",
      },
    });

    console.log(`Seeded category: ${category.name} (id: ${category.id}, slug: ${category.slug})`);

    if (node.children && node.children.length > 0) {
      await seedCategoryTree(node.children, category.id);
    }
  }
}

async function main() {
  console.log("Seeding Shopify-style Standard Product Taxonomy for Klarone (India)...");
  await seedCategoryTree(TAXONOMY);
  console.log("Product Taxonomy Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("Failed to seed taxonomy:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
