import type { CatalogueProductDetail } from "./catalogue";

export interface CartItem {
  productId: string;
  variantId: string;
  productSlug: string;
  productName: string;
  variantName: string | null;
  sku: string;
  sellingPrice: string;
  compareAtPrice: string | null;
  currency: string;
  quantity: number;
  imageUrl: string | null;
  brandName: string;
  ramGb: number | null;
  storageGb: number | null;
}

export interface AddToCartInput {
  product: CatalogueProductDetail;
  variantId: string;
}

export interface CartContextValue {
  items: CartItem[];
  itemCount: number;
  subtotal: string;
  addItem: (input: AddToCartInput) => void;
  removeItem: (variantId: string) => void;
  updateQuantity: (
    variantId: string,
    quantity: number,
  ) => void;
  clearCart: () => void;
  isHydrated: boolean;
}