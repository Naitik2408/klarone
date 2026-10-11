import type {
  CreateStaffMetaobjectEntryInput,
  SetStaffProductMetafieldsInput,
  StaffMetaobjectEntriesResponse,
  StaffMetaobjectEntry,
  StaffMetafieldDefinitionsResponse,
  StaffProductMetafieldsResponse,
  UpdateStaffMetaobjectEntryInput,
} from "../types/staff-metaobjects";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3000";

export class StaffMetaobjectsApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "StaffMetaobjectsApiError";
    this.status = status;
  }
}

async function request<T>(
  path: string,
  token: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });

  const text = await response.text();
  const body = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message =
      (body && (body.message || body.error)) ||
      `Request failed with status ${response.status}`;
    throw new StaffMetaobjectsApiError(message, response.status);
  }

  return body as T;
}

/* ------------------------------------------------------------------ */
/* Definitions                                                         */
/* ------------------------------------------------------------------ */

export async function listMetafieldDefinitions(
  token: string,
  categoryId?: number,
): Promise<StaffMetafieldDefinitionsResponse> {
  const query =
    categoryId !== undefined ? `?categoryId=${categoryId}` : "";
  return request<StaffMetafieldDefinitionsResponse>(
    `/staff/metaobjects/definitions${query}`,
    token,
    { method: "GET" },
  );
}

export async function createMetafieldDefinition(
  token: string,
  input: {
    name: string;
    key?: string;
    type: "text" | "number" | "boolean" | "select" | "metaobject";
    categoryId?: number | null;
    displayOrder?: number;
    options?: string[];
  },
) {
  return request<any>(
    "/staff/metaobjects/definitions",
    token,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}

export async function deleteMetafieldDefinition(
  token: string,
  id: number,
) {
  return request<{ success: boolean; id: number }>(
    `/staff/metaobjects/definitions/${id}`,
    token,
    { method: "PATCH" },
  );
}

/* ------------------------------------------------------------------ */
/* Entries                                                             */
/* ------------------------------------------------------------------ */

export async function listMetaobjectEntries(
  token: string,
  type: string,
  options?: {
    q?: string;
    groupId?: string;
    take?: number;
    skip?: number;
  },
): Promise<StaffMetaobjectEntriesResponse> {
  const params = new URLSearchParams();
  if (options?.q) params.set("q", options.q);
  if (options?.groupId) params.set("groupId", options.groupId);
  if (options?.take !== undefined) params.set("take", String(options.take));
  if (options?.skip !== undefined) params.set("skip", String(options.skip));
  const query = params.toString() ? `?${params.toString()}` : "";

  return request<StaffMetaobjectEntriesResponse>(
    `/staff/metaobjects/${type}/entries${query}`,
    token,
    { method: "GET" },
  );
}

export async function getMetaobjectEntry(
  token: string,
  type: string,
  id: string,
): Promise<StaffMetaobjectEntry> {
  return request<StaffMetaobjectEntry>(
    `/staff/metaobjects/${type}/entries/${id}`,
    token,
    { method: "GET" },
  );
}

export async function createMetaobjectEntry(
  token: string,
  type: string,
  input: CreateStaffMetaobjectEntryInput,
): Promise<StaffMetaobjectEntry> {
  return request<StaffMetaobjectEntry>(
    `/staff/metaobjects/${type}/entries`,
    token,
    { method: "POST", body: JSON.stringify(input) },
  );
}

export async function updateMetaobjectEntry(
  token: string,
  type: string,
  id: string,
  input: UpdateStaffMetaobjectEntryInput,
): Promise<StaffMetaobjectEntry> {
  return request<StaffMetaobjectEntry>(
    `/staff/metaobjects/${type}/entries/${id}`,
    token,
    { method: "PATCH", body: JSON.stringify(input) },
  );
}

/* ------------------------------------------------------------------ */
/* Product metafields                                                  */
/* ------------------------------------------------------------------ */

export async function getProductMetafields(
  token: string,
  productId: string,
): Promise<StaffProductMetafieldsResponse> {
  return request<StaffProductMetafieldsResponse>(
    `/staff/products/${productId}/metafields`,
    token,
    { method: "GET" },
  );
}

export async function setProductMetafields(
  token: string,
  productId: string,
  input: SetStaffProductMetafieldsInput,
): Promise<StaffProductMetafieldsResponse> {
  return request<StaffProductMetafieldsResponse>(
    `/staff/products/${productId}/metafields`,
    token,
    { method: "PUT", body: JSON.stringify(input) },
  );
}