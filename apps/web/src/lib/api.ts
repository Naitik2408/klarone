import { cache } from "react";
import type {
  CatalogueBrand,
  CatalogueCategory,
  CatalogueCollection,
  CatalogueFacets,
  CatalogueProductDetail,
  CatalogueProductsResponse,
} from "../types/catalogue";
import type {
  RecommendationStartResponse,
} from "../types/recommendations";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3000";

async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...init?.headers,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `API request failed: ${response.status} ${response.statusText}`,
    );
  }

  return response.json() as Promise<T>;
}

export const getBrands = cache(async function getBrands(): Promise<CatalogueBrand[]> {
  return apiFetch<CatalogueBrand[]>("/catalogue/brands");
});

export const getCategories = cache(async function getCategories(): Promise<CatalogueCategory[]> {
  return apiFetch<CatalogueCategory[]>("/catalogue/categories");
});

export const getCollections = cache(async function getCollections(): Promise<CatalogueCollection[]> {
  return apiFetch<CatalogueCollection[]>("/catalogue/collections");
});

export const getFacets = cache(async function getFacets(params?: {
  categorySlug?: string;
  collectionSlug?: string;
}): Promise<CatalogueFacets> {
  const searchParams = new URLSearchParams();
  if (params?.categorySlug) searchParams.set("categorySlug", params.categorySlug);
  if (params?.collectionSlug) searchParams.set("collectionSlug", params.collectionSlug);
  const query = searchParams.toString();
  return apiFetch<CatalogueFacets>(`/catalogue/facets${query ? `?${query}` : ""}`);
});

export async function getProducts(params?: {
  search?: string;
  brandSlug?: string;
  brandSlugs?: string[];
  categorySlug?: string;
  collectionSlug?: string;
  minPrice?: number;
  maxPrice?: number;
  ramGb?: number[];
  storageGb?: number[];
  inStockOnly?: boolean;
  sortBy?: "featured" | "price-asc" | "price-desc" | "newest";
  page?: number;
  pageSize?: number;
}): Promise<CatalogueProductsResponse> {
  const searchParams = new URLSearchParams();

  if (params?.search) searchParams.set("search", params.search);
  if (params?.brandSlug) searchParams.set("brandSlug", params.brandSlug);
  if (params?.brandSlugs && params.brandSlugs.length > 0) {
    searchParams.set("brandSlugs", params.brandSlugs.join(","));
  }
  if (params?.categorySlug) searchParams.set("categorySlug", params.categorySlug);
  if (params?.collectionSlug) searchParams.set("collectionSlug", params.collectionSlug);
  if (params?.minPrice !== undefined) searchParams.set("minPrice", String(params.minPrice));
  if (params?.maxPrice !== undefined) searchParams.set("maxPrice", String(params.maxPrice));
  if (params?.ramGb && params.ramGb.length > 0) {
    searchParams.set("ramGb", params.ramGb.join(","));
  }
  if (params?.storageGb && params.storageGb.length > 0) {
    searchParams.set("storageGb", params.storageGb.join(","));
  }
  if (params?.inStockOnly) searchParams.set("inStockOnly", "true");
  if (params?.sortBy) searchParams.set("sortBy", params.sortBy);
  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.pageSize) searchParams.set("pageSize", String(params.pageSize));

  const query = searchParams.toString();

  return apiFetch<CatalogueProductsResponse>(
    `/catalogue/products${query ? `?${query}` : ""}`,
  );
}

export const getProduct = cache(async function getProduct(
  slug: string,
): Promise<CatalogueProductDetail> {
  return apiFetch<CatalogueProductDetail>(
    `/catalogue/products/${encodeURIComponent(slug)}`,
  );
});

export async function startRecommendation(params: {
  message: string;
  sessionToken?: string;
  history?: Array<{ role: "user" | "model"; text: string }>;
}): Promise<RecommendationStartResponse> {
  return apiFetch<RecommendationStartResponse>(
    "/recommendations/start",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(params),
    },
  );
}
