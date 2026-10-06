export type StaffOrderCustomer = {
  id: string;
  customerCode: string;
  person: {
    firstName: string;
    middleName: string | null;
    lastName: string;
    email: string | null;
    phone: string | null;
  };
};

export type StaffOrderListItem = {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  totalAmount: string;
  currency: string;
  createdAt: string;
  placedAt: string | null;
  customer: StaffOrderCustomer;
  _count: {
    items: number;
  };
};

export type StaffOrderAddress = {
  id: string;
  addressType: string;
  recipientName: string | null;
  phone: string | null;
  addressLine1: string;
  addressLine2: string | null;
  landmark: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

export type StaffOrderDetail = {
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
  placedAt: string | null;
  createdAt: string;
  updatedAt: string;
  customer: StaffOrderCustomer;
  billingAddress: StaffOrderAddress | null;
  shippingAddress: StaffOrderAddress | null;
  items: Array<{
    id: string;
    productVariantId: string | null;
    productName: string;
    sku: string;
    quantity: number;
    unitPrice: string;
    discountAmount: string;
    taxAmount: string;
    totalAmount: string;
    productVariant: {
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
        } | null;
      } | null;
    } | null;
  }>;
  payments: Array<{
    id: string;
    provider: string;
    providerOrderId: string | null;
    providerPaymentId: string | null;
    paymentMethod: string | null;
    amount: string;
    currency: string;
    status: string;
    paidAt: string | null;
    createdAt: string;
  }>;
  statusHistory: Array<{
    id: string;
    oldStatus: string | null;
    newStatus: string;
    notes: string | null;
    createdAt: string;
    changedBy: {
      id: string;
      email: string | null;
    } | null;
  }>;
  shipments: Array<{
    id: string;
    carrier: string | null;
    trackingNumber: string | null;
    status: string;
    shippedAt: string | null;
    deliveredAt: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
  refunds: Array<{
    id: string;
    paymentId: string;
    amount: string;
    reason: string | null;
    providerRefundId: string | null;
    status: string;
    createdAt: string;
    completedAt: string | null;
  }>;
};

export type StaffOrdersResponse = {
  orders: StaffOrderListItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export type StaffDraftListItem = {
  id: string;
  draftNumber: string;
  sequenceNumber: number;
  poNumber: string | null;
  status: string;
  currency: string;
  subtotal: string;
  discountAmount: string;
  shippingAmount: string;
  taxAmount: string;
  totalAmount: string;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  cancelledAt: string | null;
  customer: StaffOrderCustomer | null;
  _count: {
    items: number;
  };
};

export type StaffDraftItem = {
  id: string;
  productVariantId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: string;
  discountAmount: string;
  taxAmount: string;
  totalAmount: string;
  productVariant?: {
    id: string;
    variantName: string | null;
    ramGb: number | null;
    storageGb: number | null;
    operatingSystem: string | null;
    currency: string;
    media?: Array<{
      url: string;
      storageKey: string;
      altText: string | null;
    }>;
    product?: {
      id: string;
      name: string;
      slug: string;
      brand?: { id: number; name: string; slug: string } | null;
    };
  } | null;
};

export type StaffDraftDetail = {
  id: string;
  draftNumber: string;
  sequenceNumber: number;
  poNumber: string | null;
  status: string;
  currency: string;
  subtotal: string;
  discountAmount: string;
  shippingAmount: string;
  taxAmount: string;
  totalAmount: string;
  notes: string | null;
  tags: string[];
  email: string | null;
  phone: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  cancelledAt: string | null;
  completedOrderId: string | null;
  customer: StaffOrderCustomer | null;
  shippingAddress: StaffOrderAddress | null;
  billingAddress: StaffOrderAddress | null;
  completedOrder: { id: string; orderNumber: string; status: string } | null;
  items: StaffDraftItem[];
};

export type StaffDraftsResponse = {
  drafts: StaffDraftListItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};