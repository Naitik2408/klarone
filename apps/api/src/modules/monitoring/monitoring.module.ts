import { Global, Module } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { MonitoringMetricsService } from "./monitoring-metrics.service";
import { HttpTelemetryInterceptor } from "./http-telemetry.interceptor";
import { MonitoringController } from "./monitoring.controller";
import { StaffAuthModule } from "../staff-auth/staff-auth.module";

@Global()
@Module({
  imports: [StaffAuthModule],
  controllers: [MonitoringController],
  providers: [
    MonitoringMetricsService,
    {
      provide: APP_INTERCEPTOR,
      useClass: HttpTelemetryInterceptor,
    },
  ],
  exports: [MonitoringMetricsService],
})
export class MonitoringModule {}
