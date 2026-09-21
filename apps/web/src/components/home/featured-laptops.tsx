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
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-600">
              Explore laptops
            </p>

            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              Start with the catalogue.
            </h2>

            <p className="mt-4 text-base leading-7 text-slate-600">
              Explore the laptops currently available in
              the Klarone catalogue, then open any product
              to see its configuration and specifications.
            </p>
          </div>

          <Link
            href="/laptops"
            className="inline-flex shrink-0 rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-100"
          >
            View all laptops
          </Link>
        </div>

        {products.items.length > 0 ? (
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {products.items.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
              />
            ))}
          </div>
        ) : (
          <div className="mt-10 rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <h3 className="text-xl font-semibold text-slate-950">
              Catalogue coming together
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              Products will appear here as the Klarone
              catalogue is populated.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}