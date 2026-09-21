export interface CheckoutQuoteRequestItem {
  variantId: string;
  quantity: number;
}

export interface CheckoutQuoteItem {
  variantId: string;
  productId: string;
  productSlug: string;
  productName: string;
  brandName: string;
  sku: string;
  variantName: string | null;
  quantity: number;
  unitPrice: string;
  compareAtPrice: string | null;
  lineTotal: string;
  currency: string;
  availableQuantity: number;
}

export interface CheckoutQuote {
  items: CheckoutQuoteItem[];

  pricing: {
    currency: string;
    subtotal: string;
    discountAmount: string;
    shippingAmount: string;
    taxAmount: string;
    totalAmount: string;
  };
}