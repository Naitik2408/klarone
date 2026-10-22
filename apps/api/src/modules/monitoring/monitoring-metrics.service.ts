import { Injectable, Logger } from "@nestjs/common";
import * as os from "node:os";
import { PrismaService } from "../../database/prisma.service";
import type {
  AlertRuleConfig,
  LatencyPercentiles,
  LogEntry,
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

  // Sliding window of requests (last 5,000 for high performance & minimal RAM)
  private readonly maxRecords = 5000;
  private readonly records: RequestTelemetryRecord[] = [];

  // Structured Log Stream (last 2,000 logs for Grafana-Loki style exploration)
  private readonly maxLogs = 2000;
  private readonly logs: LogEntry[] = [];

  // Recent 5xx & critical exceptions
  private readonly maxRecentErrors = 100;
  private readonly recentErrors: RequestTelemetryRecord[] = [];

  // Acknowledged alert IDs
  private readonly acknowledgedAlerts = new Set<string>();

  // Alert Rules Configuration (Actionable, Symptom-based rules with runbooks)
  private alertRules: AlertRuleConfig[] = [
    {
      id: "rule-error-rate",
      name: "High API Error Rate (> 5%)",
      category: "ERRORS",
      enabled: true,
      threshold: 5,
      unit: "%",
      severity: "CRITICAL",
      description: "Triggered when 4xx/5xx failures exceed 5% of total request traffic in active window.",
      runbook: "1. Inspect Recent Faults tab to check failing route and stack trace.\n2. Verify database connection pool.\n3. Check if external third-party API (Groq/Gemini/Razorpay) is failing.",
    },
    {
      id: "rule-p95-latency",
      name: "High Tail Latency (p95 > 1500ms)",
      category: "LATENCY",
      enabled: true,
      threshold: 1500,
      unit: "ms",
      severity: "WARNING",
      description: "Triggered when 95th percentile response time exceeds 1.5 seconds, hurting user experience.",
      runbook: "1. Check Active Routes table to find slow endpoint.\n2. Review SQL queries and missing indexes for that table.\n3. Verify DB ping round-trip latency.",
    },
    {
      id: "rule-5xx-spikes",
      name: "Unhandled Server Exceptions (5xx)",
      category: "ERRORS",
      enabled: true,
      threshold: 1,
      unit: "errors",
      severity: "CRITICAL",
      description: "Triggered on any unhandled internal server error (500).",
      runbook: "1. Open Logs Stream and filter by 'Level: ERROR'.\n2. Locate the Correlation Request ID.\n3. Inspect the full stack trace and apply hotfix.",
    },
    {
      id: "rule-node-heap",
      name: "API Memory Saturation (> 400MB)",
      category: "HARDWARE",
      enabled: true,
      threshold: 400,
      unit: "MB",
      severity: "WARNING",
      description: "Triggered when Node.js process RSS memory approaches container threshold.",
      runbook: "1. Inspect Process Heap in System Resources.\n2. Check for unbounded array caching or missing pagination in large list endpoints.",
    },
    {
      id: "rule-db-latency",
      name: "PostgreSQL High Latency (> 250ms)",
      category: "AVAILABILITY",
      enabled: true,
      threshold: 250,
      unit: "ms",
      severity: "WARNING",
      description: "Triggered when database health ping takes over 250ms.",
      runbook: "1. Check PostgreSQL connection pool count.\n2. Check if a heavy report or unindexed scan is locking tables.",
    },
  ];

  // CPU measurement anchor
  private lastCpuMeasure = this.getCpuTimes();

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Append a structured log entry into the live log stream
   */
  logEntry(entry: Omit<LogEntry, "id" | "timestamp">): void {
    const fullEntry: LogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
      ...entry,
    };

    if (this.logs.length >= this.maxLogs) {
      this.logs.shift();
    }
    this.logs.push(fullEntry);
  }

  /**
   * Record telemetry for an incoming HTTP request
   */
  recordRequest(record: RequestTelemetryRecord): void {
    if (this.records.length >= this.maxRecords) {
      this.records.shift();
    }
    this.records.push(record);

    // Also automatically log as structured event
    const level = record.statusCode >= 500 ? "error" : record.statusCode >= 400 ? "warn" : "info";
    this.logEntry({
      level,
      event: record.statusCode >= 500 ? "http_5xx_exception" : record.statusCode >= 400 ? "http_client_fault" : "http_request_finished",
      message: `${record.method} ${record.path} ${record.statusCode} (${record.durationMs}ms)`,
      requestId: record.requestId,
      module: "http",
      route: record.path,
      method: record.method,
      statusCode: record.statusCode,
      durationMs: record.durationMs,
      userId: record.userId,
      ip: record.ipAddress,
      stackTrace: record.stackTrace,
    });

    if (record.statusCode >= 500 || record.errorMessage) {
      if (this.recentErrors.length >= this.maxRecentErrors) {
        this.recentErrors.shift();
      }
      this.recentErrors.push(record);
    }
  }

  /**
   * Query structured logs with filtering (Grafana-Loki style)
   */
  getLogs(query: {
    search?: string;
    level?: string;
    requestId?: string;
    limit?: number;
  }): { logs: LogEntry[]; total: number } {
    let filtered = [...this.logs];

    if (query.level && query.level !== "ALL") {
      filtered = filtered.filter((l) => l.level.toLowerCase() === query.level?.toLowerCase());
    }

    if (query.requestId?.trim()) {
      filtered = filtered.filter((l) => l.requestId === query.requestId?.trim());
    }

    if (query.search?.trim()) {
      const q = query.search.trim().toLowerCase();
      filtered = filtered.filter(
        (l) =>
          l.message.toLowerCase().includes(q) ||
          l.event.toLowerCase().includes(q) ||
          (l.route && l.route.toLowerCase().includes(q)) ||
          l.requestId.toLowerCase().includes(q) ||
          (l.stackTrace && l.stackTrace.toLowerCase().includes(q)),
      );
    }

    // Return most recent first
    filtered.reverse();
    const limit = Math.max(1, Math.min(500, query.limit ?? 100));

    return {
      total: filtered.length,
      logs: filtered.slice(0, limit),
    };
  }

  /**
   * Alert rules configuration management
   */
  getAlertRules(): AlertRuleConfig[] {
    return this.alertRules;
  }

  updateAlertRule(ruleId: string, updates: Partial<AlertRuleConfig>): AlertRuleConfig {
    const rule = this.alertRules.find((r) => r.id === ruleId);
    if (!rule) {
      throw new Error(`Rule ${ruleId} not found.`);
    }
    Object.assign(rule, updates);
    return rule;
  }

  acknowledgeAlert(alertId: string): void {
    this.acknowledgedAlerts.add(alertId);
  }

  /**
   * Calculate throughput (Requests Per Second)
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
   * Status codes breakdown
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
   * Top routes summary
   */
  getRouteSummaries(windowSeconds = 300, limit = 15): RouteMetricSummary[] {
    const cutoff = Date.now() - windowSeconds * 1000;
    const windowRecords = this.records.filter((r) => r.timestamp >= cutoff);

    const map = new Map<string, { method: string; path: string; durations: number[]; errors: number }>();

    for (const r of windowRecords) {
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
   * System resource metrics
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
   * PostgreSQL health check
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
   * Dynamic evaluation of symptom-based alert rules with runbooks
   */
  evaluateAlerts(
    resources: SystemResourceMetrics,
    statusCodes: StatusCodesBreakdown,
    db: { status: string; latencyMs: number },
    latency: LatencyPercentiles,
  ): SystemHealthAlert[] {
    const alerts: SystemHealthAlert[] = [];
    const now = new Date().toISOString();

    const totalReqs = statusCodes.total;
    const errorRatePercent =
      totalReqs > 0
        ? Number((((statusCodes.status4xx + statusCodes.status5xx) / totalReqs) * 100).toFixed(1))
        : 0;

    const procRssMB = Math.round(resources.processMemory.rssBytes / (1024 * 1024));

    for (const rule of this.alertRules) {
      if (!rule.enabled) continue;

      let triggered = false;
      let val = 0;
      let msg = "";

      switch (rule.id) {
        case "rule-error-rate":
          if (errorRatePercent >= rule.threshold && totalReqs >= 10) {
            triggered = true;
            val = errorRatePercent;
            msg = `Overall error rate is currently ${errorRatePercent}%, exceeding threshold of ${rule.threshold}%.`;
          }
          break;

        case "rule-p95-latency":
          if (latency.p95 >= rule.threshold && totalReqs >= 5) {
            triggered = true;
            val = latency.p95;
            msg = `p95 response duration reached ${latency.p95}ms, exceeding threshold of ${rule.threshold}ms.`;
          }
          break;

        case "rule-5xx-spikes":
          if (statusCodes.status5xx >= rule.threshold) {
            triggered = true;
            val = statusCodes.status5xx;
            msg = `${statusCodes.status5xx} unhandled 5xx server exception(s) detected in the active window.`;
          }
          break;

        case "rule-node-heap":
          if (procRssMB >= rule.threshold) {
            triggered = true;
            val = procRssMB;
            msg = `API process RSS memory is ${procRssMB} MB, exceeding ${rule.threshold} MB threshold.`;
          }
          break;

        case "rule-db-latency":
          if (db.status === "DOWN") {
            triggered = true;
            val = -1;
            msg = "PostgreSQL database ping failed completely. Backend disconnected.";
          } else if (db.latencyMs >= rule.threshold) {
            triggered = true;
            val = db.latencyMs;
            msg = `PostgreSQL round-trip ping took ${db.latencyMs}ms (> ${rule.threshold}ms threshold).`;
          }
          break;
      }

      if (triggered) {
        alerts.push({
          id: rule.id,
          type: rule.category === "HARDWARE" ? "HARDWARE" : rule.category === "AVAILABILITY" ? "DATABASE" : "SOFTWARE",
          severity: rule.severity,
          title: rule.name,
          message: msg,
          timestamp: now,
          value: val,
          threshold: rule.threshold,
          runbook: rule.runbook,
          acknowledged: this.acknowledgedAlerts.has(rule.id),
        });
      }
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

    const activeAlerts = this.evaluateAlerts(resources, statusCodes, db, latency);

    const hasCritical = activeAlerts.some((a) => a.severity === "CRITICAL" && !a.acknowledged);
    const hasWarning = activeAlerts.some((a) => a.severity === "WARNING" && !a.acknowledged);

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
      recentErrors: [...this.recentErrors].reverse().slice(0, 20),
    };
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
