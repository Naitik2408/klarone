import type {
  CreateStaffBrandInput,
  CreateStaffCategoryInput,
  CreateStaffProductInput,
  CreateStaffVariantInput,
  StaffBrandsResponse,
  StaffCatalogueBrand,
  StaffCatalogueCategory,
  StaffCatalogueProduct,
  StaffCatalogueProductsResponse,
  StaffCategoryNode,
  StaffProductDetail,
  SyncStaffVariantMatrixResponse,
  UpdateStaffBrandInput,
  UpdateStaffCategoryInput,
  UpdateStaffProductInput,
} from "../types/staff-catalogue";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:3000";

export class StaffCatalogueApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "StaffCatalogueApiError";
    this.status = status;
  }
}

async function readError(response: Response) {
  try {
    const body = (await response.json()) as {
      message?: string | string[];
    };

    if (Array.isArray(body.message)) {
      return body.message.join(", ");
    }

    return body.message ?? "Catalogue request failed.";
  } catch {
    return "Catalogue request failed.";
  }
}

async function staffRequest<T>(
  path: string,
  token: string,
  init?: RequestInit,
) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw new StaffCatalogueApiError(
      await readError(response),
      response.status,
    );
  }

  return (await response.json()) as T;
}

async function publicRequest<T>(path: string) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new StaffCatalogueApiError(
      await readError(response),
      response.status,
    );
  }

  return (await response.json()) as T;
}

/* ---------- Staff: products ---------- */

export function getStaffProducts(
  token: string,
  params?: {
    search?: string;
    status?: string;
  },
) {
  const query = new URLSearchParams();

  if (params?.search?.trim()) {
    query.set("search", params.search.trim());
  }

  if (params?.status && params.status !== "ALL") {
    query.set("status", params.status);
  }

  const suffix = query.toString() ? `?${query.toString()}` : "";

  return staffRequest<StaffCatalogueProductsResponse>(
    `/staff/catalogue/products${suffix}`,
    token,
  );
}

export function getStaffProduct(
  token: string,
  productId: string,
) {
  return staffRequest<StaffProductDetail>(
    `/staff/catalogue/products/${productId}`,
    token,
  );
}

export function createStaffProduct(
  token: string,
  input: CreateStaffProductInput,
) {
  return staffRequest<StaffCatalogueProduct>(
    "/staff/catalogue/products",
    token,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}

export function updateStaffProduct(
  token: string,
  productId: string,
  input: UpdateStaffProductInput,
) {
  return staffRequest<StaffProductDetail>(
    `/staff/catalogue/products/${productId}/update`,
    token,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}

export function createStaffVariant(
  token: string,
  productId: string,
  input: CreateStaffVariantInput,
) {
  return staffRequest<StaffProductDetail>(
    `/staff/catalogue/products/${productId}/variants`,
    token,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}

export function publishStaffProduct(
  token: string,
  productId: string,
) {
  return staffRequest<StaffCatalogueProduct>(
    `/staff/catalogue/products/${productId}/publish`,
    token,
    {
      method: "POST",
    },
  );
}

export function deactivateStaffVariant(
  token: string,
  productId: string,
  variantId: string,
) {
  return staffRequest<{ id: string; status: string }>(
    `/staff/catalogue/products/${productId}/variants/${variantId}/deactivate`,
    token,
    { method: "POST" },
  );
}

export function activateStaffVariant(
  token: string,
  productId: string,
  variantId: string,
) {
  return staffRequest<{ id: string; status: string }>(
    `/staff/catalogue/products/${productId}/variants/${variantId}/activate`,
    token,
    { method: "POST" },
  );
}

export function deleteStaffVariant(
  token: string,
  productId: string,
  variantId: string,
  reason?: string,
) {
  return staffRequest<{ id: string; deleted: boolean }>(
    `/staff/catalogue/products/${productId}/variants/${variantId}`,
    token,
    {
      method: "DELETE",
      body: reason ? JSON.stringify({ reason }) : undefined,
    },
  );
}

/* ---------- Staff: product options + variant matrix ---------- */

export interface StaffProductOptionMetaobjectEntry {
  id: string;
  handle: string;
  displayName: string;
  fields: Record<string, unknown>;
}

export interface StaffProductOptionValue {
  id: string;
  value: string;
  displayOrder: number;
  metaobjectEntryId: string | null;
  metaobjectEntry: StaffProductOptionMetaobjectEntry | null;
}

export interface StaffProductOption {
  id: string;
  name: string;
  displayOrder: number;
  values: StaffProductOptionValue[];
}

export function getStaffProductOptions(
  token: string,
  productId: string,
) {
  return staffRequest<StaffProductOption[]>(
    `/staff/catalogue/products/${productId}/options`,
    token,
  );
}

export function createStaffProductOption(
  token: string,
  productId: string,
  input: { name: string; displayOrder?: number; values?: string[] },
) {
  return staffRequest<StaffProductOption>(
    `/staff/catalogue/products/${productId}/options`,
    token,
    { method: "POST", body: JSON.stringify(input) },
  );
}

export function updateStaffProductOption(
  token: string,
  productId: string,
  optionId: string,
  input: { name?: string; displayOrder?: number },
) {
  return staffRequest<StaffProductOption>(
    `/staff/catalogue/products/${productId}/options/${optionId}`,
    token,
    { method: "PATCH", body: JSON.stringify(input) },
  );
}

export function deleteStaffProductOption(
  token: string,
  productId: string,
  optionId: string,
) {
  return staffRequest<{ ok: true }>(
    `/staff/catalogue/products/${productId}/options/${optionId}`,
    token,
    { method: "DELETE" },
  );
}

export function addStaffProductOptionValue(
  token: string,
  productId: string,
  optionId: string,
  input: {
    value: string;
    displayOrder?: number;
    metaobjectEntryId?: string | number | null;
  },
) {
  return staffRequest<StaffProductOptionValue>(
    `/staff/catalogue/products/${productId}/options/${optionId}/values`,
    token,
    { method: "POST", body: JSON.stringify(input) },
  );
}

export function updateStaffProductOptionValue(
  token: string,
  productId: string,
  optionId: string,
  valueId: string,
  input: {
    value?: string;
    displayOrder?: number;
    metaobjectEntryId?: string | number | null;
  },
) {
  return staffRequest<StaffProductOptionValue>(
    `/staff/catalogue/products/${productId}/options/${optionId}/values/${valueId}`,
    token,
    { method: "PATCH", body: JSON.stringify(input) },
  );
}

export function deleteStaffProductOptionValue(
  token: string,
  productId: string,
  optionId: string,
  valueId: string,
) {
  return staffRequest<{ ok: true }>(
    `/staff/catalogue/products/${productId}/options/${optionId}/values/${valueId}`,
    token,
    { method: "DELETE" },
  );
}

export function syncStaffVariantMatrix(
  token: string,
  productId: string,
) {
  return staffRequest<SyncStaffVariantMatrixResponse>(
    `/staff/catalogue/products/${productId}/options/sync-matrix`,
    token,
    { method: "POST" },
  );
}

/* ---------- Public reads ---------- */

export function getCatalogueBrands() {
  return publicRequest<StaffCatalogueBrand[]>(
    "/catalogue/brands",
  );
}

export function getCatalogueCategories() {
  return publicRequest<StaffCatalogueCategory[]>(
    "/catalogue/categories",
  );
}

/* ---------- Staff: taxonomy (brands) ---------- */

export function getStaffBrands(
  token: string,
  params?: {
    search?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  },
) {
  const query = new URLSearchParams();

  if (params?.search?.trim()) {
    query.set("search", params.search.trim());
  }

  if (params?.status?.trim()) {
    query.set("status", params.status.trim());
  }

  if (params?.page) {
    query.set("page", String(params.page));
  }

  if (params?.pageSize) {
    query.set("pageSize", String(params.pageSize));
  }

  const suffix = query.toString() ? `?${query.toString()}` : "";

  return staffRequest<StaffBrandsResponse>(
    `/staff/catalogue/brands${suffix}`,
    token,
  );
}

export function createStaffBrand(
  token: string,
  input: CreateStaffBrandInput,
) {
  return staffRequest<StaffBrandListItemResponse>(
    "/staff/catalogue/brands",
    token,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}

export function updateStaffBrand(
  token: string,
  brandId: number,
  input: UpdateStaffBrandInput,
) {
  return staffRequest<StaffBrandListItemResponse>(
    `/staff/catalogue/brands/${brandId}`,
    token,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );
}

export function deactivateStaffBrand(
  token: string,
  brandId: number,
) {
  return staffRequest<StaffBrandListItemResponse>(
    `/staff/catalogue/brands/${brandId}/deactivate`,
    token,
    {
      method: "POST",
    },
  );
}

/* ---------- Staff: taxonomy (categories) ---------- */

export function getStaffCategories(token: string) {
  return staffRequest<StaffCategoryNode[]>(
    "/staff/catalogue/categories",
    token,
  );
}

export function createStaffCategory(
  token: string,
  input: CreateStaffCategoryInput,
) {
  return staffRequest<StaffCategoryResponse>(
    "/staff/catalogue/categories",
    token,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}

export function updateStaffCategory(
  token: string,
  categoryId: number,
  input: UpdateStaffCategoryInput,
) {
  return staffRequest<StaffCategoryResponse>(
    `/staff/catalogue/categories/${categoryId}`,
    token,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );
}

export function deactivateStaffCategory(
  token: string,
  categoryId: number,
) {
  return staffRequest<StaffCategoryResponse>(
    `/staff/catalogue/categories/${categoryId}/deactivate`,
    token,
    {
      method: "POST",
    },
  );
}

/* ---------- Response shapes for taxonomy writes ---------- */

type StaffBrandListItemResponse = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  websiteUrl: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
};

type StaffCategoryResponse = {
  id: number;
  parentId: number | null;
  name: string;
  slug: string;
  description: string | null;
  displayOrder: number;
  status: string;
  createdAt: string;
  updatedAt: string;
};



/* ---------- Staff: product media ---------- */

export interface StaffProductMedia {
  id: string;
  productId: string | null;
  productVariantId: string | null;
  mediaType: string;
  url: string | null;
  storageKey: string;
  altText: string | null;
  isPrimary: boolean;
  displayOrder: number;
}

export function listProductMedia(
  token: string,
  productId: string,
) {
  return staffRequest<StaffProductMedia[]>(
    `/staff/catalogue/products/${productId}/media`,
    token,
  );
}

export async function uploadVariantMedia(
  token: string,
  productId: string,
  file: File,
  variantId: string,
  altText?: string,
) {
  const form = new FormData();
  form.append("file", file);
  form.append("variantId", variantId);
  if (altText) form.append("altText", altText);

  const response = await fetch(
    `${API_BASE_URL}/staff/catalogue/products/${productId}/media/upload`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        // Note: do NOT set Content-Type — the browser sets the multipart
        // boundary automatically when passing FormData.
      },
      body: form,
    },
  );

  if (!response.ok) {
    throw new StaffCatalogueApiError(
      await readError(response),
      response.status,
    );
  }

  return (await response.json()) as StaffProductMedia;
}

/* ---------- Staff: inventory ---------- */

export function listWarehouses(token: string) {
  return staffRequest<
    Array<{ id: number; name: string; code: string; status: string }>
  >("/staff/inventory/warehouses", token);
}

export function adjustInventory(
  token: string,
  input: {
    productVariantId: string;
    warehouseId: number;
    quantityDelta: number;
    notes?: string | null;
  },
) {
  return staffRequest<unknown>("/staff/inventory/adjust", token, {
    method: "POST",
    body: JSON.stringify(input),
  });
}



