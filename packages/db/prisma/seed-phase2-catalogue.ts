import { config } from "dotenv";
import { resolve } from "node:path";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

config({ path: resolve(__dirname, "../../../.env") });

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

const connectionString = requiredEnv("DATABASE_URL");
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Starting Phase 2 Real Catalogue Expansion...");

  const adminAccount = await prisma.userAccount.findFirst({
    where: { status: "ACTIVE" },
  });
  const adminId = adminAccount?.id ?? null;

  // 1. PHASE 2 BRANDS: HP, ASUS, ACER
  console.log("Upserting Phase 2 Brands (HP, Asus, Acer)...");

  const hpBrand = await prisma.brand.upsert({
    where: { slug: "hp" },
    update: {
      name: "HP",
      description: "Iconic Spectre luxury ultrabooks, Envy creator notebooks, and OMEN tournament-grade gaming laptops.",
      logoUrl: "/media/catalogue/brands/hp-logo.svg",
      websiteUrl: "https://www.hp.com",
      status: "ACTIVE",
    },
    create: {
      name: "HP",
      slug: "hp",
      description: "Iconic Spectre luxury ultrabooks, Envy creator notebooks, and OMEN tournament-grade gaming laptops.",
      logoUrl: "/media/catalogue/brands/hp-logo.svg",
      websiteUrl: "https://www.hp.com",
      status: "ACTIVE",
    },
  });

  const asusBrand = await prisma.brand.upsert({
    where: { slug: "asus" },
    update: {
      name: "Asus",
      description: "Industry-leading ROG Strix/Zephyrus gaming machines, Zenbook dual-screen OLED laptops, and ProArt creator rigs.",
      logoUrl: "/media/catalogue/brands/asus-logo.svg",
      websiteUrl: "https://www.asus.com",
      status: "ACTIVE",
    },
    create: {
      name: "Asus",
      slug: "asus",
      description: "Industry-leading ROG Strix/Zephyrus gaming machines, Zenbook dual-screen OLED laptops, and ProArt creator rigs.",
      logoUrl: "/media/catalogue/brands/asus-logo.svg",
      websiteUrl: "https://www.asus.com",
      status: "ACTIVE",
    },
  });

  const acerBrand = await prisma.brand.upsert({
    where: { slug: "acer" },
    update: {
      name: "Acer",
      description: "Value-packed Predator Helios & Nitro gaming hardware, along with featherweight Swift Go OLED ultrabooks.",
      logoUrl: "/media/catalogue/brands/acer-logo.svg",
      websiteUrl: "https://www.acer.com",
      status: "ACTIVE",
    },
    create: {
      name: "Acer",
      slug: "acer",
      description: "Value-packed Predator Helios & Nitro gaming hardware, along with featherweight Swift Go OLED ultrabooks.",
      logoUrl: "/media/catalogue/brands/acer-logo.svg",
      websiteUrl: "https://www.acer.com",
      status: "ACTIVE",
    },
  });

  console.log(`Phase 2 Brands Ready: HP (${hpBrand.id}), Asus (${asusBrand.id}), Acer (${acerBrand.id})`);

  // Fetch Category references
  const catUltrabooks = await prisma.category.findUniqueOrThrow({ where: { slug: "ultrabooks" } });
  const catGaming = await prisma.category.findUniqueOrThrow({ where: { slug: "gaming-laptops" } });
  const catWorkstations = await prisma.category.findUniqueOrThrow({ where: { slug: "creator-workstations" } });

  // 2. ADDITIONAL COLLECTIONS
  console.log("Upserting Collections...");
  const oledCollection = await prisma.collection.upsert({
    where: { slug: "pure-oled-displays" },
    update: {
      title: "Pure OLED & Cinema Displays",
      description: "Laptops featuring 100% DCI-P3 color reproduction, infinite contrast, and certified low-blue-light panels.",
      status: "ACTIVE",
    },
    create: {
      title: "Pure OLED & Cinema Displays",
      slug: "pure-oled-displays",
      description: "Laptops featuring 100% DCI-P3 color reproduction, infinite contrast, and certified low-blue-light panels.",
      status: "ACTIVE",
    },
  });

  const studentBudgetCollection = await prisma.collection.upsert({
    where: { slug: "student-and-coding" },
    update: {
      title: "Best for Students & Software Development",
      description: "Long battery life, responsive keyboards, and comfortable lightweight chassis under ₹1,20,000.",
      status: "ACTIVE",
    },
    create: {
      title: "Best for Students & Software Development",
      slug: "student-and-coding",
      description: "Long battery life, responsive keyboards, and comfortable lightweight chassis under ₹1,20,000.",
      status: "ACTIVE",
    },
  });

  // 3. EXPANDED FLAGSHIP PRODUCTS & VARIANTS
  console.log("Seeding Phase 2 Flagship Products...");

  // PRODUCT 4: ASUS ROG Zephyrus G14 (2024)
  const asusZephyrus = await prisma.product.upsert({
    where: { slug: "asus-rog-zephyrus-g14-2024" },
    update: {
      brandId: asusBrand.id,
      categoryId: catGaming.id,
      name: "ASUS ROG Zephyrus G14 (2024) OLED",
      modelNumber: "GA403UI",
      manufacturerPartNumber: "GA403UI-QS085WS",
      shortDescription: "14″ 3K 120Hz ROG Nebula OLED display, AMD Ryzen 9 8945HS with Ryzen AI, NVIDIA GeForce RTX 4070 (90W), Slash Lighting lid, and CNC unibody.",
      description: `Power, precision, and elegance define the 2024 ROG Zephyrus G14. Redesigned with a CNC aluminum chassis and the customizable Slash Lighting LED array across the lid, this 1.5kg gaming ultrabook pushes the boundary of portable performance.

Key Highlights:
• ROG Nebula Display (OLED): 3K (2880 x 1800) 120Hz/0.2ms OLED panel with 100% DCI-P3, G-SYNC, VESA DisplayHDR True Black 500, and Delta E < 1 factory calibration.
• AI-Accelerated AMD Ryzen 9 8945HS: 8 cores, 16 threads, up to 5.2 GHz with 16 NPU TOPS for generative AI workflows.
• NVIDIA GeForce RTX 4070 Laptop GPU: 8GB GDDR6 with MUX Switch, NVIDIA Advanced Optimus, and DLSS 3.5 Ray Reconstruction.
• ROG Intelligent Cooling: 2nd Gen Arc Flow Fans, liquid metal on CPU, and enhanced heatpipes keep noise below 0dB in light tasks.`,
      productType: "LAPTOP",
      status: "PUBLISHED",
      createdByUserId: adminId,
    },
    create: {
      brandId: asusBrand.id,
      categoryId: catGaming.id,
      name: "ASUS ROG Zephyrus G14 (2024) OLED",
      slug: "asus-rog-zephyrus-g14-2024",
      modelNumber: "GA403UI",
      manufacturerPartNumber: "GA403UI-QS085WS",
      shortDescription: "14″ 3K 120Hz ROG Nebula OLED display, AMD Ryzen 9 8945HS with Ryzen AI, NVIDIA GeForce RTX 4070 (90W), Slash Lighting lid, and CNC unibody.",
      description: `Power, precision, and elegance define the 2024 ROG Zephyrus G14. Redesigned with a CNC aluminum chassis and the customizable Slash Lighting LED array across the lid, this 1.5kg gaming ultrabook pushes the boundary of portable performance.

Key Highlights:
• ROG Nebula Display (OLED): 3K (2880 x 1800) 120Hz/0.2ms OLED panel with 100% DCI-P3, G-SYNC, VESA DisplayHDR True Black 500, and Delta E < 1 factory calibration.
• AI-Accelerated AMD Ryzen 9 8945HS: 8 cores, 16 threads, up to 5.2 GHz with 16 NPU TOPS for generative AI workflows.
• NVIDIA GeForce RTX 4070 Laptop GPU: 8GB GDDR6 with MUX Switch, NVIDIA Advanced Optimus, and DLSS 3.5 Ray Reconstruction.
• ROG Intelligent Cooling: 2nd Gen Arc Flow Fans, liquid metal on CPU, and enhanced heatpipes keep noise below 0dB in light tasks.`,
      productType: "LAPTOP",
      status: "PUBLISHED",
      createdByUserId: adminId,
    },
  });

  await prisma.collectionProduct.upsert({
    where: { collectionId_productId: { collectionId: oledCollection.id, productId: asusZephyrus.id } },
    update: {},
    create: { collectionId: oledCollection.id, productId: asusZephyrus.id, displayOrder: 1 },
  });

  const zephyrusVariant = await prisma.productVariant.upsert({
    where: { sku: "ZEPHYRUS-G14-R9-32-1TB-RTX4070-EG" },
    update: {
      productId: asusZephyrus.id,
      variantName: "Ryzen 9 8945HS (32GB LPDDR5X, 1TB NVMe, RTX 4070 8GB, Eclipse Gray)",
      color: "Eclipse Gray",
      ramGb: 32,
      storageGb: 1000,
      operatingSystem: "Windows 11 Home",
      basePrice: "194990.00",
      sellingPrice: "194990.00",
      compareAtPrice: "214990.00",
      warrantyMonths: 12,
      status: "ACTIVE",
    },
    create: {
      productId: asusZephyrus.id,
      sku: "ZEPHYRUS-G14-R9-32-1TB-RTX4070-EG",
      variantName: "Ryzen 9 8945HS (32GB LPDDR5X, 1TB NVMe, RTX 4070 8GB, Eclipse Gray)",
      color: "Eclipse Gray",
      ramGb: 32,
      storageGb: 1000,
      operatingSystem: "Windows 11 Home",
      basePrice: "194990.00",
      sellingPrice: "194990.00",
      compareAtPrice: "214990.00",
      warrantyMonths: 12,
      status: "ACTIVE",
    },
  });

  await prisma.productSpecification.upsert({
    where: { productVariantId: zephyrusVariant.id },
    update: {
      cpuBrand: "AMD",
      cpuModel: "AMD Ryzen 9 8945HS",
      cpuGeneration: "Ryzen 8000 Hawk Point",
      cpuCores: 8,
      cpuThreads: 16,
      gpuBrand: "NVIDIA",
      gpuModel: "NVIDIA GeForce RTX 4070 (90W TGP)",
      gpuVramGb: 8,
      ramType: "LPDDR5X-6400",
      ramSpeedMhz: 6400,
      maxRamGb: 32,
      storageType: "PCIe 4.0 NVMe M.2 SSD",
      displaySizeInches: "14.00",
      displayResolution: "2880 x 1800 (3K)",
      displayPanelType: "ROG Nebula OLED",
      displayRefreshRateHz: 120,
      displayBrightnessNits: 500,
      displayColorGamut: "100% DCI-P3",
      batteryCapacityWh: "73.00",
      weightKg: "1.500",
      widthMm: "311.00",
      depthMm: "220.00",
      heightMm: "16.30",
      webcamResolution: "1080p FHD IR with Windows Hello",
      wifiVersion: "Wi-Fi 6E (802.11ax)",
      bluetoothVersion: "Bluetooth 5.3",
      keyboardType: "Backlit Chiclet 1-Zone RGB with Slash Lighting",
      keyboardBacklight: true,
      fingerprintSensor: false,
    },
    create: {
      productVariantId: zephyrusVariant.id,
      cpuBrand: "AMD",
      cpuModel: "AMD Ryzen 9 8945HS",
      cpuGeneration: "Ryzen 8000 Hawk Point",
      cpuCores: 8,
      cpuThreads: 16,
      gpuBrand: "NVIDIA",
      gpuModel: "NVIDIA GeForce RTX 4070 (90W TGP)",
      gpuVramGb: 8,
      ramType: "LPDDR5X-6400",
      ramSpeedMhz: 6400,
      maxRamGb: 32,
      storageType: "PCIe 4.0 NVMe M.2 SSD",
      displaySizeInches: "14.00",
      displayResolution: "2880 x 1800 (3K)",
      displayPanelType: "ROG Nebula OLED",
      displayRefreshRateHz: 120,
      displayBrightnessNits: 500,
      displayColorGamut: "100% DCI-P3",
      batteryCapacityWh: "73.00",
      weightKg: "1.500",
      widthMm: "311.00",
      depthMm: "220.00",
      heightMm: "16.30",
      webcamResolution: "1080p FHD IR with Windows Hello",
      wifiVersion: "Wi-Fi 6E (802.11ax)",
      bluetoothVersion: "Bluetooth 5.3",
      keyboardType: "Backlit Chiclet 1-Zone RGB with Slash Lighting",
      keyboardBacklight: true,
      fingerprintSensor: false,
    },
  });

  await prisma.productPort.deleteMany({ where: { productVariantId: zephyrusVariant.id } });
  await prisma.productPort.createMany({
    data: [
      { productVariantId: zephyrusVariant.id, portType: "USB4 Type-C (DisplayPort 1.4, 100W Power Delivery)", quantity: 1, supportsCharging: true, supportsDisplay: true },
      { productVariantId: zephyrusVariant.id, portType: "USB-C 3.2 Gen 2 (DisplayPort 1.4, 100W PD)", quantity: 1, supportsCharging: true, supportsDisplay: true },
      { productVariantId: zephyrusVariant.id, portType: "USB-A 3.2 Gen 2", quantity: 2, supportsCharging: false, supportsDisplay: false },
      { productVariantId: zephyrusVariant.id, portType: "HDMI 2.1 FRL", quantity: 1, supportsCharging: false, supportsDisplay: true },
      { productVariantId: zephyrusVariant.id, portType: "UHS-II MicroSD Card Reader", quantity: 1, supportsCharging: false, supportsDisplay: false },
      { productVariantId: zephyrusVariant.id, portType: "3.5mm Combo Audio Jack", quantity: 1, supportsCharging: false, supportsDisplay: false },
    ],
  });

  // PRODUCT 5: HP Spectre x360 14 (2024)
  const hpSpectre = await prisma.product.upsert({
    where: { slug: "hp-spectre-x360-14-2024" },
    update: {
      brandId: hpBrand.id,
      categoryId: catUltrabooks.id,
      name: "HP Spectre x360 14 2-in-1 OLED",
      modelNumber: "14-eu0000",
      manufacturerPartNumber: "14-eu0789TU",
      shortDescription: "14″ 2.8K 120Hz IMAX Enhanced OLED touch display, Intel Core Ultra 7 155H, 9MP AI webcam with auto-framing, and 360-degree convertible hinge.",
      description: `The HP Spectre x360 14 combines artisan gemstone-cut aluminum craftsmanship with cutting-edge Intel Core Ultra silicon. Effortlessly transforms between laptop, tent, presentation, and tablet modes.

Key Highlights:
• IMAX Enhanced 2.8K OLED Display: 2880 x 1800 120Hz variable refresh rate touch screen with HP MPP 2.0 tilt pen included.
• Studio-Grade 9MP AI Camera: Hardware low-light adjustment, auto-framing, and physical privacy shutter.
• Quad Poly Studio Audio: Four speakers tuned with DTS:X Ultra and HP Audio Boost.
• Fast Charging: Charges up to 50% in approximately 45 minutes via 65W USB-C adapter.`,
      productType: "LAPTOP",
      status: "PUBLISHED",
      createdByUserId: adminId,
    },
    create: {
      brandId: hpBrand.id,
      categoryId: catUltrabooks.id,
      name: "HP Spectre x360 14 2-in-1 OLED",
      slug: "hp-spectre-x360-14-2024",
      modelNumber: "14-eu0000",
      manufacturerPartNumber: "14-eu0789TU",
      shortDescription: "14″ 2.8K 120Hz IMAX Enhanced OLED touch display, Intel Core Ultra 7 155H, 9MP AI webcam with auto-framing, and 360-degree convertible hinge.",
      description: `The HP Spectre x360 14 combines artisan gemstone-cut aluminum craftsmanship with cutting-edge Intel Core Ultra silicon. Effortlessly transforms between laptop, tent, presentation, and tablet modes.

Key Highlights:
• IMAX Enhanced 2.8K OLED Display: 2880 x 1800 120Hz variable refresh rate touch screen with HP MPP 2.0 tilt pen included.
• Studio-Grade 9MP AI Camera: Hardware low-light adjustment, auto-framing, and physical privacy shutter.
• Quad Poly Studio Audio: Four speakers tuned with DTS:X Ultra and HP Audio Boost.
• Fast Charging: Charges up to 50% in approximately 45 minutes via 65W USB-C adapter.`,
      productType: "LAPTOP",
      status: "PUBLISHED",
      createdByUserId: adminId,
    },
  });

  await prisma.collectionProduct.upsert({
    where: { collectionId_productId: { collectionId: oledCollection.id, productId: hpSpectre.id } },
    update: {},
    create: { collectionId: oledCollection.id, productId: hpSpectre.id, displayOrder: 2 },
  });

  const spectreVariant = await prisma.productVariant.upsert({
    where: { sku: "SPECTRE-X360-14-U7-32-1TB-NB" },
    update: {
      productId: hpSpectre.id,
      variantName: "Intel Core Ultra 7 155H (32GB LPDDR5x, 1TB NVMe, Intel Arc Graphics, Nightfall Black)",
      color: "Nightfall Black",
      ramGb: 32,
      storageGb: 1000,
      operatingSystem: "Windows 11 Home",
      basePrice: "164999.00",
      sellingPrice: "164999.00",
      compareAtPrice: "179999.00",
      warrantyMonths: 12,
      status: "ACTIVE",
    },
    create: {
      productId: hpSpectre.id,
      sku: "SPECTRE-X360-14-U7-32-1TB-NB",
      variantName: "Intel Core Ultra 7 155H (32GB LPDDR5x, 1TB NVMe, Intel Arc Graphics, Nightfall Black)",
      color: "Nightfall Black",
      ramGb: 32,
      storageGb: 1000,
      operatingSystem: "Windows 11 Home",
      basePrice: "164999.00",
      sellingPrice: "164999.00",
      compareAtPrice: "179999.00",
      warrantyMonths: 12,
      status: "ACTIVE",
    },
  });

  await prisma.productSpecification.upsert({
    where: { productVariantId: spectreVariant.id },
    update: {
      cpuBrand: "Intel",
      cpuModel: "Intel Core Ultra 7 155H",
      cpuCores: 16,
      cpuThreads: 22,
      gpuBrand: "Intel",
      gpuModel: "Intel Arc Graphics (8 Xe-cores)",
      ramType: "LPDDR5x-7467",
      ramSpeedMhz: 7467,
      maxRamGb: 32,
      storageType: "PCIe Gen4 NVMe M.2 SSD",
      displaySizeInches: "14.00",
      displayResolution: "2880 x 1800 (2.8K)",
      displayPanelType: "OLED Touch 120Hz IMAX Enhanced",
      displayRefreshRateHz: 120,
      displayBrightnessNits: 500,
      displayColorGamut: "100% DCI-P3",
      batteryCapacityWh: "68.00",
      weightKg: "1.440",
      widthMm: "313.70",
      depthMm: "220.40",
      heightMm: "16.90",
      webcamResolution: "9MP IR Camera with privacy shutter",
      wifiVersion: "Intel Wi-Fi 7 BE200 (802.11be)",
      bluetoothVersion: "Bluetooth 5.4",
      keyboardType: "Full-size backlit Nightfall Black",
      keyboardBacklight: true,
      fingerprintSensor: true,
    },
    create: {
      productVariantId: spectreVariant.id,
      cpuBrand: "Intel",
      cpuModel: "Intel Core Ultra 7 155H",
      cpuCores: 16,
      cpuThreads: 22,
      gpuBrand: "Intel",
      gpuModel: "Intel Arc Graphics (8 Xe-cores)",
      ramType: "LPDDR5x-7467",
      ramSpeedMhz: 7467,
      maxRamGb: 32,
      storageType: "PCIe Gen4 NVMe M.2 SSD",
      displaySizeInches: "14.00",
      displayResolution: "2880 x 1800 (2.8K)",
      displayPanelType: "OLED Touch 120Hz IMAX Enhanced",
      displayRefreshRateHz: 120,
      displayBrightnessNits: 500,
      displayColorGamut: "100% DCI-P3",
      batteryCapacityWh: "68.00",
      weightKg: "1.440",
      widthMm: "313.70",
      depthMm: "220.40",
      heightMm: "16.90",
      webcamResolution: "9MP IR Camera with privacy shutter",
      wifiVersion: "Intel Wi-Fi 7 BE200 (802.11be)",
      bluetoothVersion: "Bluetooth 5.4",
      keyboardType: "Full-size backlit Nightfall Black",
      keyboardBacklight: true,
      fingerprintSensor: true,
    },
  });

  await prisma.productPort.deleteMany({ where: { productVariantId: spectreVariant.id } });
  await prisma.productPort.createMany({
    data: [
      { productVariantId: spectreVariant.id, portType: "Thunderbolt 4 with USB Type-C 40Gbps (USB PD, DP 2.1)", quantity: 2, supportsCharging: true, supportsDisplay: true },
      { productVariantId: spectreVariant.id, portType: "USB Type-A 10Gbps (HP Sleep and Charge)", quantity: 1, supportsCharging: false, supportsDisplay: false },
      { productVariantId: spectreVariant.id, portType: "3.5mm Headphone / Microphone combo", quantity: 1, supportsCharging: false, supportsDisplay: false },
    ],
  });

  // PRODUCT 6: Acer Swift Go 14 (2024)
  const acerSwiftGo = await prisma.product.upsert({
    where: { slug: "acer-swift-go-14-oled-2024" },
    update: {
      brandId: acerBrand.id,
      categoryId: catUltrabooks.id,
      name: "Acer Swift Go 14 (2024) OLED",
      modelNumber: "SFG14-73",
      manufacturerPartNumber: "NX.KSGSI.002",
      shortDescription: "14″ 2.8K 90Hz 100% DCI-P3 CineCrystal OLED display, Intel Core Ultra 5 125H, 1440p QHD webcam, dual fan TwinAir cooling, featherlight 1.32 kg.",
      description: `The Acer Swift Go 14 is the ultimate lightweight productivity companion for university students and developers. Combining an immaculate 2.8K OLED panel with Intel Core Ultra 5 efficiency.

Key Highlights:
• 2.8K 90Hz CineCrystal OLED: 2880 x 1800 resolution with 100% DCI-P3 color gamut, 500 nits peak HDR brightness, and 0.2ms response time.
• TwinAir Dual-Fan Cooling: Dual copper heat pipes and multiple cooling modes keep the chassis cool and whisper-quiet under heavy compile workloads.
• 1440p QHD AI Webcam: Acer PurifiedView with background blur, automatic framing, and eye contact correction.
• High Connectivity: Dual Thunderbolt 4 ports, HDMI 2.1, microSD card reader, and dual USB-A 3.2 Gen 1 ports.`,
      productType: "LAPTOP",
      status: "PUBLISHED",
      createdByUserId: adminId,
    },
    create: {
      brandId: acerBrand.id,
      categoryId: catUltrabooks.id,
      name: "Acer Swift Go 14 (2024) OLED",
      slug: "acer-swift-go-14-oled-2024",
      modelNumber: "SFG14-73",
      manufacturerPartNumber: "NX.KSGSI.002",
      shortDescription: "14″ 2.8K 90Hz 100% DCI-P3 CineCrystal OLED display, Intel Core Ultra 5 125H, 1440p QHD webcam, dual fan TwinAir cooling, featherlight 1.32 kg.",
      description: `The Acer Swift Go 14 is the ultimate lightweight productivity companion for university students and developers. Combining an immaculate 2.8K OLED panel with Intel Core Ultra 5 efficiency.

Key Highlights:
• 2.8K 90Hz CineCrystal OLED: 2880 x 1800 resolution with 100% DCI-P3 color gamut, 500 nits peak HDR brightness, and 0.2ms response time.
• TwinAir Dual-Fan Cooling: Dual copper heat pipes and multiple cooling modes keep the chassis cool and whisper-quiet under heavy compile workloads.
• 1440p QHD AI Webcam: Acer PurifiedView with background blur, automatic framing, and eye contact correction.
• High Connectivity: Dual Thunderbolt 4 ports, HDMI 2.1, microSD card reader, and dual USB-A 3.2 Gen 1 ports.`,
      productType: "LAPTOP",
      status: "PUBLISHED",
      createdByUserId: adminId,
    },
  });

  await prisma.collectionProduct.upsert({
    where: { collectionId_productId: { collectionId: studentBudgetCollection.id, productId: acerSwiftGo.id } },
    update: {},
    create: { collectionId: studentBudgetCollection.id, productId: acerSwiftGo.id, displayOrder: 1 },
  });

  const swiftGoVariant = await prisma.productVariant.upsert({
    where: { sku: "SWIFT-GO-14-U5-16-512-SV" },
    update: {
      productId: acerSwiftGo.id,
      variantName: "Intel Core Ultra 5 125H (16GB LPDDR5x, 512GB NVMe, Pure Silver)",
      color: "Pure Silver",
      ramGb: 16,
      storageGb: 512,
      operatingSystem: "Windows 11 Home",
      basePrice: "79999.00",
      sellingPrice: "79999.00",
      compareAtPrice: "89999.00",
      warrantyMonths: 12,
      status: "ACTIVE",
    },
    create: {
      productId: acerSwiftGo.id,
      sku: "SWIFT-GO-14-U5-16-512-SV",
      variantName: "Intel Core Ultra 5 125H (16GB LPDDR5x, 512GB NVMe, Pure Silver)",
      color: "Pure Silver",
      ramGb: 16,
      storageGb: 512,
      operatingSystem: "Windows 11 Home",
      basePrice: "79999.00",
      sellingPrice: "79999.00",
      compareAtPrice: "89999.00",
      warrantyMonths: 12,
      status: "ACTIVE",
    },
  });

  await prisma.productSpecification.upsert({
    where: { productVariantId: swiftGoVariant.id },
    update: {
      cpuBrand: "Intel",
      cpuModel: "Intel Core Ultra 5 125H",
      cpuCores: 14,
      cpuThreads: 18,
      gpuBrand: "Intel",
      gpuModel: "Intel Arc Graphics (7 Xe-cores)",
      ramType: "LPDDR5x-6400",
      ramSpeedMhz: 6400,
      maxRamGb: 16,
      storageType: "PCIe Gen4 NVMe M.2 SSD",
      displaySizeInches: "14.00",
      displayResolution: "2880 x 1800 (2.8K)",
      displayPanelType: "CineCrystal OLED",
      displayRefreshRateHz: 90,
      displayBrightnessNits: 500,
      displayColorGamut: "100% DCI-P3",
      batteryCapacityWh: "65.00",
      weightKg: "1.320",
      widthMm: "312.90",
      depthMm: "217.90",
      heightMm: "14.90",
      webcamResolution: "1440p QHD with Temporal Noise Reduction",
      wifiVersion: "Intel Killer Wi-Fi 6E (802.11ax)",
      bluetoothVersion: "Bluetooth 5.3",
      keyboardType: "Backlit FineTip keyboard",
      keyboardBacklight: true,
      fingerprintSensor: true,
    },
    create: {
      productVariantId: swiftGoVariant.id,
      cpuBrand: "Intel",
      cpuModel: "Intel Core Ultra 5 125H",
      cpuCores: 14,
      cpuThreads: 18,
      gpuBrand: "Intel",
      gpuModel: "Intel Arc Graphics (7 Xe-cores)",
      ramType: "LPDDR5x-6400",
      ramSpeedMhz: 6400,
      maxRamGb: 16,
      storageType: "PCIe Gen4 NVMe M.2 SSD",
      displaySizeInches: "14.00",
      displayResolution: "2880 x 1800 (2.8K)",
      displayPanelType: "CineCrystal OLED",
      displayRefreshRateHz: 90,
      displayBrightnessNits: 500,
      displayColorGamut: "100% DCI-P3",
      batteryCapacityWh: "65.00",
      weightKg: "1.320",
      widthMm: "312.90",
      depthMm: "217.90",
      heightMm: "14.90",
      webcamResolution: "1440p QHD with Temporal Noise Reduction",
      wifiVersion: "Intel Killer Wi-Fi 6E (802.11ax)",
      bluetoothVersion: "Bluetooth 5.3",
      keyboardType: "Backlit FineTip keyboard",
      keyboardBacklight: true,
      fingerprintSensor: true,
    },
  });

  await prisma.productPort.deleteMany({ where: { productVariantId: swiftGoVariant.id } });
  await prisma.productPort.createMany({
    data: [
      { productVariantId: swiftGoVariant.id, portType: "Thunderbolt 4 USB Type-C (100W PD, DisplayPort)", quantity: 2, supportsCharging: true, supportsDisplay: true },
      { productVariantId: swiftGoVariant.id, portType: "USB 3.2 Gen 1 Type-A (power-off charging)", quantity: 1, supportsCharging: false, supportsDisplay: false },
      { productVariantId: swiftGoVariant.id, portType: "USB 3.2 Gen 1 Type-A", quantity: 1, supportsCharging: false, supportsDisplay: false },
      { productVariantId: swiftGoVariant.id, portType: "HDMI 2.1", quantity: 1, supportsCharging: false, supportsDisplay: true },
      { productVariantId: swiftGoVariant.id, portType: "MicroSD Card Reader", quantity: 1, supportsCharging: false, supportsDisplay: false },
      { productVariantId: swiftGoVariant.id, portType: "3.5mm Headphone / Speaker Jack", quantity: 1, supportsCharging: false, supportsDisplay: false },
    ],
  });

  console.log("Phase 2 Real Catalogue Expansion Completed Successfully!");
}

main()
  .catch((e) => {
    console.error("Error during Phase 2 real catalogue seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
