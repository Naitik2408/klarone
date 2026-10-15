"use client";

import Link from "next/link";
import type { CatalogueCollection } from "../../types/catalogue";

interface StorefrontFormulationsSectionProps {
  initialCollections?: CatalogueCollection[];
}

// Fallback high-resolution lifestyle images for collections when no bannerImage is uploaded yet
const FALLBACK_COLLECTION_CARDS = [
  {
    tag: "Pro Creation",
    titlePrimary: "Video Editing &",
    titleSecondary: "Content Creation",
    slug: "content-creation",
    fallbackImage: "/formulation-1.jpg",
    description: "Color-accurate 100% sRGB/DCI-P3 panels and GPU acceleration",
  },
  {
    tag: "Ultra-Portable",
    titlePrimary: "Ultra-Portable &",
    titleSecondary: "All-Day Battery",
    slug: "thin-light-travel",
    fallbackImage: "/formulation-2.jpg",
    description: "Sub-1.5kg ultrabooks with 10+ hour battery life for hybrid professionals",
  },
  {
    tag: "Flagship Choice",
    titlePrimary: "Top Rated &",
    titleSecondary: "Flagship Picks",
    slug: "top-picks",
    fallbackImage: "/formulation-3.jpg",
    description: "Handpicked benchmark laptops known for uncompromising build quality",
  },
];

/* Helper to render the tiny floating badge with subtle laptop icon at bottom right */
function MiniProductBadge() {
  return (
    <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-white p-1.5 shadow-md ring-1 ring-black/5 sm:h-12 sm:w-12 text-slate-800">
      <svg
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0H3"
        />
      </svg>
    </div>
  );
}

// Split collection title nicely into primary and secondary lines if needed
function formatCollectionTitle(title: string) {
  if (title.includes("&")) {
    const parts = title.split("&");
    return {
      primary: parts[0]?.trim() ? `${parts[0].trim()} &` : title,
      secondary: parts.slice(1).join("&").trim() || "",
    };
  }
  const words = title.split(" ");
  if (words.length <= 2) {
    return { primary: words[0] || "", secondary: words.slice(1).join(" ") };
  }
  const midpoint = Math.ceil(words.length / 2);
  return {
    primary: words.slice(0, midpoint).join(" "),
    secondary: words.slice(midpoint).join(" "),
  };
}

export function StorefrontFormulationsSection({
  initialCollections = [],
}: StorefrontFormulationsSectionProps) {
  // Take top 3 collections from database/admin panel
  // Prioritize collections with bannerImage, or take top 3 available
  const dbCollections = [...initialCollections]
    .sort((a, b) => {
      if (a.bannerImage && !b.bannerImage) return -1;
      if (!a.bannerImage && b.bannerImage) return 1;
      return 0;
    })
    .slice(0, 3);

  // Map to 3 display cards, falling back gracefully
  const cards = Array.from({ length: 3 }).map((_, idx) => {
    const col = dbCollections[idx];
    const fallback = FALLBACK_COLLECTION_CARDS[idx] || FALLBACK_COLLECTION_CARDS[0];

    if (!col) {
      return {
        id: `fallback-${idx}`,
        tag: fallback.tag,
        titlePrimary: fallback.titlePrimary,
        titleSecondary: fallback.titleSecondary,
        imageSrc: fallback.fallbackImage,
        ctaLink: `/laptops?collectionSlug=${fallback.slug}`,
      };
    }

    const { primary, secondary } = formatCollectionTitle(col.title);
    return {
      id: String(col.id),
      tag: fallback.tag,
      titlePrimary: primary,
      titleSecondary: secondary,
      imageSrc: col.bannerImage || fallback.fallbackImage,
      ctaLink: `/laptops?collectionSlug=${col.slug}`,
    };
  });

  return (
    <section className="relative z-10 bg-white pt-8 pb-20 sm:pt-12 sm:pb-28 md:pt-16 md:pb-36">
      <div className="mx-auto max-w-[1560px] px-4 sm:px-10 lg:px-14">
        {/* Section Header */}
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-[0.25em] text-stone-600 sm:text-sm">
            CURATED COLLECTIONS
          </span>

          <h2 className="mt-2.5 sm:mt-3 font-serif text-3xl sm:text-5xl lg:text-[58px] font-normal tracking-tight text-slate-900">
            Engineered for every workflow
          </h2>

          <p className="mt-3 sm:mt-4 max-w-2xl text-xs sm:text-base leading-relaxed text-stone-500">
            Explore curated machines tailored for intensive video production, software compilation,
            and all-day untethered mobility.
          </p>
        </div>

        {/* 3 Top Collection Feature Cards Grid */}
        <div className="mt-10 sm:mt-14 grid grid-cols-1 gap-5 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => (
            <div
              key={card.id}
              className="group relative flex h-[390px] sm:h-[480px] w-full flex-col justify-between overflow-hidden rounded-[22px] sm:rounded-[26px] bg-stone-900 p-6 sm:p-8 text-white shadow-sm"
            >
              {/* Background Collection Image (From Admin Panel bannerImage or fallback) */}
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
                <span className="inline-block rounded-full bg-white/20 px-3 py-1 sm:px-3.5 sm:py-1.5 text-[11px] sm:text-xs font-medium text-white backdrop-blur-md shadow-2xs">
                  {card.tag}
                </span>

                {/* Headline: responsive scale */}
                <h3 className="mt-4 sm:mt-5 font-serif text-3xl sm:text-5xl lg:text-[58px] font-normal leading-[1.05] tracking-tight text-white">
                  <span>{card.titlePrimary}</span>
                  {card.titleSecondary && (
                    <>
                      <br />
                      <span>{card.titleSecondary}</span>
                    </>
                  )}
                </h3>
              </div>

              {/* BOTTOM CONTENT: Explore / Shop Now clean rounded pill button on the left, Mini Product Badge on the right */}
              <div className="relative z-10 mt-auto flex items-end justify-between pt-4">
                {/* Pale Lime Rounded Pill Button with explicit black text */}
                <Link
                  href={card.ctaLink}
                  style={{ color: "#000000" }}
                  className="group/btn inline-flex items-center justify-center rounded-full bg-[#d6f088] px-6 py-2.5 text-sm font-semibold tracking-tight text-black !text-black shadow-md transition-all duration-200 hover:scale-105 hover:bg-[#c8e678] active:scale-95"
                >
                  <span style={{ color: "#000000" }} className="text-black !text-black font-semibold">
                    Explore
                  </span>
                </Link>

                {/* Floating White Thumbnail Box */}
                <div className="transition-transform duration-300 group-hover:scale-105">
                  <MiniProductBadge />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
