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
    <article className="group overflow-hidden rounded-2xl border border-slate-200 bg-white transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg">
      <Link
        href={`/laptops/${product.slug}`}
        className="block"
      >
        <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
          {primaryMedia?.url ? (
            <img
              src={primaryMedia.url}
              alt={
                primaryMedia.altText ??
                product.name
              }
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-100 via-white to-slate-200">
              <div className="text-center">
                <div className="mx-auto mb-3 flex h-16 w-24 items-center justify-center rounded-lg border-2 border-slate-300 bg-white shadow-sm">
                  <div className="h-8 w-14 rounded border border-slate-300 bg-slate-50" />
                </div>

                <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
                  Klarone
                </p>
              </div>
            </div>
          )}

          <div className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-xs font-medium text-slate-700 shadow-sm backdrop-blur">
            {product.brand.name}
          </div>
        </div>

        <div className="p-5">
          <p className="mb-1 text-xs font-medium uppercase tracking-[0.14em] text-slate-400">
            {product.category.name}
          </p>

          <h3 className="text-lg font-semibold tracking-tight text-slate-950">
            {product.name}
          </h3>

          {product.shortDescription ? (
            <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">
              {product.shortDescription}
            </p>
          ) : (
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Explore this laptop at Klarone.
            </p>
          )}

          {variant ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {variant.ramGb ? (
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                  {variant.ramGb}GB RAM
                </span>
              ) : null}

              {variant.storageGb ? (
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                  {variant.storageGb >= 1024
                    ? `${variant.storageGb / 1024}TB`
                    : `${variant.storageGb}GB`}{" "}
                  SSD
                </span>
              ) : null}

              {variant.operatingSystem ? (
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                  {variant.operatingSystem}
                </span>
              ) : null}
            </div>
          ) : null}

          {variant ? (
            <div className="mt-5 flex items-end justify-between gap-4">
              <div>
                <p className="text-xl font-semibold tracking-tight text-slate-950">
                  {formatPrice(
                    variant.sellingPrice,
                    variant.currency,
                  )}
                </p>

                {variant.compareAtPrice &&
                variant.compareAtPrice !==
                  variant.sellingPrice ? (
                  <p className="mt-1 text-sm text-slate-400 line-through">
                    {formatPrice(
                      variant.compareAtPrice,
                      variant.currency,
                    )}
                  </p>
                ) : null}
              </div>

              <span className="rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white transition-colors group-hover:bg-blue-600">
                View laptop
              </span>
            </div>
          ) : (
            <div className="mt-5">
              <span className="text-sm font-medium text-slate-500">
                View details
              </span>
            </div>
          )}
        </div>
      </Link>
    </article>
  );
}