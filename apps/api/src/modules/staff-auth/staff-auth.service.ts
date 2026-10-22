import {
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import * as argon2 from "argon2";
import { PrismaService } from "../../database/prisma.service";

interface StaffJwtPayload {
  sub: string;
  userAccountId: string;
  staffProfileId: string;
  roles: string[];
  tokenType: "staff-access";
}

@Injectable()
export class StaffAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(email: string, password: string) {
    const normalizedEmail = email.toLowerCase().trim();

    const userAccount = await this.prisma.userAccount.findFirst({
      where: {
        status: "ACTIVE",
        person: {
          email: normalizedEmail,
        },
        staffProfile: {
          isNot: null,
        },
      },
      include: {
        staffProfile: true,
        userRoles: {
          where: {
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
          },
          include: {
            role: true,
          },
        },
      },
    });

    if (!userAccount || !userAccount.staffProfile) {
      throw new UnauthorizedException("Invalid credentials");
    }

    if (userAccount.staffProfile.status !== "ACTIVE") {
      throw new UnauthorizedException("Staff account is inactive");
    }

    const credential = await this.prisma.staffCredential.findFirst({
      where: {
        userAccountId: userAccount.id,
        loginEmail: normalizedEmail,
      },
    });

    if (!credential) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const passwordValid = await argon2.verify(
      credential.passwordHash,
      password,
    );

    if (!passwordValid) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const roles = userAccount.userRoles.map(
      (userRole) => userRole.role.name,
    );

    const payload: StaffJwtPayload = {
      sub: userAccount.id.toString(),
      userAccountId: userAccount.id.toString(),
      staffProfileId: userAccount.staffProfile.id.toString(),
      roles,
      tokenType: "staff-access",
    };

    const expiresIn = this.configService.get<string>(
      "STAFF_AUTH_JWT_EXPIRES_IN",
      "12h",
    );

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.getOrThrow<string>(
        "STAFF_AUTH_JWT_SECRET",
      ),
      expiresIn: (expiresIn ?? "12h") as `${number}h` | `${number}d` | `${number}m` | `${number}s`,
      issuer: this.configService.get<string>(
        "STAFF_AUTH_JWT_ISSUER",
        "klarone-api",
      ),
      audience: this.configService.get<string>(
        "STAFF_AUTH_JWT_AUDIENCE",
        "klarone-admin",
      ),
    });

    await this.prisma.staffCredential.update({
      where: {
        id: credential.id,
      },
      data: {
        lastPasswordLoginAt: new Date(),
      },
    });

    return {
      accessToken,
      tokenType: "Bearer",
      expiresIn: 43200,
      staff: {
        userAccountId: userAccount.id.toString(),
        staffProfileId: userAccount.staffProfile.id.toString(),
        roles,
      },
    };
  }

  async getStaffProfileWithPermissions(userAccountId: bigint) {
    const account = await this.prisma.userAccount.findUnique({
      where: { id: userAccountId },
      include: {
        person: true,
        staffProfile: true,
        userRoles: {
          where: {
            status: "ACTIVE",
            OR: [
              { expiresAt: null },
              { expiresAt: { gt: new Date() } },
            ],
            role: { status: "ACTIVE" },
          },
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!account || !account.staffProfile) {
      throw new UnauthorizedException("Staff member not found");
    }

    const isSuperAdmin = account.userRoles.some((ur) => ur.role.name === "SUPER_ADMIN");

    let permissionCodes: string[] = [];
    if (isSuperAdmin) {
      const allPerms = await this.prisma.permission.findMany({ select: { code: true } });
      permissionCodes = allPerms.map((p) => p.code);
    } else {
      const codeSet = new Set<string>();
      for (const ur of account.userRoles) {
        for (const rp of ur.role.permissions) {
          codeSet.add(rp.permission.code);
        }
      }
      permissionCodes = Array.from(codeSet);
    }

    return {
      userAccountId: account.id.toString(),
      staffProfileId: account.staffProfile.id.toString(),
      name: `${account.person.firstName} ${account.person.lastName ?? ""}`.trim(),
      email: account.person.email,
      department: account.staffProfile.department,
      jobTitle: account.staffProfile.jobTitle,
      employeeCode: account.staffProfile.employeeCode,
      roles: account.userRoles.map((ur) => ur.role.name),
      isSuperAdmin,
      permissions: permissionCodes,
    };
  }
}