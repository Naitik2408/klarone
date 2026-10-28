import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import OpenAI from "openai";
import { Agent, Runner, tool, OpenAIProvider } from "@openai/agents";
import { z } from "zod";
import type { ChatHistoryMessage } from "./dto/start-recommendation.dto";
import { buildSalesConsultantSystemInstruction } from "./sales-advisor-framework";
import type { CandidateLaptopSummary, CatalogSearchToolArgs } from "./gemini-advisor-explainer.service";

export interface ConversationTurnResult {
  replyText: string;
  shouldSearchCatalog: boolean;
  toolArgs?: CatalogSearchToolArgs;
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
        useResponses: false, // Groq uses standard Chat Completions
      });
      this.logger.log(
        `OpenAI Agents SDK initialized with Groq model: ${this.modelName}`,
      );
    } else {
      this.logger.warn(
        "GROQ_API_KEY is not set. OpenAI Agents SDK will not be able to process queries.",
      );
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
          "Namaste! Our AI advisor is temporarily offline. Please reach out to our team at admin@klarone.in.",
        shouldSearchCatalog: false,
      };
    }

    let toolExecuted = false;
    let capturedToolArgs: CatalogSearchToolArgs | undefined;

    // Define the catalog search tool using OpenAI Agents SDK
    const searchCatalogTool = tool({
      name: "search_laptop_catalog",
      description:
        "Search Klarone's verified laptop catalog in Kolkata when the user expresses specific laptop requirements (budget, RAM, gaming, coding, brand, etc.). DO NOT call this tool for casual greetings, simple chit-chat, or general clarification questions.",
      parameters: z.object({
        query: z
          .string()
          .optional()
          .describe("Keywords or primary need (e.g., 'coding', 'gaming', 'office')"),
        maxBudget: z
          .number()
          .optional()
          .describe("Maximum budget limit in Indian Rupees (INR)"),
        minRamGb: z
          .number()
          .optional()
          .describe("Minimum RAM in gigabytes (e.g. 16, 32)"),
        useCase: z
          .string()
          .optional()
          .describe("Primary category: 'office', 'coding', 'gaming', 'creative', 'student'"),
        brand: z
          .string()
          .optional()
          .describe("Brand preference if stated (e.g. 'Apple', 'Dell', 'Lenovo', 'HP', 'ASUS')"),
      }),
      execute: async (args) => {
        toolExecuted = true;
        capturedToolArgs = args;
        this.logger.log(`[OpenAI Agent Tool] search_laptop_catalog called with: ${JSON.stringify(args)}`);
        const laptops = await params.searchCatalogCallback(args);
        return JSON.stringify(laptops);
      },
    });

    const systemInstruction = buildSalesConsultantSystemInstruction();

    const laptopAdvisorAgent = new Agent({
      name: "KlaroneLaptopAdvisor",
      model: this.modelName,
      instructions: systemInstruction,
      tools: [searchCatalogTool],
    });

    const runner = new Runner({
      modelProvider: this.groqProvider,
    });

    try {
      // Build conversation inputs including past multi-turn history
      let promptInput = params.userMessage;
      if (params.history && params.history.length > 0) {
        const historyContext = params.history
          .map((h) => `${h.role === "user" ? "Customer" : "Klarone Advisor"}: ${h.text}`)
          .join("\n");
        promptInput = `Previous conversation history:\n${historyContext}\n\nCurrent Customer Message: ${params.userMessage}`;
      }

      const result = await runner.run(laptopAdvisorAgent, promptInput);
      const reply =
        result.finalOutput && typeof result.finalOutput === "string"
          ? result.finalOutput
          : "I'm reviewing our verified Kolkata inventory for you. Could you share your preferred budget or primary workload?";

      return {
        replyText: reply,
        shouldSearchCatalog: toolExecuted,
        toolArgs: capturedToolArgs,
      };
    } catch (err: any) {
      this.logger.error(`[OpenAI Agents SDK Error] Execution failed: ${err.message}`, err.stack);
      return {
        replyText:
          "I apologize, I encountered a temporary delay checking our live stock. What kind of work or budget do you have in mind so I can guide you?",
        shouldSearchCatalog: false,
      };
    }
  }
}
