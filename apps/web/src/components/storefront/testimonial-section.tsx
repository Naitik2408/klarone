"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";

function ChevronLeftIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function ChevronRightIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

function CheckIcon({ className = "h-2.5 w-2.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

interface Testimonial {
  id: string;
  quote: string;
  author: string;
  verified: boolean;
  avatarSrc: string;
  lifestyleImage: string;
  product: {
    name: string;
    price: string;
    bottleColor: "green" | "white";
    link: string;
  };
}

const TESTIMONIALS: Testimonial[] = [
  {
    id: "test-1",
    quote:
      "“I feel noticeably lighter after meals, and my constant bloating has finally disappeared. It feels like my digestive system is finally in sync.”",
    author: "Elena Rostova",
    verified: true,
    avatarSrc: "/testimonial-avatar.jpg",
    lifestyleImage: "/testimonial-lifestyle-1.jpg",
    product: {
      name: "Synbiotic Core",
      price: "$48.00",
      bottleColor: "white",
      link: "#featured-products",
    },
  },
  {
    id: "test-2",
    quote:
      "“My morning brain fog lifted within two weeks. I have clean, sustained focus without needing three cups of coffee to get through the afternoon.”",
    author: "Marcus Chen",
    verified: true,
    avatarSrc: "/testimonial-avatar.jpg",
    lifestyleImage: "/testimonial-lifestyle-2.jpg",
    product: {
      name: "Clarity Mushroom",
      price: "$52.00",
      bottleColor: "green",
      link: "#featured-products",
    },
  },
  {
    id: "test-3",
    quote:
      "“I didn’t realize how off I felt until I started taking this. My digestion improved significantly, and my mood lifted.”",
    author: "Henry Sterling",
    verified: true,
    avatarSrc: "/testimonial-avatar.jpg",
    lifestyleImage: "/testimonial-lifestyle-3.jpg",
    product: {
      name: "Active Burn",
      price: "$54.00",
      bottleColor: "green",
      link: "#featured-products",
    },
  },
];

const AUTOPLAY_DURATION_MS = 6000; // 6 seconds per testimonial slide

export function StorefrontTestimonialSection() {
  const [currentIndex, setCurrentIndex] = useState(2); // Start on slide 3 matching screenshot
  const [progress, setProgress] = useState(0); // 0 to 100% for the active slide duration
  const [direction, setDirection] = useState<1 | -1>(1);

  // Auto-play interval with smooth real-time progress update (continuous, never interrupted by hover)
  useEffect(() => {
    const intervalStep = 50; // update progress every 50ms
    const stepIncrement = (intervalStep / AUTOPLAY_DURATION_MS) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev + stepIncrement >= 100) {
          setDirection(1);
          setCurrentIndex((idx) => (idx + 1) % TESTIMONIALS.length);
          return 0;
        }
        return prev + stepIncrement;
      });
    }, intervalStep);

    return () => clearInterval(timer);
  }, [currentIndex]);

  const handlePrev = () => {
    setProgress(0);
    setDirection(-1);
    setCurrentIndex((prev) => (prev === 0 ? TESTIMONIALS.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setProgress(0);
    setDirection(1);
    setCurrentIndex((prev) => (prev === TESTIMONIALS.length - 1 ? 0 : prev + 1));
  };

  const current = TESTIMONIALS[currentIndex];

  return (
    <section className="relative z-10 w-full overflow-hidden bg-[#162e20] text-white">
      <div className="grid grid-cols-1 lg:grid-cols-2">
        {/* LEFT COLUMN: Full bleed lifestyle photo with smooth crossfade and floating product card */}
        <div className="relative min-h-[480px] sm:min-h-[560px] lg:min-h-[660px] xl:min-h-[720px] w-full overflow-hidden">
          {/* Smooth Image Crossfade Transition with scale drift */}
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={current.id}
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.85, ease: [0.25, 1, 0.5, 1] }}
              className="absolute inset-0 h-full w-full"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={current.lifestyleImage}
                alt="Customer lifestyle experience"
                className="h-full w-full object-cover object-center"
              />
            </motion.div>
          </AnimatePresence>

          {/* Subtle soft gradient over image */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/10 pointer-events-none z-10" />

          {/* Floating Product Glass Card with smooth content transition */}
          <div className="absolute bottom-6 left-6 sm:bottom-10 sm:left-10 z-20 flex items-center justify-between gap-4 rounded-2xl bg-black/40 backdrop-blur-md border border-white/20 p-3 sm:p-3.5 shadow-2xl min-w-[280px] sm:min-w-[320px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={current.product.name}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="flex items-center gap-3"
              >
                {/* Product mini bottle box */}
                <div className="flex h-14 w-12 items-center justify-center rounded-xl bg-white/95 p-1.5 shadow-xs">
                  {current.product.bottleColor === "green" ? (
                    <div className="flex flex-col items-center">
                      <div className="h-1.5 w-3 rounded-t-xs bg-stone-300" />
                      <div className="flex h-7 w-4.5 flex-col items-center justify-center rounded-b-sm bg-[#385f39] border border-[#2a492b]">
                        <span className="font-serif text-[4px] font-bold text-white">w</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <div className="h-1.5 w-4 rounded-t-xs bg-stone-700" />
                      <div className="flex h-7 w-4.5 flex-col items-center justify-center rounded-b-sm bg-stone-100 border border-stone-200">
                        <span className="font-serif text-[4px] font-bold text-stone-900">w</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Product Info */}
                <div className="flex flex-col">
                  <span className="text-sm font-semibold tracking-tight text-white">
                    {current.product.name}
                  </span>
                  <span className="text-xs text-stone-300">
                    {current.product.price}
                  </span>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Shop Pill Button */}
            <Link
              href={current.product.link}
              style={{ color: "#000000" }}
              className="group/btn inline-flex items-center justify-center rounded-full bg-[#d6f088] px-6 py-2.5 text-sm font-semibold tracking-tight text-black !text-black shadow-md transition-all duration-200 hover:scale-105 hover:bg-[#c8e678] active:scale-95 shrink-0"
            >
              <span style={{ color: "#000000" }} className="text-black !text-black font-semibold">
                Shop
              </span>
            </Link>
          </div>
        </div>

        {/* RIGHT COLUMN: Deep Forest Green background, Large Serif Editorial Quote with animated transitions */}
        <div className="flex flex-col justify-between bg-[#162e20] p-8 sm:p-12 md:p-16 lg:p-20 xl:p-24 relative overflow-hidden">
          {/* Main Testimonial Quote & Author Animated Block */}
          <div className="my-auto pt-4 pb-12 sm:pb-16 min-h-[300px] flex flex-col justify-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={current.id}
                initial={{ opacity: 0, y: direction * 14, filter: "blur(4px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: direction * -14, filter: "blur(4px)" }}
                transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                className="flex flex-col"
              >
                <blockquote className="font-serif text-3xl font-normal leading-[1.25] tracking-tight text-white sm:text-4xl md:text-[42px] lg:text-[46px] xl:text-[50px]">
                  {current.quote}
                </blockquote>

                {/* Author Profile */}
                <div className="mt-10 sm:mt-12 flex items-center gap-4">
                  {/* Circular Avatar */}
                  <div className="relative h-14 w-14 sm:h-16 sm:w-16 overflow-hidden rounded-full ring-2 ring-white/10 shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={current.avatarSrc}
                      alt={current.author}
                      className="h-full w-full object-cover"
                    />
                  </div>

                  {/* Author name & verified pill */}
                  <div className="flex flex-col">
                    <span className="font-serif text-xl sm:text-2xl font-normal tracking-tight text-white">
                      {current.author}
                    </span>
                    <div className="mt-1 flex items-center gap-1.5 text-xs text-stone-300">
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white text-[#162e20]">
                        <CheckIcon className="h-2.5 w-2.5 stroke-[3]" />
                      </span>
                      <span className="font-medium tracking-tight">Verify Customer</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* BOTTOM CONTROLS: 3 / 3 indicator, Progress Duration Line, Prev/Next arrows */}
          <div className="flex items-center justify-between gap-6 pt-6 border-t border-white/10">
            {/* Slide Index Counter */}
            <span className="text-sm font-medium tracking-wider text-white">
              {currentIndex + 1} / {TESTIMONIALS.length}
            </span>

            {/* Slider Progress Bar representing duration of current slide */}
            <div className="relative h-[2px] flex-1 max-w-[420px] rounded-full bg-white/20 overflow-hidden">
              <div
                className="h-full bg-white transition-all duration-75 ease-linear"
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* Navigation Arrows */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handlePrev}
                aria-label="Previous testimonial"
                className="flex h-8 w-8 items-center justify-center rounded-full text-white/80 transition-colors hover:text-white hover:bg-white/10 active:scale-95"
              >
                <ChevronLeftIcon className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={handleNext}
                aria-label="Next testimonial"
                className="flex h-8 w-8 items-center justify-center rounded-full text-white/80 transition-colors hover:text-white hover:bg-white/10 active:scale-95"
              >
                <ChevronRightIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
