"use client";

import React from "react";
import Link from "next/link";

interface ServiceItem {
  id: string;
  title: string;
  description: string;
  link: string;
  icon: (props: { className?: string }) => React.JSX.Element;
}

/* Custom crafted clean line-art icons matching the storefront design aesthetic */

// 1. Klarone Select (AI + Advisor Sparkle Compass)
function SelectAdvisorIcon({ className = "w-9 h-9" }: { className?: string }) {
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
      <circle cx="12" cy="12" r="9" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

// 2. Klarone Setup (Laptop + Data Sync / Optimization)
function SetupLapIcon({ className = "w-9 h-9" }: { className?: string }) {
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
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M2 18h20" />
      <path d="M8 10l3 3 5-5" />
      <circle cx="12" cy="18" r="0.8" fill="currentColor" />
    </svg>
  );
}

// 3. Klarone Care (Protective Shield + Continuous Care)
function CareShieldIcon({ className = "w-9 h-9" }: { className?: string }) {
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
      <path d="M12 3s6 2.5 8 3.5c0 6-2 11-8 14-6-3-8-8-8-14 2-1 8-3.5 8-3.5z" />
      <path d="M12 8v8" />
      <path d="M8 12h8" />
    </svg>
  );
}

// 4. Klarone Upgrade & Repair (Precision Screwdriver / Hardware Tuning)
function UpgradeWrenchIcon({ className = "w-9 h-9" }: { className?: string }) {
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
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
      <circle cx="7.5" cy="16.5" r="1" fill="currentColor" />
    </svg>
  );
}

// 4 Core Klarone Services defined in 01-KLARONE-VISION.md
const SERVICES: ServiceItem[] = [
  {
    id: "select",
    title: "Klarone Select",
    description: "AI guidance + expert matching to find the exact machine for your workload",
    link: "/select",
    icon: SelectAdvisorIcon,
  },
  {
    id: "setup",
    title: "Klarone Setup",
    description: "OS tuning, data migration, and software configured before dispatch",
    link: "/laptops",
    icon: SetupLapIcon,
  },
  {
    id: "care",
    title: "Klarone Care",
    description: "Direct local Kolkata assistance, warranty claims, and continuous advice",
    link: "/account",
    icon: CareShieldIcon,
  },
  {
    id: "upgrade",
    title: "Klarone Upgrade",
    description: "Certified NVMe SSD, RAM expansions, and professional hardware maintenance",
    link: "/laptops",
    icon: UpgradeWrenchIcon,
  },
];

export function StorefrontGutHealthSection() {
  return (
    <section className="relative z-10 bg-white py-12 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-10 lg:px-14">
        {/* Section Heading */}
        <div className="text-center">
          <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-[0.25em] text-stone-600 sm:text-sm">
            THE OWNERSHIP ECOSYSTEM
          </span>
          <h2 className="mt-2.5 sm:mt-3 font-serif text-3xl font-normal tracking-tight text-slate-900 sm:text-4xl md:text-5xl lg:text-[52px]">
            The complete laptop experience
          </h2>
          <p className="mt-3 sm:mt-4 max-w-xl mx-auto text-xs sm:text-base leading-relaxed text-stone-500">
            From discovering the right configuration to post-delivery tuning and lifetime upgrades.
          </p>
        </div>

        {/* 4 Feature Columns: 2 cols on mobile/tablet, 4 on desktop */}
        <div className="mt-10 sm:mt-16 lg:mt-20 grid grid-cols-2 gap-6 sm:gap-10 lg:grid-cols-4 lg:gap-8">
          {SERVICES.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.id}
                href={item.link}
                className="group flex flex-col items-center text-center cursor-pointer transition-transform duration-200"
              >
                {/* Soft Mint Circular Icon Container */}
                <div className="flex h-20 w-20 sm:h-28 sm:w-28 items-center justify-center rounded-full bg-[#dbe8de] text-stone-800 transition-all duration-300 ease-out group-hover:scale-105 group-hover:bg-[#d0e2d4] group-hover:shadow-sm">
                  <Icon className="h-8 w-8 sm:h-11 sm:w-11 stroke-[1.4]" />
                </div>

                {/* Service Title: Editorial Serif Font */}
                <h3 className="mt-4 sm:mt-7 font-serif text-xl sm:text-[26px] font-normal tracking-tight text-stone-900 group-hover:text-slate-950 transition-colors">
                  {item.title}
                </h3>

                {/* Service Description matching exact original length and tone */}
                <p className="mt-2 sm:mt-4 max-w-[280px] text-xs sm:text-base leading-relaxed text-stone-500">
                  {item.description}
                </p>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
