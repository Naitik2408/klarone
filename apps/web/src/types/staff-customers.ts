export type StaffCustomerPerson = {
  id?: string;
  firstName: string;
  middleName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  status: string;
  createdAt?: string;
  updatedAt?: string;
};

export type StaffCustomerAccount = {
  id: string;
  accountType?: string;
  status: string;
  lastLoginAt: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type StaffCustomerLocation = {
  country: string;
  city: string;
  state: string;
} | null;

export type StaffCustomerListItem = {
  id: string;
  customerCode: string;
  customerType: string;
  status: string;
  marketingConsent: boolean;
  emailMarketing: boolean;
  smsMarketing: boolean;
  whatsappMarketing: boolean;
  termsAcceptedAt: string | null;
  createdAt: string;
  updatedAt: string;
  person: StaffCustomerPerson;
  userAccount: StaffCustomerAccount;
  location: StaffCustomerLocation;
  orderCount: number;
  totalSpent: string;
};

export type StaffCustomerAddress = {
  id: string;
  addressType: string;
  recipientName: string | null;
  phone: string | null;
  addressLine1: string;
  addressLine2: string | null;
  landmark: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
};

export type StaffCustomerOrder = {
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
  placedAt: string | null;
  createdAt: string;
  updatedAt: string;
  itemCount: number;
};

export type StaffCustomerDetail = {
  id: string;
  customerCode: string;
  customerType: string;
  marketingConsent: boolean;
  marketingConsentAt: string | null;
  termsAcceptedAt: string | null;
  notes: string | null;
  tags: string[];
  emailMarketing: boolean;
  smsMarketing: boolean;
  whatsappMarketing: boolean;
  status: string;
  createdAt: string;
  updatedAt: string;
  totalSpent: string;

  person: StaffCustomerPerson;

  userAccount: StaffCustomerAccount;

  addresses: StaffCustomerAddress[];

  orders: StaffCustomerOrder[];
};

export type StaffCustomerListResponse = {
  customers: StaffCustomerListItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export type CreateStaffCustomerInput = {
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
  defaultAddress?: {
    recipientName?: string | null;
    phone?: string | null;
    addressLine1: string;
    addressLine2?: string | null;
    landmark?: string | null;
    city: string;
    state: string;
    postalCode: string;
    country?: string;
  } | null;
};

export type UpdateStaffCustomerInput = {
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
};