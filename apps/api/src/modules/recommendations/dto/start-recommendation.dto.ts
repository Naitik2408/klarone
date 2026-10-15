export interface ChatHistoryMessage {
  role: "user" | "model";
  text: string;
}

export interface StartRecommendationDto {
  message: string;
  sessionToken?: string;
  history?: ChatHistoryMessage[];
}
