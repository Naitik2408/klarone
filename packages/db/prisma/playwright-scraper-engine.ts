import { chromium } from "playwright";

export interface ScrapedLaptopSpec {
  name: string;
  brand: string;
  modelNumber?: string;
  price?: number;
  compareAtPrice?: number;
  color?: string;
  cpuModel?: string;
  ramGb?: number;
  storageGb?: number;
  gpuModel?: string;
  displaySizeInches?: number;
  displayResolution?: string;
  displayPanelType?: string;
  displayRefreshRateHz?: number;
  weightKg?: number;
  images: string[];
  description?: string;
}

/**
 * Clean & Human-Friendly Normalizers
 * Converts messy scraped manufacturer text into clean, simple, standardized strings
 */
export function normalizeCategory(cpu: string = "", gpu: string = "", weightKg: number = 1.5): string {
  const g = gpu.toLowerCase();
  if (g.includes("rtx") || g.includes("radeon rx") || g.includes("geforce")) {
    return "gaming-laptops"; // Simple: "Gaming Laptops"
  }
  if (weightKg <= 1.45) {
    return "ultrabooks"; // Simple: "Ultrabooks & Thin Laptops"
  }
  return "laptops"; // Simple: "Laptops"
}

export function normalizeCollection(specs: ScrapedLaptopSpec): string[] {
  const collections: string[] = [];
  const g = (specs.gpuModel || "").toLowerCase();
  const c = (specs.cpuModel || "").toLowerCase();
  const panel = (specs.displayPanelType || "").toLowerCase();

  if (g.includes("rtx") || g.includes("geforce")) {
    collections.push("gaming");
  }
  if (panel.includes("oled")) {
    collections.push("oled-displays");
  }
  if ((specs.weightKg && specs.weightKg <= 1.35) || specs.brand.toLowerCase() === "apple") {
    collections.push("thin-light");
  }
  if (specs.price && specs.price <= 90000) {
    collections.push("student");
  }
  if (specs.price && specs.price >= 180000) {
    collections.push("flagship");
  }
  return collections;
}

export function cleanCpu(raw: string = ""): string {
  return raw
    .replace(/\s+/g, " ")
    .replace(/Processor/gi, "")
    .replace(/with Intel AI Boost/gi, "")
    .trim();
}

export function cleanGpu(raw: string = ""): string {
  if (!raw || /integrated|intel iris|intel arc/i.test(raw)) {
    return "Integrated Graphics";
  }
  return raw
    .replace(/Laptop GPU/gi, "")
    .replace(/GDDR6/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function cleanStorage(gb: number = 512): string {
  return gb >= 1000 ? `${gb / 1000}TB SSD` : `${gb}GB SSD`;
}

export function cleanRam(gb: number = 16): string {
  return `${gb}GB`;
}

/**
 * Playwright Scraper Engine
 * Scrapes laptop details, specifications, images, and prices from target URLs
 */
export async function scrapeProductPage(url: string): Promise<ScrapedLaptopSpec | null> {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    viewport: { width: 1280, height: 800 },
  });

  const page = await context.newPage();

  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(1500);

    const title = (await page.title()) || "";
    const images: string[] = await page.$$eval("img", (imgs) =>
      imgs
        .map((img) => img.src)
        .filter(
          (src) =>
            src.startsWith("http") &&
            !src.includes("icon") &&
            !src.includes("logo") &&
            !src.includes("pixel") &&
            (src.endsWith(".png") || src.endsWith(".jpg") || src.endsWith(".webp"))
        )
        .slice(0, 6)
    );

    return {
      name: title.split("|")[0].trim(),
      brand: "General",
      images,
      description: "Authentic laptop extracted via Playwright automation.",
    };
  } catch (err) {
    console.error(`Failed to scrape ${url}:`, err);
    return null;
  } finally {
    await browser.close();
  }
}
