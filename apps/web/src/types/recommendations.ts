export type RecommendationResult = {
  rank: number;
  productVariantId: string;
  overallScore: number;
  budgetScore: number | null;
  performanceScore: number | null;
  useCaseScore: number | null;
  portabilityScore: number | null;
  batteryScore: number | null;
  displayScore: number | null;
  upgradeabilityScore: number | null;
  ownershipScore: number | null;
  matchReason: string;
  tradeoffs: string | null;
  recommendationType: string;
  product: {
    id: string;
    name: string;
    slug: string;
    shortDescription: string | null;
    imageUrl: string | null;
    imageAlt: string | null;
    brand: {
      id: number;
      name: string;
      slug: string;
    };
    category: {
      id: number;
      name: string;
      slug: string;
    };
  };
  variant: {
    id: string;
    sku: string;
    variantName: string;
    ramGb: number | null;
    storageGb: number | null;
    operatingSystem: string | null;
    sellingPrice: string;
    currency: string;
    warrantyMonths: number | null;
  };
};

export type RecommendationRequirements = {
  budgetMin: number | null;
  budgetMax: number | null;
  primaryUseCase: string | null;
  portabilityPreference: string | null;
  gamingRequirement: string | null;
  codingRequirement: string | null;
  designRequirement: string | null;
  officeRequirement: string | null;
  batteryPriority: string | null;
  displayPriority: string | null;
  performancePriority: string | null;
  preferredOs: string | null;
  minimumRamGb: number | null;
  minimumStorageGb: number | null;
  preferredScreenSize: string | null;
  weightPreference: string | null;
  expectedOwnershipYears: number | null;
  purchaseIntent: string | null;
};

export type RecommendationStartResponse = {
  session: {
    id: string;
    sessionToken: string;
    status: string;
  };
  requirementProfile: {
    id: string;
    rawUserInput: string;
    extractedByProvider: string | null;
    extractedByModel: string | null;
    extractionVersion: string | null;
  };
  extractedRequirements: RecommendationRequirements;
  recommendationRun: {
    id: string;
    algorithmVersion: string;
    candidateCount: number | null;
    executionTimeMs: number | null;
  };
  results: RecommendationResult[];
  conversationalReply?: string;
};
