export interface CustomerPerson {
  firstName: string;
  middleName: string | null;
  lastName: string | null;
  phone: string | null;
  email: string | null;
  status: string;
}

export interface AuthenticatedCustomer {
  userAccountId: string;
  customerId: string;
  personId: string;
  customerCode: string;
  customerType: string;
  customerStatus: string;
  person: CustomerPerson;
}

export interface CustomerAuthSession {
  accessToken: string;
  tokenType: "Bearer";
  expiresIn: number;
  customer: {
    userAccountId: string;
    customerId: string;
    personId: string;
  };
}

export interface CustomerMeResponse {
  authenticated: true;
  customer: AuthenticatedCustomer;
}

export interface RequestOtpResponse {
  challengeId: string;
  expiresInSeconds: number;
  maskedPhone: string;
}