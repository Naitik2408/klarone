export interface ShippingAddressInput {
  recipientName?: string;
  phone?: string;
  addressLine1: string;
  addressLine2?: string;
  landmark?: string;
  city: string;
  state: string;
  postalCode: string;
  country?: string;
}

export interface CreateOrderDto {
  shippingAddress?: ShippingAddressInput;
  notes?: string;
}