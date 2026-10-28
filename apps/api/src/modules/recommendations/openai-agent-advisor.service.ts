import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import OpenAI from "openai";
import { OpenAIProvider } from "@openai/agents";
import type { ChatHistoryMessage } from "./dto/start-recommendation.dto";
import type { CandidateLaptopSummary, CatalogSearchToolArgs } from "./gemini-advisor-explainer.service";

export interface ConversationTurnResult {
  replyText: string;
  shouldSearchCatalog: boolean;
  toolArgs?: CatalogSearchToolArgs;
}

interface CouncilDiagnostic {
  turnPhase: "greeting" | "role_discovery" | "purpose_discovery" | "specific_depth_mcq" | "budget_inquiry" | "ready_to_recommend";
  detectedRole?: string;
  detectedPurpose?: string;
  detectedWorkloadDepth?: string;
  detectedBudget?: number;
  shouldSearchNow: boolean;
  searchFilterRecommendation?: {
    query?: string;
    maxBudget?: number;
    minRamGb?: number;
    useCase?: string;
    brand?: string;
  };
}

@Injectable()
export class OpenAIAgentAdvisorService {
  private readonly logger = new Logger(OpenAIAgentAdvisorService.name);
  private readonly groqClient: OpenAI | null = null;
  private readonly groqProvider: OpenAIProvider | null = null;
  readonly modelName: string;

  constructor(private readonly config: ConfigService) {
    const groqKey =
      this.config.get<string>("GROQ_API_KEY") || process.env.GROQ_API_KEY;
    this.modelName =
      this.config.get<string>("GROQ_MODEL") ||
      process.env.GROQ_MODEL ||
      "openai/gpt-oss-120b";

    if (groqKey) {
      this.groqClient = new OpenAI({
        apiKey: groqKey,
        baseURL: "https://api.groq.com/openai/v1",
      });

      this.groqProvider = new OpenAIProvider({
        openAIClient: this.groqClient,
        useResponses: false,
      });
      this.logger.log(
        `OpenAI Agents Council initialized with Groq model: ${this.modelName}`,
      );
    } else {
      this.logger.warn("GROQ_API_KEY is not set.");
    }
  }

  async converse(params: {
    userMessage: string;
    history?: ChatHistoryMessage[];
    searchCatalogCallback: (
      args: CatalogSearchToolArgs,
    ) => Promise<CandidateLaptopSummary[]>;
  }): Promise<ConversationTurnResult> {
    if (!this.groqProvider || !this.groqClient) {
      return {
        replyText:
          "Hello! Our AI advisor is momentarily connecting. Please feel free to tell me what you're looking for in a laptop.",
        shouldSearchCatalog: false,
      };
    }

    try {
      const historyList = params.history || [];
      const historyContext =
        historyList.length > 0
          ? historyList
              .map((h) => `${h.role === "user" ? "Customer" : "Klarone Advisor"}: ${h.text}`)
              .join("\n")
          : "First message in conversation.";

      // ========================================================
      // STAGE 1: Conversational Phase & Intent Diagnostic
      // ========================================================
      const diagnosticPrompt = `
You are the Conversation Flow Director for Klarone Laptop Advisor.
Evaluate the conversation and decide the EXACT single next conversational phase:

PROGRESSIVE CONVERSATION PHASES (STRICTLY ONE STEP AT A TIME):
1. "greeting": User said "Hi", "Hello", "Hey" or gave no info.
   -> Action: Warm short greeting + ask who they are (e.g. student, working professional, creator, or gamer).
2. "purpose_discovery": We know who they are, but not their laptop purpose.
   -> Action: Acknowledge role + ask what primary purpose they need it for (coding, gaming, daily work, content creation).
3. "specific_depth_mcq": We know their purpose (e.g. coding, video editing, travel), but not the specific workload intensity.
   -> Action: Generate a dynamic, friendly 3-4 option scenario MCQ (e.g. Light VS Code vs Heavy Android Studio/Docker; or 1080p reels vs 4K rendering).
4. "budget_inquiry": We know specific purpose & workload, but don't have an approximate budget.
   -> Action: Ask about their comfortable budget range in INR.
5. "ready_to_recommend": We know:
   (a) Specific workload intensity
   AND
   (b) Budget anchor
   (OR the user explicitly says "just show me laptops").
   -> Action: Set shouldSearchNow = true.

Conversation History:
${historyContext}

Latest Message from Customer:
"${params.userMessage}"

Respond ONLY with JSON:
{
  "turnPhase": "greeting" | "purpose_discovery" | "specific_depth_mcq" | "budget_inquiry" | "ready_to_recommend",
  "detectedRole": string or null,
  "detectedPurpose": string or null,
  "detectedWorkloadDepth": string or null,
  "detectedBudget": number or null,
  "shouldSearchNow": false | true,
  "searchFilterRecommendation": {
    "query": string,
    "maxBudget": number or null,
    "minRamGb": number or null,
    "useCase": "student | coding | gaming | office | creative | general"
  }
}
`.trim();

      const diagnosticCompletion = await this.groqClient.chat.completions.create({
        model: this.modelName,
        messages: [{ role: "user", content: diagnosticPrompt }],
        response_format: { type: "json_object" },
        temperature: 0.1,
      });

      let diag: CouncilDiagnostic;
      try {
        diag = JSON.parse(diagnosticCompletion.choices[0]?.message?.content || "{}");
      } catch {
        diag = { turnPhase: "greeting", shouldSearchNow: false };
      }

      this.logger.log(`[Conversation Step] Phase: ${diag.turnPhase} | SearchNow: ${diag.shouldSearchNow}`);

      // ========================================================
      // STAGE 2: Inventory Retrieval (Only if ready_to_recommend)
      // ========================================================
      let candidateLaptops: CandidateLaptopSummary[] = [];
      let toolExecuted = false;
      let capturedToolArgs: CatalogSearchToolArgs | undefined;

      if (diag.shouldSearchNow && diag.searchFilterRecommendation) {
        capturedToolArgs = {
          query: diag.searchFilterRecommendation.query || undefined,
          maxBudget: diag.searchFilterRecommendation.maxBudget || undefined,
          minRamGb: diag.searchFilterRecommendation.minRamGb || undefined,
          useCase: diag.searchFilterRecommendation.useCase || undefined,
        };
        candidateLaptops = await params.searchCatalogCallback(capturedToolArgs);
        toolExecuted = candidateLaptops.length > 0;
      }

      // ========================================================
      // STAGE 3: Conversational Advisor Persona (Human, Short & Step-by-Step)
      // ========================================================
      const systemInstruction = `
You are the friendly, expert Laptop Advisor at Klarone in Kolkata.

CONVERSATION RULES (STRICTLY ADHERE):
1. ONE STEP AT A TIME:
   - NEVER ask multiple unrelated questions at once.
   - NEVER dump large matrices or multi-page questionnaire walls.
   - Acknowledge what the user just said in 1 friendly sentence, then ask the ONE next logical question.

2. PHASES GUIDE:
   - If turnPhase is "greeting":
     Say hello warmly and briefly. Ask: "To get started, tell me a little about yourself—are you a student, a working professional, a creator, or looking for something for home/business?"
   - If turnPhase is "purpose_discovery":
     Acknowledge their role warmly. Ask what primary purpose they need the laptop for (e.g., coding, gaming, everyday office work, video editing, etc.).
   - If turnPhase is "specific_depth_mcq":
     Acknowledge their purpose and present a dynamic, easy-to-read multiple choice question (A, B, C, D) to gauge their exact intensity (e.g. for coding: A. Web/Python fundamentals in VS Code, B. Heavy Android Studio & Docker, C. AI/ML/Data Science, D. Not sure).
   - If turnPhase is "budget_inquiry":
     Acknowledge their workload and ask what comfortable budget range they have in mind in INR (e.g. under ₹60k, ₹60k-₹80k, ₹1L+).
   - If turnPhase is "ready_to_recommend":
     KEEP IT CONCISE AND PUNCHY:
     - DO NOT output large comparison tables.
     - Give a short 2-3 sentence summary of why these 2 models fit their exact workload.
     - Highlight:
       • 🏆 **Top Pick**: [Model Name] (₹[Price]) — [1 punchy sentence why it fits their workload + battery/weight].
       • 💡 **Alternative / Value**: [Model Name] (₹[Price]) — [1 punchy sentence explaining the trade-off].
     - Ask an inviting closing question (e.g. "Would you like me to walk you through either of these, or check details on storage and warranty?").

CURRENT DIAGNOSTIC STATE:
- Current Phase: ${diag.turnPhase}
- Verified Inventory: ${candidateLaptops.length > 0 ? JSON.stringify(candidateLaptops) : "None yet"}
`.trim();

      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        { role: "system", content: systemInstruction },
      ];

      if (params.history && params.history.length > 0) {
        for (const h of params.history.slice(-6)) {
          messages.push({
            role: h.role === "user" ? "user" : "assistant",
            content: h.text,
          });
        }
      }

      messages.push({
        role: "user",
        content: params.userMessage,
      });

      const completion = await this.groqClient.chat.completions.create({
        model: this.modelName,
        messages,
        temperature: 0.5,
      });

      const reply =
        completion.choices[0]?.message?.content ||
        "Hello! Welcome to Klarone. Could you tell me a little about yourself—are you a student, a working professional, or looking for something for home use?";

      return {
        replyText: reply,
        shouldSearchCatalog: toolExecuted,
        toolArgs: capturedToolArgs,
      };
    } catch (err: any) {
      this.logger.error(`[OpenAI Advisor Flow Error] ${err.message}`, err.stack);
      return {
        replyText:
          "Hello! Welcome to Klarone. Could you tell me a little about yourself—are you a student, working professional, or looking for something for home use?",
        shouldSearchCatalog: false,
      };
    }
  }
}
