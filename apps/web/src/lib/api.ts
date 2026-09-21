import type {
  CatalogueBrand,
  CatalogueCategory,
  CatalogueProductDetail,
  CatalogueProductsResponse,
} from "../types/catalogue";

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

export async function getBrands(): Promise<CatalogueBrand[]> {
  return apiFetch<CatalogueBrand[]>("/catalogue/brands");
}

export async function getCategories(): Promise<CatalogueCategory[]> {
  return apiFetch<CatalogueCategory[]>("/catalogue/categories");
}

export async function getProducts(params?: {
  search?: string;
  brandSlug?: string;
  categorySlug?: string;
  page?: number;
  pageSize?: number;
}): Promise<CatalogueProductsResponse> {
  const searchParams = new URLSearchParams();

  if (params?.search) {
    searchParams.set("search", params.search);
  }

  if (params?.brandSlug) {
    searchParams.set("brandSlug", params.brandSlug);
  }

  if (params?.categorySlug) {
    searchParams.set("categorySlug", params.categorySlug);
  }

  if (params?.page) {
    searchParams.set("page", String(params.page));
  }

  if (params?.pageSize) {
    searchParams.set("pageSize", String(params.pageSize));
  }

  const query = searchParams.toString();

  return apiFetch<CatalogueProductsResponse>(
    `/catalogue/products${query ? `?${query}` : ""}`,
  );
}

export async function getProduct(
  slug: string,
): Promise<CatalogueProductDetail> {
  return apiFetch<CatalogueProductDetail>(
    `/catalogue/products/${encodeURIComponent(slug)}`,
  );
}