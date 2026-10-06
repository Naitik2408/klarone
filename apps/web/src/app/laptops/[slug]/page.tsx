import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "../../../components/site/header";
import { ProductVariantDetails } from "../../../components/catalogue/product-variant-details";
import { getProduct } from "../../../lib/api";

interface ProductPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function ProductPage({
  params,
}: ProductPageProps) {
  const { slug } = await params;

  let product;

  try {
    product = await getProduct(slug);
  } catch {
    notFound();
  }

  if (!product.variants.length) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header />

        <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <Link
            href="/laptops"
            className="text-sm font-medium text-slate-500 hover:text-slate-950"
          >
            ← Back to laptops
          </Link>

          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-8">
            <h1 className="text-2xl font-semibold text-slate-950">
              {product.name}
            </h1>

            <p className="mt-3 text-slate-600">
              This product does not currently have an
              active purchasable configuration.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link
            href="/laptops"
            className="text-sm font-medium text-slate-500 hover:text-slate-950"
          >
            ← Back to laptops
          </Link>
        </div>

        <section className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
            <div className="aspect-[4/3] bg-gradient-to-br from-slate-100 via-white to-slate-200">
              {product.media.length > 0 &&
              product.media[0]?.url ? (
                <img
                  src={product.media[0].url}
                  alt={
                    product.media[0].altText ??
                    product.name
                  }
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center">
                  <div className="flex h-32 w-52 items-center justify-center rounded-2xl border-2 border-slate-300 bg-white shadow-sm">
                    <div className="h-16 w-28 rounded-lg border border-slate-300 bg-slate-50" />
                  </div>

                  <p className="mt-5 text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
                    Product image
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-medium text-white">
                {product.brand.name}
              </span>

              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                {product.category.name}
              </span>
            </div>

            <h1 className="text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
              {product.name}
            </h1>

            {product.shortDescription ? (
              <p className="mt-4 text-base leading-7 text-slate-600">
                {product.shortDescription}
              </p>
            ) : null}

            <ProductVariantDetails product={product} />

            <div className="mt-7 rounded-2xl bg-slate-950 p-5 text-white">
              <p className="text-sm font-semibold">
                Need help deciding?
              </p>

              <p className="mt-2 text-sm leading-6 text-slate-300">
                Klarone Select can help match a laptop
                to your work, study, gaming, or other
                requirements.
              </p>

              <Link
                href="/#klarone-select"
                className="mt-4 inline-flex rounded-full bg-white px-4 py-2.5 text-sm font-medium text-slate-950 hover:bg-blue-50"
              >
                Explore Klarone Select
              </Link>
            </div>
          </div>
        </section>

        {product.description ? (
          <section className="mt-10 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
              About this laptop
            </h2>

            <p className="mt-4 max-w-4xl whitespace-pre-line text-base leading-7 text-slate-600">
              {product.description}
            </p>
          </section>
        ) : null}
      </main>
    </div>
  );
}