import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StorefrontHeader } from "@/components/storefront/header";
import { StorefrontFooter } from "@/components/storefront/newsletter-and-footer";
import { ProductExperienceView } from "@/components/catalogue/product-experience-view";
import { getProduct, getProducts } from "@/lib/api";

export const dynamicParams = true;

/**
 * Pre-render top popular laptop models at build time for instant CDN / Edge delivery.
 * Uncached / newer laptops continue to be rendered on demand via dynamicParams = true.
 */
export async function generateStaticParams() {
  try {
    const res = await getProducts({ pageSize: 12 });
    if (!res || !res.items) return [];
    return res.items.map((p) => ({
      slug: p.slug,
    }));
  } catch {
    // If backend is unavailable during build step, fallback gracefully to dynamic rendering
    return [];
  }
}

interface ProductPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const product = await getProduct(slug);
    return {
      title: `${product.name} — Klarone`,
      description:
        product.shortDescription ||
        `Discover specifications, authentic warranty, and pricing for ${product.name} at Klarone.`,
    };
  } catch {
    return {
      title: "Laptop — Klarone",
    };
  }
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

  if (!product || !product.variants || !product.variants.length) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-white">
      {/* 1. Global Storefront Floating Header */}
      <StorefrontHeader />

      {/* 2. Main Product Content (Offset top for floating navbar) */}
      <main className="pt-[76px] sm:pt-20 md:pt-24">
        <ProductExperienceView product={product} />
      </main>

      {/* 3. Global Storefront Footer & Newsletter */}
      <StorefrontFooter />
    </div>
  );
}
