export interface CreateStaffCustomerAddressInput {
  recipientName?: string | null;
  phone?: string | null;
  addressLine1: string;
  addressLine2?: string | null;
  landmark?: string | null;
  city: string;
  state: string;
  postalCode: string;
  country?: string;
}

export interface CreateStaffCustomerInput {
  firstName: string;
  lastName?: string | null;
  middleName?: string | null;

  email?: string | null;
  phone?: string | null;

  customerType?: string;

  emailMarketing?: boolean;
  smsMarketing?: boolean;
  whatsappMarketing?: boolean;

  notes?: string | null;
  tags?: string[];

  defaultAddress?: CreateStaffCustomerAddressInput | null;
}

export interface UpdateStaffCustomerInput {
  firstName?: string;
  lastName?: string | null;
  middleName?: string | null;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  tags?: string[];
  emailMarketing?: boolean;
  smsMarketing?: boolean;
  whatsappMarketing?: boolean;
  status?: string;
}