import type {
  CreateStaffInput,
  StaffListResponse,
  StaffMember,
  StaffRole,
  StaffRolePermission,
  UpdateStaffInput,
} from "../types/staff-management";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3000";

export class StaffManagementApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "StaffManagementApiError";
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
        : "Unable to complete the staff management request.";

    throw new StaffManagementApiError(message, response.status);
  }

  return body as T;
}

export async function getStaffList(
  token: string,
  params: {
    search?: string;
    roleId?: number;
    status?: string;
    department?: string;
    page?: number;
    pageSize?: number;
  } = {},
): Promise<StaffListResponse> {
  const query = new URLSearchParams();

  if (params.search?.trim()) {
    query.set("search", params.search.trim());
  }
  if (params.status) {
    query.set("status", params.status);
  }
  if (params.roleId) {
    query.set("roleId", String(params.roleId));
  }
  if (params.department) {
    query.set("department", params.department);
  }
  if (params.page) {
    query.set("page", String(params.page));
  }
  if (params.pageSize) {
    query.set("pageSize", String(params.pageSize));
  }

  const queryString = query.toString();
  const path = `/staff/users${queryString ? `?${queryString}` : ""}`;
  return request<StaffListResponse>(path, token);
}

export async function getStaffMember(
  token: string,
  id: string,
): Promise<StaffMember> {
  return request<StaffMember>(`/staff/users/${id}`, token);
}

export async function createStaffMember(
  token: string,
  input: CreateStaffInput,
): Promise<StaffMember> {
  return request<StaffMember>("/staff/users", token, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateStaffMember(
  token: string,
  id: string,
  input: UpdateStaffInput,
): Promise<StaffMember> {
  return request<StaffMember>(`/staff/users/${id}`, token, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function deleteStaffMember(
  token: string,
  id: string,
): Promise<{ success: boolean; message: string }> {
  return request<{ success: boolean; message: string }>(
    `/staff/users/${id}`,
    token,
    {
      method: "DELETE",
    },
  );
}

export async function getStaffRoles(
  token: string,
): Promise<{ roles: StaffRole[] }> {
  return request<{ roles: StaffRole[] }>("/staff/users/roles", token);
}

export async function getStaffRole(
  token: string,
  id: number,
): Promise<StaffRole> {
  return request<StaffRole>(`/staff/users/roles/${id}`, token);
}

export async function createStaffRole(
  token: string,
  input: import("../types/staff-management").CreateRoleInput,
): Promise<StaffRole> {
  return request<StaffRole>("/staff/users/roles", token, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateStaffRole(
  token: string,
  id: number,
  input: import("../types/staff-management").UpdateRoleInput,
): Promise<StaffRole> {
  return request<StaffRole>(`/staff/users/roles/${id}`, token, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function deleteStaffRole(
  token: string,
  id: number,
): Promise<{ success: boolean; message: string }> {
  return request<{ success: boolean; message: string }>(
    `/staff/users/roles/${id}`,
    token,
    {
      method: "DELETE",
    },
  );
}

export async function getStaffPermissions(
  token: string,
): Promise<{
  permissions: StaffRolePermission[];
  grouped: Record<string, StaffRolePermission[]>;
}> {
  return request<{
    permissions: StaffRolePermission[];
    grouped: Record<string, StaffRolePermission[]>;
  }>("/staff/users/permissions", token);
}
