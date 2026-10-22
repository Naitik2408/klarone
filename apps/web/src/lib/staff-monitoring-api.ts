import type {
  AlertRuleConfig,
  ApiMetricsResponse,
  LogEntry,
  LogLevel,
  MonitoringOverview,
  RequestTelemetryRecord,
  SystemResourceMetrics,
} from "../types/staff-monitoring";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3000";

export class StaffMonitoringApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "StaffMonitoringApiError";
    this.status = status;
  }
}

async function request<T>(
  path: string,
  token: string,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options?.headers ?? {}),
    },
  });

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      typeof body?.message === "string"
        ? body.message
        : "Unable to retrieve monitoring metrics.";

    throw new StaffMonitoringApiError(message, response.status);
  }

  return body as T;
}

export async function getMonitoringOverview(
  token: string,
): Promise<MonitoringOverview> {
  return request<MonitoringOverview>("/staff/monitoring/overview", token);
}

export async function getApiMetrics(
  token: string,
  windowSeconds = 300,
): Promise<ApiMetricsResponse> {
  return request<ApiMetricsResponse>(
    `/staff/monitoring/api-metrics?windowSeconds=${windowSeconds}`,
    token,
  );
}

export async function getSystemResources(
  token: string,
): Promise<SystemResourceMetrics> {
  return request<SystemResourceMetrics>("/staff/monitoring/system-resources", token);
}

export async function getRecentErrors(
  token: string,
): Promise<{ errors: RequestTelemetryRecord[] }> {
  return request<{ errors: RequestTelemetryRecord[] }>(
    "/staff/monitoring/errors",
    token,
  );
}

export async function getMonitoringLogs(
  token: string,
  query?: {
    search?: string;
    level?: LogLevel;
    requestId?: string;
    limit?: number;
  },
): Promise<{ logs: LogEntry[]; total: number }> {
  const params = new URLSearchParams();
  if (query?.search) params.set("search", query.search);
  if (query?.level) params.set("level", query.level);
  if (query?.requestId) params.set("requestId", query.requestId);
  if (query?.limit) params.set("limit", String(query.limit));

  const queryString = params.toString() ? `?${params.toString()}` : "";
  return request<{ logs: LogEntry[]; total: number }>(
    `/staff/monitoring/logs${queryString}`,
    token,
  );
}

export async function getAlertRules(
  token: string,
): Promise<{ rules: AlertRuleConfig[] }> {
  return request<{ rules: AlertRuleConfig[] }>(
    "/staff/monitoring/alert-rules",
    token,
  );
}

export async function updateAlertRule(
  token: string,
  id: string,
  data: Partial<AlertRuleConfig>,
): Promise<{ rule: AlertRuleConfig }> {
  return request<{ rule: AlertRuleConfig }>(
    `/staff/monitoring/alert-rules/${encodeURIComponent(id)}`,
    token,
    {
      method: "PATCH",
      body: JSON.stringify(data),
    },
  );
}

export async function acknowledgeAlert(
  token: string,
  id: string,
): Promise<{ success: boolean; alertId: string }> {
  return request<{ success: boolean; alertId: string }>(
    `/staff/monitoring/alerts/${encodeURIComponent(id)}/ack`,
    token,
    {
      method: "POST",
    },
  );
}

