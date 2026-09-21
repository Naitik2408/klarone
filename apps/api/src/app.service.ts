import { Injectable } from "@nestjs/common";
import { PrismaService } from "./database/prisma.service";

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  getHello(): string {
    return "Klarone API";
  }

  async getDatabaseHealth(): Promise<{ database: string }> {
    await this.prisma.$queryRaw`SELECT 1`;

    return {
      database: "ok",
    };
  }
}