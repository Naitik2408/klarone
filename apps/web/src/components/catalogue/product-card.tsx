import Link from "next/link";
import type { CatalogueProduct } from "../../types/catalogue";

interface ProductCardProps {
  product: CatalogueProduct;
}

function formatPrice(
  amount: string,
  currency: string,
): string {
  const numericAmount = Number(amount);

  if (!Number.isFinite(numericAmount)) {
    return `${currency} ${amount}`;
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(numericAmount);
}

export function ProductCard({
  product,
}: ProductCardProps) {
  const variant = product.variants[0];
  const primaryMedia = product.media[0];

  return (
    <article className="group relative flex flex-col justify-between overflow-hidden rounded-[24px] bg-[#f0f2ee] transition-all duration-200 hover:shadow-sm">
      {/* Badge (Sale / Brand) matching reference image */}
      <div className="absolute left-3.5 top-3.5 z-20 flex items-center gap-1.5">
        {variant && Number(variant.compareAtPrice) > Number(variant.sellingPrice) ? (
          <span className="inline-block rounded-full bg-[#c64f3d] px-3 py-1 text-[11px] font-medium tracking-wide text-white shadow-2xs">
            Sale
          </span>
        ) : (
          <span className="inline-block rounded-full bg-[#6c8868] px-3 py-1 text-[11px] font-medium tracking-wide text-white shadow-2xs">
            {product.brand.name}
          </span>
        )}
      </div>

      <Link
        href={`/laptops/${product.slug}`}
        className="block flex-1"
      >
        {/* Full-bleed Product Image (zero padding top, left, right) */}
        <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden bg-white/40">
          {primaryMedia?.url ? (
            <img
              src={primaryMedia.url}
              alt={primaryMedia.altText ?? product.name}
              className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-stone-200/50 text-4xl">
              💻
            </div>
          )}
        </div>

        {/* Card Content & Details (padded) */}
        <div className="p-4 pb-2">
          <span className="text-xs font-normal text-stone-500">
            {product.category.name}
          </span>

          <h3 className="mt-1 text-[16px] font-semibold tracking-tight text-slate-900 group-hover:text-emerald-950 line-clamp-1">
            {product.name}
          </h3>

          {variant ? (
            <div className="mt-1.5 flex items-baseline gap-2">
              <span className="text-sm font-semibold text-slate-900">
                {formatPrice(variant.sellingPrice, variant.currency)}
              </span>
              {variant.compareAtPrice &&
              Number(variant.compareAtPrice) > Number(variant.sellingPrice) ? (
                <span className="text-xs text-stone-400 line-through">
                  {formatPrice(variant.compareAtPrice, variant.currency)}
                </span>
              ) : null}
            </div>
          ) : (
            <p className="mt-1 text-xs text-stone-500">Check availability</p>
          )}
        </div>
      </Link>

      {/* Bottom Specs & 44px Circular Add to Cart Button */}
      <div className="flex items-center justify-between px-4 pb-4 pt-1">
        <div className="flex flex-wrap gap-1.5">
          {variant?.ramGb ? (
            <span className="rounded-md bg-white/80 px-2 py-0.5 text-[10px] font-medium text-stone-600 shadow-2xs">
              {variant.ramGb}GB
            </span>
          ) : null}
          {variant?.storageGb ? (
            <span className="rounded-md bg-white/80 px-2 py-0.5 text-[10px] font-medium text-stone-600 shadow-2xs">
              {variant.storageGb >= 1024
                ? `${variant.storageGb / 1024}TB`
                : `${variant.storageGb}GB`}
            </span>
          ) : null}
        </div>

        {/* 44px Circular Add to Cart Button */}
        <Link
          href={`/laptops/${product.slug}`}
          aria-label={`View ${product.name}`}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-black text-white shadow-md transition-all duration-200 hover:scale-105 hover:bg-stone-800 active:scale-95"
        >
          <svg
            className="h-5 w-5 text-white fill-none stroke-white"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <path d="M16 10a4 4 0 0 1-8 0" />
          </svg>
        </Link>
      </div>
    </article>
  );
}