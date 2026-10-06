/* ------------------------------------------------------------------ */
/* List / search                                                       */
/* ------------------------------------------------------------------ */

export interface ListMetaobjectEntriesQuery {
  q?: string;
  groupId?: string;
  take?: string;
  skip?: string;
}

export interface ListMetafieldDefinitionsQuery {
  categoryId?: string;
}

/* ------------------------------------------------------------------ */
/* Entry create / update                                               */
/* ------------------------------------------------------------------ */

export interface CreateMetaobjectEntryInput {
  /** Display label. Used to auto-generate handle if omitted. */
  displayName: string;
  /** Optional explicit handle. Must be unique within the definition. */
  handle?: string;
  /** Free-form fields matching the definition's fieldSchema. */
  fields?: Record<string, unknown>;
}

export interface UpdateMetaobjectEntryInput {
  displayName?: string;
  fields?: Record<string, unknown>;
}

/* ------------------------------------------------------------------ */
/* Product metafields                                                  */
/* ------------------------------------------------------------------ */

export interface SetProductMetafieldsInput {
  /**
   * Full-replace list of metafield values.
   * Anything not present in this array will be deleted for this product.
   */
  values: Array<{
    definitionId: number;
    /**
     * Value shape depends on the definition type:
     *   text/number/boolean  → primitive
     *   select               → string
     *   metaobject (single)  → { entryId: number | null } | null
     *   metaobject (multiple)→ { entryIds: number[] } | { entryIds: [] }
     */
    value: unknown;
  }>;
}