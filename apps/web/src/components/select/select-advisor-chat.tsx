"use client";

import React, { useState, useRef, useEffect, Fragment } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { startRecommendation } from "@/lib/api";
import type {
  RecommendationStartResponse,
  RecommendationResult,
} from "@/types/recommendations";

interface ChatMessage {
  id: string;
  sender: "user" | "advisor";
  text: string;
  timestamp: string;
  recommendations?: RecommendationResult[];
  extractedProfile?: RecommendationStartResponse["extractedRequirements"];
}

const INITIAL_SUGGESTIONS = [
  {
    icon: "💻",
    title: "Software Engineering & Docker",
    prompt: "I need a fast laptop for full-stack web dev, Docker containers, 32GB RAM, under ₹1.5 Lakhs.",
  },
  {
    icon: "🎨",
    title: "Creative Video Editing & 4K",
    prompt: "Looking for a creator laptop with an OLED or color-accurate display for Premiere Pro and After Effects around ₹1.8 Lakhs.",
  },
  {
    icon: "⚡",
    title: "Casual Gaming & Daily Productivity",
    prompt: "Need a durable laptop for work, light gaming (Valorant / GTA V), long battery life, under ₹80,000.",
  },
  {
    icon: "🎓",
    title: "College Student & High Battery Life",
    prompt: "Need a lightweight laptop under 1.3kg with all-day battery life for college and coding, under ₹90,000.",
  },
];

export function SelectAdvisorChat() {
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputPrompt, setInputPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Generate or restore a session token and chat messages
    const existingToken = sessionStorage.getItem("klarone_select_session_token");
    if (existingToken) {
      setSessionToken(existingToken);
    }
    const savedMessages = sessionStorage.getItem("klarone_select_messages");
    if (savedMessages) {
      try {
        const parsed = JSON.parse(savedMessages);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
        }
      } catch {
        // Ignore JSON parse errors
      }
    }
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      sessionStorage.setItem("klarone_select_messages", JSON.stringify(messages));
    } else {
      sessionStorage.removeItem("klarone_select_messages");
    }
  }, [messages]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  async function handleSubmit(textToSend?: string) {
    const messageContent = (textToSend ?? inputPrompt).trim();
    if (!messageContent || isLoading) return;

    const userMessageId = `msg-${Date.now()}`;
    const userMsg: ChatMessage = {
      id: userMessageId,
      sender: "user",
      text: messageContent,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputPrompt("");
    setIsLoading(true);

    try {
      const historyPayload = messages.slice(-6).map((m) => ({
        role: m.sender === "user" ? ("user" as const) : ("model" as const),
        text: m.text,
      }));

      const response = await startRecommendation({
        message: messageContent,
        sessionToken: sessionToken ?? undefined,
        history: historyPayload,
      });

      if (response.session?.sessionToken) {
        setSessionToken(response.session.sessionToken);
        sessionStorage.setItem("klarone_select_session_token", response.session.sessionToken);
      }

      const advisorMsg: ChatMessage = {
        id: `advisor-${Date.now()}`,
        sender: "advisor",
        text: response.conversationalReply ?? buildAdvisorIntroText(response),
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        recommendations: response.results,
        extractedProfile: response.extractedRequirements,
      };

      setMessages((prev) => [...prev, advisorMsg]);
    } catch (err: unknown) {
      const errorMsg: ChatMessage = {
        id: `advisor-err-${Date.now()}`,
        sender: "advisor",
        text: "I experienced a momentary issue analyzing your requirements. Please check your connection or refine your prompt, and I'll match our verified models for you.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  }

  function buildAdvisorIntroText(res: RecommendationStartResponse): string {
    const resultsCount = res.results?.length ?? 0;
    const req = res.extractedRequirements;

    let useCaseDesc = "your everyday workflow";
    if (req?.primaryUseCase) {
      useCaseDesc = req.primaryUseCase.toLowerCase();
    }

    if (resultsCount === 0) {
      return `I evaluated your request for ${useCaseDesc}. Here are the most practical, dependable laptops from our lineup that offer great value and reliable daily performance:`;
    }

    return `Based on your request, I evaluated our verified catalog. Here are the top ${resultsCount} laptops that balance performance, comfort, and value for you:`;
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  return (
    <div className="fixed inset-0 flex h-dvh w-full flex-col overflow-hidden bg-[#f0f2ee] text-slate-900">
      {/* Sleek Minimal App Bar */}
      <header className="flex h-14 sm:h-16 shrink-0 items-center justify-between border-b border-stone-200/90 bg-[#f0f2ee]/80 px-4 backdrop-blur-md sm:px-6">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 font-serif text-2xl font-normal tracking-tight text-slate-950 transition hover:opacity-80 md:text-3xl"
          >
            klarone
          </Link>
          <span className="hidden h-4 w-px bg-stone-300 sm:block" />
          <p className="hidden text-xs text-stone-500 sm:block">
            AI Laptop Advisory · Objective Specification Fit
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Browse Catalogue Icon Button */}
          <Link
            href="/laptops"
            title="Browse Catalogue"
            aria-label="Browse Catalogue"
            className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full border border-stone-300/80 bg-white/90 text-stone-700 shadow-2xs transition hover:bg-stone-100 hover:text-slate-950 active:scale-95"
          >
            {/* Grid / Catalogue Icon */}
            <svg
              className="h-4 w-4 sm:h-4.5 sm:w-4.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
              />
            </svg>
          </Link>

          {/* New Chat Icon Button */}
          {messages.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setMessages([]);
                sessionStorage.removeItem("klarone_select_session_token");
                sessionStorage.removeItem("klarone_select_messages");
                setSessionToken(null);
              }}
              title="New Chat"
              aria-label="New Chat"
              className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-stone-200/90 text-stone-700 transition hover:bg-stone-300 hover:text-slate-950 active:scale-90"
            >
              {/* Plus / New Chat Icon */}
              <svg
                className="h-4 w-4 sm:h-4.5 sm:w-4.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2.2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4.5v15m7.5-7.5h-15"
                />
              </svg>
            </button>
          )}
        </div>
      </header>

      {/* Main Chat Stream Container */}
      <div className="flex-1 overflow-y-auto px-4 py-4 sm:py-6 sm:px-6">
        <div className={`mx-auto max-w-4xl ${messages.length === 0 ? "h-full flex flex-col justify-center" : "pb-4"}`}>
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-4 text-center my-auto">
            {/* Center Brand Identity */}
            <div className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl sm:rounded-3xl bg-[#0b241b] text-2xl sm:text-3xl text-[#d6f088] shadow-md">
              ⚡
            </div>

            <h2 className="mt-5 font-serif text-3xl font-normal tracking-tight text-slate-900 sm:text-5xl">
              Meet Klarone Select
            </h2>
            <p className="mt-3 max-w-md px-4 text-xs sm:text-sm leading-relaxed text-stone-600 sm:max-w-lg">
              Describe your workload, favorite software, battery needs, and budget. Our AI matches verified laptops with transparent specification fit analysis.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className={`flex w-full ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`flex flex-col ${
                    msg.sender === "user"
                      ? "items-end max-w-[85%] sm:max-w-md ml-auto"
                      : "items-start w-full max-w-2xl min-w-0 mr-auto"
                  }`}
                >
                  {/* Speech Bubble */}
                  <div
                    className={`rounded-[22px] px-5 py-3.5 text-sm leading-relaxed ${
                      msg.sender === "user"
                        ? "self-end bg-[#0b241b] text-white shadow-xs rounded-tr-xs"
                        : "w-full bg-[#f0f2ee] text-slate-900 shadow-2xs rounded-tl-xs"
                    }`}
                  >
                    {msg.sender === "user" ? (
                      <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                    ) : (
                      <div className="w-full min-w-0 overflow-hidden">
                        <FormattedAdvisorMessage text={msg.text} />
                      </div>
                    )}
                  </div>

                  {/* Extracted Requirements Badge Pill Row */}
                  {msg.extractedProfile && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5 px-1">
                      {msg.extractedProfile.budgetMax && (
                        <span className="inline-flex items-center rounded-full bg-stone-100 px-2.5 py-0.5 text-[11px] font-medium text-stone-700">
                          Budget: ≤ ₹{msg.extractedProfile.budgetMax.toLocaleString("en-IN")}
                        </span>
                      )}
                      {msg.extractedProfile.minimumRamGb && (
                        <span className="inline-flex items-center rounded-full bg-stone-100 px-2.5 py-0.5 text-[11px] font-medium text-stone-700">
                          RAM: ≥ {msg.extractedProfile.minimumRamGb}GB
                        </span>
                      )}
                      {msg.extractedProfile.primaryUseCase && (
                        <span className="inline-flex items-center rounded-full bg-[#d6f088]/60 px-2.5 py-0.5 text-[11px] font-semibold text-slate-900">
                          Use: {msg.extractedProfile.primaryUseCase}
                        </span>
                      )}
                      {msg.extractedProfile.preferredOs && (
                        <span className="inline-flex items-center rounded-full bg-stone-100 px-2.5 py-0.5 text-[11px] font-medium text-stone-700">
                          OS: {msg.extractedProfile.preferredOs}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Recommended Products: Horizontally scrollable on mobile, matching shop cards */}
                  {msg.recommendations && msg.recommendations.length > 0 && (
                    <div className="mt-4 w-full min-w-0">
                      <div className="mb-2.5 flex items-center justify-between px-1 text-xs font-semibold uppercase tracking-wider text-stone-500">
                        <span>Top Store Matches</span>
                        <span>{msg.recommendations.length} Options</span>
                      </div>

                      <div className="flex gap-3 overflow-x-auto pb-3 pt-1 -mx-2 px-2 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-2 md:grid-cols-3 sm:overflow-visible">
                        {msg.recommendations.slice(0, 4).map((rec) => {
                          const price = Number(rec.variant.sellingPrice);
                          const formattedPrice = new Intl.NumberFormat("en-IN", {
                            style: "currency",
                            currency: "INR",
                            maximumFractionDigits: 0,
                          }).format(price);

                          const scoreNum = rec.overallScore ? Number(rec.overallScore) : 85;
                          const displayScore = Math.min(99, Math.round(scoreNum > 1 ? scoreNum : scoreNum * 100));

                          return (
                            <article
                              key={rec.rank}
                              className="group relative flex w-[220px] shrink-0 sm:w-auto flex-col justify-between rounded-[20px] sm:rounded-[24px] bg-[#f0f2ee] p-2.5 sm:p-4 transition-transform duration-200"
                            >
                              <Link
                                href={`/laptops/${rec.product.slug}`}
                                className="block w-full"
                              >
                                {/* Unified Product Stage matching aspect ratio */}
                                <div className="relative flex aspect-[4/4.4] min-h-[140px] sm:min-h-[160px] w-full items-center justify-center overflow-hidden rounded-[14px] sm:rounded-[18px] bg-white/60">
                                  {rec.product.imageUrl ? (
                                    <img
                                      src={rec.product.imageUrl}
                                      alt={rec.product.imageAlt ?? rec.product.name}
                                      className="h-full w-full object-contain p-2.5 sm:p-3 transition-transform duration-200 group-hover:scale-105"
                                    />
                                  ) : (
                                    <div className="flex h-full w-full items-center justify-center text-3xl sm:text-4xl text-stone-400 select-none">
                                      💻
                                    </div>
                                  )}

                                  {/* Rank & Fit Pill */}
                                  <div className="absolute top-2 left-2 flex items-center gap-1 z-10">
                                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-950 text-[10px] font-bold text-white shadow-xs">
                                      #{rec.rank}
                                    </span>
                                    <span className="rounded-full bg-emerald-50/90 backdrop-blur-xs px-1.5 py-0.5 text-[9px] font-bold text-emerald-800 border border-emerald-200/50">
                                      {displayScore}% Fit
                                    </span>
                                  </div>
                                </div>

                                {/* Card Meta & Bottom Row */}
                                <div className="mt-2.5 sm:mt-3 flex flex-col justify-between px-0.5 pb-0.5">
                                  <div className="flex flex-col min-w-0">
                                    <span className="text-[10px] sm:text-[11px] font-medium text-stone-500 uppercase tracking-wide truncate">
                                      {rec.product.brand?.name ?? rec.product.category?.name ?? "Laptop"}
                                    </span>

                                    <h3 className="mt-0.5 text-xs sm:text-sm font-semibold tracking-tight text-slate-900 group-hover:text-emerald-950 line-clamp-1">
                                      {rec.product.name}
                                    </h3>

                                    <div className="mt-1 flex flex-wrap items-center gap-1 text-[10px] sm:text-[11px] text-stone-600">
                                      {rec.variant.ramGb && (
                                        <span className="rounded bg-white/70 px-1.5 py-0.5 font-medium text-stone-700">
                                          {rec.variant.ramGb}GB
                                        </span>
                                      )}
                                      {rec.variant.storageGb && (
                                        <span className="rounded bg-white/70 px-1.5 py-0.5 font-medium text-stone-700">
                                          {rec.variant.storageGb}GB
                                        </span>
                                      )}
                                    </div>

                                    <div className="mt-2 flex items-center justify-between">
                                      <span className="text-xs sm:text-sm font-bold text-slate-900">
                                        {formattedPrice}
                                      </span>

                                      <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-semibold text-[#0b241b] group-hover:underline">
                                        View
                                        <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                        </svg>
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </Link>
                            </article>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <span className="mt-1 block text-[10px] text-stone-400">
                    {msg.timestamp}
                  </span>
                </div>
              </motion.div>
            ))}

            {isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center text-stone-500"
              >
                <div className="flex items-center gap-2 rounded-full bg-white border border-stone-200/80 px-4 py-2.5 shadow-xs">
                  <span className="h-2 w-2 rounded-full bg-[#0b241b] animate-pulse [animation-duration:1.2s]" />
                  <span className="h-2 w-2 rounded-full bg-[#0b241b] animate-pulse [animation-duration:1.2s] [animation-delay:200ms]" />
                  <span className="h-2 w-2 rounded-full bg-[#0b241b] animate-pulse [animation-duration:1.2s] [animation-delay:400ms]" />
                  <span className="ml-1 text-xs font-medium text-stone-700">
                    Evaluating laptop specs and thermal profiles...
                  </span>
                </div>
              </motion.div>
            )}

            <div ref={chatBottomRef} />
          </div>
        )}
        </div>
      </div>

      {/* Modern, Highly Refined Floating Prompt Input Bar */}
      <div className="shrink-0 border-t border-stone-200/80 bg-[#f0f2ee]/90 px-3 py-3 sm:px-6 sm:py-4 backdrop-blur-md">
        <div className="mx-auto max-w-3xl">
          <div className="group relative flex items-end rounded-2xl sm:rounded-3xl border border-stone-300 bg-white p-1.5 sm:p-2 shadow-sm transition-all duration-200 focus-within:border-slate-900 focus-within:ring-2 focus-within:ring-slate-900/10 focus-within:shadow-md hover:border-stone-400">
            <textarea
              ref={inputRef}
              rows={1}
              value={inputPrompt}
              onChange={(e) => {
                setInputPrompt(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
              }}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything..."
              disabled={isLoading}
              className="max-h-32 min-h-[40px] sm:min-h-[44px] w-full resize-none bg-transparent px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-[14px] leading-relaxed text-slate-900 placeholder:text-stone-400 focus:outline-none"
            />

            <button
              type="button"
              onClick={() => handleSubmit()}
              disabled={!inputPrompt.trim() || isLoading}
              aria-label="Send query"
              className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl bg-[#0b241b] text-white shadow-xs transition duration-150 hover:bg-slate-800 active:scale-95 disabled:cursor-not-allowed disabled:bg-stone-200 disabled:text-stone-400"
            >
              <svg
                className="h-4 w-4 sm:h-4.5 sm:w-4.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 12h14M12 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Keyword categorization with aesthetic pill/highlight backgrounds
const HIGHLIGHT_MAP: Array<{ regex: RegExp; className: string }> = [
  // Technical / tasks / workloads (Indigo / Violet)
  {
    regex: /\b(programming|coding|software development|graphic design|video editing|3d rendering|machine learning|data science|ai workflows|architecture|cad)\b/gi,
    className: "bg-indigo-100/90 text-indigo-900 border border-indigo-200/60 font-medium px-1.5 py-0.5 rounded-md",
  },
  // Budget / pricing / money (Emerald / Green)
  {
    regex: /\b(budget range|budget|₹[\d,]+|\d{1,2}(?:,\d{2})*,\d{3}\s*(?:inr|rs|rupees)?|\d+\s*(?:k|thousand|lakh)\b)/gi,
    className: "bg-emerald-100/90 text-emerald-900 border border-emerald-200/60 font-semibold px-1.5 py-0.5 rounded-md",
  },
  // Portability & Everyday Mobility (Amber / Orange)
  {
    regex: /\b(portability|travel a lot|lightweight|carry(?:ing)? it around|daily commute|battery life|all-day battery)\b/gi,
    className: "bg-amber-100/90 text-amber-900 border border-amber-200/60 font-medium px-1.5 py-0.5 rounded-md",
  },
  // Core hardware components (Cyan / Teal)
  {
    regex: /\b(\d+gb\s*ram|\d+gb\s*ssd|\d+tb\s*ssd|oled|retina|multitasking|smooth performance)\b/gi,
    className: "bg-teal-100/90 text-teal-900 border border-teal-200/60 font-medium px-1.5 py-0.5 rounded-md",
  },
  // Study / casual / general (Rose / Pink)
  {
    regex: /\b(extensive research|note-taking|essays|college needs|academic needs|office work|everyday use)\b/gi,
    className: "bg-rose-100/80 text-rose-900 border border-rose-200/60 font-medium px-1.5 py-0.5 rounded-md",
  },
];

function highlightKeywords(text: string): React.ReactNode[] {
  // Split words or tokens while preserving separators
  // We can scan through regex patterns sequentially
  type Segment = { text: string; className?: string };
  let segments: Segment[] = [{ text }];

  for (const { regex, className } of HIGHLIGHT_MAP) {
    const nextSegments: Segment[] = [];
    for (const seg of segments) {
      if (seg.className) {
        // already highlighted
        nextSegments.push(seg);
        continue;
      }
      let lastIndex = 0;
      regex.lastIndex = 0;
      let match: RegExpExecArray | null;

      while ((match = regex.exec(seg.text)) !== null) {
        const matchStart = match.index;
        const matchEnd = regex.lastIndex;

        if (matchStart > lastIndex) {
          nextSegments.push({ text: seg.text.slice(lastIndex, matchStart) });
        }
        nextSegments.push({ text: match[0], className });
        lastIndex = matchEnd;
      }

      if (lastIndex < seg.text.length) {
        nextSegments.push({ text: seg.text.slice(lastIndex) });
      }
    }
    segments = nextSegments;
  }

  return segments.map((seg, i) =>
    seg.className ? (
      <mark key={i} className={`inline-block ${seg.className}`}>
        {seg.text}
      </mark>
    ) : (
      <span key={i}>{seg.text}</span>
    )
  );
}

function FormattedAdvisorMessage({ text }: { text: string }) {
  // First, parse out markdown tables and regular blocks
  const lines = text.split("\n");
  const blocks: Array<{ type: "p" | "table" | "list"; lines: string[] }> = [];

  let currentTableLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isTableLine = line.trim().startsWith("|") && line.trim().endsWith("|");

    if (isTableLine) {
      currentTableLines.push(line);
    } else {
      if (currentTableLines.length > 0) {
        blocks.push({ type: "table", lines: currentTableLines });
        currentTableLines = [];
      }
      blocks.push({ type: "p", lines: [line] });
    }
  }

  if (currentTableLines.length > 0) {
    blocks.push({ type: "table", lines: currentTableLines });
  }

  function renderInline(content: string) {
    const boldSegments = content.split(/(\*\*[^*]+\*\*)/g);
    return boldSegments.map((part, partIdx) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        const rawText = part.slice(2, -2);
        return (
          <strong key={partIdx} className="font-semibold text-slate-950">
            {highlightKeywords(rawText)}
          </strong>
        );
      }
      return <Fragment key={partIdx}>{highlightKeywords(part)}</Fragment>;
    });
  }

  return (
    <div className="space-y-3">
      {blocks.map((block, blockIdx) => {
        if (block.type === "table") {
          // Parse markdown table rows
          const rows = block.lines
            .map((l) =>
              l
                .split("|")
                .map((cell) => cell.trim())
                .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1)
            )
            .filter((row) => !row.every((cell) => /^:?-+:?$/.test(cell))); // remove separator row

          if (rows.length === 0) return null;
          const [header, ...body] = rows;

          return (
            <div
              key={blockIdx}
              className="my-3 overflow-x-auto rounded-xl border border-stone-200 bg-white/90 shadow-2xs"
            >
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-stone-200 bg-stone-100/70 font-semibold text-slate-900">
                    {header.map((col, colIdx) => (
                      <th
                        key={colIdx}
                        className={`px-3 py-2.5 ${colIdx === 0 ? "bg-stone-100/90 font-bold" : ""}`}
                      >
                        {renderInline(col)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-stone-700">
                  {body.map((row, rIdx) => (
                    <tr
                      key={rIdx}
                      className={rIdx % 2 === 0 ? "bg-white" : "bg-[#fcfdfa]"}
                    >
                      {row.map((cell, cIdx) => (
                        <td
                          key={cIdx}
                          className={`px-3 py-2.5 leading-relaxed align-top ${
                            cIdx === 0
                              ? "font-semibold text-slate-900 bg-stone-50/50 w-28 sm:w-36"
                              : ""
                          }`}
                        >
                          {renderInline(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }

        // Regular lines / paragraphs
        const line = block.lines[0];
        if (!line.trim()) {
          return <div key={blockIdx} className="h-1" />;
        }

        const listMatch = line.match(/^(\s*)([*-]|\d+\.)\s+(.*)$/);
        const indent = listMatch ? listMatch[1].length : 0;
        const bullet = listMatch ? listMatch[2] : null;
        const content = listMatch ? listMatch[3] : line;

        if (bullet) {
          return (
            <div
              key={blockIdx}
              className="flex items-start gap-2 text-stone-800"
              style={{ marginLeft: `${indent * 8}px` }}
            >
              <span className="shrink-0 font-medium text-stone-500">
                {bullet.length === 1 ? "•" : bullet}
              </span>
              <div className="flex-1 leading-relaxed">{renderInline(content)}</div>
            </div>
          );
        }

        return (
          <p key={blockIdx} className="leading-relaxed text-stone-800">
            {renderInline(line)}
          </p>
        );
      })}
    </div>
  );
}
