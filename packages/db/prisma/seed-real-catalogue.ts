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
  console.log("Starting Phase 1 Real Catalogue Seed...");

  // 1. Ensure Super Admin user account for createdBy
  const adminAccount = await prisma.userAccount.findFirst({
    where: { status: "ACTIVE" },
  });

  const adminId = adminAccount?.id ?? null;
  console.log(`Using admin account ID: ${adminId ?? "none"}`);

  // 2. BRANDS
  console.log("Upserting Phase 1 Brands...");

  const appleBrand = await prisma.brand.upsert({
    where: { slug: "apple" },
    update: {
      name: "Apple",
      description: "Industry-leading Apple Silicon performance, unified architecture, Liquid Retina XDR displays, and class-leading battery life.",
      logoUrl: "/media/catalogue/brands/apple-logo.svg",
      websiteUrl: "https://www.apple.com/macbook-pro/",
      status: "ACTIVE",
    },
    create: {
      name: "Apple",
      slug: "apple",
      description: "Industry-leading Apple Silicon performance, unified architecture, Liquid Retina XDR displays, and class-leading battery life.",
      logoUrl: "/media/catalogue/brands/apple-logo.svg",
      websiteUrl: "https://www.apple.com/macbook-pro/",
      status: "ACTIVE",
    },
  });

  const dellBrand = await prisma.brand.upsert({
    where: { slug: "dell" },
    update: {
      name: "Dell",
      description: "Precision-crafted XPS ultrabooks, Inspiron everyday laptops, and Alienware high-performance gaming rigs with InfinityEdge displays.",
      logoUrl: "/media/catalogue/brands/dell-logo.svg",
      websiteUrl: "https://www.dell.com",
      status: "ACTIVE",
    },
    create: {
      name: "Dell",
      slug: "dell",
      description: "Precision-crafted XPS ultrabooks, Inspiron everyday laptops, and Alienware high-performance gaming rigs with InfinityEdge displays.",
      logoUrl: "/media/catalogue/brands/dell-logo.svg",
      websiteUrl: "https://www.dell.com",
      status: "ACTIVE",
    },
  });

  const lenovoBrand = await prisma.brand.upsert({
    where: { slug: "lenovo" },
    update: {
      name: "Lenovo",
      description: "Pioneering ThinkPad business engineering, Legion high-frame-rate gaming laptops, and ultra-flexible Yoga 2-in-1 convertibles.",
      logoUrl: "/media/catalogue/brands/lenovo-logo.svg",
      websiteUrl: "https://www.lenovo.com",
      status: "ACTIVE",
    },
    create: {
      name: "Lenovo",
      slug: "lenovo",
      description: "Pioneering ThinkPad business engineering, Legion high-frame-rate gaming laptops, and ultra-flexible Yoga 2-in-1 convertibles.",
      logoUrl: "/media/catalogue/brands/lenovo-logo.svg",
      websiteUrl: "https://www.lenovo.com",
      status: "ACTIVE",
    },
  });

  console.log(`Brands ready: Apple (${appleBrand.id}), Dell (${dellBrand.id}), Lenovo (${lenovoBrand.id})`);

  // 3. CATEGORIES
  console.log("Upserting Categories...");

  const rootLaptops = await prisma.category.upsert({
    where: { slug: "laptops" },
    update: {
      name: "Laptops",
      description: "High-performance portable personal computers and ultrabooks (HSN: 84713010 | GST: 18%)",
      displayOrder: 1,
      status: "ACTIVE",
    },
    create: {
      name: "Laptops",
      slug: "laptops",
      description: "High-performance portable personal computers and ultrabooks (HSN: 84713010 | GST: 18%)",
      displayOrder: 1,
      status: "ACTIVE",
    },
  });

  const catUltrabooks = await prisma.category.upsert({
    where: { slug: "ultrabooks" },
    update: {
      name: "Ultrabooks & Productivity",
      parentId: rootLaptops.id,
      description: "Featherlight everyday notebooks built for unmatched battery life, sleek portability, and quiet fanless efficiency.",
      imageUrl: "/media/catalogue/categories/ultrabooks.jpg",
      displayOrder: 1,
      status: "ACTIVE",
    },
    create: {
      name: "Ultrabooks & Productivity",
      slug: "ultrabooks",
      parentId: rootLaptops.id,
      description: "Featherlight everyday notebooks built for unmatched battery life, sleek portability, and quiet fanless efficiency.",
      imageUrl: "/media/catalogue/categories/ultrabooks.jpg",
      displayOrder: 1,
      status: "ACTIVE",
    },
  });

  const catGaming = await prisma.category.upsert({
    where: { slug: "gaming-laptops" },
    update: {
      name: "Gaming Laptops",
      parentId: rootLaptops.id,
      description: "High-TGP dedicated RTX graphics, high-refresh displays, and vapor chamber cooling for esports and AAA titles.",
      imageUrl: "/media/catalogue/categories/gaming-laptops.jpg",
      displayOrder: 2,
      status: "ACTIVE",
    },
    create: {
      name: "Gaming Laptops",
      slug: "gaming-laptops",
      parentId: rootLaptops.id,
      description: "High-TGP dedicated RTX graphics, high-refresh displays, and vapor chamber cooling for esports and AAA titles.",
      imageUrl: "/media/catalogue/categories/gaming-laptops.jpg",
      displayOrder: 2,
      status: "ACTIVE",
    },
  });

  const catWorkstations = await prisma.category.upsert({
    where: { slug: "creator-workstations" },
    update: {
      name: "Creator & Mobile Workstations",
      parentId: rootLaptops.id,
      description: "Color-accurate 4K/OLED panels, massive RAM headroom, and workstation-grade compute for 3D rendering and software compilation.",
      displayOrder: 3,
      status: "ACTIVE",
    },
    create: {
      name: "Creator & Mobile Workstations",
      slug: "creator-workstations",
      parentId: rootLaptops.id,
      description: "Color-accurate 4K/OLED panels, massive RAM headroom, and workstation-grade compute for 3D rendering and software compilation.",
      displayOrder: 3,
      status: "ACTIVE",
    },
  });

  console.log(`Categories ready: Root (${rootLaptops.id}), Ultrabooks (${catUltrabooks.id}), Gaming (${catGaming.id}), Workstations (${catWorkstations.id})`);

  // 4. COLLECTIONS
  console.log("Upserting Collections...");

  const bestsellersCollection = await prisma.collection.upsert({
    where: { slug: "bestsellers" },
    update: {
      title: "Bestsellers & Staff Picks",
      description: "The most trusted, reliable, and high-demand laptops in our catalogue.",
      status: "ACTIVE",
    },
    create: {
      title: "Bestsellers & Staff Picks",
      slug: "bestsellers",
      description: "The most trusted, reliable, and high-demand laptops in our catalogue.",
      status: "ACTIVE",
    },
  });

  const creatorPicksCollection = await prisma.collection.upsert({
    where: { slug: "pro-creators" },
    update: {
      title: "Engineered for Pro Creators",
      description: "Laptops calibrated for video editors, 3D artists, and machine learning engineers.",
      status: "ACTIVE",
    },
    create: {
      title: "Engineered for Pro Creators",
      slug: "pro-creators",
      description: "Laptops calibrated for video editors, 3D artists, and machine learning engineers.",
      status: "ACTIVE",
    },
  });

  console.log("Collections ready.");

  // 5. PRODUCTS & RICH SPEC VARIANTS
  console.log("Seeding Flagship Products...");

  // PRODUCT 1: Apple MacBook Pro 14 M3
  const mbp14 = await prisma.product.upsert({
    where: { slug: "apple-macbook-pro-14-m3" },
    update: {
      brandId: appleBrand.id,
      categoryId: catUltrabooks.id,
      name: "Apple MacBook Pro 14″ (M3 / M3 Pro)",
      modelNumber: "A2992",
      manufacturerPartNumber: "MRX33HN/A",
      shortDescription: "14.2″ Liquid Retina XDR display, up to 18 hours battery life, hardware-accelerated ray tracing, and phenomenal unified memory efficiency.",
      description: `The 14-inch MacBook Pro blazes forward with M3, M3 Pro, and M3 Max, phenomenally advanced chips that bring massive performance leaps and remarkable capabilities for the most demanding pro workflows.

Key Highlights:
• Supercharged by Apple Silicon: Next-generation GPU architecture with Dynamic Caching and mesh shading.
• Liquid Retina XDR Display: Extreme Dynamic Range delivers 1,000 nits sustained full-screen brightness, 1,600 nits peak for HDR content, and up to 120Hz ProMotion refresh rates.
• Unified Memory Architecture: Low-latency, high-bandwidth unified memory allows CPU and GPU to share data without costly copies.
• Exceptional All-Day Endurance: Up to 18 hours of video playback and up to 12 hours of wireless web browsing.
• Advanced Audio & Camera: 1080p FaceTime HD camera, studio-quality three-mic array, and six-speaker sound system with Spatial Audio.`,
      productType: "LAPTOP",
      status: "PUBLISHED",
      createdByUserId: adminId,
    },
    create: {
      brandId: appleBrand.id,
      categoryId: catUltrabooks.id,
      name: "Apple MacBook Pro 14″ (M3 / M3 Pro)",
      slug: "apple-macbook-pro-14-m3",
      modelNumber: "A2992",
      manufacturerPartNumber: "MRX33HN/A",
      shortDescription: "14.2″ Liquid Retina XDR display, up to 18 hours battery life, hardware-accelerated ray tracing, and phenomenal unified memory efficiency.",
      description: `The 14-inch MacBook Pro blazes forward with M3, M3 Pro, and M3 Max, phenomenally advanced chips that bring massive performance leaps and remarkable capabilities for the most demanding pro workflows.

Key Highlights:
• Supercharged by Apple Silicon: Next-generation GPU architecture with Dynamic Caching and mesh shading.
• Liquid Retina XDR Display: Extreme Dynamic Range delivers 1,000 nits sustained full-screen brightness, 1,600 nits peak for HDR content, and up to 120Hz ProMotion refresh rates.
• Unified Memory Architecture: Low-latency, high-bandwidth unified memory allows CPU and GPU to share data without costly copies.
• Exceptional All-Day Endurance: Up to 18 hours of video playback and up to 12 hours of wireless web browsing.
• Advanced Audio & Camera: 1080p FaceTime HD camera, studio-quality three-mic array, and six-speaker sound system with Spatial Audio.`,
      productType: "LAPTOP",
      status: "PUBLISHED",
      createdByUserId: adminId,
    },
  });

  // Assign product to collections
  await prisma.collectionProduct.upsert({
    where: { collectionId_productId: { collectionId: bestsellersCollection.id, productId: mbp14.id } },
    update: {},
    create: { collectionId: bestsellersCollection.id, productId: mbp14.id, displayOrder: 1 },
  });

  await prisma.collectionProduct.upsert({
    where: { collectionId_productId: { collectionId: creatorPicksCollection.id, productId: mbp14.id } },
    update: {},
    create: { collectionId: creatorPicksCollection.id, productId: mbp14.id, displayOrder: 1 },
  });

  // Variants for MacBook Pro 14
  const mbpVariants = [
    {
      sku: "MBP14-M3-18-512-SB",
      variantName: "M3 Pro (18GB Unified RAM, 512GB SSD, Space Black)",
      color: "Space Black",
      ramGb: 18,
      storageGb: 512,
      operatingSystem: "macOS Sonoma",
      basePrice: "189900.00",
      sellingPrice: "189900.00",
      compareAtPrice: "199900.00",
      warrantyMonths: 12,
      spec: {
        cpuBrand: "Apple",
        cpuModel: "Apple M3 Pro",
        cpuCores: 11,
        cpuThreads: 11,
        gpuBrand: "Apple",
        gpuModel: "14-Core Apple Silicon GPU",
        ramType: "Unified Memory",
        ramSpeedMhz: 6400,
        maxRamGb: 36,
        storageType: "NVMe SSD",
        displaySizeInches: "14.20",
        displayResolution: "3024 x 1964",
        displayPanelType: "Liquid Retina XDR Mini-LED",
        displayRefreshRateHz: 120,
        displayBrightnessNits: 1600,
        displayColorGamut: "100% DCI-P3 Wide Color",
        batteryCapacityWh: "70.00",
        weightKg: "1.610",
        widthMm: "312.60",
        depthMm: "221.20",
        heightMm: "15.50",
        webcamResolution: "1080p FaceTime HD",
        wifiVersion: "Wi-Fi 6E (802.11ax)",
        bluetoothVersion: "Bluetooth 5.3",
        keyboardType: "Magic Keyboard with Touch ID",
        keyboardBacklight: true,
        fingerprintSensor: true,
      },
      ports: [
        { portType: "Thunderbolt 4 / USB-C", quantity: 3, version: "Thunderbolt 4", supportsCharging: true, supportsDisplay: true },
        { portType: "HDMI", quantity: 1, version: "2.1", supportsCharging: false, supportsDisplay: true },
        { portType: "SDXC Card Slot", quantity: 1, supportsCharging: false, supportsDisplay: false },
        { portType: "MagSafe 3 Charging", quantity: 1, supportsCharging: true, supportsDisplay: false },
        { portType: "3.5mm Headphone Jack with High-Impedance", quantity: 1, supportsCharging: false, supportsDisplay: false },
      ],
    },
    {
      sku: "MBP14-M3-36-1TB-SB",
      variantName: "M3 Pro (36GB Unified RAM, 1TB SSD, Space Black)",
      color: "Space Black",
      ramGb: 36,
      storageGb: 1000,
      operatingSystem: "macOS Sonoma",
      basePrice: "229900.00",
      sellingPrice: "229900.00",
      compareAtPrice: "239900.00",
      warrantyMonths: 12,
      spec: {
        cpuBrand: "Apple",
        cpuModel: "Apple M3 Pro",
        cpuCores: 12,
        cpuThreads: 12,
        gpuBrand: "Apple",
        gpuModel: "18-Core Apple Silicon GPU",
        ramType: "Unified Memory",
        ramSpeedMhz: 6400,
        maxRamGb: 36,
        storageType: "NVMe SSD",
        displaySizeInches: "14.20",
        displayResolution: "3024 x 1964",
        displayPanelType: "Liquid Retina XDR Mini-LED",
        displayRefreshRateHz: 120,
        displayBrightnessNits: 1600,
        displayColorGamut: "100% DCI-P3 Wide Color",
        batteryCapacityWh: "70.00",
        weightKg: "1.610",
        widthMm: "312.60",
        depthMm: "221.20",
        heightMm: "15.50",
        webcamResolution: "1080p FaceTime HD",
        wifiVersion: "Wi-Fi 6E (802.11ax)",
        bluetoothVersion: "Bluetooth 5.3",
        keyboardType: "Magic Keyboard with Touch ID",
        keyboardBacklight: true,
        fingerprintSensor: true,
      },
      ports: [
        { portType: "Thunderbolt 4 / USB-C", quantity: 3, version: "Thunderbolt 4", supportsCharging: true, supportsDisplay: true },
        { portType: "HDMI", quantity: 1, version: "2.1", supportsCharging: false, supportsDisplay: true },
        { portType: "SDXC Card Slot", quantity: 1, supportsCharging: false, supportsDisplay: false },
        { portType: "MagSafe 3 Charging", quantity: 1, supportsCharging: true, supportsDisplay: false },
        { portType: "3.5mm Headphone Jack with High-Impedance", quantity: 1, supportsCharging: false, supportsDisplay: false },
      ],
    },
    {
      sku: "MBP14-M3-18-512-SV",
      variantName: "M3 Pro (18GB Unified RAM, 512GB SSD, Silver)",
      color: "Silver",
      ramGb: 18,
      storageGb: 512,
      operatingSystem: "macOS Sonoma",
      basePrice: "189900.00",
      sellingPrice: "189900.00",
      compareAtPrice: "199900.00",
      warrantyMonths: 12,
      spec: {
        cpuBrand: "Apple",
        cpuModel: "Apple M3 Pro",
        cpuCores: 11,
        cpuThreads: 11,
        gpuBrand: "Apple",
        gpuModel: "14-Core Apple Silicon GPU",
        ramType: "Unified Memory",
        ramSpeedMhz: 6400,
        maxRamGb: 36,
        storageType: "NVMe SSD",
        displaySizeInches: "14.20",
        displayResolution: "3024 x 1964",
        displayPanelType: "Liquid Retina XDR Mini-LED",
        displayRefreshRateHz: 120,
        displayBrightnessNits: 1600,
        displayColorGamut: "100% DCI-P3 Wide Color",
        batteryCapacityWh: "70.00",
        weightKg: "1.610",
        widthMm: "312.60",
        depthMm: "221.20",
        heightMm: "15.50",
        webcamResolution: "1080p FaceTime HD",
        wifiVersion: "Wi-Fi 6E (802.11ax)",
        bluetoothVersion: "Bluetooth 5.3",
        keyboardType: "Magic Keyboard with Touch ID",
        keyboardBacklight: true,
        fingerprintSensor: true,
      },
      ports: [
        { portType: "Thunderbolt 4 / USB-C", quantity: 3, version: "Thunderbolt 4", supportsCharging: true, supportsDisplay: true },
        { portType: "HDMI", quantity: 1, version: "2.1", supportsCharging: false, supportsDisplay: true },
        { portType: "SDXC Card Slot", quantity: 1, supportsCharging: false, supportsDisplay: false },
        { portType: "MagSafe 3 Charging", quantity: 1, supportsCharging: true, supportsDisplay: false },
        { portType: "3.5mm Headphone Jack with High-Impedance", quantity: 1, supportsCharging: false, supportsDisplay: false },
      ],
    },
  ];

  for (const vData of mbpVariants) {
    const variant = await prisma.productVariant.upsert({
      where: { sku: vData.sku },
      update: {
        productId: mbp14.id,
        variantName: vData.variantName,
        color: vData.color,
        ramGb: vData.ramGb,
        storageGb: vData.storageGb,
        operatingSystem: vData.operatingSystem,
        basePrice: vData.basePrice,
        sellingPrice: vData.sellingPrice,
        compareAtPrice: vData.compareAtPrice,
        warrantyMonths: vData.warrantyMonths,
        status: "ACTIVE",
      },
      create: {
        productId: mbp14.id,
        sku: vData.sku,
        variantName: vData.variantName,
        color: vData.color,
        ramGb: vData.ramGb,
        storageGb: vData.storageGb,
        operatingSystem: vData.operatingSystem,
        basePrice: vData.basePrice,
        sellingPrice: vData.sellingPrice,
        compareAtPrice: vData.compareAtPrice,
        warrantyMonths: vData.warrantyMonths,
        status: "ACTIVE",
      },
    });

    // Upsert Specification
    await prisma.productSpecification.upsert({
      where: { productVariantId: variant.id },
      update: vData.spec,
      create: {
        productVariantId: variant.id,
        ...vData.spec,
      },
    });

    // Ports
    await prisma.productPort.deleteMany({ where: { productVariantId: variant.id } });
    for (const port of vData.ports) {
      await prisma.productPort.create({
        data: {
          productVariantId: variant.id,
          ...port,
        },
      });
    }

    // Features
    await prisma.productFeature.deleteMany({ where: { productVariantId: variant.id } });
    await prisma.productFeature.createMany({
      data: [
        { productVariantId: variant.id, featureType: "DISPLAY", featureName: "Liquid Retina XDR", description: "Extreme dynamic range with 1,000,000:1 contrast ratio" },
        { productVariantId: variant.id, featureType: "PERFORMANCE", featureName: "Dynamic Caching", description: "Hardware-allocated GPU memory in real time for massive efficiency" },
        { productVariantId: variant.id, featureType: "BATTERY", featureName: "18-Hour Endurance", description: "Industry-leading battery run time that maintains identical performance on or off battery" },
        { productVariantId: variant.id, featureType: "SECURITY", featureName: "Secure Enclave & Touch ID", description: "Instant, encrypted biometric authentication and Apple Pay support" },
      ],
    });
  }

  // PRODUCT 2: Dell XPS 14 (9440)
  const dellXps14 = await prisma.product.upsert({
    where: { slug: "dell-xps-14-9440" },
    update: {
      brandId: dellBrand.id,
      categoryId: catUltrabooks.id,
      name: "Dell XPS 14 (9440) Intel Core Ultra 7",
      modelNumber: "XPS-9440",
      manufacturerPartNumber: "XPS9440-7798SLV",
      shortDescription: "14.5″ 3.2K OLED InfinityEdge touch display, Intel Core Ultra 7 processor with dedicated NPU AI engine, and seamless capacitive glass touch function row.",
      description: `The new Dell XPS 14 brings revolutionary architectural design to Windows ultrabooks. Crafted from CNC machined aluminum and Gorilla Glass 3, it integrates an invisible seamless glass haptic touchpad and a capacitive function row.

Key Highlights:
• Next-Gen Intel Core Ultra: Equipped with Intel Core Ultra 7 155H and dedicated Intel AI Boost NPU for on-device generative AI acceleration.
• Stunning 3.2K OLED Touch Display: 3200 x 2000 resolution, 100% DCI-P3 color reproduction, VESA DisplayHDR 500, and 120Hz variable refresh rate.
• Zero-Lattice Keyboard: Large, comfortable keycaps with 1mm travel and ultra-responsive haptic feedback.
• Studio Sound: 8W quad-speaker design with Waves MaxxAudio 13.0 and Dolby Atmos.`,
      productType: "LAPTOP",
      status: "PUBLISHED",
      createdByUserId: adminId,
    },
    create: {
      brandId: dellBrand.id,
      categoryId: catUltrabooks.id,
      name: "Dell XPS 14 (9440) Intel Core Ultra 7",
      slug: "dell-xps-14-9440",
      modelNumber: "XPS-9440",
      manufacturerPartNumber: "XPS9440-7798SLV",
      shortDescription: "14.5″ 3.2K OLED InfinityEdge touch display, Intel Core Ultra 7 processor with dedicated NPU AI engine, and seamless capacitive glass touch function row.",
      description: `The new Dell XPS 14 brings revolutionary architectural design to Windows ultrabooks. Crafted from CNC machined aluminum and Gorilla Glass 3, it integrates an invisible seamless glass haptic touchpad and a capacitive function row.

Key Highlights:
• Next-Gen Intel Core Ultra: Equipped with Intel Core Ultra 7 155H and dedicated Intel AI Boost NPU for on-device generative AI acceleration.
• Stunning 3.2K OLED Touch Display: 3200 x 2000 resolution, 100% DCI-P3 color reproduction, VESA DisplayHDR 500, and 120Hz variable refresh rate.
• Zero-Lattice Keyboard: Large, comfortable keycaps with 1mm travel and ultra-responsive haptic feedback.
• Studio Sound: 8W quad-speaker design with Waves MaxxAudio 13.0 and Dolby Atmos.`,
      productType: "LAPTOP",
      status: "PUBLISHED",
      createdByUserId: adminId,
    },
  });

  const dellVariant = await prisma.productVariant.upsert({
    where: { sku: "XPS14-9440-U7-32-1TB-PT" },
    update: {
      productId: dellXps14.id,
      variantName: "Intel Core Ultra 7 155H (32GB LPDDR5x, 1TB NVMe, RTX 4050, Platinum Silver)",
      color: "Platinum Silver",
      ramGb: 32,
      storageGb: 1000,
      operatingSystem: "Windows 11 Home",
      basePrice: "214990.00",
      sellingPrice: "214990.00",
      compareAtPrice: "229990.00",
      warrantyMonths: 12,
      status: "ACTIVE",
    },
    create: {
      productId: dellXps14.id,
      sku: "XPS14-9440-U7-32-1TB-PT",
      variantName: "Intel Core Ultra 7 155H (32GB LPDDR5x, 1TB NVMe, RTX 4050, Platinum Silver)",
      color: "Platinum Silver",
      ramGb: 32,
      storageGb: 1000,
      operatingSystem: "Windows 11 Home",
      basePrice: "214990.00",
      sellingPrice: "214990.00",
      compareAtPrice: "229990.00",
      warrantyMonths: 12,
      status: "ACTIVE",
    },
  });

  await prisma.productSpecification.upsert({
    where: { productVariantId: dellVariant.id },
    update: {
      cpuBrand: "Intel",
      cpuModel: "Intel Core Ultra 7 155H",
      cpuCores: 16,
      cpuThreads: 22,
      gpuBrand: "NVIDIA",
      gpuModel: "NVIDIA GeForce RTX 4050 (30W)",
      gpuVramGb: 6,
      ramType: "LPDDR5x",
      ramSpeedMhz: 7467,
      maxRamGb: 32,
      storageType: "PCIe Gen4 NVMe M.2 SSD",
      displaySizeInches: "14.50",
      displayResolution: "3200 x 2000 (3.2K)",
      displayPanelType: "OLED InfinityEdge Touch",
      displayRefreshRateHz: 120,
      displayBrightnessNits: 500,
      displayColorGamut: "100% DCI-P3",
      batteryCapacityWh: "69.50",
      weightKg: "1.680",
      widthMm: "320.00",
      depthMm: "216.00",
      heightMm: "18.00",
      webcamResolution: "1080p FHD with Windows Hello IR",
      wifiVersion: "Intel Killer Wi-Fi 7 (802.11be)",
      bluetoothVersion: "Bluetooth 5.4",
      keyboardType: "Zero-lattice backlit with capacitive row",
      keyboardBacklight: true,
      fingerprintSensor: true,
    },
    create: {
      productVariantId: dellVariant.id,
      cpuBrand: "Intel",
      cpuModel: "Intel Core Ultra 7 155H",
      cpuCores: 16,
      cpuThreads: 22,
      gpuBrand: "NVIDIA",
      gpuModel: "NVIDIA GeForce RTX 4050 (30W)",
      gpuVramGb: 6,
      ramType: "LPDDR5x",
      ramSpeedMhz: 7467,
      maxRamGb: 32,
      storageType: "PCIe Gen4 NVMe M.2 SSD",
      displaySizeInches: "14.50",
      displayResolution: "3200 x 2000 (3.2K)",
      displayPanelType: "OLED InfinityEdge Touch",
      displayRefreshRateHz: 120,
      displayBrightnessNits: 500,
      displayColorGamut: "100% DCI-P3",
      batteryCapacityWh: "69.50",
      weightKg: "1.680",
      widthMm: "320.00",
      depthMm: "216.00",
      heightMm: "18.00",
      webcamResolution: "1080p FHD with Windows Hello IR",
      wifiVersion: "Intel Killer Wi-Fi 7 (802.11be)",
      bluetoothVersion: "Bluetooth 5.4",
      keyboardType: "Zero-lattice backlit with capacitive row",
      keyboardBacklight: true,
      fingerprintSensor: true,
    },
  });

  await prisma.productPort.deleteMany({ where: { productVariantId: dellVariant.id } });
  await prisma.productPort.createMany({
    data: [
      { productVariantId: dellVariant.id, portType: "Thunderbolt 4 / USB Type-C", quantity: 3, supportsCharging: true, supportsDisplay: true },
      { productVariantId: dellVariant.id, portType: "microSDXC v6.0 Card Reader", quantity: 1, supportsCharging: false, supportsDisplay: false },
      { productVariantId: dellVariant.id, portType: "3.5mm Headphone/Microphone Combo Jack", quantity: 1, supportsCharging: false, supportsDisplay: false },
    ],
  });

  // PRODUCT 3: Lenovo Legion Pro 5i (16″)
  const lenovoLegion5 = await prisma.product.upsert({
    where: { slug: "lenovo-legion-pro-5i-16" },
    update: {
      brandId: lenovoBrand.id,
      categoryId: catGaming.id,
      name: "Lenovo Legion Pro 5i Gen 9 (16″ Intel)",
      modelNumber: "16IRX9",
      manufacturerPartNumber: "83DF003PIN",
      shortDescription: "16″ WQXGA (2560x1600) 240Hz 500-nits display, Intel Core i7-14700HX, NVIDIA GeForce RTX 4070 (140W TGP), and Legion ColdFront 5.0 vapor chamber.",
      description: `Dominate modern competitive gaming with the Lenovo Legion Pro 5i Gen 9. Powered by the 14th Gen Intel Core i7-14700HX processor and NVIDIA GeForce RTX 4070 graphics with a maximum 140W graphics power.

Key Highlights:
• Desktop-Caliber 14th Gen Intel Core i7: 20 cores (8 performance cores, 12 efficiency cores) with turbo speeds reaching 5.5 GHz.
• 140W High-TGP NVIDIA GeForce RTX 4070: DLSS 3 frame generation, full hardware ray tracing, and Lenovo LA1 AI chip tuning power dynamically.
• PureSight Gaming Display: 16″ 16:10 WQXGA panel, 240Hz refresh rate, 3ms response time with OverDrive, 100% sRGB, VESA DisplayHDR 400.
• Legion TrueStrike Keyboard: 100% anti-ghosting, 1.5mm key travel, swappable keycaps, and 4-zone RGB backlighting.
• ColdFront 5.0 Cooling: Phase-change thermal compounds, 3D fan blades, and hybrid heat pipes for uninterrupted sustained clock speeds.`,
      productType: "LAPTOP",
      status: "PUBLISHED",
      createdByUserId: adminId,
    },
    create: {
      brandId: lenovoBrand.id,
      categoryId: catGaming.id,
      name: "Lenovo Legion Pro 5i Gen 9 (16″ Intel)",
      slug: "lenovo-legion-pro-5i-16",
      modelNumber: "16IRX9",
      manufacturerPartNumber: "83DF003PIN",
      shortDescription: "16″ WQXGA (2560x1600) 240Hz 500-nits display, Intel Core i7-14700HX, NVIDIA GeForce RTX 4070 (140W TGP), and Legion ColdFront 5.0 vapor chamber.",
      description: `Dominate modern competitive gaming with the Lenovo Legion Pro 5i Gen 9. Powered by the 14th Gen Intel Core i7-14700HX processor and NVIDIA GeForce RTX 4070 graphics with a maximum 140W graphics power.

Key Highlights:
• Desktop-Caliber 14th Gen Intel Core i7: 20 cores (8 performance cores, 12 efficiency cores) with turbo speeds reaching 5.5 GHz.
• 140W High-TGP NVIDIA GeForce RTX 4070: DLSS 3 frame generation, full hardware ray tracing, and Lenovo LA1 AI chip tuning power dynamically.
• PureSight Gaming Display: 16″ 16:10 WQXGA panel, 240Hz refresh rate, 3ms response time with OverDrive, 100% sRGB, VESA DisplayHDR 400.
• Legion TrueStrike Keyboard: 100% anti-ghosting, 1.5mm key travel, swappable keycaps, and 4-zone RGB backlighting.
• ColdFront 5.0 Cooling: Phase-change thermal compounds, 3D fan blades, and hybrid heat pipes for uninterrupted sustained clock speeds.`,
      productType: "LAPTOP",
      status: "PUBLISHED",
      createdByUserId: adminId,
    },
  });

  const legionVariant = await prisma.productVariant.upsert({
    where: { sku: "LEGION-PRO5I-14700-4070-16" },
    update: {
      productId: lenovoLegion5.id,
      variantName: "Core i7-14700HX (32GB DDR5, 1TB NVMe, RTX 4070 8GB, Onyx Grey)",
      color: "Onyx Grey",
      ramGb: 32,
      storageGb: 1000,
      operatingSystem: "Windows 11 Home",
      basePrice: "169990.00",
      sellingPrice: "169990.00",
      compareAtPrice: "189990.00",
      warrantyMonths: 24,
      status: "ACTIVE",
    },
    create: {
      productId: lenovoLegion5.id,
      sku: "LEGION-PRO5I-14700-4070-16",
      variantName: "Core i7-14700HX (32GB DDR5, 1TB NVMe, RTX 4070 8GB, Onyx Grey)",
      color: "Onyx Grey",
      ramGb: 32,
      storageGb: 1000,
      operatingSystem: "Windows 11 Home",
      basePrice: "169990.00",
      sellingPrice: "169990.00",
      compareAtPrice: "189990.00",
      warrantyMonths: 24,
      status: "ACTIVE",
    },
  });

  await prisma.productSpecification.upsert({
    where: { productVariantId: legionVariant.id },
    update: {
      cpuBrand: "Intel",
      cpuModel: "Intel Core i7-14700HX",
      cpuGeneration: "14th Gen",
      cpuCores: 20,
      cpuThreads: 28,
      gpuBrand: "NVIDIA",
      gpuModel: "NVIDIA GeForce RTX 4070 (140W TGP)",
      gpuVramGb: 8,
      ramType: "DDR5-5600 SODIMM",
      ramSpeedMhz: 5600,
      maxRamGb: 64,
      storageType: "PCIe 4.0 NVMe M.2 SSD",
      displaySizeInches: "16.00",
      displayResolution: "2560 x 1600 (WQXGA)",
      displayPanelType: "IPS PureSight Gaming",
      displayRefreshRateHz: 240,
      displayBrightnessNits: 500,
      displayColorGamut: "100% sRGB",
      batteryCapacityWh: "80.00",
      weightKg: "2.500",
      widthMm: "363.40",
      depthMm: "260.35",
      heightMm: "26.75",
      webcamResolution: "1080p FHD with E-shutter",
      wifiVersion: "Wi-Fi 6E (802.11ax)",
      bluetoothVersion: "Bluetooth 5.2",
      keyboardType: "Legion TrueStrike 4-Zone RGB",
      keyboardBacklight: true,
      fingerprintSensor: false,
    },
    create: {
      productVariantId: legionVariant.id,
      cpuBrand: "Intel",
      cpuModel: "Intel Core i7-14700HX",
      cpuGeneration: "14th Gen",
      cpuCores: 20,
      cpuThreads: 28,
      gpuBrand: "NVIDIA",
      gpuModel: "NVIDIA GeForce RTX 4070 (140W TGP)",
      gpuVramGb: 8,
      ramType: "DDR5-5600 SODIMM",
      ramSpeedMhz: 5600,
      maxRamGb: 64,
      storageType: "PCIe 4.0 NVMe M.2 SSD",
      displaySizeInches: "16.00",
      displayResolution: "2560 x 1600 (WQXGA)",
      displayPanelType: "IPS PureSight Gaming",
      displayRefreshRateHz: 240,
      displayBrightnessNits: 500,
      displayColorGamut: "100% sRGB",
      batteryCapacityWh: "80.00",
      weightKg: "2.500",
      widthMm: "363.40",
      depthMm: "260.35",
      heightMm: "26.75",
      webcamResolution: "1080p FHD with E-shutter",
      wifiVersion: "Wi-Fi 6E (802.11ax)",
      bluetoothVersion: "Bluetooth 5.2",
      keyboardType: "Legion TrueStrike 4-Zone RGB",
      keyboardBacklight: true,
      fingerprintSensor: false,
    },
  });

  await prisma.productPort.deleteMany({ where: { productVariantId: legionVariant.id } });
  await prisma.productPort.createMany({
    data: [
      { productVariantId: legionVariant.id, portType: "USB-C 3.2 Gen 2 (DisplayPort 1.4, 140W Power Delivery)", quantity: 1, supportsCharging: true, supportsDisplay: true },
      { productVariantId: legionVariant.id, portType: "USB-C 3.2 Gen 2 (DisplayPort 1.4)", quantity: 1, supportsCharging: false, supportsDisplay: true },
      { productVariantId: legionVariant.id, portType: "USB-A 3.2 Gen 1 (Always On)", quantity: 1, supportsCharging: false, supportsDisplay: false },
      { productVariantId: legionVariant.id, portType: "USB-A 3.2 Gen 1", quantity: 3, supportsCharging: false, supportsDisplay: false },
      { productVariantId: legionVariant.id, portType: "HDMI 2.1 (supports up to 8K/60Hz)", quantity: 1, supportsCharging: false, supportsDisplay: true },
      { productVariantId: legionVariant.id, portType: "RJ-45 Gigabit Ethernet", quantity: 1, supportsCharging: false, supportsDisplay: false },
      { productVariantId: legionVariant.id, portType: "3.5mm Headphone / mic combo", quantity: 1, supportsCharging: false, supportsDisplay: false },
    ],
  });

  console.log("Phase 1 Real Catalogue Seed Completed Successfully!");
}

main()
  .catch((e) => {
    console.error("Error during real catalogue seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
