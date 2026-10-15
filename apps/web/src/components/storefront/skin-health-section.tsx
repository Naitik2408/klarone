"use client";

import React from "react";
import Link from "next/link";

interface TimelineStep {
  id: string;
  badge: string;
  title: string;
  description: string;
}

const TIMELINE_STEPS: TimelineStep[] = [
  {
    id: "step-1",
    badge: "Week 1",
    title: "Calm & Balance Within",
    description:
      "Your microbiome begins to rebalance, helping soothe internal digestive stressors that can cause early irritation and breakouts.",
  },
  {
    id: "step-2",
    badge: "Week 2",
    title: "Hydration & Barrier Defense",
    description:
      "Nutrient assimilation improves, locking in essential moisture and strengthening the skin's protective lipid barrier.",
  },
  {
    id: "step-3",
    badge: "Week 3",
    title: "Refined Clarity & Texture",
    description:
      "Cellular turnover and antioxidant levels optimize, clearing blemishes and minimizing the appearance of uneven texture.",
  },
  {
    id: "step-4",
    badge: "Week 4",
    title: "Visible Skin Boost",
    description:
      "As gut harmony takes root, redness subsides and skin appears visibly smoother, resilient, and refreshed.",
  },
  {
    id: "step-5",
    badge: "Week 5",
    title: "Collagen Support & Tone",
    description:
      "Essential micronutrients stimulate natural skin elasticity, imparting firmness and a visibly unified complexion.",
  },
  {
    id: "step-6",
    badge: "Week 6",
    title: "Radiance From Within",
    description:
      "Deep, sustainable equilibrium is established—delivering lasting clarity, plump hydration, and an unmistakable natural glow.",
  },
];

/* Circular Badge with curved text matching screenshot: "PEBBLE - WHERE DESIGN MEETS FUNCTION" */
function CircularStampBadge() {
  return (
    <div className="relative flex h-28 w-28 items-center justify-center rounded-full bg-[#d7f289] text-stone-900 shadow-lg">
      {/* Rotating SVG Curved Circular Text */}
      <svg
        viewBox="0 0 100 100"
        className="absolute inset-0 h-full w-full animate-[spin_18s_linear_infinite]"
      >
        <path
          id="textPathStamp"
          d="M 50, 50 m -37, 0 a 37,37 0 1,1 74,0 a 37,37 0 1,1 -74,0"
          fill="none"
        />
        <text className="text-[8.5px] font-semibold uppercase tracking-[0.18em] fill-stone-900">
          <textPath href="#textPathStamp" startOffset="0%">
            • PEBBLE • WHERE DESIGN MEETS FUNCTION
          </textPath>
        </text>
      </svg>

      {/* Heart Icon in Center */}
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-8 w-8 text-stone-900"
      >
        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
      </svg>
    </div>
  );
}

export function StorefrontSkinHealthSection() {
  return (
    <section className="relative z-10 bg-white py-20 sm:py-24 lg:py-28 text-slate-900">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-10 lg:px-14">
        {/* Section Header */}
        <div className="text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-500 sm:text-sm">
            THE FUTURE OF SKIN HEALTH
          </span>
          <h2 className="mt-4 font-serif text-3xl font-normal tracking-tight text-slate-900 sm:text-5xl lg:text-[58px]">
            Glow that builds over time.
          </h2>
        </div>

        {/* Two Column Layout: Left scrolling timeline content, Right sticky image container */}
        <div className="mt-12 sm:mt-20 grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16 items-start">
          {/* LEFT COLUMN: Vertical Timeline (col-span-6) */}
          <div className="lg:col-span-6 flex flex-col justify-start">
            <div className="relative pl-6 sm:pl-12">
              {/* Vertical dotted connecting line */}
              <div className="absolute left-[5px] sm:left-[7px] top-3 bottom-8 w-[1.5px] border-l-2 border-dashed border-stone-300" />

              {/* Timeline Steps */}
              <div className="flex flex-col space-y-12 sm:space-y-20 lg:space-y-24">
                {TIMELINE_STEPS.map((step) => (
                  <div key={step.id} className="relative group">
                    {/* Dark forest green circle node */}
                    <div className="absolute -left-[30px] sm:-left-[48px] top-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#162e20] ring-4 ring-white" />

                    {/* Step Badge */}
                    <span className="inline-block rounded-full bg-[#e8f3e5] px-4 py-1.5 text-xs font-semibold tracking-tight text-stone-800">
                      {step.badge}
                    </span>

                    {/* Step Title */}
                    <h3 className="mt-3 sm:mt-4 font-serif text-2xl font-normal tracking-tight text-stone-900 sm:text-[34px]">
                      {step.title}
                    </h3>

                    {/* Step Description */}
                    <p className="mt-2.5 sm:mt-3.5 max-w-lg text-sm sm:text-base leading-relaxed text-stone-600">
                      {step.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Sticky Image Container (col-span-6) */}
          <div className="lg:col-span-6 lg:sticky lg:top-28">
            <div className="relative mx-auto max-w-[540px]">
              {/* Circular rotating stamp badge overlapping at top-right */}
              <div className="absolute -top-8 -right-2 sm:-top-10 sm:-right-8 z-30 scale-75 sm:scale-100 origin-top-right">
                <CircularStampBadge />
              </div>

              {/* Main Wellness Lifestyle Portrait Card */}
              <div className="relative h-[360px] sm:h-[540px] md:h-[580px] w-full overflow-hidden rounded-[24px] sm:rounded-[32px] bg-stone-100 shadow-md">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/skin-health-woman.jpg"
                  alt="Fit athletic woman stretching arms overhead"
                  className="h-full w-full object-cover object-[center_20%] transition-transform duration-700 ease-out hover:scale-105"
                />
              </div>

              {/* Overlapping Supplement Jar Card (bottom-right overlap) */}
              <div className="absolute -bottom-6 -right-2 sm:-bottom-8 sm:-right-8 z-20 h-36 w-32 sm:h-56 sm:w-52 overflow-hidden rounded-[20px] sm:rounded-[26px] bg-white p-2 sm:p-3 shadow-2xl ring-1 ring-black/5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/skin-health-capsules.jpg"
                  alt="Supplement capsules jar"
                  className="h-full w-full object-cover rounded-[14px] sm:rounded-[18px]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Centered CTA Button at the end of the section, matching Hero Shop Now button */}
        <div className="mt-16 sm:mt-20 lg:mt-24 flex items-center justify-center">
          <Link
            href="#how-it-works"
            className="group flex items-center gap-3.5 rounded-full bg-[#d6f088] py-2.5 pl-6 pr-2.5 text-sm font-semibold tracking-tight text-slate-900 shadow-md transition-all duration-200 hover:scale-105 hover:bg-[#c8e678] active:scale-95"
          >
            <span style={{ color: "#000000" }} className="text-black !text-black font-semibold">
              See How It Works
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-950 text-white transition-transform duration-200 group-hover:translate-x-0.5">
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}
