export interface StaffOrderListParams {
  search?: string;
  status?: string;
  paymentStatus?: string;
  fulfillmentStatus?: string;
  page?: number;
  pageSize?: number;
}

export interface UpdateStaffOrderStatusInput {
  status: string;
  notes?: string;
}