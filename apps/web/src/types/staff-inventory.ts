export interface StaffWarehouse {
  id: number;
  name: string;
  code: string;
  city: string;
  state: string;
  status: string;
}

export interface StaffInventoryItem {
  id: string;
  warehouseId: number;
  productVariantId: string;
  quantityAvailable: number;
  quantityReserved: number;
  reorderLevel: number | null;
  updatedAt: string;
  warehouse: StaffWarehouse;
  productVariant: {
    id: string;
    sku: string;
    variantName: string;
    ramGb: number | null;
    storageGb: number | null;
    sellingPrice: string;
    status: string;
    product: {
      id: string;
      name: string;
      slug: string;
      status: string;
      brand: {
        id: number;
        name: string;
        slug: string;
      };
    };
  };
}

export interface StaffInventoryResponse {
  items: StaffInventoryItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface StaffInventoryCandidate {
  id: string;
  sku: string;
  variantName: string;
  ramGb: number | null;
  storageGb: number | null;
  sellingPrice: string;
  status: string;
  product: {
    id: string;
    name: string;
    slug: string;
    status: string;
    brand: {
      id: number;
      name: string;
      slug: string;
    };
  };
}
