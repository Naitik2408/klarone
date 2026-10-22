import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { StaffAuthGuard } from "../staff-auth/guards/staff-auth.guard";
import { StaffPermissionGuard } from "../staff-auth/guards/permission.guard";
import { RequirePermission } from "../staff-auth/decorators/require-permission.decorator";
import { MonitoringMetricsService } from "./monitoring-metrics.service";
import type { AlertRuleConfig } from "./monitoring.types";

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

  @Get("logs")
  @RequirePermission("platform.settings.read")
  async getLogs(
    @Query("search") search?: string,
    @Query("level") level?: string,
    @Query("requestId") requestId?: string,
    @Query("limit") limit?: string,
  ) {
    return this.metricsService.getLogs({
      search,
      level,
      requestId,
      limit: limit ? Number(limit) : 100,
    });
  }

  @Get("alert-rules")
  @RequirePermission("platform.settings.read")
  async getAlertRules() {
    return { rules: this.metricsService.getAlertRules() };
  }

  @Patch("alert-rules/:id")
  @RequirePermission("platform.settings.read")
  async updateAlertRule(
    @Param("id") id: string,
    @Body() body: Partial<AlertRuleConfig>,
  ) {
    return this.metricsService.updateAlertRule(id, body);
  }

  @Post("alerts/:id/ack")
  @RequirePermission("platform.settings.read")
  async acknowledgeAlert(@Param("id") id: string) {
    this.metricsService.acknowledgeAlert(id);
    return { success: true, alertId: id };
  }
}
