import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { StaffAuthGuard } from "../staff-auth/guards/staff-auth.guard";
import { StaffPermissionGuard } from "../staff-auth/guards/permission.guard";
import { RequirePermission } from "../staff-auth/decorators/require-permission.decorator";
import { MonitoringMetricsService } from "./monitoring-metrics.service";

@Controller("staff/monitoring")
@UseGuards(StaffAuthGuard, StaffPermissionGuard)
export class MonitoringController {
  constructor(private readonly metricsService: MonitoringMetricsService) {}

  @Get("overview")
  @RequirePermission("platform.settings.read")
  async getOverview() {
    return this.metricsService.getOverview();
  }

  @Get("api-metrics")
  @RequirePermission("platform.settings.read")
  async getApiMetrics(@Query("windowSeconds") window?: string) {
    const windowSec = window ? Math.max(10, Math.min(3600, Number(window))) : 300;
    return {
      windowSeconds: windowSec,
      throughputRps: this.metricsService.getThroughputRps(60),
      latencyPercentiles: this.metricsService.getLatencyPercentiles(windowSec),
      statusCodes: this.metricsService.getStatusCodesBreakdown(windowSec),
      topRoutes: this.metricsService.getRouteSummaries(windowSec, 15),
    };
  }

  @Get("system-resources")
  @RequirePermission("platform.settings.read")
  async getSystemResources() {
    return this.metricsService.getSystemResourceMetrics();
  }

  @Get("errors")
  @RequirePermission("platform.settings.read")
  async getErrors() {
    return {
      errors: this.metricsService.getRecentErrors(),
    };
  }
}
