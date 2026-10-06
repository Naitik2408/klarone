import {
  BadGatewayException,
  Injectable,
  Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import {
  requirementExtractionSchema,
  type RequirementExtraction,
} from "./requirement-extraction.schema";
import type { RequirementExtractor } from "./requirement-extractor";

const requirementResponseSchema = {
  type: "object",
  properties: {
    budgetMin: {
      type: ["number", "null"],
      description:
        "Minimum budget in INR if explicitly provided.",
    },
    budgetMax: {
      type: ["number", "null"],
      description:
        "Maximum budget in INR. For 'around 70000', use 70000.",
    },
    primaryUseCase: {
      type: ["string", "null"],
      enum: [
        "WORK",
        "STUDY",
        "DEVELOPMENT",
        "DESIGN",
        "GAMING",
        "EVERYDAY",
        "MIXED",
      ],
    },
    portabilityPreference: {
      type: ["string", "null"],
      enum: ["LOW", "MEDIUM", "HIGH"],
    },
    gamingRequirement: {
      type: ["string", "null"],
      enum: ["NONE", "LIGHT", "MODERATE", "HIGH"],
    },
    codingRequirement: {
      type: ["string", "null"],
      enum: ["NONE", "LIGHT", "MODERATE", "HIGH"],
    },
    designRequirement: {
      type: ["string", "null"],
      enum: ["NONE", "LIGHT", "MODERATE", "HIGH"],
    },
    officeRequirement: {
      type: ["string", "null"],
      enum: ["NONE", "LIGHT", "MODERATE", "HIGH"],
    },
    batteryPriority: {
      type: ["string", "null"],
      enum: ["LOW", "MEDIUM", "HIGH"],
    },
    displayPriority: {
      type: ["string", "null"],
      enum: ["LOW", "MEDIUM", "HIGH"],
    },
    performancePriority: {
      type: ["string", "null"],
      enum: ["LOW", "MEDIUM", "HIGH"],
    },
    preferredOs: {
      type: ["string", "null"],
      enum: ["WINDOWS", "MACOS", "LINUX", "CHROMEOS", "ANY"],
    },
    minimumRamGb: {
      type: ["integer", "null"],
    },
    minimumStorageGb: {
      type: ["integer", "null"],
    },
    preferredScreenSize: {
      type: ["string", "null"],
      enum: ["COMPACT", "STANDARD", "LARGE", "ANY"],
    },
    weightPreference: {
      type: ["string", "null"],
      enum: ["LIGHT", "STANDARD", "HEAVY_OK", "ANY"],
    },
    expectedOwnershipYears: {
      type: ["integer", "null"],
    },
    purchaseIntent: {
      type: ["string", "null"],
      enum: [
        "IMMEDIATE",
        "WITHIN_1_MONTH",
        "WITHIN_3_MONTHS",
        "RESEARCHING",
      ],
    },
  },
  required: [
    "budgetMin",
    "budgetMax",
    "primaryUseCase",
    "portabilityPreference",
    "gamingRequirement",
    "codingRequirement",
    "designRequirement",
    "officeRequirement",
    "batteryPriority",
    "displayPriority",
    "performancePriority",
    "preferredOs",
    "minimumRamGb",
    "minimumStorageGb",
    "preferredScreenSize",
    "weightPreference",
    "expectedOwnershipYears",
    "purchaseIntent",
  ],
  additionalProperties: false,
};

const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 1_000;

@Injectable()
export class GeminiRequirementExtractor
  implements RequirementExtractor
{
  private readonly logger = new Logger(
    GeminiRequirementExtractor.name,
  );

  readonly providerName = "GEMINI";
  readonly modelName: string;

  private readonly client: GoogleGenAI;

  constructor(private readonly config: ConfigService) {
    const apiKey =
      this.config.get<string>("GEMINI_API_KEY");
    const model =
      this.config.get<string>("GEMINI_MODEL");

    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    if (!model) {
      throw new Error("GEMINI_MODEL is not configured");
    }

    this.client = new GoogleGenAI({
      apiKey,
    });

    this.modelName = model;
  }

  async extract(
    userInput: string,
  ): Promise<RequirementExtraction> {
    const startedAt = Date.now();
    const input = userInput.trim();

    if (!input) {
      throw new BadGatewayException(
        "Klarone received an empty laptop requirement.",
      );
    }

    try {
      this.logger.log(
        `Starting Gemini extraction with model ${this.modelName}`,
      );

      const response =
        await this.generateWithRetry(input);

      const responseReceivedAt = Date.now();

      this.logger.log(
        `Gemini response received in ${
          responseReceivedAt - startedAt
        }ms`,
      );

      const rawText = response.text?.trim();

      if (!rawText) {
        throw new Error(
          "Gemini returned an empty response.",
        );
      }

      const parsed = JSON.parse(rawText);

      const validated =
        requirementExtractionSchema.safeParse(parsed);

      if (!validated.success) {
        this.logger.error(
          `Gemini returned invalid requirement data: ${validated.error.message}`,
        );

        throw new Error(
          "Gemini returned data that failed Klarone validation.",
        );
      }

      this.logger.log(
        `Gemini extraction completed in ${
          Date.now() - startedAt
        }ms`,
      );

      return validated.data;
    } catch (error) {
      const details =
        error instanceof Error
          ? {
              name: error.name,
              message: error.message,
            }
          : {
              value: String(error),
            };

      this.logger.error(
        `Gemini requirement extraction failed after ${
          Date.now() - startedAt
        }ms: ${JSON.stringify(details)}`,
      );

      throw new BadGatewayException(
        "Klarone could not understand the laptop requirements right now. Please try again in a moment.",
      );
    }
  }

  private async generateWithRetry(input: string) {
    let lastError: unknown;

    for (
      let attempt = 0;
      attempt <= MAX_RETRIES;
      attempt += 1
    ) {
      const attemptStartedAt = Date.now();

      try {
        this.logger.log(
          `Gemini attempt ${attempt + 1}/${MAX_RETRIES + 1}`,
        );

        const response =
          await this.client.models.generateContent({
            model: this.modelName,
            contents: [
              "Extract laptop-buying requirements from the customer message.",
              "",
              "STRICT EXTRACTION RULES:",
              "1. Only extract information supported by the customer's message.",
              "2. Never invent a requirement.",
              "3. If a field is not mentioned, return null.",
              "4. Use NONE only when the customer explicitly says that a use case or requirement is not needed.",
              "5. Use ANY only when the customer explicitly says they have no preference.",
              "6. Do not recommend, rank, compare, or score products.",
              "7. Do not convert assumptions into facts.",
              "",
              'Example: "I am a software developer" ? primaryUseCase DEVELOPMENT and codingRequirement HIGH.',
              'Example: "I carry it every day" ? portabilityPreference HIGH.',
              'Example: "I want something light" ? weightPreference LIGHT.',
              'Example: "I do not game" ? gamingRequirement NONE.',
              'Example: "I am open to Windows or Linux" ? preferredOs ANY.',
              'Example: "around 70000" ? budgetMax 70000 and budgetMin null.',
              "",
              "Customer message:",
              input,
            ].join("\n"),
            config: {
              thinkingConfig: {
                thinkingLevel: ThinkingLevel.MINIMAL,
              },
              responseMimeType: "application/json",
              responseSchema: requirementResponseSchema,
            },
          });

        this.logger.log(
          `Gemini attempt ${attempt + 1} completed in ${
            Date.now() - attemptStartedAt
          }ms`,
        );

        return response;
      } catch (error) {
        lastError = error;

        const retryable =
          this.isRetryableError(error);

        const finalAttempt =
          attempt >= MAX_RETRIES;

        this.logger.warn(
          `Gemini attempt ${attempt + 1} failed after ${
            Date.now() - attemptStartedAt
          }ms. retryable=${retryable}`,
        );

        if (!retryable || finalAttempt) {
          throw error;
        }

        const baseDelay =
          INITIAL_RETRY_DELAY_MS *
          2 ** attempt;

        const jitterMs =
          Math.floor(Math.random() * 250);

        const delayMs =
          baseDelay + jitterMs;

        this.logger.warn(
          `Retrying Gemini in ${delayMs}ms`,
        );

        await this.sleep(delayMs);
      }
    }

    throw lastError;
  }

  private isRetryableError(
    error: unknown,
  ): boolean {
    if (!error) {
      return false;
    }

    const candidate =
      error as {
        status?: number | string;
        code?: number | string;
        message?: string;
      };

    const status = Number(
      candidate.status ?? candidate.code,
    );

    if (
      [408, 429, 500, 502, 503, 504].includes(
        status,
      )
    ) {
      return true;
    }

    const message =
      error instanceof Error
        ? error.message
        : String(error);

    return (
      /UNAVAILABLE/i.test(message) ||
      /RESOURCE_EXHAUSTED/i.test(message) ||
      /SERVICE_UNAVAILABLE/i.test(message) ||
      /\b503\b/.test(message) ||
      /\b429\b/.test(message)
    );
  }

  private sleep(
    milliseconds: number,
  ): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, milliseconds);
    });
  }
}

