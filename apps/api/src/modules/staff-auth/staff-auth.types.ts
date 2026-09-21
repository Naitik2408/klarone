export interface StaffJwtPayload {
  sub: string;
  userAccountId: string;
  staffProfileId: string;
  roles: string[];
  tokenType: "staff-access";
}

export interface AuthenticatedStaff {
  userAccountId: bigint;
  staffProfileId: bigint;
  roles: string[];
  tokenType: "staff-access";
}