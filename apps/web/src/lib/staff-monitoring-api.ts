import type {
  ApiMetricsResponse,
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
