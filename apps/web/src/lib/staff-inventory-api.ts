import type {
  StaffInventoryCandidate,
  StaffInventoryResponse,
  StaffWarehouse,
} from "../types/staff-inventory";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3000";

export class StaffInventoryApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "StaffInventoryApiError";
    this.status = status;
  }
}

async function request<T>(
  path: string,
  token: string,
  init?: RequestInit,
) {
  const response = await fetch(
    `${API_BASE_URL}${path}`,
    {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    },
  );

  if (!response.ok) {
    let message = "Inventory request failed.";

    try {
      const body = (await response.json()) as {
        message?: string | string[];
      };

      if (Array.isArray(body.message)) {
        message = body.message.join(", ");
      } else if (body.message) {
        message = body.message;
      }
    } catch {
      // Keep default error message.
    }

    throw new StaffInventoryApiError(
      message,
      response.status,
    );
  }

  return (await response.json()) as T;
}

export function getWarehouses(token: string) {
  return request<StaffWarehouse[]>(
    "/staff/inventory/warehouses",
    token,
  );
}

export function getInventory(
  token: string,
  params?: {
    search?: string;
    warehouseId?: number;
  },
) {
  const query = new URLSearchParams();

  if (params?.search?.trim()) {
    query.set("search", params.search.trim());
  }

  if (params?.warehouseId) {
    query.set(
      "warehouseId",
      String(params.warehouseId),
    );
  }

  const suffix = query.toString()
    ? `?${query.toString()}`
    : "";

  return request<StaffInventoryResponse>(
    `/staff/inventory${suffix}`,
    token,
  );
}

export function getInitializationCandidates(
  token: string,
  params: {
    warehouseId: number;
    search?: string;
  },
) {
  const query = new URLSearchParams({
    warehouseId: String(params.warehouseId),
  });

  if (params.search?.trim()) {
    query.set("search", params.search.trim());
  }

  return request<StaffInventoryCandidate[]>(
    `/staff/inventory/variants?${query.toString()}`,
    token,
  );
}

export function initializeInventory(
  token: string,
  input: {
    productVariantId: string;
    warehouseId: number;
    initialQuantity: number;
    reorderLevel: number | null;
    notes: string | null;
  },
) {
  return request(
    "/staff/inventory/initialize",
    token,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}

export function adjustInventory(
  token: string,
  input: {
    productVariantId: string;
    warehouseId: number;
    quantityDelta: number;
    notes: string | null;
  },
) {
  return request(
    "/staff/inventory/adjust",
    token,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}
