export interface InitializeInventoryInput {
  productVariantId: string;
  warehouseId: number;
  initialQuantity: number;
  reorderLevel?: number | null;
  notes?: string | null;
}
