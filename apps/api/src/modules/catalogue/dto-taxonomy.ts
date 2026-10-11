export interface CreateStaffBrandInput {
  name: string;
  slug?: string;
  description?: string | null;
  logoUrl?: string | null;
  websiteUrl?: string | null;
}

export interface UpdateStaffBrandInput {
  name?: string;
  slug?: string;
  description?: string | null;
  logoUrl?: string | null;
  websiteUrl?: string | null;
  status?: string;
}

export interface CreateStaffCategoryInput {
  name: string;
  slug?: string;
  description?: string | null;
  imageUrl?: string | null;
  parentId?: number | null;
  displayOrder?: number;
}

export interface UpdateStaffCategoryInput {
  name?: string;
  slug?: string;
  description?: string | null;
  imageUrl?: string | null;
  parentId?: number | null;
  displayOrder?: number;
  status?: string;
}