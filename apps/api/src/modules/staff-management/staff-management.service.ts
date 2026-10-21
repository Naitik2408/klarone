import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import * as argon2 from "argon2";
import { PrismaService } from "../../database/prisma.service";
import { toJsonSafe } from "../../common/serialization/json-safe";
import { AuditService } from "../audit/audit.service";
import type {
  CreateRoleDto,
  CreateStaffMemberDto,
  ListStaffQueryDto,
  UpdateRoleDto,
  UpdateStaffMemberDto,
} from "./dto/staff-member.dto";

@Injectable()
export class StaffManagementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async listRoles() {
    const roles = await this.prisma.role.findMany({
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
        _count: {
          select: {
            users: true,
          },
        },
      },
      orderBy: {
        id: "asc",
      },
    });

    return toJsonSafe({
      roles: roles.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        isSystemRole: r.isSystemRole,
        status: r.status,
        userCount: r._count.users,
        permissions: r.permissions.map((rp) => ({
          id: rp.permission.id,
          code: rp.permission.code,
          module: rp.permission.module,
          action: rp.permission.action,
          description: rp.permission.description,
        })),
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      })),
    });
  }

  async listPermissions() {
    const permissions = await this.prisma.permission.findMany({
      orderBy: [{ module: "asc" }, { code: "asc" }],
    });

    // Group permissions by module
    const grouped: Record<string, typeof permissions> = {};
    for (const p of permissions) {
      if (!grouped[p.module]) {
        grouped[p.module] = [];
      }
      grouped[p.module].push(p);
    }

    return toJsonSafe({
      permissions,
      grouped,
    });
  }

  async getRole(roleId: number) {
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
        _count: {
          select: {
            users: true,
          },
        },
      },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID ${roleId} not found.`);
    }

    return toJsonSafe({
      id: role.id,
      name: role.name,
      description: role.description,
      isSystemRole: role.isSystemRole,
      status: role.status,
      userCount: role._count.users,
      permissions: role.permissions.map((rp) => ({
        id: rp.permission.id,
        code: rp.permission.code,
        module: rp.permission.module,
        action: rp.permission.action,
        description: rp.permission.description,
      })),
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    });
  }

  async createRole(dto: CreateRoleDto, actorUserId?: bigint) {
    const formattedName = dto.name.trim().toUpperCase().replace(/\s+/g, "_");
    if (!formattedName) {
      throw new BadRequestException("Role name is required.");
    }

    const existing = await this.prisma.role.findUnique({
      where: { name: formattedName },
    });
    if (existing) {
      throw new ConflictException(`Role with name "${formattedName}" already exists.`);
    }

    // Auto-resolve interlinked permissions:
    // e.g. If you grant "catalogue.update" or "catalogue.create", you MUST also have "catalogue.read".
    const resolvedPermissionIds = await this.resolveInterlinkedPermissions(dto.permissionIds || []);

    const role = await this.prisma.$transaction(async (tx) => {
      const created = await tx.role.create({
        data: {
          name: formattedName,
          description: dto.description?.trim() || null,
          isSystemRole: false,
          status: "ACTIVE",
        },
      });

      for (const pId of resolvedPermissionIds) {
        await tx.rolePermission.create({
          data: {
            roleId: created.id,
            permissionId: pId,
          },
        });
      }

      return created;
    });

    await this.auditService.log({
      userAccountId: actorUserId,
      action: "role.create",
      module: "roles",
      entityType: "Role",
      entityId: role.id.toString(),
      description: `Created custom role ${role.name} with ${resolvedPermissionIds.length} permissions`,
      newData: { name: role.name, permissions: resolvedPermissionIds },
    });

    return this.getRole(role.id);
  }

  async updateRole(roleId: number, dto: UpdateRoleDto, actorUserId?: bigint) {
    const existing = await this.prisma.role.findUnique({
      where: { id: roleId },
      include: { permissions: true },
    });

    if (!existing) {
      throw new NotFoundException(`Role with ID ${roleId} not found.`);
    }

    if (existing.isSystemRole && dto.name && dto.name !== existing.name) {
      throw new BadRequestException("System predefined role names cannot be renamed.");
    }

    let resolvedPermissionIds = existing.permissions.map((p) => p.permissionId);
    if (Array.isArray(dto.permissionIds)) {
      resolvedPermissionIds = await this.resolveInterlinkedPermissions(dto.permissionIds);
    }

    await this.prisma.$transaction(async (tx) => {
      if (dto.name || dto.description !== undefined || dto.status) {
        await tx.role.update({
          where: { id: roleId },
          data: {
            name: !existing.isSystemRole && dto.name ? dto.name.trim().toUpperCase().replace(/\s+/g, "_") : existing.name,
            description: dto.description !== undefined ? dto.description.trim() || null : existing.description,
            status: dto.status ?? existing.status,
          },
        });
      }

      if (Array.isArray(dto.permissionIds)) {
        await tx.rolePermission.deleteMany({
          where: { roleId },
        });
        for (const pId of resolvedPermissionIds) {
          await tx.rolePermission.create({
            data: {
              roleId,
              permissionId: pId,
            },
          });
        }
      }
    });

    await this.auditService.log({
      userAccountId: actorUserId,
      action: "role.update",
      module: "roles",
      entityType: "Role",
      entityId: roleId.toString(),
      description: `Updated role ${existing.name}`,
      newData: { name: dto.name, permissions: resolvedPermissionIds },
    });

    return this.getRole(roleId);
  }

  async deleteRole(roleId: number, actorUserId?: bigint) {
    const existing = await this.prisma.role.findUnique({
      where: { id: roleId },
      include: {
        _count: { select: { users: true } },
      },
    });

    if (!existing) {
      throw new NotFoundException(`Role with ID ${roleId} not found.`);
    }

    if (existing.isSystemRole) {
      throw new BadRequestException("System predefined roles cannot be deleted.");
    }

    if (existing._count.users > 0) {
      throw new BadRequestException(
        `Cannot delete role "${existing.name}" because it is currently assigned to ${existing._count.users} staff member(s). Reassign them first.`,
      );
    }

    await this.prisma.role.delete({
      where: { id: roleId },
    });

    await this.auditService.log({
      userAccountId: actorUserId,
      action: "role.delete",
      module: "roles",
      entityType: "Role",
      entityId: roleId.toString(),
      description: `Deleted custom role ${existing.name}`,
    });

    return toJsonSafe({ success: true, message: `Role ${existing.name} deleted successfully.` });
  }

  /**
   * Automatically resolves interlinked permissions.
   * Rules:
   * 1. If any write/create/update/delete action in a module is selected, automatically include `<module>.read`.
   * 2. If 'orders.drafts.manage' is selected, automatically include 'orders.read' and 'orders.create'.
   * 3. If 'roles.assign' or 'roles.update' is selected, include 'roles.read'.
   */
  private async resolveInterlinkedPermissions(selectedIds: number[]): Promise<number[]> {
    const all = await this.prisma.permission.findMany();
    const idMap = new Map(all.map((p) => [p.id, p]));
    const codeMap = new Map(all.map((p) => [p.code, p]));

    const resultSet = new Set<number>(selectedIds);

    for (const id of selectedIds) {
      const p = idMap.get(id);
      if (!p) continue;

      // Module read prerequisite rule
      if (p.action !== "read") {
        const readPerm = codeMap.get(`${p.module}.read`);
        if (readPerm) {
          resultSet.add(readPerm.id);
        }
      }

      // Order drafts prerequisite
      if (p.code === "orders.drafts.manage") {
        const oRead = codeMap.get("orders.read");
        const oCreate = codeMap.get("orders.create");
        if (oRead) resultSet.add(oRead.id);
        if (oCreate) resultSet.add(oCreate.id);
      }

      // Roles assign prerequisite
      if (p.code === "roles.assign") {
        const rRead = codeMap.get("roles.read");
        if (rRead) resultSet.add(rRead.id);
      }
    }

    return Array.from(resultSet);
  }

  async listStaff(query: ListStaffQueryDto) {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 20));
    const skip = (page - 1) * pageSize;

    const where: any = {
      accountType: "STAFF",
    };

    if (query.status && query.status !== "ALL") {
      where.status = query.status;
    }

    if (query.department) {
      where.staffProfile = {
        department: query.department,
      };
    }

    if (query.roleId) {
      where.userRoles = {
        some: {
          roleId: Number(query.roleId),
        },
      };
    }

    if (query.search?.trim()) {
      const s = query.search.trim();
      where.OR = [
        {
          person: {
            OR: [
              { firstName: { contains: s, mode: "insensitive" } },
              { lastName: { contains: s, mode: "insensitive" } },
              { email: { contains: s, mode: "insensitive" } },
              { phone: { contains: s, mode: "insensitive" } },
            ],
          },
        },
        {
          staffProfile: {
            OR: [
              { employeeCode: { contains: s, mode: "insensitive" } },
              { department: { contains: s, mode: "insensitive" } },
              { jobTitle: { contains: s, mode: "insensitive" } },
            ],
          },
        },
        {
          staffCredentials: {
            loginEmail: { contains: s, mode: "insensitive" },
          },
        },
      ];
    }

    const [total, accounts] = await Promise.all([
      this.prisma.userAccount.count({ where }),
      this.prisma.userAccount.findMany({
        where,
        skip,
        take: pageSize,
        include: {
          person: true,
          staffProfile: true,
          staffCredentials: {
            select: {
              loginEmail: true,
              lastPasswordLoginAt: true,
              mfaRequired: true,
              updatedAt: true,
            },
          },
          userRoles: {
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
        orderBy: {
          id: "desc",
        },
      }),
    ]);

    const items = accounts.map((acc) => this.mapStaffAccount(acc));

    return toJsonSafe({
      items,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  }

  async getStaff(id: string) {
    const userAccountId = BigInt(id);
    const account = await this.prisma.userAccount.findUnique({
      where: { id: userAccountId },
      include: {
        person: true,
        staffProfile: true,
        staffCredentials: {
          select: {
            loginEmail: true,
            lastPasswordLoginAt: true,
            mfaRequired: true,
            updatedAt: true,
          },
        },
        userRoles: {
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

    if (!account || account.accountType !== "STAFF") {
      throw new NotFoundException(`Staff member with ID ${id} not found.`);
    }

    return toJsonSafe(this.mapStaffAccount(account));
  }

  async createStaff(dto: CreateStaffMemberDto, actorUserId?: bigint) {
    const email = dto.email.trim().toLowerCase();
    if (!email) {
      throw new BadRequestException("Staff login email is required.");
    }

    const existingCred = await this.prisma.staffCredential.findUnique({
      where: { loginEmail: email },
    });
    if (existingCred) {
      throw new ConflictException(`Staff login email "${email}" is already in use.`);
    }

    const employeeCode =
      dto.employeeCode?.trim().toUpperCase() ||
      `KLN-STF-${Math.floor(1000 + Math.random() * 9000)}`;

    const existingCode = await this.prisma.staffProfile.findUnique({
      where: { employeeCode },
    });
    if (existingCode) {
      throw new ConflictException(`Employee code "${employeeCode}" is already in use.`);
    }

    const rawPassword = dto.password?.trim() || "KlaroneStaff@2026";
    if (rawPassword.length < 8) {
      throw new BadRequestException("Password must be at least 8 characters long.");
    }

    const passwordHash = await argon2.hash(rawPassword, {
      type: argon2.argon2id,
    });

    const result = await this.prisma.$transaction(async (tx) => {
      const person = await tx.person.create({
        data: {
          firstName: dto.firstName.trim(),
          lastName: dto.lastName?.trim() || null,
          email,
          phone: dto.phone?.trim() || null,
          status: dto.status || "ACTIVE",
        },
      });

      const userAccount = await tx.userAccount.create({
        data: {
          personId: person.id,
          accountType: "STAFF",
          status: dto.status || "ACTIVE",
        },
      });

      await tx.staffProfile.create({
        data: {
          userAccountId: userAccount.id,
          employeeCode,
          department: dto.department?.trim() || "Operations",
          jobTitle: dto.jobTitle?.trim() || "Staff Member",
          status: dto.status || "ACTIVE",
        },
      });

      await tx.staffCredential.create({
        data: {
          userAccountId: userAccount.id,
          loginEmail: email,
          passwordHash,
          mfaRequired: false,
        },
      });

      const roleIds = dto.roleIds && dto.roleIds.length > 0 ? dto.roleIds : [];
      for (const rId of roleIds) {
        await tx.userRole.create({
          data: {
            userAccountId: userAccount.id,
            roleId: rId,
            assignedByUserId: actorUserId ?? null,
            status: "ACTIVE",
          },
        });
      }

      return userAccount.id;
    });

    await this.auditService.log({
      userAccountId: actorUserId,
      action: "staff.create",
      module: "staff-management",
      entityType: "UserAccount",
      entityId: result.toString(),
      description: `Created new staff member ${dto.firstName} (${email}) with code ${employeeCode}`,
      newData: {
        email,
        employeeCode,
        department: dto.department,
        roles: dto.roleIds,
      },
    });

    return this.getStaff(result.toString());
  }

  async updateStaff(id: string, dto: UpdateStaffMemberDto, actorUserId?: bigint) {
    const userAccountId = BigInt(id);
    const existing = await this.prisma.userAccount.findUnique({
      where: { id: userAccountId },
      include: {
        person: true,
        staffProfile: true,
        staffCredentials: true,
        userRoles: true,
      },
    });

    if (!existing || existing.accountType !== "STAFF") {
      throw new NotFoundException(`Staff member with ID ${id} not found.`);
    }

    if (dto.employeeCode && dto.employeeCode !== existing.staffProfile?.employeeCode) {
      const codeCheck = await this.prisma.staffProfile.findUnique({
        where: { employeeCode: dto.employeeCode },
      });
      if (codeCheck && codeCheck.userAccountId !== userAccountId) {
        throw new ConflictException(`Employee code "${dto.employeeCode}" is already taken.`);
      }
    }

    await this.prisma.$transaction(async (tx) => {
      // Update Person
      if (dto.firstName || dto.lastName !== undefined || dto.phone !== undefined || dto.status) {
        await tx.person.update({
          where: { id: existing.personId },
          data: {
            firstName: dto.firstName?.trim() ?? existing.person.firstName,
            lastName: dto.lastName !== undefined ? dto.lastName?.trim() || null : existing.person.lastName,
            phone: dto.phone !== undefined ? dto.phone?.trim() || null : existing.person.phone,
            status: dto.status ?? existing.person.status,
          },
        });
      }

      // Update UserAccount status
      if (dto.status) {
        await tx.userAccount.update({
          where: { id: userAccountId },
          data: { status: dto.status },
        });
      }

      // Update StaffProfile
      if (dto.employeeCode || dto.department !== undefined || dto.jobTitle !== undefined || dto.status) {
        await tx.staffProfile.update({
          where: { userAccountId },
          data: {
            employeeCode: dto.employeeCode?.trim().toUpperCase() ?? existing.staffProfile?.employeeCode,
            department: dto.department !== undefined ? dto.department?.trim() || null : existing.staffProfile?.department,
            jobTitle: dto.jobTitle !== undefined ? dto.jobTitle?.trim() || null : existing.staffProfile?.jobTitle,
            status: dto.status ?? existing.staffProfile?.status,
          },
        });
      }

      // Update Password if provided
      if (dto.password?.trim()) {
        const rawPassword = dto.password.trim();
        if (rawPassword.length < 8) {
          throw new BadRequestException("Password must be at least 8 characters long.");
        }
        const passwordHash = await argon2.hash(rawPassword, {
          type: argon2.argon2id,
        });
        await tx.staffCredential.update({
          where: { userAccountId },
          data: {
            passwordHash,
            passwordUpdatedAt: new Date(),
          },
        });
      }

      // Update Roles if provided
      if (Array.isArray(dto.roleIds)) {
        await tx.userRole.deleteMany({
          where: { userAccountId },
        });
        for (const rId of dto.roleIds) {
          await tx.userRole.create({
            data: {
              userAccountId,
              roleId: rId,
              assignedByUserId: actorUserId ?? null,
              status: "ACTIVE",
            },
          });
        }
      }
    });

    await this.auditService.log({
      userAccountId: actorUserId,
      action: "staff.update",
      module: "staff-management",
      entityType: "UserAccount",
      entityId: id,
      description: `Updated staff member ${existing.person.firstName} (${existing.staffProfile?.employeeCode})`,
      oldData: {
        status: existing.status,
        roles: existing.userRoles.map((ur) => ur.roleId),
      },
      newData: {
        status: dto.status,
        roles: dto.roleIds,
      },
    });

    return this.getStaff(id);
  }

  async deleteStaff(id: string, actorUserId?: bigint) {
    const userAccountId = BigInt(id);
    const existing = await this.prisma.userAccount.findUnique({
      where: { id: userAccountId },
      include: {
        staffProfile: true,
        person: true,
        userRoles: {
          include: { role: true },
        },
      },
    });

    if (!existing || existing.accountType !== "STAFF") {
      throw new NotFoundException(`Staff member with ID ${id} not found.`);
    }

    // Safety guard: Prevent deleting SUPER_ADMIN if it's the last one
    const isSuperAdmin = existing.userRoles.some((ur) => ur.role.name === "SUPER_ADMIN");
    if (isSuperAdmin) {
      const superAdminCount = await this.prisma.userRole.count({
        where: {
          role: { name: "SUPER_ADMIN" },
          status: "ACTIVE",
        },
      });
      if (superAdminCount <= 1) {
        throw new BadRequestException("Cannot delete the only remaining Super Administrator.");
      }
    }

    // Soft delete / disable account
    await this.prisma.$transaction(async (tx) => {
      await tx.userAccount.update({
        where: { id: userAccountId },
        data: { status: "DISABLED" },
      });
      await tx.person.update({
        where: { id: existing.personId },
        data: { status: "DISABLED" },
      });
      if (existing.staffProfile) {
        await tx.staffProfile.update({
          where: { userAccountId },
          data: { status: "DISABLED" },
        });
      }
    });

    await this.auditService.log({
      userAccountId: actorUserId,
      action: "staff.disable",
      module: "staff-management",
      entityType: "UserAccount",
      entityId: id,
      description: `Disabled staff member ${existing.person.firstName} (${existing.staffProfile?.employeeCode})`,
    });

    return toJsonSafe({ success: true, message: "Staff account disabled successfully." });
  }

  private mapStaffAccount(acc: any) {
    // Collect all distinct permissions from all assigned active roles
    const permMap = new Map<string, any>();
    for (const ur of acc.userRoles ?? []) {
      for (const rp of ur.role.permissions ?? []) {
        permMap.set(rp.permission.code, rp.permission);
      }
    }

    return {
      id: acc.id.toString(),
      email: acc.staffCredentials?.loginEmail ?? acc.person?.email ?? "",
      firstName: acc.person?.firstName ?? "",
      lastName: acc.person?.lastName ?? "",
      name: `${acc.person?.firstName ?? ""} ${acc.person?.lastName ?? ""}`.trim(),
      phone: acc.person?.phone ?? null,
      employeeCode: acc.staffProfile?.employeeCode ?? "",
      department: acc.staffProfile?.department ?? "General",
      jobTitle: acc.staffProfile?.jobTitle ?? "Staff",
      status: acc.status ?? "ACTIVE",
      lastLoginAt: acc.lastLoginAt ?? acc.staffCredentials?.lastPasswordLoginAt ?? null,
      createdAt: acc.createdAt,
      updatedAt: acc.updatedAt,
      roles: (acc.userRoles ?? []).map((ur: any) => ({
        id: ur.role.id,
        name: ur.role.name,
        description: ur.role.description,
        isSystemRole: ur.role.isSystemRole,
      })),
      permissions: Array.from(permMap.values()).map((p) => ({
        id: p.id,
        code: p.code,
        module: p.module,
        action: p.action,
        description: p.description,
      })),
    };
  }
}
