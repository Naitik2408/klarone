import {
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaClient, PrismaPg, Pool } from "@klarone/db";

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private pool: Pool;

  constructor(configService: ConfigService) {
    const connectionString =
      configService.getOrThrow<string>("DATABASE_URL");

    const pool = new Pool({
      connectionString,
      max: 10,
      idleTimeoutMillis: 60000,
      connectionTimeoutMillis: 30000,
      statement_timeout: 30000,
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000,
    });

    pool.on("error", (err) => {
      // In PgBouncer transaction mode or network drops, idle connections can be terminated by server.
      // Handling pool error prevents unhandled exception crashes.
      console.warn("[PrismaService] pg-pool client error:", err.message);
    });

    const adapter = new PrismaPg(pool);

    super({
      adapter,
    });

    this.pool = pool;
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    await this.pool.end();
  }
}