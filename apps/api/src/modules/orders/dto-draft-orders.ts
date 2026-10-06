export interface CreateDraftOrderItemInput {
  productVariantId?: string | null;
  productName?: string;
  sku?: string;
  quantity?: number;
  unitPrice?: number;
  discountAmount?: number;
  taxAmount?: number;
}

export interface CreateDraftOrderInput {
  customerId?: string | null;
  email?: string | null;
  phone?: string | null;
  poNumber?: string | null;
  notes?: string | null;
  tags?: string[];
  currency?: string;
  shippingAddressId?: string | null;
  billingAddressId?: string | null;
  items?: CreateDraftOrderItemInput[];
}

export interface UpdateDraftOrderInput {
  customerId?: string | null;
  email?: string | null;
  phone?: string | null;
  poNumber?: string | null;
  notes?: string | null;
  tags?: string[];
  shippingAddressId?: string | null;
  billingAddressId?: string | null;
}

export interface AddDraftOrderItemInput {
  productVariantId: string;
  quantity?: number;
  unitPrice?: number;
  discountAmount?: number;
  taxAmount?: number;
}

export interface UpdateDraftOrderItemInput {
  quantity?: number;
  unitPrice?: number;
  discountAmount?: number;
  taxAmount?: number;
}

export interface ListDraftOrdersParams {
  search?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

export interface CompleteDraftOrderInput {
  /** When true, create the Order with paymentStatus = PAID and add a Payment row. */
  markAsPaid?: boolean;
  /** Free-text payment method label (e.g. "cash", "manual"). */
  paymentMethod?: string | null;
}