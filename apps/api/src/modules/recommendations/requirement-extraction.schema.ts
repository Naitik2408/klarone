import { z } from "zod/v4";

export const requirementExtractionSchema = z.object({
  budgetMin: z.number().nullable(),
  budgetMax: z.number().nullable(),

  primaryUseCase: z
    .enum([
      "WORK",
      "STUDY",
      "DEVELOPMENT",
      "DESIGN",
      "GAMING",
      "EVERYDAY",
      "MIXED",
    ])
    .nullable(),

  portabilityPreference: z
    .enum(["LOW", "MEDIUM", "HIGH"])
    .nullable(),

  gamingRequirement: z
    .enum(["NONE", "LIGHT", "MODERATE", "HIGH"])
    .nullable(),

  codingRequirement: z
    .enum(["NONE", "LIGHT", "MODERATE", "HIGH"])
    .nullable(),

  designRequirement: z
    .enum(["NONE", "LIGHT", "MODERATE", "HIGH"])
    .nullable(),

  officeRequirement: z
    .enum(["NONE", "LIGHT", "MODERATE", "HIGH"])
    .nullable(),

  batteryPriority: z
    .enum(["LOW", "MEDIUM", "HIGH"])
    .nullable(),

  displayPriority: z
    .enum(["LOW", "MEDIUM", "HIGH"])
    .nullable(),

  performancePriority: z
    .enum(["LOW", "MEDIUM", "HIGH"])
    .nullable(),

  preferredOs: z
    .enum(["WINDOWS", "MACOS", "LINUX", "CHROMEOS", "ANY"])
    .nullable(),

  minimumRamGb: z.number().int().nullable(),
  minimumStorageGb: z.number().int().nullable(),

  preferredScreenSize: z
    .enum([
      "COMPACT",
      "STANDARD",
      "LARGE",
      "ANY",
    ])
    .nullable(),

  weightPreference: z
    .enum(["LIGHT", "STANDARD", "HEAVY_OK", "ANY"])
    .nullable(),

  expectedOwnershipYears: z.number().int().nullable(),

  purchaseIntent: z
    .enum([
      "IMMEDIATE",
      "WITHIN_1_MONTH",
      "WITHIN_3_MONTHS",
      "RESEARCHING",
    ])
    .nullable(),
});

export type RequirementExtraction = z.infer<
  typeof requirementExtractionSchema
>;
