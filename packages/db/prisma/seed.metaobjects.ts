/**
 * Seed: metaobject definitions + entries + metafield definitions.
 *
 * KIS/Klarone-scoped — we don't build a general-purpose metaobject builder
 * like Shopify. Only the definitions we actually need for laptop commerce:
 *
 *   klarone.color  → Color entries (Label, Hex, Image, Base color, Base pattern)
 *   klarone.entry  → Generic labelled entries for every other enum-ish field
 *
 * Then metafield definitions pinned to the "Laptops" category.
 *
 * Idempotent: safe to run multiple times. Uses upserts keyed on
 * (definitionId, handle) for entries and (namespace, key, categoryId, ownerType)
 * for metafield definitions.
 */

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";
import { resolve } from "node:path";

// Load the repo-root .env, regardless of cwd.
config({ path: resolve(__dirname, "../../../.env") });

if (!process.env.DATABASE_URL) {
  throw new Error(
    `DATABASE_URL is not set. Looked at: ${resolve(__dirname, "../../../.env")}`,
  );
}

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

const NAMESPACE = "klarone";

/* ------------------------------------------------------------------ */
/* Base catalogs                                                       */
/* ------------------------------------------------------------------ */

const BASE_COLORS: Array<{ label: string; hex: string }> = [
  { label: "Black",  hex: "#000000" },
  { label: "White",  hex: "#FFFFFF" },
  { label: "Grey",   hex: "#808080" },
  { label: "Silver", hex: "#C0C0C0" },
  { label: "Red",    hex: "#FF0000" },
  { label: "Orange", hex: "#FFA500" },
  { label: "Yellow", hex: "#FFFF00" },
  { label: "Green",  hex: "#008000" },
  { label: "Blue",   hex: "#0000FF" },
  { label: "Navy",   hex: "#000080" },
  { label: "Teal",   hex: "#008080" },
  { label: "Purple", hex: "#800080" },
  { label: "Pink",   hex: "#FFC0CB" },
  { label: "Brown",  hex: "#8B4513" },
  { label: "Beige",  hex: "#F5F5DC" },
  { label: "Gold",   hex: "#FFD700" },
  { label: "Maroon", hex: "#800000" },
  { label: "Multi",  hex: "#A0A0A0" },
];

const BASE_PATTERNS = [
  "Solid",
  "Striped",
  "Checked",
  "Dotted",
  "Floral",
  "Geometric",
  "Gradient",
  "Patterned",
  "Camouflage",
  "Glitter",
];

/* Default entries for every klarone.entry-typed metafield we ship. */

const ENTRY_CATALOG: Record<string, string[]> = {
  "Computer form": [
    "Notebook",
    "All-in-one",
    "Blade server",
    "Chromebook",
    "Cloud client",
    "Compact",
    "Convertible",
    "JBOD",
    "NAS",
    "Netbook",
    "Rack server",
    "Stick PC",
    "Tablet",
    "Thin client",
    "Tower server",
    "Ultrabook",
    "Workstation",
  ],
  "Processor family": [
    "Intel Core i3",
    "Intel Core i5",
    "Intel Core i7",
    "Intel Core i9",
    "Intel Core Ultra 5",
    "Intel Core Ultra 7",
    "Intel Core Ultra 9",
    "Intel Pentium",
    "Intel Celeron",
    "Intel Xeon",
    "AMD Ryzen 3",
    "AMD Ryzen 5",
    "AMD Ryzen 7",
    "AMD Ryzen 9",
    "AMD Athlon",
    "AMD Threadripper",
    "AMD EPYC",
    "Apple M1",
    "Apple M2",
    "Apple M3",
    "Apple M4",
    "Qualcomm Snapdragon X",
    "Qualcomm Snapdragon X Plus",
    "Qualcomm Snapdragon X Elite",
    "MediaTek Kompanio",
  ],
  "Graphics card type": [
    "Integrated",
    "Dedicated",
    "NVIDIA GeForce GTX",
    "NVIDIA GeForce RTX",
    "NVIDIA RTX Ada",
    "NVIDIA Quadro",
    "AMD Radeon RX",
    "AMD Radeon Pro",
    "Intel Arc",
    "Intel Iris Xe",
    "Apple GPU",
    "Qualcomm Adreno",
  ],
  "Display technology": [
    "IPS",
    "TN",
    "VA",
    "OLED",
    "AMOLED",
    "Mini-LED",
    "Micro-LED",
    "Retina",
    "Liquid Retina XDR",
    "Nano IPS",
    "QHD",
    "UHD",
  ],
  "Display resolution": [
    "HD (1280×720)",
    "HD+ (1600×900)",
    "FHD (1920×1080)",
    "FHD+ (1920×1200)",
    "2K (2560×1440)",
    "2.5K (2560×1600)",
    "QHD+ (3200×1800)",
    "3K (2880×1800)",
    "4K (3840×2160)",
    "Retina (2560×1600)",
  ],
  "Memory technology": [
    "DDR4",
    "DDR5",
    "LPDDR4",
    "LPDDR4X",
    "LPDDR5",
    "LPDDR5X",
    "Unified Memory",
    "ECC DDR4",
    "ECC DDR5",
  ],
  "Cosmetic condition": [
    "New",
    "Open box",
    "Refurbished",
    "Like new",
    "Excellent",
    "Good",
    "Fair",
    "For parts",
  ],
  "Removable storage formats supported": [
    "SD",
    "SDHC",
    "SDXC",
    "microSD",
    "microSDHC",
    "microSDXC",
    "Memory Stick",
    "CompactFlash",
    "CFexpress",
  ],
  "Storage types supported": [
    "NVMe SSD",
    "SATA SSD",
    "M.2 SSD",
    "HDD",
    "eMMC",
    "UFS",
    "Optane",
  ],
  "Optical drive type": [
    "None",
    "DVD-ROM",
    "DVD-RW",
    "Blu-ray",
    "Blu-ray writer",
    "CD-ROM",
    "CD-RW",
  ],
  "Processor cores": [
    "2",
    "4",
    "6",
    "8",
    "10",
    "12",
    "14",
    "16",
    "20",
    "24",
    "32",
  ],
  "Storage drive type installed": [
    "NVMe SSD",
    "SATA SSD",
    "M.2 SSD",
    "HDD",
    "eMMC",
    "Hybrid",
  ],
  "Computer specialized features": [
    "Touchscreen",
    "Stylus support",
    "Backlit keyboard",
    "Fingerprint reader",
    "IR face unlock",
    "Numpad",
    "Spill-resistant keyboard",
    "Military-grade durability",
    "Thunderbolt support",
    "VR ready",
    "AI acceleration",
    "Physical webcam shutter",
  ],
  "Keyboard layout": [
    "QWERTY",
    "AZERTY",
    "QWERTZ",
    "Dvorak",
    "Colemak",
    "Numpad included",
    "Compact",
    "Full size",
  ],
  "Keyboard type": [
    "Membrane",
    "Mechanical",
    "Scissor switch",
    "Butterfly switch",
    "Chiclet",
    "Optical",
  ],
  "Operating system": [
    "Windows 11 Home",
    "Windows 11 Pro",
    "Windows 10 Home",
    "Windows 10 Pro",
    "macOS",
    "Chrome OS",
    "Linux",
    "Ubuntu",
    "Fedora",
    "No OS",
  ],
  "Power source": [
    "AC adapter",
    "USB-C PD",
    "Proprietary charger",
    "Wireless charging",
    "Solar",
    "Dual (AC + USB-C)",
  ],
};

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/* ------------------------------------------------------------------ */
/* 1. Metaobject definitions                                           */
/* ------------------------------------------------------------------ */

async function upsertDefinitions() {
  const color = await prisma.metaobjectDefinition.upsert({
    where: { type: "color" },
    update: {
      namespace: NAMESPACE,
      name: "Color",
      description: "Reusable color entry with swatch and Shopify-style base mapping.",
      fieldSchema: [
        { key: "hex",         label: "Color",        type: "color",  required: true },
        { key: "imageUrl",    label: "Image",        type: "image",  required: false },
        { key: "baseColor",   label: "Base color",   type: "select", required: true, options: BASE_COLORS.map((c) => c.label) },
        { key: "basePattern", label: "Base pattern", type: "select", required: true, options: BASE_PATTERNS },
      ],
    },
    create: {
      namespace: NAMESPACE,
      type: "color",
      name: "Color",
      description: "Reusable color entry with swatch and Shopify-style base mapping.",
      fieldSchema: [
        { key: "hex",         label: "Color",        type: "color",  required: true },
        { key: "imageUrl",    label: "Image",        type: "image",  required: false },
        { key: "baseColor",   label: "Base color",   type: "select", required: true, options: BASE_COLORS.map((c) => c.label) },
        { key: "basePattern", label: "Base pattern", type: "select", required: true, options: BASE_PATTERNS },
      ],
    },
  });

  const entry = await prisma.metaobjectDefinition.upsert({
    where: { type: "entry" },
    update: {
      namespace: NAMESPACE,
      name: "Entry",
      description: "Generic labelled entry used by enum-like metafields.",
      fieldSchema: [],
    },
    create: {
      namespace: NAMESPACE,
      type: "entry",
      name: "Entry",
      description: "Generic labelled entry used by enum-like metafields.",
      fieldSchema: [],
    },
  });

  console.log(`✔ definitions: ${color.type}, ${entry.type}`);
  return { color, entry };
}

/* ------------------------------------------------------------------ */
/* 2. Color entries                                                    */
/* ------------------------------------------------------------------ */

async function seedColorEntries(definitionId: number) {
  let count = 0;
  for (const color of BASE_COLORS) {
    await prisma.metaobjectEntry.upsert({
      where: { definitionId_handle: { definitionId, handle: slugify(color.label) } },
      update: {
        displayName: color.label,
        fields: { hex: color.hex, imageUrl: null, baseColor: color.label, basePattern: "Solid" },
      },
      create: {
        definitionId,
        handle: slugify(color.label),
        displayName: color.label,
        fields: { hex: color.hex, imageUrl: null, baseColor: color.label, basePattern: "Solid" },
      },
    });
    count += 1;
  }
  console.log(`✔ color entries: ${count}`);
}

/* ------------------------------------------------------------------ */
/* 3. Generic entries (all the chips + the six pinned fields)          */
/* ------------------------------------------------------------------ */

async function seedEntryEntries(definitionId: number) {
  let count = 0;
  for (const [groupName, entries] of Object.entries(ENTRY_CATALOG)) {
    for (const value of entries) {
      const handle = `${slugify(groupName)}--${slugify(value)}`;
      await prisma.metaobjectEntry.upsert({
        where: { definitionId_handle: { definitionId, handle } },
        update: { displayName: value, fields: { group: groupName } },
        create: { definitionId, handle, displayName: value, fields: { group: groupName } },
      });
      count += 1;
    }
  }
  console.log(`✔ generic entries: ${count}`);
}

/* ------------------------------------------------------------------ */
/* 4. Metafield definitions pinned to "Laptops"                        */
/* ------------------------------------------------------------------ */

type FieldSeed = {
  key: string;
  name: string;
  type: "text" | "number" | "boolean" | "select" | "metaobject";
  metaobjectType?: "color" | "entry";
  multiple?: boolean;
  displayOrder: number;
};

const PINNED: FieldSeed[] = [
  { key: "color",            name: "Color",            type: "metaobject", metaobjectType: "color", displayOrder: 1 },
  { key: "computer_form",    name: "Computer form",    type: "metaobject", metaobjectType: "entry", multiple: true, displayOrder: 2 },
  { key: "keyboard_layout",  name: "Keyboard layout",  type: "metaobject", metaobjectType: "entry", multiple: true, displayOrder: 3 },
  { key: "keyboard_type",    name: "Keyboard type",    type: "metaobject", metaobjectType: "entry", multiple: true, displayOrder: 4 },
  { key: "operating_system", name: "Operating system", type: "metaobject", metaobjectType: "entry", multiple: true, displayOrder: 5 },
  { key: "power_source",     name: "Power source",     type: "metaobject", metaobjectType: "entry", multiple: true, displayOrder: 6 },
];

const CHIPS: FieldSeed[] = [
  { key: "display_technology",                  name: "Display technology",                  type: "metaobject", metaobjectType: "entry", multiple: true, displayOrder: 101 },
  { key: "display_resolution",                  name: "Display resolution",                  type: "metaobject", metaobjectType: "entry", multiple: true, displayOrder: 102 },
  { key: "memory_technology",                   name: "Memory technology",                   type: "metaobject", metaobjectType: "entry", multiple: true, displayOrder: 103 },
  { key: "cosmetic_condition",                  name: "Cosmetic condition",                  type: "metaobject", metaobjectType: "entry", multiple: true, displayOrder: 104 },
  { key: "removable_storage_formats_supported", name: "Removable storage formats supported", type: "metaobject", metaobjectType: "entry", multiple: true, displayOrder: 105 },
  { key: "processor_family",                    name: "Processor family",                    type: "metaobject", metaobjectType: "entry", multiple: true, displayOrder: 106 },
  { key: "graphics_card_type",                  name: "Graphics card type",                  type: "metaobject", metaobjectType: "entry", multiple: true, displayOrder: 107 },
  { key: "storage_types_supported",             name: "Storage types supported",             type: "metaobject", metaobjectType: "entry", multiple: true, displayOrder: 108 },
  { key: "optical_drive_type",                  name: "Optical drive type",                  type: "metaobject", metaobjectType: "entry", multiple: true, displayOrder: 109 },
  { key: "processor_cores",                     name: "Processor cores",                     type: "metaobject", metaobjectType: "entry", multiple: true, displayOrder: 110 },
  { key: "storage_drive_type_installed",        name: "Storage drive type installed",        type: "metaobject", metaobjectType: "entry", multiple: true, displayOrder: 111 },
  { key: "computer_specialized_features",       name: "Computer specialized features",       type: "metaobject", metaobjectType: "entry", multiple: true, displayOrder: 112 },
];

async function seedMetafieldDefinitions() {
  // Find or create the "Laptops" category (child of "Computers" if it exists, else top-level).
  const computers =
    (await prisma.category.findFirst({ where: { slug: "computers" } })) ?? null;

  const laptops = await prisma.category.upsert({
    where: { slug: "laptops" },
    update: {},
    create: {
      slug: "laptops",
      name: "Laptops",
      parentId: computers?.id ?? null,
      displayOrder: 0,
      status: "ACTIVE",
    },
  });

  for (const f of [...PINNED, ...CHIPS]) {
    await prisma.metafieldDefinition.upsert({
      where: {
        namespace_key_categoryId_ownerType: {
          namespace: NAMESPACE,
          key: f.key,
          categoryId: laptops.id,
          ownerType: "PRODUCT",
        },
      },
      update: {
        name: f.name,
        type: f.type,
        metaobjectType: f.metaobjectType ?? null,
        multiple: f.multiple ?? false,
        displayOrder: f.displayOrder,
        status: "ACTIVE",
      },
      create: {
        namespace: NAMESPACE,
        key: f.key,
        name: f.name,
        ownerType: "PRODUCT",
        type: f.type,
        metaobjectType: f.metaobjectType ?? null,
        multiple: f.multiple ?? false,
        displayOrder: f.displayOrder,
        categoryId: laptops.id,
        status: "ACTIVE",
      },
    });
  }

  console.log(`✔ metafield definitions on category "${laptops.name}" (id=${laptops.id}): ${PINNED.length + CHIPS.length}`);
}

/* ------------------------------------------------------------------ */
/* Main                                                                */
/* ------------------------------------------------------------------ */

async function main() {
  console.log("── Seeding metaobjects + metafields ──");
  const { color, entry } = await upsertDefinitions();
  await seedColorEntries(color.id);
  await seedEntryEntries(entry.id);
  await seedMetafieldDefinitions();
  console.log("── Done ──");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });