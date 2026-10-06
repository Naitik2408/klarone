import { Injectable } from "@nestjs/common";
import type { RequirementExtraction } from "./requirement-extraction.schema";

const ALGORITHM_VERSION = "V1";

type CandidateSpecification = {
  cpuBrand: string | null;
  cpuModel: string | null;
  cpuGeneration: string | null;
  cpuCores: number | null;
  cpuThreads: number | null;
  gpuBrand: string | null;
  gpuModel: string | null;
  gpuVramGb: number | null;
  maxRamGb: number | null;
  ramSlots: number | null;
  storageType: string | null;
  storageSlots: number | null;
  maxStorageGb: number | null;
  displaySizeInches: number | string | null;
  displayResolution: string | null;
  displayPanelType: string | null;
  displayRefreshRateHz: number | null;
  displayBrightnessNits: number | null;
  displayColorGamut: string | null;
  batteryCapacityWh: number | string | null;
  weightKg: number | string | null;
};

export type RecommendationCandidate = {
  id: bigint;
  ramGb: number | null;
  storageGb: number | null;
  operatingSystem: string | null;
  sellingPrice: number | string;
  warrantyMonths: number | null;
  product: {
    id: bigint;
    name: string;
    slug: string;
    shortDescription: string | null;
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
  specification: CandidateSpecification | null;
  features: Array<{
    id: bigint;
    featureType: string;
    featureName: string;
    description: string | null;
    score: number | string | null;
  }>;
};

export type RecommendationEngineResult = {
  productVariantId: bigint;
  rank: number;
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
};

@Injectable()
export class RecommendationEngineService {
  readonly algorithmVersion = ALGORITHM_VERSION;

  scoreCandidates(
    requirements: RequirementExtraction,
    candidates: RecommendationCandidate[],
  ): RecommendationEngineResult[] {
    const scored = candidates.map((candidate) =>
      this.scoreCandidate(requirements, candidate),
    );

    scored.sort((a, b) => {
      if (b.overallScore !== a.overallScore) {
        return b.overallScore - a.overallScore;
      }

      const priceA = this.toNumber(
        candidates.find(
          (candidate) => candidate.id === a.productVariantId,
        )?.sellingPrice,
      );

      const priceB = this.toNumber(
        candidates.find(
          (candidate) => candidate.id === b.productVariantId,
        )?.sellingPrice,
      );

      return priceA - priceB;
    });

    return scored.map((result, index) => ({
      ...result,
      rank: index + 1,
    }));
  }

  private scoreCandidate(
    requirements: RequirementExtraction,
    candidate: RecommendationCandidate,
  ): RecommendationEngineResult {
    const price = this.toNumber(candidate.sellingPrice);
    const spec = candidate.specification;

    const budgetScore =
      requirements.budgetMin !== null ||
      requirements.budgetMax !== null
        ? this.scoreBudget(
            price,
            requirements.budgetMin,
            requirements.budgetMax,
          )
        : null;

    const performanceRequested =
      requirements.performancePriority !== null ||
      requirements.codingRequirement !== null ||
      requirements.gamingRequirement !== null ||
      requirements.designRequirement !== null ||
      requirements.primaryUseCase === "DEVELOPMENT" ||
      requirements.primaryUseCase === "GAMING" ||
      requirements.primaryUseCase === "DESIGN";

    const performanceScore = performanceRequested
      ? this.scorePerformance(candidate)
      : null;

    const useCaseScore =
      requirements.primaryUseCase !== null
        ? this.scoreUseCase(requirements, candidate)
        : null;

    const portabilityScore =
      requirements.portabilityPreference !== null
        ? this.scorePortability(
            requirements.portabilityPreference,
            spec?.weightKg ?? null,
          )
        : null;

    const batteryScore =
      requirements.batteryPriority !== null
        ? this.scoreBattery(
            requirements.batteryPriority,
            spec?.batteryCapacityWh ?? null,
          )
        : null;

    const displayScore =
      requirements.displayPriority !== null
        ? this.scoreDisplay(
            requirements.displayPriority,
            spec,
          )
        : null;

    const upgradeabilityScore =
      requirements.minimumRamGb !== null ||
      requirements.minimumStorageGb !== null ||
      requirements.expectedOwnershipYears !== null
        ? this.scoreUpgradeability(candidate)
        : null;

    const ownershipScore =
      requirements.expectedOwnershipYears !== null
        ? this.scoreOwnership(candidate)
        : null;

    const weightedParts = [
      { value: budgetScore, weight: 25 },
      { value: performanceScore, weight: 20 },
      { value: useCaseScore, weight: 25 },
      { value: portabilityScore, weight: 10 },
      { value: batteryScore, weight: 10 },
      { value: displayScore, weight: 5 },
      { value: upgradeabilityScore, weight: 5 },
    ].filter(
      (
        item,
      ): item is { value: number; weight: number } =>
        item.value !== null,
    );

    const totalWeight = weightedParts.reduce(
      (sum, item) => sum + item.weight,
      0,
    );

    const overallScore =
      totalWeight > 0
        ? this.round(
            weightedParts.reduce(
              (sum, item) =>
                sum + item.value * item.weight,
              0,
            ) / totalWeight,
            3,
          )
        : 50;

    const matchReason = this.buildMatchReason(
      requirements,
      candidate,
      {
        budgetScore,
        performanceScore,
        useCaseScore,
        portabilityScore,
        batteryScore,
        displayScore,
        upgradeabilityScore,
        ownershipScore,
      },
    );

    const tradeoffs = this.buildTradeoffs(
      requirements,
      candidate,
      {
        budgetScore,
        performanceScore,
        useCaseScore,
        portabilityScore,
        batteryScore,
        displayScore,
        upgradeabilityScore,
        ownershipScore,
      },
    );

    return {
      productVariantId: candidate.id,
      rank: 0,
      overallScore,
      budgetScore,
      performanceScore,
      useCaseScore,
      portabilityScore,
      batteryScore,
      displayScore,
      upgradeabilityScore,
      ownershipScore,
      matchReason,
      tradeoffs,
      recommendationType:
        overallScore >= 85
          ? "STRONG_MATCH"
          : overallScore >= 70
            ? "GOOD_MATCH"
            : "ALTERNATIVE",
    };
  }

  private scoreBudget(
    price: number,
    minimum: number | null,
    maximum: number | null,
  ): number {
    if (maximum !== null && price > maximum) {
      const overBudgetRatio =
        (price - maximum) / Math.max(maximum, 1);

      if (overBudgetRatio >= 0.25) {
        return 0;
      }

      return this.clamp(
        100 - overBudgetRatio * 400,
        0,
        100,
      );
    }

    if (minimum !== null && price < minimum) {
      const underBudgetRatio =
        (minimum - price) / Math.max(minimum, 1);

      return this.clamp(
        100 - underBudgetRatio * 80,
        70,
        100,
      );
    }

    return 100;
  }

  private scorePerformance(
    candidate: RecommendationCandidate,
  ): number {
    const spec = candidate.specification;

    if (!spec) {
      return 0;
    }

    const cpuScore = this.scoreCpu(spec);
    const gpuScore = this.scoreGpu(spec);
    const ramScore = this.scoreRam(
      candidate.ramGb,
      16,
    );

    return this.round(
      cpuScore * 0.5 +
        gpuScore * 0.25 +
        ramScore * 0.25,
      3,
    );
  }

  private scoreUseCase(
    requirements: RequirementExtraction,
    candidate: RecommendationCandidate,
  ): number {
    switch (requirements.primaryUseCase) {
      case "DEVELOPMENT":
        return this.scoreDevelopment(candidate);

      case "GAMING":
        return this.scoreGaming(candidate);

      case "DESIGN":
        return this.scoreDesign(candidate);

      case "WORK":
      case "STUDY":
      case "EVERYDAY":
        return this.scoreGeneralUse(candidate);

      case "MIXED":
        return this.scoreMixedUse(candidate);

      default:
        return 50;
    }
  }

  private scoreDevelopment(
    candidate: RecommendationCandidate,
  ): number {
    const spec = candidate.specification;

    if (!spec) {
      return 0;
    }

    const cpu = this.scoreCpu(spec);
    const ram = this.scoreRam(
      candidate.ramGb,
      16,
    );

    const storage = this.scoreStorage(
      candidate.storageGb,
      512,
    );

    return this.round(
      cpu * 0.5 +
        ram * 0.3 +
        storage * 0.2,
      3,
    );
  }

  private scoreGaming(
    candidate: RecommendationCandidate,
  ): number {
    const spec = candidate.specification;

    if (!spec) {
      return 0;
    }

    const gpu = this.scoreGpu(spec);
    const cpu = this.scoreCpu(spec);
    const refresh =
      spec.displayRefreshRateHz === null
        ? 50
        : this.clamp(
            (spec.displayRefreshRateHz / 144) *
              100,
            0,
            100,
          );

    return this.round(
      gpu * 0.6 +
        cpu * 0.25 +
        refresh * 0.15,
      3,
    );
  }

  private scoreDesign(
    candidate: RecommendationCandidate,
  ): number {
    const spec = candidate.specification;

    if (!spec) {
      return 0;
    }

    const gpu = this.scoreGpu(spec);
    const cpu = this.scoreCpu(spec);
    const display = this.scoreDisplay(
      "HIGH",
      spec,
    );

    return this.round(
      gpu * 0.35 +
        cpu * 0.25 +
        display * 0.4,
      3,
    );
  }

  private scoreGeneralUse(
    candidate: RecommendationCandidate,
  ): number {
    const spec = candidate.specification;

    if (!spec) {
      return 0;
    }

    const cpu = this.scoreCpu(spec);
    const ram = this.scoreRam(
      candidate.ramGb,
      8,
    );
    const battery = this.scoreBattery(
      "MEDIUM",
      spec.batteryCapacityWh,
    );

    return this.round(
      cpu * 0.4 +
        ram * 0.3 +
        battery * 0.3,
      3,
    );
  }

  private scoreMixedUse(
    candidate: RecommendationCandidate,
  ): number {
    const development = this.scoreDevelopment(
      candidate,
    );

    const general = this.scoreGeneralUse(
      candidate,
    );

    return this.round(
      development * 0.6 + general * 0.4,
      3,
    );
  }

  private scoreCpu(
    spec: CandidateSpecification,
  ): number {
    if (
      spec.cpuCores === null &&
      spec.cpuThreads === null &&
      !spec.cpuModel
    ) {
      return 0;
    }

    const coresScore =
      spec.cpuCores === null
        ? 50
        : this.clamp(
            (spec.cpuCores / 12) * 100,
            0,
            100,
          );

    const threadsScore =
      spec.cpuThreads === null
        ? 50
        : this.clamp(
            (spec.cpuThreads / 20) * 100,
            0,
            100,
          );

    const modelScore =
      spec.cpuModel &&
      /(ultra 7|ultra 9|i9|i7|ryzen 7|ryzen 9|core 7)/i.test(
        spec.cpuModel,
      )
        ? 100
        : spec.cpuModel &&
            /(i5|ryzen 5|core 5|core ultra 5)/i.test(
              spec.cpuModel,
            )
          ? 75
          : 55;

    return this.round(
      coresScore * 0.4 +
        threadsScore * 0.35 +
        modelScore * 0.25,
      3,
    );
  }

  private scoreGpu(
    spec: CandidateSpecification,
  ): number {
    if (
      !spec.gpuModel &&
      !spec.gpuBrand &&
      spec.gpuVramGb === null
    ) {
      return 50;
    }

    const vramScore =
      spec.gpuVramGb === null
        ? 50
        : this.clamp(
            (spec.gpuVramGb / 12) * 100,
            0,
            100,
          );

    const modelScore =
      spec.gpuModel &&
      /(rtx 40|rtx 50|radeon rx 7|radeon rx 8)/i.test(
        spec.gpuModel,
      )
        ? 100
        : spec.gpuModel &&
            /(rtx|rx 6|arc)/i.test(spec.gpuModel)
          ? 80
          : spec.gpuModel
            ? 60
            : 50;

    return this.round(
      modelScore * 0.7 +
        vramScore * 0.3,
      3,
    );
  }

  private scoreRam(
    ramGb: number | null,
    minimum: number,
  ): number {
    if (ramGb === null) {
      return 0;
    }

    return this.clamp(
      (ramGb / minimum) * 100,
      0,
      100,
    );
  }

  private scoreStorage(
    storageGb: number | null,
    minimum: number,
  ): number {
    if (storageGb === null) {
      return 0;
    }

    return this.clamp(
      (storageGb / minimum) * 100,
      0,
      100,
    );
  }

  private scorePortability(
    preference: string,
    weight: number | string | null,
  ): number {
    if (weight === null) {
      return 0;
    }

    const kg = this.toNumber(weight);

    if (preference === "HIGH") {
      if (kg <= 1.3) {
        return 100;
      }

      if (kg >= 2.5) {
        return 40;
      }

      return this.round(
        100 -
          ((kg - 1.3) / (2.5 - 1.3)) * 60,
        3,
      );
    }

    if (preference === "MEDIUM") {
      if (kg <= 1.6) {
        return 100;
      }

      if (kg >= 2.5) {
        return 55;
      }

      return this.round(
        100 -
          ((kg - 1.6) / (2.5 - 1.6)) * 45,
        3,
      );
    }

    if (kg <= 2.0) {
      return 100;
    }

    if (kg >= 3.0) {
      return 70;
    }

    return this.round(
      100 -
        ((kg - 2.0) / (3.0 - 2.0)) * 30,
      3,
    );
  }

  private scoreBattery(
    priority: string,
    capacity: number | string | null,
  ): number {
    if (capacity === null) {
      return 0;
    }

    const wh = this.toNumber(capacity);

    if (priority === "HIGH") {
      return this.clamp(
        (wh / 70) * 100,
        0,
        100,
      );
    }

    if (priority === "MEDIUM") {
      return this.clamp(
        (wh / 60) * 100,
        0,
        100,
      );
    }

    return this.clamp(
      (wh / 50) * 100,
      0,
      100,
    );
  }

  private scoreDisplay(
    priority: string,
    spec: CandidateSpecification | null,
  ): number {
    if (!spec) {
      return 0;
    }

    const brightness =
      spec.displayBrightnessNits ?? 0;

    const refresh =
      spec.displayRefreshRateHz ?? 0;

    const resolutionScore =
      spec.displayResolution &&
      /(2k|2\.5k|3k|4k|qhd|wqhd|uhd)/i.test(
        spec.displayResolution,
      )
        ? 100
        : spec.displayResolution &&
            /fhd|1920x1080/i.test(
              spec.displayResolution,
            )
          ? 75
          : 50;

    const brightnessScore = this.clamp(
      (brightness / 500) * 100,
      0,
      100,
    );

    const refreshScore = this.clamp(
      (refresh / 144) * 100,
      0,
      100,
    );

    const base =
      resolutionScore * 0.45 +
      brightnessScore * 0.3 +
      refreshScore * 0.25;

    return priority === "HIGH"
      ? this.round(base, 3)
      : this.round(
          base * 0.8 + 20,
          3,
        );
  }

  private scoreUpgradeability(
    candidate: RecommendationCandidate,
  ): number {
    const spec = candidate.specification;

    if (!spec) {
      return 0;
    }

    const ramUpgrade =
      spec.maxRamGb !== null &&
      candidate.ramGb !== null &&
      spec.maxRamGb > candidate.ramGb
        ? 100
        : spec.maxRamGb !== null
          ? 70
          : 40;

    const storageUpgrade =
      spec.maxStorageGb !== null &&
      candidate.storageGb !== null &&
      spec.maxStorageGb > candidate.storageGb
        ? 100
        : spec.maxStorageGb !== null
          ? 70
          : 40;

    const slotsScore =
      ((spec.ramSlots ?? 1) >= 2 ? 100 : 60) * 0.5 +
      ((spec.storageSlots ?? 1) >= 2 ? 100 : 60) * 0.5;

    return this.round(
      ramUpgrade * 0.4 +
        storageUpgrade * 0.4 +
        slotsScore * 0.2,
      3,
    );
  }

  private scoreOwnership(
    candidate: RecommendationCandidate,
  ): number {
    const warranty =
      candidate.warrantyMonths ?? 0;

    const warrantyScore = this.clamp(
      (warranty / 36) * 100,
      0,
      100,
    );

    const upgradeability =
      this.scoreUpgradeability(candidate);

    return this.round(
      warrantyScore * 0.5 +
        upgradeability * 0.5,
      3,
    );
  }

  private buildMatchReason(
    requirements: RequirementExtraction,
    candidate: RecommendationCandidate,
    scores: {
      budgetScore: number | null;
      performanceScore: number | null;
      useCaseScore: number | null;
      portabilityScore: number | null;
      batteryScore: number | null;
      displayScore: number | null;
      upgradeabilityScore: number | null;
      ownershipScore: number | null;
    },
  ): string {
    const reasons: string[] = [];

    if (
      requirements.budgetMax !== null &&
      scores.budgetScore !== null &&
      scores.budgetScore >= 90
    ) {
      reasons.push(
        `is within your stated budget of ₹${requirements.budgetMax.toLocaleString("en-IN")}`,
      );
    }

    if (
      requirements.budgetMin !== null &&
      requirements.budgetMax === null &&
      scores.budgetScore !== null &&
      scores.budgetScore >= 90
    ) {
      reasons.push("fits your stated budget range");
    }

    if (
      requirements.minimumRamGb !== null &&
      candidate.ramGb !== null &&
      candidate.ramGb >= requirements.minimumRamGb
    ) {
      reasons.push(
        `has ${candidate.ramGb}GB RAM that meets your minimum`,
      );
    }

    if (
      requirements.minimumStorageGb !== null &&
      candidate.storageGb !== null &&
      candidate.storageGb >= requirements.minimumStorageGb
    ) {
      reasons.push(
        `has ${candidate.storageGb}GB storage that meets your minimum`,
      );
    }

    if (
      requirements.primaryUseCase !== null &&
      scores.useCaseScore !== null &&
      scores.useCaseScore >= 80
    ) {
      reasons.push(
        `has a strong fit for your ${requirements.primaryUseCase.toLowerCase()} use case`,
      );
    } else if (
      requirements.primaryUseCase !== null &&
      scores.useCaseScore !== null &&
      scores.useCaseScore >= 65
    ) {
      reasons.push(
        `has a reasonable fit for your ${requirements.primaryUseCase.toLowerCase()} use case`,
      );
    }

    if (
      scores.performanceScore !== null &&
      scores.performanceScore >= 80
    ) {
      if (
        requirements.codingRequirement !== null ||
        requirements.gamingRequirement !== null ||
        requirements.designRequirement !== null ||
        requirements.performancePriority !== null
      ) {
        reasons.push(
          "offers strong overall performance for your requirements",
        );
      }
    }

    if (
      requirements.batteryPriority !== null &&
      scores.batteryScore !== null &&
      scores.batteryScore >= 80
    ) {
      reasons.push(
        "offers battery capacity that strongly aligns with your priority",
      );
    } else if (
      requirements.batteryPriority !== null &&
      scores.batteryScore !== null &&
      scores.batteryScore >= 65
    ) {
      reasons.push(
        "offers battery capacity that reasonably aligns with your priority",
      );
    }

    if (
      requirements.portabilityPreference !== null &&
      scores.portabilityScore !== null &&
      scores.portabilityScore >= 80
    ) {
      reasons.push(
        "offers portability that strongly aligns with your preference",
      );
    }

    if (
      requirements.displayPriority !== null &&
      scores.displayScore !== null &&
      scores.displayScore >= 80
    ) {
      reasons.push(
        "offers display characteristics that strongly align with your priority",
      );
    }

    if (reasons.length === 0) {
      return "This option has a reasonable overall fit based on the requirements provided.";
    }

    return `${candidate.product.name} fits because it ${reasons.join(", ")}.`;
  }

  private buildTradeoffs(
    requirements: RequirementExtraction,
    candidate: RecommendationCandidate,
    scores: {
      budgetScore: number | null;
      performanceScore: number | null;
      useCaseScore: number | null;
      portabilityScore: number | null;
      batteryScore: number | null;
      displayScore: number | null;
      upgradeabilityScore: number | null;
      ownershipScore: number | null;
    },
  ): string | null {
    const tradeoffs: string[] = [];

    if (
      requirements.budgetMax !== null &&
      scores.budgetScore !== null &&
      scores.budgetScore < 75
    ) {
      tradeoffs.push(
        "price is above the stated budget",
      );
    }

    if (
      requirements.minimumRamGb !== null &&
      candidate.ramGb !== null &&
      candidate.ramGb < requirements.minimumRamGb
    ) {
      tradeoffs.push(
        "RAM does not meet the stated minimum",
      );
    }

    if (
      requirements.minimumStorageGb !== null &&
      candidate.storageGb !== null &&
      candidate.storageGb < requirements.minimumStorageGb
    ) {
      tradeoffs.push(
        "storage does not meet the stated minimum",
      );
    }

    if (
      requirements.primaryUseCase !== null &&
      scores.useCaseScore !== null &&
      scores.useCaseScore < 65
    ) {
      tradeoffs.push(
        `fit for your ${requirements.primaryUseCase.toLowerCase()} use case is weaker than requested`,
      );
    }

    if (
      (
        requirements.codingRequirement !== null ||
        requirements.gamingRequirement !== null ||
        requirements.designRequirement !== null ||
        requirements.performancePriority !== null
      ) &&
      scores.performanceScore !== null &&
      scores.performanceScore < 65
    ) {
      tradeoffs.push(
        "overall performance is weaker than your stated requirements",
      );
    }

    if (
      requirements.portabilityPreference !== null &&
      scores.portabilityScore !== null &&
      scores.portabilityScore < 65
    ) {
      tradeoffs.push(
        "portability is weaker than requested",
      );
    }

    if (
      requirements.batteryPriority !== null &&
      scores.batteryScore !== null &&
      scores.batteryScore < 65
    ) {
      tradeoffs.push(
        "battery capacity is weaker than requested",
      );
    }

    if (
      requirements.displayPriority !== null &&
      scores.displayScore !== null &&
      scores.displayScore < 65
    ) {
      tradeoffs.push(
        "display characteristics are weaker than requested",
      );
    }

    if (
      requirements.expectedOwnershipYears !== null &&
      scores.ownershipScore !== null &&
      scores.ownershipScore < 60
    ) {
      tradeoffs.push(
        "long-term ownership factors are less compelling",
      );
    }

    return tradeoffs.length > 0
      ? tradeoffs.join("; ")
      : null;
  }
private toNumber(
    value: number | string | null | undefined,
  ): number {
    if (value === null || value === undefined) {
      return 0;
    }

    const parsed =
      typeof value === "number"
        ? value
        : Number(value);

    return Number.isFinite(parsed) ? parsed : 0;
  }

  private clamp(
    value: number,
    minimum: number,
    maximum: number,
  ): number {
    return Math.min(
      Math.max(value, minimum),
      maximum,
    );
  }

  private round(
    value: number,
    decimals: number,
  ): number {
    const factor = 10 ** decimals;
    return Math.round(value * factor) / factor;
  }
}

