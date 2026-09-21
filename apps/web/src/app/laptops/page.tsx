import Link from "next/link";
import { Header } from "../../components/site/header";
import { CatalogueFilters } from "../../components/catalogue/catalogue-filters";
import { ProductCard } from "../../components/catalogue/product-card";
import {
  getBrands,
  getCategories,
  getProducts,
} from "../../lib/api";

interface LaptopsPageProps {
  searchParams: Promise<{
    search?: string | string[];
    brandSlug?: string | string[];
    categorySlug?: string | string[];
    page?: string | string[];
  }>;
}

function getSingleValue(
  value: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function getPageNumber(
  value: string | string[] | undefined,
): number {
  const raw = getSingleValue(value);
  const parsed = Number(raw);

  if (!Number.isInteger(parsed) || parsed < 1) {
    return 1;
  }

  return parsed;
}

function buildPageUrl(
  page: number,
  currentParams: {
    search?: string;
    brandSlug?: string;
    categorySlug?: string;
  },
): string {
  const params = new URLSearchParams();

  if (currentParams.search) {
    params.set("search", currentParams.search);
  }

  if (currentParams.brandSlug) {
    params.set("brandSlug", currentParams.brandSlug);
  }

  if (currentParams.categorySlug) {
    params.set(
      "categorySlug",
      currentParams.categorySlug,
    );
  }

  if (page > 1) {
    params.set("page", String(page));
  }

  const query = params.toString();

  return query ? `/laptops?${query}` : "/laptops";
}

export default async function LaptopsPage({
  searchParams,
}: LaptopsPageProps) {
  const params = await searchParams;

  const search = getSingleValue(params.search);
  const brandSlug = getSingleValue(params.brandSlug);
  const categorySlug = getSingleValue(
    params.categorySlug,
  );
  const page = getPageNumber(params.page);

  const [brands, categories, products] =
    await Promise.all([
      getBrands(),
      getCategories(),
      getProducts({
        search,
        brandSlug,
        categorySlug,
        page,
        pageSize: 12,
      }),
    ]);

  const pagination = products.pagination;

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <section className="mb-8">
          <div className="max-w-3xl">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-blue-600">
              Klarone laptops
            </p>

            <h1 className="text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
              Find a laptop that fits your work.
            </h1>

            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
              Browse the Klarone catalogue, narrow down
              your choices, and explore detailed
              specifications before you decide.
            </p>
          </div>
        </section>

        <section className="mb-8">
          <CatalogueFilters
            brands={brands}
            categories={categories}
          />
        </section>

        <section>
          <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm text-slate-500">
                {pagination.total}{" "}
                {pagination.total === 1
                  ? "laptop"
                  : "laptops"}{" "}
                found
              </p>

              {search ? (
                <p className="mt-1 text-sm font-medium text-slate-800">
                  Results for “{search}”
                </p>
              ) : null}
            </div>

            <p className="text-sm text-slate-500">
              Page {pagination.page} of{" "}
              {pagination.totalPages}
            </p>
          </div>

          {products.items.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {products.items.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
              <h2 className="text-xl font-semibold text-slate-950">
                No laptops found
              </h2>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                Try a different search or remove one
                of the filters.
              </p>

              <Link
                href="/laptops"
                className="mt-6 inline-flex rounded-full bg-slate-950 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-600"
              >
                View all laptops
              </Link>
            </div>
          )}
        </section>

        {pagination.totalPages > 1 ? (
          <nav
            aria-label="Catalogue pagination"
            className="mt-10 flex items-center justify-center gap-2"
          >
            {pagination.page > 1 ? (
              <Link
                href={buildPageUrl(
                  pagination.page - 1,
                  {
                    search,
                    brandSlug,
                    categorySlug,
                  },
                )}
                className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                Previous
              </Link>
            ) : null}

            <span className="rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white">
              {pagination.page}
            </span>

            {pagination.page <
            pagination.totalPages ? (
              <Link
                href={buildPageUrl(
                  pagination.page + 1,
                  {
                    search,
                    brandSlug,
                    categorySlug,
                  },
                )}
                className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                Next
              </Link>
            ) : null}
          </nav>
        ) : null}
      </main>
    </div>
  );
}