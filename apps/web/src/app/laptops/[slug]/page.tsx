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
    const primaryImage = product.media?.[0]?.url;
    return {
      title: `${product.name} — Klarone | Verified Laptops Kolkata`,
      description:
        product.shortDescription ||
        `Buy authentic ${product.name} with official manufacturer warranty, transparent specs, and fast local support in Kolkata.`,
      openGraph: {
        title: `${product.name} | Klarone`,
        description: product.shortDescription || `Authentic ${product.name} in Kolkata.`,
        images: primaryImage ? [{ url: primaryImage }] : undefined,
      },
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

  const primaryVariant = product.variants[0];
  const primaryImage = product.media?.[0]?.url;
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://klarone.com";

  // Google Rich Results Product & Offer Schema (JSON-LD)
  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: primaryImage ? [primaryImage] : undefined,
    description:
      product.shortDescription ||
      `Authentic ${product.name} with official brand warranty and local Kolkata setup.`,
    sku: primaryVariant?.sku || product.slug,
    brand: {
      "@type": "Brand",
      name: product.brand?.name || "Klarone",
    },
    offers: {
      "@type": "Offer",
      url: `${baseUrl}/laptops/${product.slug}`,
      priceCurrency: primaryVariant?.currency || "INR",
      price: primaryVariant?.sellingPrice || "0",
      itemCondition: "https://schema.org/NewCondition",
      availability: "https://schema.org/InStock",
      seller: {
        "@type": "Organization",
        name: "Klarone",
        url: baseUrl,
      },
    },
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Google Product Schema for Rich Snippets */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />

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
