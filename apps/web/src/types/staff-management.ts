export interface StaffRolePermission {
  id: number;
  code: string;
  module: string;
  action: string;
  description: string | null;
}

export interface StaffRole {
  id: number;
  name: string;
  description: string | null;
  isSystemRole: boolean;
  status: string;
  userCount?: number;
  permissions: StaffRolePermission[];
  createdAt: string;
  updatedAt: string;
}

export interface StaffMember {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  name: string;
  phone: string | null;
  employeeCode: string;
  department: string;
  jobTitle: string;
  status: string;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  roles: Array<{
    id: number;
    name: string;
    description: string | null;
    isSystemRole: boolean;
  }>;
  permissions: StaffRolePermission[];
}

export interface StaffListResponse {
  items: StaffMember[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateStaffInput {
  email: string;
  password?: string;
  firstName: string;
  lastName?: string;
  phone?: string;
  employeeCode?: string;
  department?: string;
  jobTitle?: string;
  roleIds?: number[];
  status?: string;
}

export interface UpdateStaffInput {
  firstName?: string;
  lastName?: string;
  phone?: string;
  employeeCode?: string;
  department?: string;
  jobTitle?: string;
  roleIds?: number[];
  status?: string;
  password?: string;
}

export interface CreateRoleInput {
  name: string;
  description?: string;
  permissionIds: number[];
}

export interface UpdateRoleInput {
  name?: string;
  description?: string;
  permissionIds?: number[];
  status?: string;
}
