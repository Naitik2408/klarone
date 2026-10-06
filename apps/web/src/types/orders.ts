export interface OrderListItem {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  subtotal: string;
  discountAmount: string;
  shippingAmount: string;
  taxAmount: string;
  totalAmount: string;
  currency: string;
  billingAddressId: string | null;
  shippingAddressId: string | null;
  recommendationSessionId: string | null;
  placedAt: string | null;
  createdAt: string;
  updatedAt: string;
  items: OrderListLineItem[];
  payments: OrderPayment[];
  statusHistory: OrderStatusHistoryEntry[];
}

export interface OrderListLineItem {
  id: string;
  productVariantId: string | null;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: string;
  discountAmount: string;
  taxAmount: string;
  totalAmount: string;
  productVariant: null;
}

export interface OrderDetailLineItem
  extends Omit<
    OrderListLineItem,
    "productVariant"
  > {
  productVariant: OrderProductVariant | null;
}

export interface OrderProductVariant {
  id: string;
  variantName: string | null;
  ramGb: number | null;
  storageGb: number | null;
  operatingSystem: string | null;
  currency: string;
  product: {
    id: string;
    name: string;
    slug: string;
    brand: {
      id: number;
      name: string;
      slug: string;
    };
  };
}

export interface OrderPayment {
  id: string;
  provider: string;
  providerOrderId: string | null;
  amount: string;
  currency: string;
  status: string;
  createdAt: string;
}

export interface OrderStatusHistoryEntry {
  id: string;
  oldStatus: string | null;
  newStatus: string;
  notes: string | null;
  createdAt: string;
}

export interface OrdersListResponse {
  orders: OrderListItem[];
}

export interface OrderDetail {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  subtotal: string;
  discountAmount: string;
  shippingAmount: string;
  taxAmount: string;
  totalAmount: string;
  currency: string;
  billingAddressId: string | null;
  shippingAddressId: string | null;
  recommendationSessionId: string | null;
  placedAt: string | null;
  createdAt: string;
  updatedAt: string;
  items: OrderDetailLineItem[];
  payments: OrderPayment[];
  statusHistory: OrderStatusHistoryEntry[];
}

export interface OrderDetailResponse {
  order: OrderDetail;
}