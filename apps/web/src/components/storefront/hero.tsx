"use client";

import { useState, useEffect } from "react";
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
    subtitle: "KLARONE SELECT",
    titlePrimary: "Find the right laptop",
    titleSecondary: "with guided AI.",
    ctaText: "Get Advice",
    ctaLink: "/select",
    leftBg: "#8b9c75",
    rightBg: "#2d4422",
  },
  {
    id: 2,
    subtitle: "PRECISION MATCHING",
    titlePrimary: "Tell us what you do",
    titleSecondary: "we find your fit.",
    ctaText: "Find Laptop",
    ctaLink: "/select",
    leftBg: "#7f9169",
    rightBg: "#263c1d",
  },
  {
    id: 3,
    subtitle: "UNBIASED ADVICE",
    titlePrimary: "Transparent specs,",
    titleSecondary: "genuine reason.",
    ctaText: "Start Fitting",
    ctaLink: "/select",
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

  // Continuous auto-slide every 4.5 seconds (never pauses on hover)
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlideIndex((prev) => (prev + 1) % SLIDES.length);
    }, 4500);

    return () => clearInterval(timer);
  }, []);

  const slide = SLIDES[currentSlideIndex];

  return (
    /* 
      Sticky hero container: Stays anchored on screen while the following product
      section scrolls and slides over it smoothly with rounded corners and shadow elevation.
    */
    <div className="sticky top-0 z-0 h-screen w-full overflow-hidden bg-[#07090e]">
      {/* Cinematic Night Cityscape Architecture Background */}
      <div className="absolute inset-0 -z-10 h-full w-full overflow-hidden">
        {/* Photographic Dusk Cityscape Layer */}
        <div
          className="absolute inset-0 h-full w-full bg-cover bg-center bg-no-repeat transition-transform duration-1000 scale-[1.02]"
          style={{
            backgroundImage: "url('/hero-laptop-detail.jpg')",
          }}
        />

        {/* Top Dark Vignette: keeps floating navbar & upper text perfectly legible */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/20 to-black/40" />

        {/* Radial Center Glow: softens illuminated office cubicles in midground */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(0,0,0,0)_0%,_rgba(0,0,0,0.40)_100%)]" />

        {/* Bottom Atmospheric Fade: seamlessly grounds into the following section */}
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#07090e] to-transparent" />
      </div>

      <div className="relative mx-auto flex h-full max-w-7xl flex-col items-center justify-between px-4 pt-24 pb-8 text-center sm:px-6 sm:justify-center sm:pt-16 sm:pb-12 lg:px-8">
        <div className="hidden sm:block sm:h-4" />

        <AnimatePresence mode="wait">
          <motion.div
            key={slide.id}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="flex my-auto flex-col items-center"
          >
            {/* Category Eyebrow */}
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/90 drop-shadow-sm sm:mb-4 sm:text-sm">
              {slide.subtitle}
            </p>

            {/* Editorial Serif Headline */}
            <h1 className="max-w-4xl font-serif text-[42px] font-normal leading-[1.08] tracking-tight text-white drop-shadow-sm sm:text-7xl md:text-8xl lg:text-[104px]">
              <span className="block">{slide.titlePrimary}</span>
              <span className="block font-serif italic font-normal tracking-normal text-white">
                {slide.titleSecondary}
              </span>
            </h1>

            {/* CTA Pill Button with circle arrow */}
            <div className="mt-8 flex items-center justify-center sm:mt-9">
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

        {/* Bottom Pagination & Interactive Controls (lifted ~1.5cm / 56px on mobile screens) */}
        <div className="mt-auto mb-14 sm:mb-0 pb-2 sm:pb-0 flex w-full max-w-xs items-center justify-between text-white/95 sm:mt-12 sm:w-auto sm:gap-6 z-20">
          {/* Slide Indicator */}
          <span className="min-w-[36px] text-xs font-medium tracking-widest sm:text-sm">
            {currentSlideIndex + 1} / {SLIDES.length}
          </span>

          {/* Smooth Progress Bar Line */}
          <div className="mx-3 h-[2px] flex-1 overflow-hidden rounded-full bg-white/35 sm:mx-0 sm:w-24 sm:flex-none">
            <motion.div
              className="h-full bg-white"
              animate={{ width: `${((currentSlideIndex + 1) / SLIDES.length) * 100}%` }}
              transition={{ duration: 0.35, ease: "easeOut" }}
            />
          </div>

          {/* Navigation Arrows */}
          <div className="flex items-center gap-2 relative z-30">
            <button
              type="button"
              onClick={prevSlide}
              aria-label="Previous slide"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white shadow-xs backdrop-blur-xs transition-all duration-150 hover:bg-white/30 active:scale-90"
            >
              <svg className="h-4 w-4 stroke-[3px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              type="button"
              onClick={nextSlide}
              aria-label="Next slide"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white shadow-xs backdrop-blur-xs transition-all duration-150 hover:bg-white/30 active:scale-90"
            >
              <svg className="h-4 w-4 stroke-[3px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
