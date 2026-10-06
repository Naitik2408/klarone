export interface AdjustInventoryInput {
  productVariantId: string;
  warehouseId: number;
  quantityDelta: number;
  notes?: string | null;
}
