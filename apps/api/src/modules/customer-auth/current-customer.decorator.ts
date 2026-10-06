import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from "@nestjs/common";
import type { Request } from "express";

import type { AuthenticatedCustomer } from "./types/customer-session.types";

type CustomerRequest = Request & {
  customer?: AuthenticatedCustomer;
};

export const CurrentCustomer = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedCustomer => {
    const request =
      context.switchToHttp().getRequest<CustomerRequest>();

    if (!request.customer) {
      throw new UnauthorizedException("Customer session is not available");
    }

    return request.customer;
  },
);