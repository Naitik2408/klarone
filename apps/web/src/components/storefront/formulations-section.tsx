"use client";

import Link from "next/link";
import { motion } from "motion/react";

interface FormulationCard {
  id: string;
  tag: string;
  titlePrimary: string;
  titleSecondary: string;
  imageSrc: string;
  ctaText: string;
  ctaLink: string;
  miniProductBottle: "white_tin" | "green_jar" | "green_bottle";
}

const FORMULATIONS: FormulationCard[] = [
  {
    id: "f-1",
    tag: "Nutrient Support",
    titlePrimary: "Support metabolic",
    titleSecondary: "balance",
    imageSrc: "/formulation-1.jpg",
    ctaText: "Shop Now",
    ctaLink: "#featured-products",
    miniProductBottle: "white_tin",
  },
  {
    id: "f-2",
    tag: "Immune Defense",
    titlePrimary: "Strengthen natural",
    titleSecondary: "immunity",
    imageSrc: "/formulation-2.jpg",
    ctaText: "Shop Now",
    ctaLink: "#featured-products",
    miniProductBottle: "green_jar",
  },
  {
    id: "f-3",
    tag: "Mind & Focus",
    titlePrimary: "Promote cognitive",
    titleSecondary: "health",
    imageSrc: "/formulation-3.jpg",
    ctaText: "Shop Now",
    ctaLink: "#featured-products",
    miniProductBottle: "green_bottle",
  },
];

/* Helper to render the tiny floating white pill badge with product thumbnail inside at bottom right */
function MiniProductBadge({ type }: { type: FormulationCard["miniProductBottle"] }) {
  return (
    <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-white p-1.5 shadow-md ring-1 ring-black/5 sm:h-12 sm:w-12">
      {type === "white_tin" && (
        <div className="flex flex-col items-center">
          <div className="h-1.5 w-5 rounded-t-xs bg-stone-700" />
          <div className="flex h-6 w-5 flex-col items-center justify-center rounded-b-xs bg-stone-100 border border-stone-200">
            <span className="font-serif text-[5px] font-bold text-stone-900">wellina</span>
          </div>
        </div>
      )}
      {type === "green_jar" && (
        <div className="flex flex-col items-center">
          <div className="h-1.5 w-5 rounded-t-xs bg-gradient-to-r from-stone-300 to-stone-400" />
          <div className="flex h-6 w-5 flex-col items-center justify-center rounded-b-xs bg-[#52794c] border border-[#40623a]">
            <span className="font-serif text-[5px] font-bold text-white">wellina</span>
          </div>
        </div>
      )}
      {type === "green_bottle" && (
        <div className="flex flex-col items-center">
          <div className="h-1.5 w-3.5 rounded-t-xs bg-white border-t border-stone-300" />
          <div className="flex h-6 w-4.5 flex-col items-center justify-center rounded-b-md bg-[#2d502f] border border-[#1f3b21]">
            <span className="font-serif text-[4.5px] font-bold text-emerald-100">wellina</span>
          </div>
        </div>
      )}
    </div>
  );
}

export function StorefrontFormulationsSection() {
  return (
    <section className="relative z-10 bg-white pt-12 pb-28 md:pt-16 md:pb-36">
      <div className="mx-auto max-w-[1560px] px-6 sm:px-10 lg:px-14">
        {/* Section Header */}
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-600 sm:text-sm">
            FORMULATIONS
          </span>

          <h2 className="mt-3 font-serif text-4xl font-normal tracking-tight text-slate-900 sm:text-5xl lg:text-[58px]">
            Science-backed formulations
          </h2>

          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-stone-500 sm:text-base">
            Our targeted blends combine research-backed ingredients with thoughtful
            formulation to support lasting vitality, balance
          </p>
        </div>

        {/* 3 Formulation Feature Cards Grid with reduced compact height */}
        <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {FORMULATIONS.map((card) => (
            <div
              key={card.id}
              className="group relative flex h-[460px] sm:h-[480px] w-full flex-col justify-between overflow-hidden rounded-[26px] bg-stone-900 p-7 text-white shadow-sm sm:p-8"
            >
              {/* Background Photography Image using standard img tag with priority cover */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={card.imageSrc}
                alt={card.titlePrimary}
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                loading="eager"
              />

              {/* Gradient overlay: Top subtle vignette so tag & headline pop, bottom vignette for buttons */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/15 to-black/60 pointer-events-none" />

              {/* TOP CONTENT: Tag Pill + Headline positioned directly at the top with proper spacing */}
              <div className="relative z-10 flex flex-col items-start pt-1">
                {/* Top Tag Pill */}
                <span className="inline-block rounded-full bg-white/20 px-3.5 py-1.5 text-xs font-medium text-white backdrop-blur-md shadow-2xs">
                  {card.tag}
                </span>

                {/* Headline: Exactly matching the size of 'Science-backed formulations' (text-4xl sm:text-5xl lg:text-[58px]) */}
                <h3 className="mt-5 font-serif text-4xl font-normal leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-[58px]">
                  <span>{card.titlePrimary}</span>
                  <br />
                  <span>{card.titleSecondary}</span>
                </h3>
              </div>

              {/* BOTTOM CONTENT: Shop Now clean rounded pill button on the left, Mini Product Badge on the right */}
              <div className="relative z-10 mt-auto flex items-end justify-between pt-4">
                {/* Pale Lime Rounded Pill Button with explicit black text (no inheritance) */}
                <Link
                  href={card.ctaLink}
                  style={{ color: "#000000" }}
                  className="group/btn inline-flex items-center justify-center rounded-full bg-[#d6f088] px-6 py-2.5 text-sm font-semibold tracking-tight text-black !text-black shadow-md transition-all duration-200 hover:scale-105 hover:bg-[#c8e678] active:scale-95"
                >
                  <span style={{ color: "#000000" }} className="text-black !text-black">
                    {card.ctaText}
                  </span>
                </Link>

                {/* Floating White Thumbnail Box */}
                <div className="transition-transform duration-300 group-hover:scale-105">
                  <MiniProductBadge type={card.miniProductBottle} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
