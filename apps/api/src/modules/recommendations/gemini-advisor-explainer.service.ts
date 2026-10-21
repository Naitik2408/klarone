import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";
import type { ChatHistoryMessage } from "./dto/start-recommendation.dto";
import { buildSalesConsultantSystemInstruction } from "./sales-advisor-framework";

export interface CandidateLaptopSummary {
  name: string;
  brand: string;
  variantName: string | null;
  priceInr: number;
  ramGb: number | null;
  storageGb: number | null;
  displaySize: string | null;
  weightKg: string | null;
  cpuModel: string | null;
  gpuModel: string | null;
  batteryWh: string | null;
  matchScorePercent: number;
  rank: number;
}

export interface CatalogSearchToolArgs {
  query?: string;
  maxBudget?: number;
  minRamGb?: number;
  useCase?: string;
  brand?: string;
}

const searchCatalogToolDeclaration: FunctionDeclaration = {
  name: "search_laptop_catalog",
  description:
    "Search Klarone's verified laptop catalog in Kolkata when the user expresses specific laptop requirements (such as use case, work/study needs, budget, RAM, gaming, video editing, etc.). Call this tool ONLY when you need to retrieve matching laptops to recommend to the customer. DO NOT call this tool for casual greetings, simple chit-chat, or general clarification questions.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: {
        type: Type.STRING,
        description: "Keywords or primary need (e.g., 'office productivity', 'video editing', 'student coding', 'gaming').",
      },
      maxBudget: {
        type: Type.NUMBER,
        description: "Maximum budget limit in Indian Rupees (INR) if mentioned by the user.",
      },
      minRamGb: {
        type: Type.NUMBER,
        description: "Minimum RAM in gigabytes if specified (e.g. 16, 32).",
      },
      useCase: {
        type: Type.STRING,
        description: "Primary category: 'office', 'coding', 'gaming', 'creative', 'student', 'everyday'.",
      },
      brand: {
        type: Type.STRING,
        description: "Brand preference if stated (e.g. 'Apple', 'Dell', 'Lenovo', 'HP', 'ASUS').",
      },
    },
  },
};

@Injectable()
export class GeminiAdvisorExplainerService {
  private readonly logger = new Logger(GeminiAdvisorExplainerService.name);
  private readonly client: GoogleGenAI | null = null;
  readonly geminiModelName: string;
  readonly groqApiKey: string | null;
  readonly groqModelName: string;

  constructor(private readonly config: ConfigService) {
    const geminiKey =
      this.config.get<string>("GEMINI_API_KEY") || process.env.GEMINI_API_KEY;
    this.geminiModelName =
      this.config.get<string>("GEMINI_MODEL") ||
      process.env.GEMINI_MODEL ||
      "gemini-2.5-flash";

    if (geminiKey) {
      this.client = new GoogleGenAI({ apiKey: geminiKey });
    }

    this.groqApiKey =
      this.config.get<string>("GROQ_API_KEY") ||
      process.env.GROQ_API_KEY ||
      null;
    this.groqModelName =
      this.config.get<string>("GROQ_MODEL") ||
      process.env.GROQ_MODEL ||
      "openai/gpt-oss-120b";
  }

  /**
   * Conversational turn with Function Calling:
   * Uses Groq LPU as ultra-fast primary, or seamlessly falls back to Gemini.
   */
  async converse(params: {
    userMessage: string;
    history?: ChatHistoryMessage[];
    searchCatalogCallback: (args: CatalogSearchToolArgs) => Promise<CandidateLaptopSummary[]>;
  }): Promise<{
    replyText: string;
    shouldSearchCatalog: boolean;
    searchArgs?: CatalogSearchToolArgs;
    candidates?: CandidateLaptopSummary[];
  }> {
    const { userMessage, history = [], searchCatalogCallback } = params;

    const systemInstruction = buildSalesConsultantSystemInstruction({
      storeLocation: "Kolkata",
    });

    // Prefer Groq when configured for 0.6s latency and unlimited free testing
    if (this.groqApiKey) {
      try {
        return await this.converseWithGroq({
          userMessage,
          history,
          systemInstruction,
          searchCatalogCallback,
        });
      } catch (groqErr: any) {
        this.logger.error(`Groq conversation failed: ${groqErr?.message || groqErr}`, groqErr?.stack);
      }
    }

    // Fallback to Gemini if Groq is not configured or fails
    if (this.client) {
      try {
        return await this.converseWithGemini({
          userMessage,
          history,
          systemInstruction,
          searchCatalogCallback,
        });
      } catch (geminiErr) {
        this.logger.error("Gemini conversation failed:", geminiErr);
      }
    }

    return {
      replyText:
        "Hello! I am your Klarone laptop advisor. Could you tell me a little about your budget and what tasks you will be doing?",
      shouldSearchCatalog: false,
    };
  }

  private async converseWithGroq(params: {
    userMessage: string;
    history: ChatHistoryMessage[];
    systemInstruction: string;
    searchCatalogCallback: (args: CatalogSearchToolArgs) => Promise<CandidateLaptopSummary[]>;
  }) {
    const { userMessage, history, systemInstruction, searchCatalogCallback } = params;

    const messages: Array<{ role: "system" | "user" | "assistant" | "tool"; content: string; tool_call_id?: string; tool_calls?: any }> = [
      { role: "system", content: systemInstruction },
    ];

    for (const msg of history.slice(-6)) {
      messages.push({
        role: msg.role === "user" ? "user" : "assistant",
        content: msg.text,
      });
    }

    messages.push({
      role: "user",
      content: userMessage,
    });

    const tools = [
      {
        type: "function" as const,
        function: {
          name: "search_laptop_catalog",
          description:
            "Search Klarone's verified laptop catalog in Kolkata when the user expresses specific laptop requirements (such as use case, work/study needs, budget, RAM, gaming, video editing, etc.). Call this tool ONLY when you need to retrieve matching laptops to recommend to the customer. DO NOT call this tool for casual greetings, simple chit-chat, or general clarification questions.",
          parameters: {
            type: "object",
            properties: {
              query: { type: ["string", "null"], description: "Keywords or primary need" },
              maxBudget: { type: ["number", "null"], description: "Maximum budget limit in Indian Rupees (INR)" },
              minRamGb: { type: ["number", "null"], description: "Minimum RAM in gigabytes (e.g. 16, 32)" },
              useCase: { type: ["string", "null"], description: "Primary category: 'office', 'coding', 'gaming', 'creative', 'student', 'everyday'" },
              brand: { type: ["string", "null"], description: "Brand preference (e.g. 'Apple', 'Dell', 'Lenovo', 'HP', 'ASUS') or null if none" },
            },
          },
        },
      },
    ];

    // Step 1: Initial call to Groq
    const initialRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.groqApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.groqModelName,
        messages,
        tools,
        tool_choice: "auto",
        temperature: 0.6,
      }),
    });

    const initialData = await initialRes.json();
    if (initialData.error) {
      throw new Error(`Groq API error: ${initialData.error.message}`);
    }

    const choice = initialData.choices?.[0];
    const message = choice?.message;

    // Check if tool was called
    if (message?.tool_calls && message.tool_calls.length > 0) {
      const toolCall = message.tool_calls[0];
      let searchArgs: CatalogSearchToolArgs = {};

      try {
        searchArgs = JSON.parse(toolCall.function.arguments || "{}");
      } catch {
        searchArgs = {};
      }

      this.logger.log(`Groq triggered search_laptop_catalog with args: ${JSON.stringify(searchArgs)}`);

      // Search database
      const laptops = await searchCatalogCallback(searchArgs);

      const laptopsContext = laptops.length > 0
        ? laptops
            .map(
              (l) =>
                `#${l.rank} ${l.name} (${l.brand})\n` +
                `  - Variant: ${l.variantName ?? "Standard"}\n` +
                `  - Price: ₹${l.priceInr.toLocaleString("en-IN")}\n` +
                `  - Memory: ${l.ramGb ?? "N/A"}GB RAM, ${l.storageGb ?? "N/A"}GB Storage\n` +
                `  - Processor & Graphics: ${l.cpuModel ?? "N/A"} / ${l.gpuModel ?? "Integrated"}\n` +
                `  - Weight & Battery: ${l.weightKg ?? "N/A"}kg, ${l.batteryWh ?? "N/A"}Wh\n` +
                `  - Match Score: ${l.matchScorePercent}%`,
            )
            .join("\n\n")
        : "No laptops found matching strict parameters. Show closest practical alternatives.";

      const assistantToolMsg = {
        role: "assistant" as const,
        content: message.content || "",
        tool_calls: message.tool_calls,
      };

      const followUpMessages = [
        ...messages,
        assistantToolMsg,
        {
          role: "tool" as const,
          tool_call_id: toolCall.id,
          content: laptopsContext,
        },
      ];

      const followUpRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.groqApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: this.groqModelName,
          messages: followUpMessages,
          temperature: 0.6,
        }),
      });

      const followUpData = await followUpRes.json();
      if (followUpData.error) {
        throw new Error(`Groq follow-up error: ${followUpData.error.message}`);
      }
      const replyText =
        followUpData.choices?.[0]?.message?.content?.trim() ||
        "Here are the best laptops from our store that balance daily comfort, speed, and reliability for your needs:";

      return {
        replyText,
        shouldSearchCatalog: true,
        searchArgs,
        candidates: laptops,
      };
    }

    return {
      replyText:
        message?.content?.trim() ||
        "Hello! Welcome to Klarone. Tell me a bit about what you'll be using your laptop for, and I'll find your perfect match!",
      shouldSearchCatalog: false,
    };
  }

  private async converseWithGemini(params: {
    userMessage: string;
    history: ChatHistoryMessage[];
    systemInstruction: string;
    searchCatalogCallback: (args: CatalogSearchToolArgs) => Promise<CandidateLaptopSummary[]>;
  }) {
    const { userMessage, history, systemInstruction, searchCatalogCallback } = params;

    const contents: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }> = [];

    for (const msg of history.slice(-6)) {
      contents.push({
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: msg.text }],
      });
    }

    contents.push({
      role: "user",
      parts: [{ text: userMessage }],
    });

    const initialResponse = await this.client!.models.generateContent({
      model: this.geminiModelName,
      contents,
      config: {
        systemInstruction,
        tools: [{ functionDeclarations: [searchCatalogToolDeclaration] }],
      },
    });

    const candidate = initialResponse.candidates?.[0];
    const functionCalls = candidate?.content?.parts?.filter((p) => p.functionCall);

    if (functionCalls && functionCalls.length > 0) {
      const call = functionCalls[0].functionCall;
      const searchArgs = (call?.args ?? {}) as CatalogSearchToolArgs;

      this.logger.log(`Gemini triggered search_laptop_catalog with args: ${JSON.stringify(searchArgs)}`);

      const laptops = await searchCatalogCallback(searchArgs);

      const laptopsContext = laptops.length > 0
        ? laptops
            .map(
              (l) =>
                `#${l.rank} ${l.name} (${l.brand})\n` +
                `  - Variant: ${l.variantName ?? "Standard"}\n` +
                `  - Price: ₹${l.priceInr.toLocaleString("en-IN")}\n` +
                `  - Memory: ${l.ramGb ?? "N/A"}GB RAM, ${l.storageGb ?? "N/A"}GB Storage\n` +
                `  - Processor & Graphics: ${l.cpuModel ?? "N/A"} / ${l.gpuModel ?? "Integrated"}\n` +
                `  - Weight & Battery: ${l.weightKg ?? "N/A"}kg, ${l.batteryWh ?? "N/A"}Wh\n` +
                `  - Match Score: ${l.matchScorePercent}%`,
            )
            .join("\n\n")
        : "No laptops found matching strict parameters. Show closest practical alternatives.";

      const followUpContents = [
        ...contents,
        {
          role: "model" as const,
          parts: [{ functionCall: call }],
        },
        {
          role: "user" as const,
          parts: [
            {
              functionResponse: {
                name: "search_laptop_catalog",
                response: {
                  results: laptopsContext,
                },
              },
            },
          ],
        },
      ];

      const finalResponse = await this.client!.models.generateContent({
        model: this.geminiModelName,
        contents: followUpContents,
        config: {
          systemInstruction,
        },
      });

      const replyText =
        finalResponse.text?.trim() ||
        "Here are the best laptops from our store that balance daily comfort, speed, and reliability for your needs:";

      return {
        replyText,
        shouldSearchCatalog: true,
        searchArgs,
        candidates: laptops,
      };
    }

    return {
      replyText:
        initialResponse.text?.trim() ||
        "Hello! Welcome to Klarone. Tell me a bit about what you'll be using your laptop for, and I'll find your perfect match!",
      shouldSearchCatalog: false,
    };
  }
}
