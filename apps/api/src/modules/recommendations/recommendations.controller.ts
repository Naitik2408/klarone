import { Body, Controller, Post } from "@nestjs/common";
import { RecommendationsService } from "./recommendations.service";
import type { StartRecommendationDto } from "./dto/start-recommendation.dto";

@Controller("recommendations")
export class RecommendationsController {
  constructor(
    private readonly recommendationsService: RecommendationsService,
  ) {}

  @Post("start")
  async startRecommendation(
    @Body() input: StartRecommendationDto,
  ) {
    return this.recommendationsService.startRecommendation(input);
  }
}
