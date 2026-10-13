import type { Metadata } from "next";
import { StorefrontHeader } from "../../components/storefront/header";
import { StorefrontFooter } from "../../components/storefront/newsletter-and-footer";
import { CatalogueListingLayout } from "../../components/catalogue/catalogue-listing-layout";
import {
  getCategories,
  getFacets,
  getProducts,
} from "../../lib/api";

export const metadata: Metadata = {
  title: "Shop All Laptops — Klarone",
  description: "Browse our complete catalog of flagship ultrabooks, gaming rigs, and creator workstations.",
};

interface LaptopsPageProps {
  searchParams: Promise<{
    search?: string | string[];
    brandSlug?: string | string[];
    brandSlugs?: string | string[];
    categorySlug?: string | string[];
    collectionSlug?: string | string[];
    minPrice?: string | string[];
    maxPrice?: string | string[];
    ramGb?: string | string[];
    storageGb?: string | string[];
    inStockOnly?: string | string[];
    sortBy?: "featured" | "price-asc" | "price-desc" | "newest";
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

function getArrayValues(
  value: string | string[] | undefined,
): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return value.split(",").map((s) => s.trim()).filter(Boolean);
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

export default async function LaptopsPage({
  searchParams,
}: LaptopsPageProps) {
  const params = await searchParams;

  const search = getSingleValue(params.search);
  const categorySlug = getSingleValue(params.categorySlug);
  const collectionSlug = getSingleValue(params.collectionSlug);
  const brandSlug = getSingleValue(params.brandSlug);
  const brandSlugs = getArrayValues(params.brandSlugs);
  const minPrice = params.minPrice ? Number(getSingleValue(params.minPrice)) : undefined;
  const maxPrice = params.maxPrice ? Number(getSingleValue(params.maxPrice)) : undefined;
  const ramGb = getArrayValues(params.ramGb).map(Number).filter((n) => n > 0);
  const storageGb = getArrayValues(params.storageGb).map(Number).filter((n) => n > 0);
  const inStockOnly = getSingleValue(params.inStockOnly) === "true";
  const sortBy = (getSingleValue(params.sortBy) as "featured" | "price-asc" | "price-desc" | "newest") || "featured";
  const page = getPageNumber(params.page);

  const [categories, facets, productsResponse] = await Promise.all([
    getCategories(),
    getFacets({ categorySlug, collectionSlug }),
    getProducts({
      search,
      brandSlug,
      brandSlugs: brandSlugs.length > 0 ? brandSlugs : undefined,
      categorySlug,
      collectionSlug,
      minPrice,
      maxPrice,
      ramGb: ramGb.length > 0 ? ramGb : undefined,
      storageGb: storageGb.length > 0 ? storageGb : undefined,
      inStockOnly,
      sortBy,
      page,
      pageSize: 12,
    }),
  ]);

  // Clean categories for horizontal carousel (ignore root laptops)
  const carouselCategories = categories.filter((c) => c.slug !== "laptops");

  // Title & Breadcrumbs logic
  let pageTitle = "Shop All";
  if (categorySlug) {
    const activeCat = categories.find((c) => c.slug === categorySlug);
    if (activeCat) pageTitle = activeCat.name;
  } else if (collectionSlug) {
    pageTitle = collectionSlug
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }

  const breadcrumbs = [
    { label: "Home", href: "/" },
    { label: "Collection", href: "/laptops" },
    { label: pageTitle },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* 1. Floating Storefront Header */}
      <StorefrontHeader />

      {/* Top spacing to account for floating header */}
      <div className="pt-28 md:pt-36">
        <CatalogueListingLayout
          products={productsResponse.items}
          facets={facets}
          categories={carouselCategories}
          total={productsResponse.pagination.total}
          page={productsResponse.pagination.page}
          totalPages={productsResponse.pagination.totalPages}
          title={pageTitle}
          breadcrumbs={breadcrumbs}
          activeCategorySlug={categorySlug}
        />
      </div>

      {/* Footer */}
      <StorefrontFooter />
    </div>
  );
}