import type {
  StaffPortInput,
  StaffFeatureInput,
  StaffVariantSpecificationInput,
} from "./dto-create-staff-product";

export type {
  StaffPortInput,
  StaffFeatureInput,
  StaffVariantSpecificationInput,
};

export type CreateStaffVariantInput = {
  sku: string;
  variantName?: string | null;
  color?: string | null;
  ramGb?: number | null;
  storageGb?: number | null;
  operatingSystem?: string | null;
  basePrice: number | string;
  sellingPrice: number | string;
  compareAtPrice?: number | string | null;
  currency?: string | null;
  warrantyMonths?: number | null;
  specification?: StaffVariantSpecificationInput | null;

  /** Full-replace list of ports. Absent = leave empty. */
  ports?: StaffPortInput[];

  /** Full-replace list of features. Absent = leave empty. */
  features?: StaffFeatureInput[];

  /** Tag names (or slugs) to attach to this new variant. Absent = leave empty. */
  tags?: string[];
};