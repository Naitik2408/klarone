import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { PrismaModule } from "../../database/prisma.module";
import { StaffAuthController } from "./staff-auth.controller";
import { StaffAuthService } from "./staff-auth.service";
import { StaffAuthGuard } from "./guards/staff-auth.guard";
import { StaffPermissionGuard } from "./guards/permission.guard";

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>(
          "STAFF_AUTH_JWT_SECRET",
        ),
        signOptions: {
          expiresIn: (configService.get<string>(
            "STAFF_AUTH_JWT_EXPIRES_IN",
            "12h",
          ) ?? "12h") as `${number}h` | `${number}d` | `${number}m` | `${number}s`,
          issuer: configService.get<string>(
            "STAFF_AUTH_JWT_ISSUER",
            "klarone-api",
          ),
          audience: configService.get<string>(
            "STAFF_AUTH_JWT_AUDIENCE",
            "klarone-admin",
          ),
        },
      }),
    }),
  ],
  controllers: [StaffAuthController],
  providers: [
  StaffAuthService,
  StaffAuthGuard,
  StaffPermissionGuard,
],
  exports: [
  StaffAuthService,
  JwtModule,
  StaffAuthGuard,
  StaffPermissionGuard,
],
})
export class StaffAuthModule {}