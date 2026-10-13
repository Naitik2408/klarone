import type {
  CreateStaffCustomerInput,
  StaffCustomerDetail,
  StaffCustomerListResponse,
  UpdateStaffCustomerInput,
} from "../types/staff-customers";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:3000";

export class StaffCustomersApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "StaffCustomersApiError";
    this.status = status;
  }
}

async function request<T>(
  path: string,
  token: string,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options?.headers ?? {}),
    },
  });

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      typeof body?.message === "string"
        ? body.message
        : "Unable to complete the customer request.";

    throw new StaffCustomersApiError(
      message,
      response.status,
    );
  }

  return body as T;
}

export async function getStaffCustomers(
  token: string,
  params: {
    search?: string;
    status?: string;
    customerType?: string;
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

  if (params.customerType) {
    query.set("customerType", params.customerType);
  }

  if (params.page) {
    query.set("page", String(params.page));
  }

  if (params.pageSize) {
    query.set("pageSize", String(params.pageSize));
  }

  const suffix = query.toString();

  return request<StaffCustomerListResponse>(
    `/staff/customers${suffix ? `?${suffix}` : ""}`,
    token,
  );
}

export async function getStaffCustomer(
  token: string,
  customerCode: string,
) {
  return request<StaffCustomerDetail>(
    `/staff/customers/${encodeURIComponent(customerCode)}`,
    token,
  );
}

export async function createStaffCustomer(
  token: string,
  input: CreateStaffCustomerInput,
) {
  return request<{ id: string; customerCode: string }>(
    `/staff/customers`,
    token,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}

export async function updateStaffCustomer(
  token: string,
  customerCode: string,
  input: UpdateStaffCustomerInput,
) {
  return request<StaffCustomerDetail>(
    `/staff/customers/${encodeURIComponent(customerCode)}`,
    token,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );
}

export async function deleteStaffCustomer(
  token: string,
  customerCode: string,
) {
  return request<{ success: boolean; customerCode: string }>(
    `/staff/customers/${encodeURIComponent(customerCode)}`,
    token,
    {
      method: "DELETE",
    },
  );
}