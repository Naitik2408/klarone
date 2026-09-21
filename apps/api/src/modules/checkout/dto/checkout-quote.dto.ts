export interface CheckoutQuoteItemInput {
  variantId: string;
  quantity: number;
}

export interface CheckoutQuoteDto {
  items: CheckoutQuoteItemInput[];
}