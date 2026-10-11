export interface TaxonomySuggestion {
  categoryName: string;
  categorySlug: string;
  matchedKeyword: string;
  confidence: number;
}

interface TaxonomyRule {
  keywords: string[];
  categorySlug: string;
  categoryName: string;
}

// Flat, physical hardware & service rules only — no marketing tags
const FLAT_TAXONOMY_RULES: TaxonomyRule[] = [
  {
    keywords: [
      "laptop", "notebook", "macbook", "ultrabook", "thinkpad", "latitude",
      "elitebook", "vostro", "ideapad", "inspiron", "vivobook", "legion", "rog",
      "predator", "alienware", "tuf", "victus", "loq", "zenbook", "yoga"
    ],
    categorySlug: "laptops",
    categoryName: "Laptops",
  },
  {
    keywords: ["desktop", "all-in-one", "aio", "tower", "optiplex", "thinkcentre", "workstation pc"],
    categorySlug: "desktops",
    categoryName: "Desktops & All-in-Ones",
  },
  {
    keywords: ["monitor", "display panel", "curved monitor", "ips monitor", "oled screen"],
    categorySlug: "monitors",
    categoryName: "Monitors",
  },
  {
    keywords: ["ram", "ddr4", "ddr5", "sodimm", "memory module"],
    categorySlug: "memory-ram",
    categoryName: "Memory (RAM)",
  },
  {
    keywords: ["ssd", "nvme", "m.2", "solid state drive", "hard drive", "hdd", "pcie gen4"],
    categorySlug: "storage-ssds-hdds",
    categoryName: "Storage (SSDs & HDDs)",
  },
  {
    keywords: ["battery", "whr", "mah", "cell battery", "replacement battery"],
    categorySlug: "batteries",
    categoryName: "Batteries",
  },
  {
    keywords: ["charger", "adapter", "power supply", "65w type-c", "100w gan", "power cord"],
    categorySlug: "chargers-power-adapters",
    categoryName: "Chargers & Power Adapters",
  },
  {
    keywords: ["keyboard", "mouse", "trackpad", "touchpad", "mechanical keyboard", "wireless mouse"],
    categorySlug: "keyboards-mice",
    categoryName: "Keyboards & Mice",
  },
  {
    keywords: ["bag", "sleeve", "backpack", "laptop case", "messenger bag"],
    categorySlug: "bags-sleeves",
    categoryName: "Bags & Sleeves",
  },
  {
    keywords: ["dock", "docking station", "usb hub", "thunderbolt dock", "type-c hub"],
    categorySlug: "docks-hubs",
    categoryName: "Docks & Hubs",
  },
  {
    keywords: ["service", "repair", "diagnostic", "cleaning", "thermal paste", "replacement service"],
    categorySlug: "services-support",
    categoryName: "Services & Support",
  },
];

export function suggestCategoryFromText(text: string): TaxonomySuggestion | null {
  if (!text || text.trim().length < 2) return null;
  const normalized = text.toLowerCase();

  for (const rule of FLAT_TAXONOMY_RULES) {
    for (const kw of rule.keywords) {
      const regex = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
      if (regex.test(normalized)) {
        return {
          categoryName: rule.categoryName,
          categorySlug: rule.categorySlug,
          matchedKeyword: kw,
          confidence: 0.95,
        };
      }
    }
  }

  for (const rule of FLAT_TAXONOMY_RULES) {
    for (const kw of rule.keywords) {
      if (normalized.includes(kw)) {
        return {
          categoryName: rule.categoryName,
          categorySlug: rule.categorySlug,
          matchedKeyword: kw,
          confidence: 0.75,
        };
      }
    }
  }

  return null;
}
