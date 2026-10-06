export interface CustomerJwtPayload {
  sub: string;
  userAccountId: string;
  customerId: string;
  personId: string;
  tokenType: "customer-access";
  iat?: number;
  exp?: number;
  aud?: string;
  iss?: string;
}

export interface AuthenticatedCustomer {
  userAccountId: string;
  customerId: string;
  personId: string;
  customerCode: string;
  customerType: string;
  customerStatus: string;
  person: {
    firstName: string;
    middleName: string | null;
    lastName: string | null;
    phone: string | null;
    email: string | null;
    status: string;
  };
}