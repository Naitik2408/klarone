import {
  BadRequestException,
  Inject,
  Injectable,
} from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { toJsonSafe } from "../../common/serialization/json-safe";
import {
  RecommendationEngineService,
  type RecommendationCandidate,
} from "./recommendation-engine.service";
import { StartRecommendationDto } from "./dto/start-recommendation.dto";
import {
  REQUIREMENT_EXTRACTOR,
  type RequirementExtractor,
} from "./requirement-extractor";

const MAX_RESULTS = 5;

@Injectable()
export class RecommendationsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REQUIREMENT_EXTRACTOR)
    private readonly requirementExtractor: RequirementExtractor,
    private readonly recommendationEngine: RecommendationEngineService,
  ) { }

  async startRecommendation(input: StartRecommendationDto) {
    const message = input.message?.trim();

    if (!message) {
      throw new BadRequestException(
        "Please describe what you need from your laptop.",
      );
    }

    if (message.length > 5000) {
      throw new BadRequestException(
        "Your laptop requirement message is too long.",
      );
    }

    let session = input.sessionToken
      ? await this.prisma.recommendationSession.findUnique({
        where: {
          sessionToken: input.sessionToken,
        },
      })
      : null;

    if (!session || session.status !== "ACTIVE") {
      session = await this.prisma.recommendationSession.create({
        data: {
          sessionToken: crypto.randomUUID(),
          status: "ACTIVE",
        },
      });
    }

    const requirementProfile =
      await this.prisma.requirementProfile.create({
        data: {
          recommendationSessionId: session.id,
          rawUserInput: message,
          extractedByModel: "PENDING",
          extractionVersion: "V1",
        },
      });

    const extractedRequirements =
      await this.requirementExtractor.extract(message);

    await this.prisma.requirementProfile.update({
      where: {
        id: requirementProfile.id,
      },
      data: {
        budgetMin: extractedRequirements.budgetMin,
        budgetMax: extractedRequirements.budgetMax,
        primaryUseCase:
          extractedRequirements.primaryUseCase,
        portabilityPreference:
          extractedRequirements.portabilityPreference,
        gamingRequirement:
          extractedRequirements.gamingRequirement,
        codingRequirement:
          extractedRequirements.codingRequirement,
        designRequirement:
          extractedRequirements.designRequirement,
        officeRequirement:
          extractedRequirements.officeRequirement,
        batteryPriority:
          extractedRequirements.batteryPriority,
        displayPriority:
          extractedRequirements.displayPriority,
        performancePriority:
          extractedRequirements.performancePriority,
        preferredOs:
          extractedRequirements.preferredOs,
        minimumRamGb:
          extractedRequirements.minimumRamGb,
        minimumStorageGb:
          extractedRequirements.minimumStorageGb,
        preferredScreenSize:
          extractedRequirements.preferredScreenSize,
        weightPreference:
          extractedRequirements.weightPreference,
        expectedOwnershipYears:
          extractedRequirements.expectedOwnershipYears,
        purchaseIntent:
          extractedRequirements.purchaseIntent,
        extractedByModel:
          this.requirementExtractor.modelName,
        extractionVersion: "V1",
      },
    });

    const candidates =
      await this.findCandidateVariants();

    const eligibleCandidates =
      this.filterHardRequirements(
        extractedRequirements,
        candidates,
        message,
      );

    const engineCandidates =
      this.toEngineCandidates(eligibleCandidates);

    const startedAt = Date.now();

    const rankedResults =
      this.recommendationEngine.scoreCandidates(
        extractedRequirements,
        engineCandidates,
      );

    const executionTimeMs =
      Date.now() - startedAt;

    const topResults =
      rankedResults.slice(0, MAX_RESULTS);

    const recommendationRun =
      await this.prisma.recommendationRun.create({
        data: {
          recommendationSessionId: session.id,
          requirementProfileId:
            requirementProfile.id,
          algorithmVersion:
            this.recommendationEngine
              .algorithmVersion,
          candidateCount:
            eligibleCandidates.length,
          executionTimeMs,
        },
      });

    if (topResults.length > 0) {
      await this.prisma.recommendationResult.createMany({
        data: topResults.map((result) => ({
          recommendationRunId:
            recommendationRun.id,
          productVariantId:
            result.productVariantId,
          rank: result.rank,
          overallScore: result.overallScore,
          budgetScore: result.budgetScore,
          performanceScore:
            result.performanceScore,
          useCaseScore:
            result.useCaseScore,
          portabilityScore:
            result.portabilityScore,
          batteryScore:
            result.batteryScore,
          displayScore:
            result.displayScore,
          upgradeabilityScore:
            result.upgradeabilityScore,
          ownershipScore:
            result.ownershipScore,
          matchReason:
            result.matchReason,
          tradeoffs:
            result.tradeoffs,
          recommendationType:
            result.recommendationType,
        })),
      });
    }

    const candidateMap = new Map(
      eligibleCandidates.map((candidate) => [
        candidate.id.toString(),
        candidate,
      ]),
    );

    const results = topResults.map((result) => {
      const candidate = candidateMap.get(
        result.productVariantId.toString(),
      );

      const primaryImage = candidate?.product.media.find(
        (media) =>
          media.url &&
          media.mediaType.toLowerCase().includes("image"),
      );

      return {
        rank: result.rank,
        productVariantId:
          result.productVariantId,
        overallScore:
          result.overallScore,
        budgetScore:
          result.budgetScore,
        performanceScore:
          result.performanceScore,
        useCaseScore:
          result.useCaseScore,
        portabilityScore:
          result.portabilityScore,
        batteryScore:
          result.batteryScore,
        displayScore:
          result.displayScore,
        upgradeabilityScore:
          result.upgradeabilityScore,
        ownershipScore:
          result.ownershipScore,
        recommendationType:
          result.recommendationType,
        matchReason:
          result.matchReason,
        tradeoffs:
          result.tradeoffs,
        product: candidate
          ? {
            id: candidate.product.id,
            name: candidate.product.name,
            slug: candidate.product.slug,
            shortDescription:
              candidate.product.shortDescription,
            imageUrl: primaryImage?.url ?? null,
            imageAlt:
              primaryImage?.altText ??
              candidate.product.name,
            brand: candidate.product.brand,
            category:
              candidate.product.category,
          }
          : null,
        variant: candidate
          ? {
            id: candidate.id,
            sku: candidate.sku,
            variantName:
              candidate.variantName,
            ramGb: candidate.ramGb,
            storageGb:
              candidate.storageGb,
            operatingSystem:
              candidate.operatingSystem,
            sellingPrice:
              candidate.sellingPrice,
            currency:
              candidate.currency,
            warrantyMonths:
              candidate.warrantyMonths,
          }
          : null,
      };
    });

    return toJsonSafe({
      session: {
        id: session.id,
        sessionToken:
          session.sessionToken,
        status: session.status,
      },

      requirementProfile: {
        id: requirementProfile.id,
        rawUserInput: message,
        extractedByProvider:
          this.requirementExtractor
            .providerName,
        extractedByModel:
          this.requirementExtractor
            .modelName,
        extractionVersion: "V1",
      },

      extractedRequirements,

      recommendationRun: {
        id: recommendationRun.id,
        algorithmVersion:
          this.recommendationEngine
            .algorithmVersion,
        candidateCount:
          eligibleCandidates.length,
        executionTimeMs,
      },

      results,
    });
  }

  private filterHardRequirements(
    requirements: {
      budgetMax: number | null;
      minimumRamGb: number | null;
      minimumStorageGb: number | null;
      preferredOs:
      | "WINDOWS"
      | "MACOS"
      | "LINUX"
      | "CHROMEOS"
      | "ANY"
      | null;
    },
    candidates: Awaited<
      ReturnType<
        RecommendationsService["findCandidateVariants"]
      >
    >,
    rawMessage: string,
  ) {
    return candidates.filter((candidate) => {
      if (
        requirements.minimumRamGb !== null &&
        (candidate.ramGb === null ||
          candidate.ramGb <
          requirements.minimumRamGb)
      ) {
        return false;
      }

      if (
        requirements.minimumStorageGb !== null &&
        (candidate.storageGb === null ||
          candidate.storageGb <
          requirements.minimumStorageGb)
      ) {
        return false;
      }

      if (
        requirements.preferredOs !== null &&
        requirements.preferredOs !== "ANY"
      ) {
        const os =
          candidate.operatingSystem
            ?.toLowerCase() ?? "";

        const expectedOs =
          requirements.preferredOs === "WINDOWS"
            ? "windows"
            : requirements.preferredOs === "MACOS"
              ? "mac"
              : requirements.preferredOs ===
                "LINUX"
                ? "linux"
                : "chrome";

        if (!os.includes(expectedOs)) {
          return false;
        }
      }

      if (
        requirements.budgetMax !== null &&
        this.hasStrictBudgetConstraint(rawMessage)
      ) {
        const price = Number(candidate.sellingPrice);

        if (
          Number.isFinite(price) &&
          price > requirements.budgetMax
        ) {
          return false;
        }
      }

      return true;
    });
  }

  private hasStrictBudgetConstraint(
    rawMessage: string,
  ): boolean {
    const normalized = rawMessage
      .toLowerCase()
      .replace(/₹/g, " ")
      .replace(/,/g, " ");

    if (
      /\b(around|about|approximately|roughly|close to)\b/.test(
        normalized,
      )
    ) {
      return false;
    }

    return /\b(under|below|less than|up to|upto|maximum|max|no more than|within)\b/.test(
      normalized,
    );
  }

  private toEngineCandidates(
    candidates: Awaited<
      ReturnType<
        RecommendationsService["findCandidateVariants"]
      >
    >,
  ): RecommendationCandidate[] {
    return candidates.map((candidate) => ({
      id: candidate.id,
      ramGb: candidate.ramGb,
      storageGb: candidate.storageGb,
      operatingSystem:
        candidate.operatingSystem,
      sellingPrice:
        candidate.sellingPrice.toString(),
      warrantyMonths:
        candidate.warrantyMonths,

      product: {
        id: candidate.product.id,
        name: candidate.product.name,
        slug: candidate.product.slug,
        shortDescription:
          candidate.product.shortDescription,
        brand: candidate.product.brand,
        category:
          candidate.product.category,
      },

      specification:
        candidate.specification
          ? {
            cpuBrand:
              candidate.specification
                .cpuBrand,
            cpuModel:
              candidate.specification
                .cpuModel,
            cpuGeneration:
              candidate.specification
                .cpuGeneration,
            cpuCores:
              candidate.specification
                .cpuCores,
            cpuThreads:
              candidate.specification
                .cpuThreads,
            gpuBrand:
              candidate.specification
                .gpuBrand,
            gpuModel:
              candidate.specification
                .gpuModel,
            gpuVramGb:
              candidate.specification
                .gpuVramGb,
            maxRamGb:
              candidate.specification
                .maxRamGb,
            ramSlots:
              candidate.specification
                .ramSlots,
            storageType:
              candidate.specification
                .storageType,
            storageSlots:
              candidate.specification
                .storageSlots,
            maxStorageGb:
              candidate.specification
                .maxStorageGb,
            displaySizeInches:
              candidate.specification
                .displaySizeInches
                ?.toString() ??
              null,
            displayResolution:
              candidate.specification
                .displayResolution,
            displayPanelType:
              candidate.specification
                .displayPanelType,
            displayRefreshRateHz:
              candidate.specification
                .displayRefreshRateHz,
            displayBrightnessNits:
              candidate.specification
                .displayBrightnessNits,
            displayColorGamut:
              candidate.specification
                .displayColorGamut,
            batteryCapacityWh:
              candidate.specification
                .batteryCapacityWh
                ?.toString() ??
              null,
            weightKg:
              candidate.specification
                .weightKg
                ?.toString() ??
              null,
          }
          : null,

      features:
        candidate.features.map(
          (feature) => ({
            id: feature.id,
            featureType:
              feature.featureType,
            featureName:
              feature.featureName,
            description:
              feature.description,
            score:
              feature.score?.toString() ??
              null,
          }),
        ),
    }));
  }

  async findCandidateVariants() {
    return this.prisma.productVariant.findMany({
      where: {
        status: "ACTIVE",
        product: {
          status: "PUBLISHED",
          productType: "LAPTOP",
        },
        inventories: {
          some: {
            quantityAvailable: {
              gt: 0,
            },
          },
        },
      },
      orderBy: [
        {
          sellingPrice: "asc",
        },
        {
          id: "asc",
        },
      ],
      select: {
        id: true,
        productId: true,
        sku: true,
        variantName: true,
        color: true,
        ramGb: true,
        storageGb: true,
        operatingSystem: true,
        basePrice: true,
        sellingPrice: true,
        compareAtPrice: true,
        currency: true,
        warrantyMonths: true,

        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            modelNumber: true,
            shortDescription: true,

            brand: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },

            category: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },

            media: {
              orderBy: [
                { isPrimary: "desc" },
                { displayOrder: "asc" },
                { id: "asc" },
              ],
              select: {
                id: true,
                mediaType: true,
                url: true,
                altText: true,
                displayOrder: true,
                isPrimary: true,
              },
            },
          },
        },

        specification: true,

        features: {
          orderBy: {
            featureType: "asc",
          },
          select: {
            id: true,
            featureType: true,
            featureName: true,
            description: true,
            score: true,
          },
        },
      },
    });
  }
}