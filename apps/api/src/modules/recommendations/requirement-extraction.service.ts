import {
  BadGatewayException,
  Injectable,
  Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { PrismaService } from "../../database/prisma.service";
import {
  requirementExtractionSchema,
  type RequirementExtraction,
} from "./requirement-extraction.schema";

@Injectable()
export class RequirementExtractionService {
  private readonly logger = new Logger(
    RequirementExtractionService.name,
  );

  private readonly openai: OpenAI;
  private readonly model: string;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const apiKey = this.config.get<string>("OPENAI_API_KEY");
    const model = this.config.get<string>("OPENAI_MODEL");

    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    if (!model) {
      throw new Error("OPENAI_MODEL is not configured");
    }

    this.openai = new OpenAI({
      apiKey,
    });

    this.model = model;
  }

  getModelName(): string {
    return this.model;
  }

  async extractRequirementProfile(
    requirementProfileId: bigint,
  ): Promise<RequirementExtraction> {
    const profile =
      await this.prisma.requirementProfile.findUnique({
        where: {
          id: requirementProfileId,
        },
        select: {
          id: true,
          rawUserInput: true,
        },
      });

    if (!profile) {
      throw new Error(
        `Requirement profile ${requirementProfileId.toString()} not found`,
      );
    }

    if (!profile.rawUserInput?.trim()) {
      throw new Error(
        `Requirement profile ${requirementProfileId.toString()} has no user input`,
      );
    }

    try {
      const response = await this.openai.responses.parse({
        model: this.model,
        input: [
          {
            role: "system",
            content: [
              "You extract laptop-buying requirements from customer language for Klarone.",
              "Return only requirements supported by the customer's message.",
              "Do not recommend products.",
              "Do not invent specifications, budgets, preferences, or intentions.",
              "Use null when a requirement is not stated or cannot be reasonably determined from the customer's words.",
              "You may normalize obvious language into the schema.",
              'Example: "software developer" can map to primaryUseCase=DEVELOPMENT and codingRequirement=HIGH.',
              'Example: "I carry it every day" can support portabilityPreference=HIGH.',
              'Example: "around 70000" should set budgetMax=70000 and leave budgetMin=null unless the customer gives a range.',
              "Keep the distinction between what the customer explicitly asks for and what is merely implied.",
              "Never choose a laptop or compare products.",
            ].join(" "),
          },
          {
            role: "user",
            content: profile.rawUserInput,
          },
        ],
        text: {
          format: zodTextFormat(
            requirementExtractionSchema,
            "klarone_requirement_extraction",
          ),
        },
      });

      this.logger.debug(
        `OpenAI extraction response: status=${response.status}, model=${this.model}`,
      );

      if (response.status !== "completed") {
        const details = JSON.stringify({
          status: response.status,
          error: response.error ?? null,
          incompleteDetails: response.incomplete_details ?? null,
        });

        this.logger.error(
          `OpenAI extraction did not complete: ${details}`,
        );

        throw new Error(
          `OpenAI response ended with status ${response.status}`,
        );
      }

      const extracted = response.output_parsed;

      if (!extracted) {
        this.logger.error(
          "OpenAI returned no parsed structured requirement output.",
        );

        throw new Error(
          "OpenAI returned no structured requirement output",
        );
      }

      await this.prisma.requirementProfile.update({
        where: {
          id: requirementProfileId,
        },
        data: {
          budgetMin: extracted.budgetMin,
          budgetMax: extracted.budgetMax,
          primaryUseCase: extracted.primaryUseCase,
          portabilityPreference:
            extracted.portabilityPreference,
          gamingRequirement: extracted.gamingRequirement,
          codingRequirement: extracted.codingRequirement,
          designRequirement: extracted.designRequirement,
          officeRequirement: extracted.officeRequirement,
          batteryPriority: extracted.batteryPriority,
          displayPriority: extracted.displayPriority,
          performancePriority: extracted.performancePriority,
          preferredOs: extracted.preferredOs,
          minimumRamGb: extracted.minimumRamGb,
          minimumStorageGb: extracted.minimumStorageGb,
          preferredScreenSize:
            extracted.preferredScreenSize,
          weightPreference: extracted.weightPreference,
          expectedOwnershipYears:
            extracted.expectedOwnershipYears,
          purchaseIntent: extracted.purchaseIntent,
          extractedByModel: this.model,
          extractionVersion: "V1",
        },
      });

      return extracted;
    } catch (error) {
      const errorDetails =
        error instanceof Error
          ? {
              name: error.name,
              message: error.message,
            }
          : {
              value: String(error),
            };

      this.logger.error(
        `Klarone requirement extraction failed: ${JSON.stringify(
          errorDetails,
        )}`,
      );

      if (error instanceof BadGatewayException) {
        throw error;
      }

      throw new BadGatewayException(
        "Klarone could not understand the laptop requirements right now.",
      );
    }
  }
}
