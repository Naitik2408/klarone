import { Module } from "@nestjs/common";
import { PrismaModule } from "../../database/prisma.module";
import { RecommendationsController } from "./recommendations.controller";
import { RecommendationsService } from "./recommendations.service";
import { GeminiRequirementExtractor } from "./gemini-requirement-extractor.service";
import { OpenAIAgentAdvisorService } from "./openai-agent-advisor.service";
import { RecommendationEngineService } from "./recommendation-engine.service";
import { REQUIREMENT_EXTRACTOR } from "./requirement-extractor";

@Module({
  imports: [PrismaModule],
  controllers: [RecommendationsController],
  providers: [
    RecommendationsService,
    GeminiRequirementExtractor,
    OpenAIAgentAdvisorService,
    RecommendationEngineService,
    {
      provide: REQUIREMENT_EXTRACTOR,
      useExisting: GeminiRequirementExtractor,
    },
  ],
  exports: [
    RecommendationsService,
    GeminiRequirementExtractor,
    OpenAIAgentAdvisorService,
    RecommendationEngineService,
    REQUIREMENT_EXTRACTOR,
  ],
})
export class RecommendationsModule {}
