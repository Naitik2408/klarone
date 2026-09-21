import {
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { AuditService } from "../audit/audit.service";

@Injectable()
export class PlatformSettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async findAll() {
    return this.prisma.platformSetting.findMany({
      orderBy: {
        settingKey: "asc",
      },
      select: {
        settingKey: true,
        settingValue: true,
        description: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findByKey(settingKey: string) {
    const setting = await this.prisma.platformSetting.findUnique({
      where: {
        settingKey,
      },
      select: {
        settingKey: true,
        settingValue: true,
        description: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!setting) {
      throw new NotFoundException(
        `Platform setting "${settingKey}" not found`,
      );
    }

    return setting;
  }

  async update(
    settingKey: string,
    settingValue: string,
    description: string | undefined,
    userAccountId: bigint,
  ) {
    const existingSetting =
      await this.prisma.platformSetting.findUnique({
        where: {
          settingKey,
        },
      });

    const updatedSetting =
      await this.prisma.platformSetting.upsert({
        where: {
          settingKey,
        },
        update: {
          settingValue,
          ...(description !== undefined
            ? { description }
            : {}),
        },
        create: {
          settingKey,
          settingValue,
          description: description ?? null,
        },
        select: {
          settingKey: true,
          settingValue: true,
          description: true,
          createdAt: true,
          updatedAt: true,
        },
      });

    await this.auditService.log({
      userAccountId,
      action: existingSetting ? "UPDATE" : "CREATE",
      module: "platform-settings",
      entityType: "PlatformSetting",
      entityId: settingKey,
      description: existingSetting
        ? `Updated platform setting "${settingKey}"`
        : `Created platform setting "${settingKey}"`,
      oldData: existingSetting
        ? {
            settingKey: existingSetting.settingKey,
            settingValue: existingSetting.settingValue,
            description: existingSetting.description,
          }
        : undefined,
      newData: {
        settingKey: updatedSetting.settingKey,
        settingValue: updatedSetting.settingValue,
        description: updatedSetting.description,
      },
    });

    return updatedSetting;
  }
}