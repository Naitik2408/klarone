import Link from "next/link";
import { ProductCard } from "../catalogue/product-card";
import { getProducts } from "../../lib/api";

export async function FeaturedLaptops() {
  const products = await getProducts({
    page: 1,
    pageSize: 3,
  });

  return (
    <section className="bg-slate-50 py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-600">
              Explore laptops
            </p>

            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              See what&apos;s available.
            </h2>

            <p className="mt-4 max-w-xl text-base leading-7 text-slate-600">
              Browse current Klarone catalogue options, compare configurations,
              and open a product to understand what you&apos;re actually buying.
            </p>
          </div>

          <Link
            href="/laptops"
            className="inline-flex w-fit shrink-0 items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition-colors hover:border-slate-400 hover:bg-slate-100"
          >
            View all laptops
          </Link>
        </div>

        {products.items.length > 0 ? (
          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {products.items.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
              />
            ))}
          </div>
        ) : (
          <div className="mt-10 rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-400">
              Catalogue
            </p>

            <h3 className="mt-3 text-xl font-semibold text-slate-950">
              Products are being added
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              Laptops will appear here as the Klarone catalogue is populated.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
