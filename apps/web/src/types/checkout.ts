export interface CheckoutQuoteItemInput {
  variantId: string;
  quantity: number;
}

export interface CheckoutQuoteRequest {
  items: CheckoutQuoteItemInput[];
}

export interface CheckoutQuoteItem {
  variantId: string;
  productId: string;
  productName: string;
  productSlug: string;
  brandName: string;
  sku: string;
  variantName: string;
  quantity: number;
  unitPrice: string;
  compareAtPrice: string | null;
  lineTotal: string;
  currency: string;
  availableQuantity: number;
}

export interface CheckoutQuotePricing {
  currency: string;
  subtotal: string;
  discountAmount: string;
  shippingAmount: string;
  taxAmount: string;
  total: string;
}

export interface CheckoutQuoteResponse {
  items: CheckoutQuoteItem[];
  pricing: CheckoutQuotePricing;
}

export interface CreateCheckoutOrderResponse {
  order: {
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
    createdAt: string;
    items: Array<{
      productVariantId: string;
      productName: string;
      sku: string;
      quantity: number;
      unitPrice: string;
      totalAmount: string;
    }>;
  };
}