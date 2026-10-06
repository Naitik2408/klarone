"use client";

import React from "react";

interface BenefitItem {
  id: string;
  title: string;
  description: string;
  icon: (props: { className?: string }) => React.JSX.Element;
}

/* Custom crafted clean line-art icons matching the screenshot */
function StomachIcon({ className = "w-9 h-9" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Esophagus tube entering stomach */}
      <path d="M11 2v3.5c0 1.2-.6 2.2-1.5 2.8" />
      <path d="M13.5 2v2.8c0 1 .4 2 1.2 2.6" />
      {/* Stomach body outline */}
      <path d="M9.5 8.3C6.5 10 4.5 13 4.5 16.5c0 3.3 2.5 5.5 6 5.5 4.5 0 8.5-3 8.5-7.5 0-3.5-2.2-6.5-5.5-7.5" />
      {/* Duodenum exit curve */}
      <path d="M10.5 22c1.5 0 2.8-.7 3.5-1.8.8-1.2 1-2.7 1-4.2" />
      {/* Micro digestive dots */}
      <circle cx="11.5" cy="14.5" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="13.5" cy="16.5" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="10" cy="17" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

function BrainIcon({ className = "w-9 h-9" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Left hemisphere lobes */}
      <path d="M12 5a3.5 3.5 0 0 0-3.5-2.5 4 4 0 0 0-4 4 3.5 3.5 0 0 0-1.5 3.5 3.5 3.5 0 0 0 1 3.5 4 4 0 0 0 0 3 3.5 3.5 0 0 0 3.5 3 3.5 3.5 0 0 0 4.5-2" />
      {/* Right hemisphere lobes */}
      <path d="M12 5a3.5 3.5 0 0 1 3.5-2.5 4 4 0 0 1 4 4 3.5 3.5 0 0 1 1.5 3.5 3.5 3.5 0 0 1-1 3.5 4 4 0 0 1 0 3 3.5 3.5 0 0 1-3.5 3 3.5 3.5 0 0 1-4.5-2" />
      {/* Central dividing line */}
      <path d="M12 2.5V19.5" />
      {/* Inner gyri / convolutions */}
      <path d="M7.5 9.5a2 2 0 0 1 2.5 2" />
      <path d="M16.5 9.5a2 2 0 0 0-2.5 2" />
      <path d="M7 14.5a2 2 0 0 0 2.5 1" />
      <path d="M17 14.5a2 2 0 0 1-2.5 1" />
    </svg>
  );
}

function MuscleArmIcon({ className = "w-9 h-9" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Flexed bicep arm outline */}
      <path d="M6 18h9a4 4 0 0 0 4-4c0-2-1.2-3.8-3-4.5" />
      <path d="M16 9.5c.2-1.5-.5-3.5-2.5-4.5-2.2-1.1-4.5-.2-5.5 1.5-1 1.8-.5 4.5-2 6" />
      <path d="M6 12.5C4.5 13.5 4 15 4 17c0 1 .5 1.5 2 1.5" />
      {/* Bicep muscle peak definition */}
      <path d="M10 8.5c1.2.8 2.2 2 2.5 3.5" />
      <path d="M7.5 15c2 .5 4 .2 5.5-.5" />
    </svg>
  );
}

function ImmunityShieldIcon({ className = "w-9 h-9" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Outer shield boundary */}
      <path d="M12 3s6 2.5 8 3.5c0 6-2 11-8 14-6-3-8-8-8-14 2-1 8-3.5 8-3.5z" />
      {/* Inner molecule / honeycomb ring */}
      <path d="M12 8l3 1.8v3.4L12 15l-3-1.8V9.8L12 8z" />
      {/* Central core node */}
      <circle cx="12" cy="11.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

const BENEFITS: BenefitItem[] = [
  {
    id: "gut",
    title: "Gut Health",
    description: "Prebiotics feed good bacteria to boost nutrient absorption",
    icon: StomachIcon,
  },
  {
    id: "brain",
    title: "Brain Health",
    description: "Thiamin, folate, and mushrooms support clarity and brain health",
    icon: BrainIcon,
  },
  {
    id: "energy",
    title: "Energy & Body",
    description: "Thiamin, folate, and mushrooms support clarity and brain health",
    icon: MuscleArmIcon,
  },
  {
    id: "immunity",
    title: "Immunity",
    description: "Immunity and stress relief from Vitamin C and D, Zinc",
    icon: ImmunityShieldIcon,
  },
];

export function StorefrontGutHealthSection() {
  return (
    <section className="relative z-10 bg-white py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-[1400px] px-6 sm:px-10 lg:px-14">
        {/* Section Heading */}
        <div className="text-center">
          <h2 className="font-serif text-3xl font-normal tracking-tight text-slate-900 sm:text-4xl md:text-5xl lg:text-[52px]">
            The future of gut health
          </h2>
        </div>

        {/* 4 Feature Columns */}
        <div className="mt-14 sm:mt-16 lg:mt-20 grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          {BENEFITS.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                className="group flex flex-col items-center text-center"
              >
                {/* Soft Mint Circular Icon Container */}
                <div className="flex h-24 w-24 sm:h-28 sm:w-28 items-center justify-center rounded-full bg-[#dbe8de] text-stone-800 transition-transform duration-300 ease-out group-hover:scale-105">
                  <Icon className="h-10 w-10 sm:h-11 sm:w-11 stroke-[1.4]" />
                </div>

                {/* Benefit Title: Editorial Serif Font */}
                <h3 className="mt-6 sm:mt-7 font-serif text-2xl font-normal tracking-tight text-stone-900 sm:text-[26px]">
                  {item.title}
                </h3>

                {/* Benefit Description: matching formulations section subtitle style and font size */}
                <p className="mt-4 max-w-[280px] text-sm leading-relaxed text-stone-500 sm:text-base">
                  {item.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
