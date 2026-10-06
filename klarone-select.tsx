"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { startRecommendation } from "../../lib/api";
import type {
  RecommendationResult,
  RecommendationStartResponse,
} from "../../types/recommendations";

const examplePrompt =
  "I am a software developer, my budget is around 70000, I carry my laptop every day and I want good battery life and at least 16GB RAM.";

const steps = [
  {
    number: "01",
    title: "Tell us what you do",
    description:
      "Describe your work, study, creative, gaming or everyday laptop needs in plain language.",
  },
  {
    number: "02",
    title: "Klarone translates the need",
    description:
      "Your message is converted into structured requirements such as budget, use case, portability, battery and memory.",
  },
  {
    number: "03",
    title: "See what fits",
    description:
      "Klarone scores available catalogue variants and explains the fit and trade-offs.",
  },
];

function formatPrice(value: string): string {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return value;
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function requirementLabel(value: string | null): string {
  if (!value) {
    return "";
  }

  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function ResultCard({
  result,
}: {
  result: RecommendationResult;
}) {
  const matchFactors = [
    {
      label: "Performance",
      score: result.performanceScore,
    },
    {
      label: "Use case",
      score: result.useCaseScore,
    },
    {
      label: "Battery",
      score: result.batteryScore,
    },
    {
      label: "Portability",
      score: result.portabilityScore,
    },
    {
      label: "Display",
      score: result.displayScore,
    },
    {
      label: "Upgradeability",
      score: result.upgradeabilityScore,
    },
    {
      label: "Ownership",
      score: result.ownershipScore,
    },
  ].filter(
    (
      factor,
    ): factor is {
      label: string;
      score: number;
    } => factor.score !== null,
  );

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-slate-950 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-white">
              #{result.rank}
            </span>

            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-blue-700">
              {result.recommendationType.replaceAll("_", " ")}
            </span>
          </div>

          <h4 className="mt-3 text-xl font-semibold tracking-tight text-slate-950">
            {result.product.name}
          </h4>

          <p className="mt-1 text-sm text-slate-500">
            {result.variant.variantName}
          </p>
        </div>

        <div className="text-right">
          <p className="text-lg font-semibold text-slate-950">
            {formatPrice(result.variant.sellingPrice)}
          </p>

          <p className="mt-1 text-xs font-medium text-slate-500">
            Match score {result.overallScore}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-2 sm:grid-cols-3">
        <div className="rounded-xl bg-slate-50 px-3 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
            Memory
          </p>

          <p className="mt-1 text-sm font-semibold text-slate-800">
            {result.variant.ramGb
              ? `${result.variant.ramGb}GB RAM`
              : "Not specified"}
          </p>
        </div>

        <div className="rounded-xl bg-slate-50 px-3 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
            Storage
          </p>

          <p className="mt-1 text-sm font-semibold text-slate-800">
            {result.variant.storageGb
              ? `${result.variant.storageGb}GB`
              : "Not specified"}
          </p>
        </div>

        <div className="rounded-xl bg-slate-50 px-3 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
            OS
          </p>

          <p className="mt-1 text-sm font-semibold text-slate-800">
            {result.variant.operatingSystem ?? "Not specified"}
          </p>
        </div>
      </div>

      {matchFactors.length > 0 ? (
        <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              Match factors
            </p>

            <p className="text-xs text-slate-400">
              Based on your requirements
            </p>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {matchFactors.map((factor) => (
              <div key={factor.label}>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-medium text-slate-600">
                    {factor.label}
                  </span>

                  <span className="text-xs font-semibold text-slate-900">
                    {factor.score}
                  </span>
                </div>

                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-blue-600"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.max(0, factor.score),
                      )}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-5 rounded-xl bg-slate-50 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
          Why it fits
        </p>

        <p className="mt-2 text-sm leading-6 text-slate-700">
          {result.matchReason}
        </p>
      </div>

      {result.tradeoffs ? (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-700">
            Trade-off
          </p>

          <p className="mt-2 text-sm leading-6 text-amber-900">
            {result.tradeoffs}
          </p>
        </div>
      ) : null}

      <div className="mt-5">
        <Link
          href={`/laptops/${result.product.slug}`}
          className="inline-flex items-center justify-center rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-600"
        >
          View laptop
        </Link>
      </div>
    </article>
  );
}

function Results({
  response,
}: {
  response: RecommendationStartResponse;
}) {
  const requirements = response.extractedRequirements;

  const requirementItems = [
    requirements.primaryUseCase
      ? `Use: ${requirementLabel(requirements.primaryUseCase)}`
      : null,
    requirements.budgetMax
      ? `Budget up to ₹${requirements.budgetMax.toLocaleString("en-IN")}`
      : null,
    requirements.minimumRamGb
      ? `At least ${requirements.minimumRamGb}GB RAM`
      : null,
    requirements.portabilityPreference
      ? `Portability: ${requirementLabel(requirements.portabilityPreference)}`
      : null,
    requirements.batteryPriority
      ? `Battery: ${requirementLabel(requirements.batteryPriority)}`
      : null,
  ].filter(Boolean) as string[];

  return (
    <div className="mt-10">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-600">
              Your Klarone Select result
            </p>

            <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
              {response.results.length} options from the current catalogue
            </h3>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              The shortlist is based on your stated requirements and the
              structured product information available to Klarone.
            </p>
          </div>

          <div className="shrink-0 rounded-xl bg-slate-950 px-4 py-3 text-right">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
              Candidates
            </p>

            <p className="mt-1 text-xl font-semibold text-white">
              {response.recommendationRun.candidateCount ?? 0}
            </p>
          </div>
        </div>

        {requirementItems.length > 0 ? (
          <div className="mt-5 flex flex-wrap gap-2">
            {requirementItems.map((item) => (
              <span
                key={item}
                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700"
              >
                {item}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <div className="mt-5 grid gap-4">
        {response.results.map((result) => (
          <ResultCard
            key={result.productVariantId}
            result={result}
          />
        ))}
      </div>
    </div>
  );
}

export function KlaroneSelect() {
  const [message, setMessage] = useState("");
  const [response, setResponse] =
    useState<RecommendationStartResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedMessage = message.trim();

    if (!trimmedMessage || loading) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const nextResponse = await startRecommendation({
        message: trimmedMessage,
        sessionToken:
          typeof window !== "undefined"
            ? sessionStorage.getItem(
                "klarone-recommendation-session-token",
              ) ?? undefined
            : undefined,
      });

      setResponse(nextResponse);

      if (typeof window !== "undefined") {
        sessionStorage.setItem(
          "klarone-recommendation-session-token",
          nextResponse.session.sessionToken,
        );
      }
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "We couldn't generate recommendations right now.",
      );
    } finally {
      setLoading(false);
    }
  }

  function useExample() {
    setMessage(examplePrompt);
    setError(null);
  }

  return (
    <section
      id="klarone-select"
      className="relative overflow-hidden bg-slate-100 py-20 sm:py-24"
    >
      <div className="absolute inset-y-0 right-0 hidden w-1/3 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.12),transparent_65%)] lg:block" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[0.86fr_1.14fr] lg:items-start">
          <div className="max-w-xl">
            <div className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">
              Klarone Select
            </div>

            <h2 className="mt-5 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
              Stop searching through specifications.
              <span className="block text-slate-500">
                Start with what you need.
              </span>
            </h2>

            <p className="mt-6 max-w-lg text-base leading-7 text-slate-600">
              Tell Klarone what you actually need from your laptop. We turn
              that into structured requirements and use the available catalogue
              to build a shortlist.
            </p>

            <form
              onSubmit={handleSubmit}
              className="mt-8 rounded-[1.6rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-950">
                    Describe your laptop need
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Plain language is fine. Mention budget, work, gaming,
                    portability, battery or anything else that matters.
                  </p>
                </div>
              </div>

              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                maxLength={5000}
                rows={7}
                placeholder="Example: developer, budget around ₹70,000, carry it every day, want good battery life and at least 16GB RAI'm a M."
                className="mt-5 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
                disabled={loading}
              />

              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={useExample}
                  disabled={loading}
                  className="text-left text-sm font-semibold text-blue-700 transition-colors hover:text-blue-900 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Try an example
                </button>

                <button
                  type="submit"
                  disabled={loading || !message.trim()}
                  className="inline-flex items-center justify-center rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? "Finding your fit..." : "Find my laptop"}
                </button>
              </div>

              {error ? (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-800">
                  {error}
                </div>
              ) : null}
            </form>

            <div className="mt-8 grid gap-4">
              {steps.map((step) => (
                <div
                  key={step.number}
                  className="grid grid-cols-[44px_1fr] gap-4"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-950 text-xs font-semibold text-white">
                    {step.number}
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-slate-950">
                      {step.title}
                    </h3>

                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            {response ? (
              <Results response={response} />
            ) : (
              <div className="rounded-[2rem] border border-slate-200 bg-white p-2 shadow-sm">
                <div className="rounded-[1.6rem] bg-white p-6 sm:p-8">
                  <div className="border-b border-slate-100 pb-6">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">
                      How Klarone Select works
                    </p>

                    <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                      A simpler way to narrow the choice.
                    </h3>

                    <p className="mt-2 max-w-lg text-sm leading-6 text-slate-500">
                      Start with your situation. Klarone handles the
                      translation into useful product requirements.
                    </p>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {steps.map((step) => (
                      <div
                        key={step.number}
                        className="grid gap-4 py-6 sm:grid-cols-[52px_1fr]"
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-950 text-xs font-semibold text-white">
                          {step.number}
                        </div>

                        <div>
                          <h4 className="text-lg font-semibold tracking-tight text-slate-950">
                            {step.title}
                          </h4>

                          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
                            {step.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-2 rounded-2xl bg-slate-950 p-5 sm:p-6">
                    <div className="flex items-start gap-4">
                      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/15 text-blue-400">
                        ?
                      </div>

                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                          Klarone principle
                        </p>

                        <p className="mt-2 text-sm leading-6 text-slate-300">
                          AI helps understand and explain your requirements.
                          The actual product ranking stays grounded in
                          Klarone&apos;s structured catalogue data and
                          recommendation rules.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

