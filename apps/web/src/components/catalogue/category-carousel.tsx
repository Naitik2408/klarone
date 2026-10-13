"use client";

import Link from "next/link";
import Image from "next/image";
import type { CatalogueCategory } from "../../types/catalogue";

interface CategoryCarouselProps {
  categories: CatalogueCategory[];
  activeCategorySlug?: string;
}

export function CategoryCarousel({
  categories,
  activeCategorySlug,
}: CategoryCarouselProps) {
  if (!categories || categories.length === 0) return null;

  return (
    <div className="relative -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <div className="flex gap-4 overflow-x-auto pb-4 pt-1 scrollbar-none [scrollbar-width:none]">
        {categories.map((cat) => {
          const isActive = activeCategorySlug === cat.slug;
          return (
            <Link
              key={cat.id}
              href={`/laptops?categorySlug=${cat.slug}`}
              className={`group flex w-[200px] shrink-0 flex-col rounded-[22px] transition-all sm:w-[220px] ${
                isActive ? "opacity-100" : "opacity-90 hover:opacity-100"
              }`}
            >
              {/* Squircle Image Card */}
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[20px] bg-stone-100 shadow-sm transition-transform duration-300 group-hover:scale-[1.02]">
                {cat.imageUrl ? (
                  <Image
                    src={cat.imageUrl}
                    alt={cat.name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-stone-200 text-3xl">
                    💻
                  </div>
                )}
              </div>

              {/* Text Meta */}
              <div className="mt-3">
                <h4
                  style={{ fontFamily: "var(--font-serif), 'Instrument Serif', Georgia, serif" }}
                  className={`text-[20px] font-normal leading-tight transition-colors ${
                    isActive ? "text-emerald-900 underline underline-offset-4" : "text-slate-900 group-hover:text-emerald-950"
                  }`}
                >
                  {cat.name}
                </h4>
                <p className="mt-1 line-clamp-1 text-xs text-stone-500">
                  {cat.description ?? "Explore laptops"}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
