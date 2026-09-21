import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PrismaService } from "../../../database/prisma.service";
import { REQUIRED_PERMISSION_KEY } from "../decorators/require-permission.decorator";
import type { Request } from "express";
import type { AuthenticatedStaff } from "../staff-auth.types";

type AuthenticatedRequest = Request & {
  staff?: AuthenticatedStaff;
};

@Injectable()
export class StaffPermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermission = this.reflector.get<string>(
      REQUIRED_PERMISSION_KEY,
      context.getHandler(),
    );

    if (!requiredPermission) {
      return true;
    }

    const request =
      context.switchToHttp().getRequest<AuthenticatedRequest>();

    const staff = request.staff;

    if (!staff) {
      throw new UnauthorizedException(
        "Staff authentication required",
      );
    }

    const userRoles = await this.prisma.userRole.findMany({
      where: {
        userAccountId: staff.userAccountId,
        status: "ACTIVE",
        OR: [
          {
            expiresAt: null,
          },
          {
            expiresAt: {
              gt: new Date(),
            },
          },
        ],
        role: {
          status: "ACTIVE",
        },
      },
      select: {
        role: {
          select: {
            id: true,
          },
        },
      },
    });

    if (userRoles.length === 0) {
      throw new ForbiddenException(
        "No active staff role assigned",
      );
    }

    const roleIds = userRoles.map(
      (userRole) => userRole.role.id,
    );

    const permission = await this.prisma.rolePermission.findFirst({
      where: {
        roleId: {
          in: roleIds,
        },
        permission: {
          code: requiredPermission,
        },
      },
      select: {
        permission: {
          select: {
            code: true,
          },
        },
      },
    });

    if (!permission) {
      throw new ForbiddenException(
        `Missing permission: ${requiredPermission}`,
      );
    }

    return true;
  }
}