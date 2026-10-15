import { Module } from "@nestjs/common";
import { PrismaModule } from "../../database/prisma.module";
import { RecommendationsController } from "./recommendations.controller";
import { RecommendationsService } from "./recommendations.service";
import { GeminiRequirementExtractor } from "./gemini-requirement-extractor.service";
import { GeminiAdvisorExplainerService } from "./gemini-advisor-explainer.service";
import { RecommendationEngineService } from "./recommendation-engine.service";
import { REQUIREMENT_EXTRACTOR } from "./requirement-extractor";

@Module({
  imports: [PrismaModule],
  controllers: [RecommendationsController],
  providers: [
    RecommendationsService,
    GeminiRequirementExtractor,
    GeminiAdvisorExplainerService,
    RecommendationEngineService,
    {
      provide: REQUIREMENT_EXTRACTOR,
      useExisting: GeminiRequirementExtractor,
    },
  ],
  exports: [
    RecommendationsService,
    GeminiRequirementExtractor,
    GeminiAdvisorExplainerService,
    RecommendationEngineService,
    REQUIREMENT_EXTRACTOR,
  ],
})
export class RecommendationsModule {}
