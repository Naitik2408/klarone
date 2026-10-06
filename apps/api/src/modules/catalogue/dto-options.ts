export interface CreateStaffProductOptionInput {
  name: string;
  displayOrder?: number;
  values?: string[];
}

export interface UpdateStaffProductOptionInput {
  name?: string;
  displayOrder?: number;
}

export interface AddStaffProductOptionValueInput {
  value: string;
  displayOrder?: number;
  /**
   * Optional link to a MetaobjectEntry (e.g. a klarone.color entry).
   * When set, the option value is a reference to the metaobject — the
   * storefront and admin will render it with the entry's swatch/label
   * rather than treating `value` as free text.
   */
  metaobjectEntryId?: string | number | null;
}

export interface UpdateStaffProductOptionValueInput {
  value?: string;
  displayOrder?: number;
  metaobjectEntryId?: string | number | null;
}

/**
 * Sets the option values on a single variant.
 * Sent as the full set of value ids for the variant's options — replace-all
 * semantics. Passing an empty array for an option removes its value on that
 * variant, which is how you "disconnect" a variant from an option.
 */
export interface SetVariantOptionValuesInput {
  optionValues: Array<{
    productOptionId: string | number;
    productOptionValueId: string | number;
  }>;
}

/**
 * Bulk-edit fields across multiple variants.
 * Every field is optional; only provided fields are written.
 * Price fields are strings because they come in as Decimal-friendly strings.
 */
export interface BulkEditVariantsInput {
  variantIds: Array<string | number>;
  status?: "ACTIVE" | "INACTIVE";
  sellingPrice?: string | number;
  basePrice?: string | number;
  compareAtPrice?: string | number | null;
  currency?: string;
  warrantyMonths?: number | null;
}


/**
 * Result of a variant-matrix sync. The endpoint returns the product's
 * current option set AND its full variant list so the client can render
 * the grouped matrix without a second round-trip.
 */
export interface SyncVariantMatrixResult {
  options: Array<{
    id: string;
    name: string;
    displayOrder: number;
    values: Array<{
      id: string;
      value: string;
      displayOrder: number;
      metaobjectEntryId: string | null;
      metaobjectEntry: {
        id: string;
        handle: string;
        displayName: string;
        fields: Record<string, unknown>;
      } | null;
    }>;
  }>;
  variants: Array<{
    id: string;
    sku: string;
    variantName: string | null;
    sellingPrice: string;
    compareAtPrice: string | null;
    currency: string;
    status: string;
    imageUrl: string | null;
    quantityAvailable: number;
    optionValues: Array<{
      productOptionId: string;
      productOptionValueId: string;
      productOptionName: string;
      value: string;
      metaobjectEntryId: string | null;
      metaobjectEntry: {
        id: string;
        handle: string;
        displayName: string;
        fields: Record<string, unknown>;
      } | null;
    }>;
  }>;
  created: number;
  removed: number;
  deactivated: number;
  skipped: number;
}