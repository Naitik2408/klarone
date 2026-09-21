import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import type { Request } from "express";
import type {
  AuthenticatedStaff,
  StaffJwtPayload,
} from "../staff-auth.types";

type AuthenticatedRequest = Request & {
  staff?: AuthenticatedStaff;
};

@Injectable()
export class StaffAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<AuthenticatedRequest>();

    const authorization = request.headers.authorization;

    if (!authorization?.startsWith("Bearer ")) {
      throw new UnauthorizedException("Missing staff access token");
    }

    const token = authorization.slice("Bearer ".length).trim();

    if (!token) {
      throw new UnauthorizedException("Missing staff access token");
    }

    try {
      const payload =
        await this.jwtService.verifyAsync<StaffJwtPayload>(token, {
          secret: this.configService.getOrThrow<string>(
            "STAFF_AUTH_JWT_SECRET",
          ),
          issuer: this.configService.get<string>(
            "STAFF_AUTH_JWT_ISSUER",
            "klarone-api",
          ),
          audience: this.configService.get<string>(
            "STAFF_AUTH_JWT_AUDIENCE",
            "klarone-admin",
          ),
        });

      if (
        payload.tokenType !== "staff-access" ||
        !payload.userAccountId ||
        !payload.staffProfileId
      ) {
        throw new UnauthorizedException("Invalid staff access token");
      }

      request.staff = {
        userAccountId: BigInt(payload.userAccountId),
        staffProfileId: BigInt(payload.staffProfileId),
        roles: payload.roles,
        tokenType: payload.tokenType,
      };

      return true;
    } catch {
      throw new UnauthorizedException("Invalid or expired staff access token");
    }
  }
}