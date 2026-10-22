export interface CreateStaffMemberDto {
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

export interface UpdateStaffMemberDto {
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

export interface ListStaffQueryDto {
  search?: string;
  roleId?: number;
  status?: string;
  department?: string;
  page?: number;
  pageSize?: number;
}

export interface CreateRoleDto {
  name: string;
  description?: string;
  permissionIds: number[];
}

export interface UpdateRoleDto {
  name?: string;
  description?: string;
  permissionIds?: number[];
  status?: string;
}
