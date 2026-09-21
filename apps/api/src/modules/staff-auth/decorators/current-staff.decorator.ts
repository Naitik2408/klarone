import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from "@nestjs/common";
import type { Request } from "express";
import type { AuthenticatedStaff } from "../staff-auth.types";

type AuthenticatedRequest = Request & {
  staff?: AuthenticatedStaff;
};

export const CurrentStaff = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedStaff => {
    const request =
      context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (!request.staff) {
      throw new UnauthorizedException("Staff authentication required");
    }

    return request.staff;
  },
);