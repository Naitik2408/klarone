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

export interface UpdateStaffProductInput {
  brandId?: number;
  categoryId?: number;
  name?: string;
  modelNumber?: string | null;
  manufacturerPartNumber?: string | null;
  shortDescription?: string | null;
  description?: string | null;
  productType?: string;

  variantId: string;

  variant?: {
    sku?: string;
    variantName?: string | null;
    color?: string | null;
    ramGb?: number | null;
    storageGb?: number | null;
    operatingSystem?: string | null;
    basePrice?: number | string;
    sellingPrice?: number | string;
    compareAtPrice?: number | string | null;
    currency?: string;
    warrantyMonths?: number | null;

    specification?: StaffVariantSpecificationInput | null;

    /** Full-replace list of ports. See CreateStaffProductInput. */
    ports?: StaffPortInput[];

    /** Full-replace list of features. See CreateStaffProductInput. */
    features?: StaffFeatureInput[];

    /** Full-replace list of tags (names or slugs). See CreateStaffProductInput. */
    tags?: string[];
  };
}