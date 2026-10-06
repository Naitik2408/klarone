"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";

interface SlideData {
  id: number;
  subtitle: string;
  titlePrimary: string;
  titleSecondary: string;
  ctaText: string;
  ctaLink: string;
  leftBg: string;
  rightBg: string;
}

const SLIDES: SlideData[] = [
  {
    id: 1,
    subtitle: "FORMULATIONS",
    titlePrimary: "Whole body health",
    titleSecondary: "starts in the gut.",
    ctaText: "Shop Now",
    ctaLink: "#featured-products",
    leftBg: "#8b9c75",
    rightBg: "#2d4422",
  },
  {
    id: 2,
    subtitle: "DAILY NOURISHMENT",
    titlePrimary: "Clean botanical fuel",
    titleSecondary: "for mind & body.",
    ctaText: "Explore More",
    ctaLink: "#featured-products",
    leftBg: "#7f9169",
    rightBg: "#263c1d",
  },
  {
    id: 3,
    subtitle: "PURE BALANCE",
    titlePrimary: "Clinically validated",
    titleSecondary: "living cultures.",
    ctaText: "Shop Collection",
    ctaLink: "#featured-products",
    leftBg: "#869870",
    rightBg: "#2a4020",
  },
];

export function StorefrontHero() {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  function nextSlide() {
    setCurrentSlideIndex((prev) => (prev + 1) % SLIDES.length);
  }

  function prevSlide() {
    setCurrentSlideIndex((prev) => (prev - 1 + SLIDES.length) % SLIDES.length);
  }

  const slide = SLIDES[currentSlideIndex];

  return (
    /* 
      Sticky hero container: Stays anchored on screen while the following product
      section scrolls and slides over it smoothly with rounded corners and shadow elevation.
    */
    <div className="sticky top-0 z-0 h-screen w-full overflow-hidden">
      {/* Background Split Screen */}
      <div className="absolute inset-0 -z-10 flex h-full w-full">
        {/* Left half: Soft organic sage/moss tone */}
        <div
          className="relative h-full w-1/2 transition-colors duration-700 ease-out"
          style={{ backgroundColor: slide.leftBg }}
        >
          <div className="absolute inset-0 bg-gradient-to-tr from-black/15 via-transparent to-white/10" />
        </div>

        {/* Right half: Lush palm leaf deep green with subtle frond diagonal lines */}
        <div
          className="relative h-full w-1/2 transition-colors duration-700 ease-out"
          style={{
            backgroundColor: slide.rightBg,
            backgroundImage: `
              radial-gradient(ellipse at 35% 50%, rgba(255,255,255,0.08), transparent 65%),
              repeating-linear-gradient(
                115deg,
                rgba(0, 0, 0, 0.12) 0px,
                rgba(0, 0, 0, 0.12) 2px,
                transparent 2px,
                transparent 16px
              )
            `,
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-bl from-transparent via-transparent to-black/20" />
        </div>
      </div>

      <div className="relative mx-auto flex h-full max-w-7xl flex-col items-center justify-center px-4 pt-16 pb-12 text-center sm:px-6 lg:px-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={slide.id}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center"
          >
            {/* Category Eyebrow */}
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.22em] text-white/90 drop-shadow-sm sm:text-sm">
              {slide.subtitle}
            </p>

            {/* Editorial Serif Headline */}
            <h1 className="max-w-4xl font-serif text-[52px] font-normal leading-[1.08] tracking-tight text-white drop-shadow-sm sm:text-7xl md:text-8xl lg:text-[104px]">
              <span className="block">{slide.titlePrimary}</span>
              <span className="block font-serif italic font-normal tracking-normal text-white">
                {slide.titleSecondary}
              </span>
            </h1>

            {/* CTA Pill Button with circle arrow */}
            <div className="mt-9 flex items-center justify-center">
              <Link
                href={slide.ctaLink}
                className="group flex items-center gap-3.5 rounded-full bg-[#d6f088] py-2.5 pl-6 pr-2.5 text-sm font-semibold tracking-tight text-slate-900 shadow-md transition-all duration-200 hover:scale-105 hover:bg-[#c8e678] active:scale-95"
              >
                <span>{slide.ctaText}</span>
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
          </motion.div>
        </AnimatePresence>

        {/* Bottom Pagination & Interactive Controls */}
        <div className="mt-12 flex items-center gap-6 text-white/95">
          {/* Slide Indicator */}
          <span className="min-w-[40px] text-xs font-medium tracking-widest sm:text-sm">
            {currentSlideIndex + 1} / {SLIDES.length}
          </span>

          {/* Smooth Progress Bar Line */}
          <div className="h-[2px] w-16 overflow-hidden rounded-full bg-white/35 sm:w-24">
            <motion.div
              className="h-full bg-white"
              animate={{ width: `${((currentSlideIndex + 1) / SLIDES.length) * 100}%` }}
              transition={{ duration: 0.35, ease: "easeOut" }}
            />
          </div>

          {/* Navigation Arrows */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={prevSlide}
              aria-label="Previous slide"
              className="flex h-8 w-8 items-center justify-center rounded-full text-white/80 transition-colors duration-150 hover:bg-white/15 hover:text-white active:scale-90"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              type="button"
              onClick={nextSlide}
              aria-label="Next slide"
              className="flex h-8 w-8 items-center justify-center rounded-full text-white/80 transition-colors duration-150 hover:bg-white/15 hover:text-white active:scale-90"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
