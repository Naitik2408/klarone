/* ------------------------------------------------------------------ */
/* Definitions                                                         */
/* ------------------------------------------------------------------ */

export type MetafieldOwnerType = "PRODUCT" | "VARIANT";

export type MetafieldType =
  | "text"
  | "number"
  | "boolean"
  | "select"
  | "metaobject";

export type MetaobjectType = "color" | "entry";

export interface MetaobjectFieldSchemaEntry {
  key: string;
  label: string;
  type: "text" | "number" | "color" | "image" | "select" | "boolean";
  required?: boolean;
  options?: string[];
}

export interface StaffMetafieldDefinition {
  id: number;
  namespace: string;
  key: string;
  name: string;
  ownerType: MetafieldOwnerType;
  type: MetafieldType;
  metaobjectType: MetaobjectType | null;
  multiple: boolean;
  options: unknown;
  displayOrder: number;
  categoryId: number | null;
  status: string;
}

export interface StaffMetafieldDefinitionsResponse {
  items: StaffMetafieldDefinition[];
}

/* ------------------------------------------------------------------ */
/* Entries                                                             */
/* ------------------------------------------------------------------ */

export interface StaffMetaobjectEntry {
  id: string;
  definitionId: number;
  handle: string;
  displayName: string;
  fields: Record<string, unknown>;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface StaffMetaobjectEntriesResponse {
  definition: {
    id: number;
    type: string;
    name: string;
    fieldSchema: MetaobjectFieldSchemaEntry[];
  };
  items: StaffMetaobjectEntry[];
  pagination: {
    take: number;
    skip: number;
    total: number;
  };
}

export interface CreateStaffMetaobjectEntryInput {
  displayName: string;
  handle?: string;
  fields?: Record<string, unknown>;
}

export interface UpdateStaffMetaobjectEntryInput {
  displayName?: string;
  fields?: Record<string, unknown>;
}

/* ------------------------------------------------------------------ */
/* Product metafields                                                  */
/* ------------------------------------------------------------------ */

export type ProductMetafieldValue =
  | string
  | number
  | boolean
  | { entryId: number | null }
  | { entryIds: string[] }
  | null;

export interface StaffProductMetafield {
  id: number;
  namespace: string;
  key: string;
  name: string;
  type: MetafieldType;
  metaobjectType: MetaobjectType | null;
  multiple: boolean;
  options: unknown;
  displayOrder: number;
  categoryId: number | null;
  value: ProductMetafieldValue;
  metaobjectEntryId: string | null;
}

export interface StaffProductMetafieldsResponse {
  productId: string;
  categoryId: number;
  definitions: StaffProductMetafield[];
}

export interface SetStaffProductMetafieldsInput {
  values: Array<{
    definitionId: number;
    value: ProductMetafieldValue;
  }>;
}