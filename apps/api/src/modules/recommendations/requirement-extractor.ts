import type { RequirementExtraction } from "./requirement-extraction.schema";

export const REQUIREMENT_EXTRACTOR = Symbol(
  "REQUIREMENT_EXTRACTOR",
);

export interface RequirementExtractor {
  readonly providerName: string;
  readonly modelName: string;

  extract(
    userInput: string,
  ): Promise<RequirementExtraction>;
}
