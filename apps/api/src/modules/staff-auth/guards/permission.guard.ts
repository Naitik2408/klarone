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
  private static permissionCache = new Map<
    string,
    { permissions: Set<string>; expiresAt: number }
  >();

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

    if (staff.roles?.includes("SUPER_ADMIN")) {
      return true;
    }

    const cacheKey = staff.userAccountId.toString();
    const now = Date.now();
    const cached = StaffPermissionGuard.permissionCache.get(cacheKey);

    if (cached && cached.expiresAt > now) {
      if (!cached.permissions.has(requiredPermission)) {
        throw new ForbiddenException(
          `Missing permission: ${requiredPermission}`,
        );
      }
      return true;
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
            name: true,
            permissions: {
              select: {
                permission: {
                  select: {
                    code: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (userRoles.length === 0) {
      throw new ForbiddenException(
        "No active staff role assigned",
      );
    }

    const permissionSet = new Set<string>();
    let isSuperAdmin = false;
    for (const ur of userRoles) {
      if (ur.role.name === "SUPER_ADMIN") {
        isSuperAdmin = true;
      }
      for (const rp of ur.role.permissions) {
        if (rp.permission?.code) {
          permissionSet.add(rp.permission.code);
        }
      }
    }

    if (isSuperAdmin) {
      return true;
    }

    // Cache permissions for 60 seconds
    StaffPermissionGuard.permissionCache.set(cacheKey, {
      permissions: permissionSet,
      expiresAt: now + 60_000,
    });

    if (!permissionSet.has(requiredPermission)) {
      throw new ForbiddenException(
        `Missing permission: ${requiredPermission}`,
      );
    }

    return true;
  }
}