export interface RequestTelemetryRecord {
  timestamp: number;
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  ipAddress?: string;
  userAgent?: string;
  errorMessage?: string;
}

export interface LatencyPercentiles {
  avg: number;
  min: number;
  max: number;
  p50: number;
  p90: number;
  p95: number;
  p99: number;
}

export interface StatusCodesBreakdown {
  total: number;
  status2xx: number;
  status3xx: number;
  status4xx: number;
  status5xx: number;
}

export interface RouteMetricSummary {
  path: string;
  method: string;
  count: number;
  avgDurationMs: number;
  p95DurationMs: number;
  errorCount: number;
}

export interface SystemResourceMetrics {
  cpuUsagePercent: number;
  cpuCount: number;
  totalMemoryBytes: number;
  freeMemoryBytes: number;
  usedMemoryBytes: number;
  memoryUsagePercent: number;
  processMemory: {
    rssBytes: number;
    heapTotalBytes: number;
    heapUsedBytes: number;
    externalBytes: number;
  };
  uptimeSeconds: number;
  nodeVersion: string;
  platform: string;
}

export interface SystemHealthAlert {
  id: string;
  type: "HARDWARE" | "SOFTWARE" | "CLIENT_FAULT" | "DATABASE";
  severity: "CRITICAL" | "WARNING" | "INFO";
  title: string;
  message: string;
  timestamp: string;
  value?: number;
  threshold?: number;
}

export interface MonitoringOverviewDto {
  status: "HEALTHY" | "DEGRADED" | "CRITICAL";
  uptimeSeconds: number;
  goldenSignals: {
    throughputRps: number;
    avgLatencyMs: number;
    p95LatencyMs: number;
    errorRatePercent: number;
    cpuUsagePercent: number;
    memoryUsagePercent: number;
  };
  statusCodes: StatusCodesBreakdown;
  activeAlerts: SystemHealthAlert[];
  database: {
    status: "CONNECTED" | "DEGRADED" | "DOWN";
    latencyMs: number;
  };
  recentErrors: RequestTelemetryRecord[];
}
