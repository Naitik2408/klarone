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
import { GeminiAdvisorExplainerService } from "./gemini-advisor-explainer.service";

const MAX_RESULTS = 5;

@Injectable()
export class RecommendationsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REQUIREMENT_EXTRACTOR)
    private readonly requirementExtractor: RequirementExtractor,
    private readonly recommendationEngine: RecommendationEngineService,
    private readonly advisorExplainer: GeminiAdvisorExplainerService,
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

    const allCandidates = await this.findCandidateVariants();

    // Converse with Gemini using function-calling / tool-calling:
    // Only searches the database and produces laptop cards when user requirements are actually present!
    let matchingResults: any[] = [];
    let extractedRequirements: any = null;

    const conversationResult = await this.advisorExplainer.converse({
      userMessage: message,
      history: input.history,
      searchCatalogCallback: async (args) => {
        // Build query filters based on tool args
        let pool = allCandidates;

        if (args.brand) {
          const brandLower = args.brand.toLowerCase();
          const brandFiltered = pool.filter((c) =>
            c.product.brand.name.toLowerCase().includes(brandLower),
          );
          if (brandFiltered.length > 0) pool = brandFiltered;
        }

        if (args.minRamGb) {
          const ramFiltered = pool.filter((c) => (c.ramGb ?? 0) >= args.minRamGb!);
          if (ramFiltered.length > 0) pool = ramFiltered;
        }

        if (args.maxBudget) {
          // Allow pool up to 15% above maxBudget so the advisor can evaluate an honest stretch option
          const stretchBudget = args.maxBudget * 1.15;
          const budgetFiltered = pool.filter(
            (c) => Number(c.sellingPrice) <= stretchBudget,
          );
          if (budgetFiltered.length > 0) pool = budgetFiltered;
        }

        extractedRequirements = {
          budgetMax: args.maxBudget ?? null,
          minimumRamGb: args.minRamGb ?? null,
          primaryUseCase: args.useCase ? args.useCase.toUpperCase() : "GENERAL",
        };

        const engineCandidates = this.toEngineCandidates(pool);
        const rankedResults = this.recommendationEngine.scoreCandidates(
          extractedRequirements,
          engineCandidates,
        );

        const topRanked = rankedResults.slice(0, MAX_RESULTS);
        const candidateMap = new Map(
          pool.map((c) => [c.id.toString(), c]),
        );

        matchingResults = topRanked.map((result) => {
          const candidate = candidateMap.get(result.productVariantId.toString());
          const primaryImage = candidate?.product.media.find(
            (media) =>
              media.url && media.mediaType.toLowerCase().includes("image"),
          );

          return {
            rank: result.rank,
            productVariantId: result.productVariantId,
            overallScore: result.overallScore,
            budgetScore: result.budgetScore,
            performanceScore: result.performanceScore,
            useCaseScore: result.useCaseScore,
            portabilityScore: result.portabilityScore,
            batteryScore: result.batteryScore,
            displayScore: result.displayScore,
            upgradeabilityScore: result.upgradeabilityScore,
            ownershipScore: result.ownershipScore,
            recommendationType: result.recommendationType,
            matchReason: result.matchReason,
            tradeoffs: result.tradeoffs,
            product: candidate
              ? {
                id: candidate.product.id,
                name: candidate.product.name,
                slug: candidate.product.slug,
                shortDescription: candidate.product.shortDescription,
                imageUrl: primaryImage?.url ?? null,
                imageAlt: primaryImage?.altText ?? candidate.product.name,
                brand: candidate.product.brand,
                category: candidate.product.category,
              }
              : null,
            variant: candidate
              ? {
                id: candidate.id,
                sku: candidate.sku,
                variantName: candidate.variantName,
                ramGb: candidate.ramGb,
                storageGb: candidate.storageGb,
                operatingSystem: candidate.operatingSystem,
                sellingPrice: candidate.sellingPrice,
                currency: candidate.currency,
                warrantyMonths: candidate.warrantyMonths,
              }
              : null,
          };
        });

        return matchingResults.map((r) => {
          const cand = candidateMap.get(r.productVariantId.toString());
          return {
            name: r.product?.name ?? "Laptop",
            brand: r.product?.brand?.name ?? "Klarone",
            variantName: r.variant?.variantName ?? null,
            priceInr: Number(r.variant?.sellingPrice ?? 0),
            ramGb: r.variant?.ramGb ?? null,
            storageGb: r.variant?.storageGb ?? null,
            displaySize: cand?.specification?.displaySizeInches
              ? `${cand.specification.displaySizeInches}″`
              : null,
            weightKg: cand?.specification?.weightKg
              ? String(cand.specification.weightKg)
              : null,
            cpuModel: cand?.specification?.cpuModel ?? null,
            gpuModel: cand?.specification?.gpuModel ?? null,
            batteryWh: cand?.specification?.batteryCapacityWh
              ? String(cand.specification.batteryCapacityWh)
              : null,
            matchScorePercent: Math.round(r.overallScore * 100),
            rank: r.rank,
          };
        });
      },
    });

    return toJsonSafe({
      conversationalReply: conversationResult.replyText,
      results: conversationResult.shouldSearchCatalog ? matchingResults : [],
      extractedRequirements,
      session: {
        id: session.id,
        sessionToken: session.sessionToken,
        status: session.status,
      },
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