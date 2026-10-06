import type {
  StaffDraftDetail,
  StaffDraftsResponse,
  StaffOrderDetail,
  StaffOrdersResponse,
} from "../types/staff-orders";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:3000";

export class StaffOrdersApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "StaffOrdersApiError";
    this.status = status;
  }
}

async function request<T>(
  path: string,
  token: string,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(
    `${API_BASE_URL}${path}`,
    {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(options?.headers ?? {}),
      },
    },
  );

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      typeof body?.message === "string"
        ? body.message
        : "Unable to complete the order request.";

    throw new StaffOrdersApiError(
      message,
      response.status,
    );
  }

  return body as T;
}

export async function getStaffOrders(
  token: string,
  params: {
    search?: string;
    status?: string;
    paymentStatus?: string;
    fulfillmentStatus?: string;
    page?: number;
    pageSize?: number;
  } = {},
) {
  const query = new URLSearchParams();

  if (params.search?.trim()) {
    query.set("search", params.search.trim());
  }
  if (params.status) {
    query.set("status", params.status);
  }
  if (params.paymentStatus) {
    query.set("paymentStatus", params.paymentStatus);
  }
  if (params.fulfillmentStatus) {
    query.set("fulfillmentStatus", params.fulfillmentStatus);
  }
  if (params.page) {
    query.set("page", String(params.page));
  }
  if (params.pageSize) {
    query.set("pageSize", String(params.pageSize));
  }

  const suffix = query.toString();
  return request<StaffOrdersResponse>(
    `/staff/orders${suffix ? `?${suffix}` : ""}`,
    token,
  );
}

export async function getStaffOrder(
  token: string,
  orderNumber: string,
) {
  return request<{ order: StaffOrderDetail }>(
    `/staff/orders/${encodeURIComponent(orderNumber)}`,
    token,
  );
}

export async function updateStaffOrderStatus(
  token: string,
  orderNumber: string,
  input: { status: string; notes?: string },
) {
  return request<{ order: StaffOrderDetail }>(
    `/staff/orders/${encodeURIComponent(orderNumber)}/status`,
    token,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}

export async function getStaffDrafts(
  token: string,
  params: {
    search?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  } = {},
) {
  const query = new URLSearchParams();

  if (params.search?.trim()) {
    query.set("search", params.search.trim());
  }
  if (params.status) {
    query.set("status", params.status);
  }
  if (params.page) {
    query.set("page", String(params.page));
  }
  if (params.pageSize) {
    query.set("pageSize", String(params.pageSize));
  }

  const suffix = query.toString();
  return request<StaffDraftsResponse>(
    `/staff/drafts${suffix ? `?${suffix}` : ""}`,
    token,
  );
}

export async function getStaffDraft(
  token: string,
  draftNumber: string,
) {
  return request<{ draft: StaffDraftDetail }>(
    `/staff/drafts/${encodeURIComponent(draftNumber)}`,
    token,
  );
}

export async function createStaffDraft(
  token: string,
  body: {
    customerId?: string;
    email?: string;
    phone?: string;
    poNumber?: string;
    notes?: string;
    currency?: string;
    tags?: string[];
    items?: Array<{
      productVariantId?: string | null;
      productName?: string;
      sku?: string;
      quantity?: number;
      unitPrice?: number;
    }>;
  },
) {
  return request<{ id: string; draftNumber: string }>(
    `/staff/drafts`,
    token,
    {
      method: "POST",
      body: JSON.stringify(body),
    },
  );
}

export async function updateStaffDraft(
  token: string,
  draftNumber: string,
  body: {
    customerId?: string;
    email?: string;
    phone?: string;
    poNumber?: string;
    notes?: string;
    tags?: string[];
  },
) {
  return request<{ draft: StaffDraftDetail }>(
    `/staff/drafts/${encodeURIComponent(draftNumber)}`,
    token,
    {
      method: "PATCH",
      body: JSON.stringify(body),
    },
  );
}

export async function addStaffDraftItem(
  token: string,
  draftNumber: string,
  body: {
    productVariantId: string;
    quantity: number;
    unitPrice?: number;
  },
) {
  return request<{ draft: StaffDraftDetail }>(
    `/staff/drafts/${encodeURIComponent(draftNumber)}/items`,
    token,
    {
      method: "POST",
      body: JSON.stringify(body),
    },
  );
}

export async function updateStaffDraftItem(
  token: string,
  draftNumber: string,
  itemId: string,
  body: {
    quantity?: number;
    unitPrice?: number;
  },
) {
  return request<{ draft: StaffDraftDetail }>(
    `/staff/drafts/${encodeURIComponent(draftNumber)}/items/${encodeURIComponent(itemId)}`,
    token,
    {
      method: "PATCH",
      body: JSON.stringify(body),
    },
  );
}

export async function removeStaffDraftItem(
  token: string,
  draftNumber: string,
  itemId: string,
) {
  return request<{ draft: StaffDraftDetail }>(
    `/staff/drafts/${encodeURIComponent(draftNumber)}/items/${encodeURIComponent(itemId)}`,
    token,
    {
      method: "DELETE",
    },
  );
}

export async function completeStaffDraft(
  token: string,
  draftNumber: string,
  body: {
    markAsPaid?: boolean;
    sendReceipt?: boolean;
  } = {},
) {
  return request<{ orderId: string; orderNumber: string }>(
    `/staff/drafts/${encodeURIComponent(draftNumber)}/complete`,
    token,
    {
      method: "POST",
      body: JSON.stringify(body),
    },
  );
}