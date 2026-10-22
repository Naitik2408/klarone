import { Injectable, Logger } from "@nestjs/common";
import * as os from "node:os";
import { PrismaService } from "../../database/prisma.service";
import type {
  LatencyPercentiles,
  MonitoringOverviewDto,
  RequestTelemetryRecord,
  RouteMetricSummary,
  StatusCodesBreakdown,
  SystemHealthAlert,
  SystemResourceMetrics,
} from "./monitoring.types";

@Injectable()
export class MonitoringMetricsService {
  private readonly logger = new Logger(MonitoringMetricsService.name);

  // Keep a sliding window of the last 5,000 requests for high performance & minimal memory usage
  private readonly maxRecords = 5000;
  private readonly records: RequestTelemetryRecord[] = [];

  // Keep recent errors (5xx and critical failures)
  private readonly maxRecentErrors = 50;
  private readonly recentErrors: RequestTelemetryRecord[] = [];

  // CPU measurement anchor
  private lastCpuMeasure = this.getCpuTimes();

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Record telemetry for an incoming HTTP request
   */
  recordRequest(record: RequestTelemetryRecord): void {
    if (this.records.length >= this.maxRecords) {
      this.records.shift();
    }
    this.records.push(record);

    if (record.statusCode >= 500 || record.errorMessage) {
      if (this.recentErrors.length >= this.maxRecentErrors) {
        this.recentErrors.shift();
      }
      this.recentErrors.push(record);
    }
  }

  /**
   * Calculate throughput (Requests Per Second) over a given time window (default: last 60 seconds)
   */
  getThroughputRps(windowSeconds = 60): number {
    const cutoff = Date.now() - windowSeconds * 1000;
    const count = this.records.filter((r) => r.timestamp >= cutoff).length;
    return Number((count / windowSeconds).toFixed(2));
  }

  /**
   * Calculate latency percentiles (Avg, Min, Max, p50, p90, p95, p99)
   */
  getLatencyPercentiles(windowSeconds = 300): LatencyPercentiles {
    const cutoff = Date.now() - windowSeconds * 1000;
    const durations = this.records
      .filter((r) => r.timestamp >= cutoff)
      .map((r) => r.durationMs)
      .sort((a, b) => a - b);

    if (durations.length === 0) {
      return { avg: 0, min: 0, max: 0, p50: 0, p90: 0, p95: 0, p99: 0 };
    }

    const sum = durations.reduce((acc, v) => acc + v, 0);
    const avg = Number((sum / durations.length).toFixed(1));
    const min = Number(durations[0].toFixed(1));
    const max = Number(durations[durations.length - 1].toFixed(1));

    const p = (pct: number) => {
      const idx = Math.min(
        durations.length - 1,
        Math.max(0, Math.ceil((pct / 100) * durations.length) - 1),
      );
      return Number(durations[idx].toFixed(1));
    };

    return {
      avg,
      min,
      max,
      p50: p(50),
      p90: p(90),
      p95: p(95),
      p99: p(99),
    };
  }

  /**
   * Status codes breakdown over a given window
   */
  getStatusCodesBreakdown(windowSeconds = 300): StatusCodesBreakdown {
    const cutoff = Date.now() - windowSeconds * 1000;
    const windowRecords = this.records.filter((r) => r.timestamp >= cutoff);

    let status2xx = 0;
    let status3xx = 0;
    let status4xx = 0;
    let status5xx = 0;

    for (const r of windowRecords) {
      if (r.statusCode >= 200 && r.statusCode < 300) status2xx++;
      else if (r.statusCode >= 300 && r.statusCode < 400) status3xx++;
      else if (r.statusCode >= 400 && r.statusCode < 500) status4xx++;
      else if (r.statusCode >= 500) status5xx++;
    }

    return {
      total: windowRecords.length,
      status2xx,
      status3xx,
      status4xx,
      status5xx,
    };
  }

  /**
   * Top active & slowest routes
   */
  getRouteSummaries(windowSeconds = 300, limit = 10): RouteMetricSummary[] {
    const cutoff = Date.now() - windowSeconds * 1000;
    const windowRecords = this.records.filter((r) => r.timestamp >= cutoff);

    const map = new Map<string, { method: string; path: string; durations: number[]; errors: number }>();

    for (const r of windowRecords) {
      // Normalize parameterized paths (e.g., /staff/users/123 -> /staff/users/:id)
      const normalizedPath = r.path.replace(/\/\d+/g, "/:id").split("?")[0];
      const key = `${r.method}:${normalizedPath}`;

      let entry = map.get(key);
      if (!entry) {
        entry = { method: r.method, path: normalizedPath, durations: [], errors: 0 };
        map.set(key, entry);
      }
      entry.durations.push(r.durationMs);
      if (r.statusCode >= 400) {
        entry.errors++;
      }
    }

    const summaries: RouteMetricSummary[] = [];
    for (const entry of map.values()) {
      entry.durations.sort((a, b) => a - b);
      const sum = entry.durations.reduce((a, b) => a + b, 0);
      const avg = Number((sum / entry.durations.length).toFixed(1));
      const p95Idx = Math.min(
        entry.durations.length - 1,
        Math.max(0, Math.ceil(0.95 * entry.durations.length) - 1),
      );
      const p95 = Number(entry.durations[p95Idx].toFixed(1));

      summaries.push({
        method: entry.method,
        path: entry.path,
        count: entry.durations.length,
        avgDurationMs: avg,
        p95DurationMs: p95,
        errorCount: entry.errors,
      });
    }

    return summaries.sort((a, b) => b.count - a.count).slice(0, limit);
  }

  /**
   * Collect hardware and process resource metrics
   */
  getSystemResourceMetrics(): SystemResourceMetrics {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memPercent = Number(((usedMem / totalMem) * 100).toFixed(1));

    const currentCpu = this.getCpuTimes();
    const idleDiff = currentCpu.idle - this.lastCpuMeasure.idle;
    const totalDiff = currentCpu.total - this.lastCpuMeasure.total;
    const cpuPercent =
      totalDiff > 0
        ? Number((((totalDiff - idleDiff) / totalDiff) * 100).toFixed(1))
        : 0;
    this.lastCpuMeasure = currentCpu;

    const procMem = process.memoryUsage();

    return {
      cpuUsagePercent: Math.min(100, Math.max(0, cpuPercent)),
      cpuCount: os.cpus().length,
      totalMemoryBytes: totalMem,
      freeMemoryBytes: freeMem,
      usedMemoryBytes: usedMem,
      memoryUsagePercent: memPercent,
      processMemory: {
        rssBytes: procMem.rss,
        heapTotalBytes: procMem.heapTotal,
        heapUsedBytes: procMem.heapUsed,
        externalBytes: procMem.external,
      },
      uptimeSeconds: Math.floor(os.uptime()),
      nodeVersion: process.version,
      platform: `${os.type()} ${os.release()} (${os.arch()})`,
    };
  }

  /**
   * Health ping for PostgreSQL Database
   */
  async checkDatabaseHealth(): Promise<{ status: "CONNECTED" | "DEGRADED" | "DOWN"; latencyMs: number }> {
    const start = performance.now();
    try {
      await this.prisma.$queryRawUnsafe("SELECT 1");
      const latencyMs = Number((performance.now() - start).toFixed(1));
      return {
        status: latencyMs > 250 ? "DEGRADED" : "CONNECTED",
        latencyMs,
      };
    } catch (err) {
      this.logger.error("Database health check failed", err);
      return {
        status: "DOWN",
        latencyMs: -1,
      };
    }
  }

  /**
   * Evaluates active system health alerts based on RED & USE thresholds
   */
  evaluateAlerts(
    resources: SystemResourceMetrics,
    statusCodes: StatusCodesBreakdown,
    db: { status: string; latencyMs: number },
  ): SystemHealthAlert[] {
    const alerts: SystemHealthAlert[] = [];
    const now = new Date().toISOString();

    // 1. Hardware: CPU Usage Warning / Critical
    if (resources.cpuUsagePercent >= 90) {
      alerts.push({
        id: "alert-cpu-critical",
        type: "HARDWARE",
        severity: "CRITICAL",
        title: "High Host CPU Utilization",
        message: `CPU usage is at ${resources.cpuUsagePercent}%, exceeding critical threshold of 90%. System may experience throttling.`,
        timestamp: now,
        value: resources.cpuUsagePercent,
        threshold: 90,
      });
    } else if (resources.cpuUsagePercent >= 75) {
      alerts.push({
        id: "alert-cpu-warning",
        type: "HARDWARE",
        severity: "WARNING",
        title: "Elevated Host CPU Load",
        message: `CPU usage is at ${resources.cpuUsagePercent}%, exceeding warning threshold of 75%.`,
        timestamp: now,
        value: resources.cpuUsagePercent,
        threshold: 75,
      });
    }

    // 2. Process / Container Memory Pressure
    // Check the actual Node.js process heap & RSS memory rather than host Windows laptop RAM
    const procHeapMB = Math.round(resources.processMemory.heapUsedBytes / (1024 * 1024));
    const procRssMB = Math.round(resources.processMemory.rssBytes / (1024 * 1024));
    
    // In Render/container environments, memory limits typically range from 512MB to 2GB
    if (procRssMB > 800) {
      alerts.push({
        id: "alert-mem-warning",
        type: "HARDWARE",
        severity: "WARNING",
        title: "High Node.js Process Memory",
        message: `API process RSS is using ${procRssMB} MB (Heap: ${procHeapMB} MB). Check for large queries or memory leaks.`,
        timestamp: now,
        value: procRssMB,
        threshold: 800,
      });
    }

    // 3. Software Fault: 5xx Internal Server Errors
    if (statusCodes.status5xx > 0) {
      alerts.push({
        id: "alert-software-5xx",
        type: "SOFTWARE",
        severity: statusCodes.status5xx >= 5 ? "CRITICAL" : "WARNING",
        title: "Internal Server Errors (5xx Detected)",
        message: `${statusCodes.status5xx} unhandled server exception(s) detected in the active window. Check recent error logs.`,
        timestamp: now,
        value: statusCodes.status5xx,
        threshold: 1,
      });
    }

    // 4. Client / Edge Fault: 4xx Rate Spikes (e.g. invalid tokens, not found, rate limits)
    if (statusCodes.status4xx >= 15) {
      alerts.push({
        id: "alert-client-4xx-spike",
        type: "CLIENT_FAULT",
        severity: "WARNING",
        title: "Elevated Client Errors (4xx Spike)",
        message: `${statusCodes.status4xx} client requests returned 4xx status (Bad Request, 401 Unauthorized, or 404). Possible broken client or scanner probe.`,
        timestamp: now,
        value: statusCodes.status4xx,
        threshold: 15,
      });
    }

    // 5. Database Health
    if (db.status === "DOWN") {
      alerts.push({
        id: "alert-db-down",
        type: "DATABASE",
        severity: "CRITICAL",
        title: "Database Disconnected",
        message: "PostgreSQL database ping failed. Critical API functions will fail.",
        timestamp: now,
      });
    } else if (db.status === "DEGRADED") {
      alerts.push({
        id: "alert-db-slow",
        type: "DATABASE",
        severity: "WARNING",
        title: "Database High Latency",
        message: `PostgreSQL ping took ${db.latencyMs}ms (>250ms). Possible connection pool saturation or disk bottleneck.`,
        timestamp: now,
        value: db.latencyMs,
        threshold: 250,
      });
    }

    return alerts;
  }

  /**
   * Top-level overview dashboard payload
   */
  async getOverview(): Promise<MonitoringOverviewDto> {
    const resources = this.getSystemResourceMetrics();
    const statusCodes = this.getStatusCodesBreakdown(300);
    const latency = this.getLatencyPercentiles(300);
    const throughput = this.getThroughputRps(60);
    const db = await this.checkDatabaseHealth();

    const activeAlerts = this.evaluateAlerts(resources, statusCodes, db);

    const hasCritical = activeAlerts.some((a) => a.severity === "CRITICAL");
    const hasWarning = activeAlerts.some((a) => a.severity === "WARNING");

    const overallStatus: "HEALTHY" | "DEGRADED" | "CRITICAL" = hasCritical
      ? "CRITICAL"
      : hasWarning
        ? "DEGRADED"
        : "HEALTHY";

    const totalReqs = statusCodes.total;
    const errorRatePercent =
      totalReqs > 0
        ? Number((((statusCodes.status4xx + statusCodes.status5xx) / totalReqs) * 100).toFixed(1))
        : 0;

    return {
      status: overallStatus,
      uptimeSeconds: resources.uptimeSeconds,
      goldenSignals: {
        throughputRps: throughput,
        avgLatencyMs: latency.avg,
        p95LatencyMs: latency.p95,
        errorRatePercent,
        cpuUsagePercent: resources.cpuUsagePercent,
        memoryUsagePercent: resources.memoryUsagePercent,
      },
      statusCodes,
      activeAlerts,
      database: db,
      recentErrors: [...this.recentErrors].reverse().slice(0, 15),
    };
  }

  getRecentErrors(): RequestTelemetryRecord[] {
    return [...this.recentErrors].reverse();
  }

  private getCpuTimes() {
    const cpus = os.cpus();
    let idle = 0;
    let total = 0;
    for (const cpu of cpus) {
      idle += cpu.times.idle;
      total +=
        cpu.times.idle +
        cpu.times.user +
        cpu.times.nice +
        cpu.times.sys +
        cpu.times.irq;
    }
    return { idle, total };
  }
}
