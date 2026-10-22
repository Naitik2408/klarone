"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  clearStaffAccessToken,
  getStaffAccessToken,
} from "../../../lib/staff-auth-api";
import {
  acknowledgeAlert,
  getAlertRules,
  getApiMetrics,
  getMonitoringLogs,
  getMonitoringOverview,
  getSystemResources,
  StaffMonitoringApiError,
  updateAlertRule,
} from "../../../lib/staff-monitoring-api";
import type {
  AlertRuleConfig,
  ApiMetricsResponse,
  LogEntry,
  LogLevel,
  MonitoringOverview,
  SystemResourceMetrics,
} from "../../../types/staff-monitoring";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${seconds % 60}s`;
}

type TimelinePoint = {
  time: string;
  throughput: number;
  avgLatency: number;
  p95Latency: number;
  cpu: number;
  memory: number;
};

type ActiveTab = "overview" | "logs" | "alerts";

export default function StaffMonitoringPage() {
  const router = useRouter();

  const [token, setToken] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");

  // Telemetry data
  const [overview, setOverview] = useState<MonitoringOverview | null>(null);
  const [apiMetrics, setApiMetrics] = useState<ApiMetricsResponse | null>(null);
  const [resources, setResources] = useState<SystemResourceMetrics | null>(null);

  // Logging & Alerts data
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [totalLogsCount, setTotalLogsCount] = useState<number>(0);
  const [alertRules, setAlertRules] = useState<AlertRuleConfig[]>([]);

  // Log filters
  const [logSearch, setLogSearch] = useState("");
  const [selectedLogLevel, setSelectedLogLevel] = useState<string>("ALL");
  const [selectedRequestId, setSelectedRequestId] = useState<string>("");
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Runbook modal or expanded alert
  const [expandedRunbookId, setExpandedRunbookId] = useState<string | null>(null);
  const [ackLoadingId, setAckLoadingId] = useState<string | null>(null);
  const [ruleToggleLoadingId, setRuleToggleLoadingId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string>("");
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<number>(5); // default 5s for live charts

  // Live timeline history for Area and Bar charts
  const [timeline, setTimeline] = useState<TimelinePoint[]>([]);

  // Search filter for tables
  const [routeSearch, setRouteSearch] = useState("");
  const [errorSearch, setErrorSearch] = useState("");

  // Collapsible cards state
  const [apiOpen, setApiOpen] = useState(true);
  const [infraOpen, setInfraOpen] = useState(true);
  const [faultsOpen, setFaultsOpen] = useState(true);
  const [subsystemsOpen, setSubsystemsOpen] = useState(true);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  async function loadData(t: string, quiet = false) {
    if (quiet) setRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      const [ov, am, res, logRes, rulesRes] = await Promise.all([
        getMonitoringOverview(t),
        getApiMetrics(t, 300),
        getSystemResources(t),
        getMonitoringLogs(t, {
          search: logSearch || undefined,
          level: selectedLogLevel !== "ALL" ? (selectedLogLevel.toLowerCase() as LogLevel) : undefined,
          requestId: selectedRequestId || undefined,
          limit: 100,
        }),
        getAlertRules(t),
      ]);

      setOverview(ov);
      setApiMetrics(am);
      setResources(res);
      setLogs(logRes.logs);
      setTotalLogsCount(logRes.total);
      setAlertRules(rulesRes.rules);

      const nowStr = new Date().toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      setLastRefreshedAt(nowStr);

      // Append point to live sliding timeline (keep last 20 points)
      setTimeline((prev) => {
        const point: TimelinePoint = {
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
          throughput: ov.goldenSignals.throughputRps,
          avgLatency: ov.goldenSignals.avgLatencyMs,
          p95Latency: ov.goldenSignals.p95LatencyMs,
          cpu: ov.goldenSignals.cpuUsagePercent,
          memory: ov.goldenSignals.memoryUsagePercent,
        };
        const next = [...prev, point];
        return next.length > 20 ? next.slice(next.length - 20) : next;
      });
    } catch (err) {
      if (err instanceof StaffMonitoringApiError && err.status === 401) {
        clearStaffAccessToken();
        router.replace("/staff/login");
        return;
      }
      setError(
        err instanceof Error ? err.message : "Failed to load monitoring telemetry.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    const activeToken = getStaffAccessToken();
    if (!activeToken) {
      router.replace("/staff/login");
      return;
    }
    setToken(activeToken);
    void loadData(activeToken);
  }, []);

  useEffect(() => {
    if (!token || autoRefreshInterval <= 0) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      void loadData(token, true);
    }, autoRefreshInterval * 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [token, autoRefreshInterval, logSearch, selectedLogLevel, selectedRequestId]);

  // Re-fetch logs specifically when log filters change without resetting full UI
  async function refreshLogsOnly() {
    if (!token) return;
    try {
      const logRes = await getMonitoringLogs(token, {
        search: logSearch || undefined,
        level: selectedLogLevel !== "ALL" ? (selectedLogLevel.toLowerCase() as LogLevel) : undefined,
        requestId: selectedRequestId || undefined,
        limit: 100,
      });
      setLogs(logRes.logs);
      setTotalLogsCount(logRes.total);
    } catch (e) {
      console.error("Failed to filter logs:", e);
    }
  }

  // Handle alert acknowledgement
  async function handleAcknowledge(alertId: string) {
    if (!token) return;
    setAckLoadingId(alertId);
    try {
      await acknowledgeAlert(token, alertId);
      // Immediately reflect in local state
      setOverview((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          activeAlerts: prev.activeAlerts.map((a) =>
            a.id === alertId ? { ...a, acknowledged: true } : a,
          ),
        };
      });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to acknowledge alert");
    } finally {
      setAckLoadingId(null);
    }
  }

  // Handle toggle alert rule
  async function handleToggleRule(rule: AlertRuleConfig) {
    if (!token) return;
    setRuleToggleLoadingId(rule.id);
    try {
      const res = await updateAlertRule(token, rule.id, { enabled: !rule.enabled });
      setAlertRules((prev) =>
        prev.map((r) => (r.id === rule.id ? res.rule : r)),
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update alert rule");
    } finally {
      setRuleToggleLoadingId(null);
    }
  }

  // Status code donut/pie data
  const statusPieData = useMemo(() => {
    if (!overview) return [];
    return [
      { name: "2xx Success", value: overview.statusCodes.status2xx, color: "#008060" },
      { name: "3xx Redirect", value: overview.statusCodes.status3xx, color: "#0ea5e9" },
      { name: "4xx Client Fault", value: overview.statusCodes.status4xx, color: "#f59e0b" },
      { name: "5xx Server Error", value: overview.statusCodes.status5xx, color: "#dc2626" },
    ].filter((item) => item.value > 0);
  }, [overview]);

  // Latency bar distribution data
  const latencyBarData = useMemo(() => {
    if (!apiMetrics) return [];
    return [
      { percentile: "p50", duration: apiMetrics.latencyPercentiles.p50, fill: "#008060" },
      { percentile: "Avg", duration: apiMetrics.latencyPercentiles.avg, fill: "#0284c7" },
      { percentile: "p90", duration: apiMetrics.latencyPercentiles.p90, fill: "#6366f1" },
      { percentile: "p95", duration: apiMetrics.latencyPercentiles.p95, fill: "#7c3aed" },
      { percentile: "p99", duration: apiMetrics.latencyPercentiles.p99, fill: "#9333ea" },
      { percentile: "Max", duration: apiMetrics.latencyPercentiles.max, fill: "#1a1a1a" },
    ];
  }, [apiMetrics]);

  // Filtered routes
  const filteredRoutes = useMemo(() => {
    if (!apiMetrics?.topRoutes) return [];
    if (!routeSearch.trim()) return apiMetrics.topRoutes;
    const q = routeSearch.toLowerCase();
    return apiMetrics.topRoutes.filter(
      (r) => r.path.toLowerCase().includes(q) || r.method.toLowerCase().includes(q),
    );
  }, [apiMetrics, routeSearch]);

  // Filtered errors
  const filteredErrors = useMemo(() => {
    if (!overview?.recentErrors) return [];
    if (!errorSearch.trim()) return overview.recentErrors;
    const q = errorSearch.toLowerCase();
    return overview.recentErrors.filter(
      (e) =>
        e.path.toLowerCase().includes(q) ||
        e.method.toLowerCase().includes(q) ||
        String(e.statusCode).includes(q) ||
        (e.errorMessage && e.errorMessage.toLowerCase().includes(q)),
    );
  }, [overview, errorSearch]);

  const today = useMemo(
    () => new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" }),
    [],
  );

  return (
    <div className="min-h-screen bg-white text-[13px] text-[#303030]">
      {/* ── Top Header Bar ── */}
      <header className="border-b border-[#e3e3e3] bg-white sticky top-0 z-30">
        <div className="mx-auto flex max-w-[1300px] flex-wrap items-center justify-between gap-3 px-6 py-3.5">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white border border-[#e3e3e3] text-[#303030] shadow-xs">
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M4 16V9M10 16V4M16 16v-5" strokeLinecap="round" />
              </svg>
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-[20px] font-semibold text-[#1a1a1a] leading-tight">
                  System Observability & Monitoring
                </h1>
                {overview && (
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium border ${
                      overview.status === "CRITICAL"
                        ? "bg-[#ffe5e5] text-[#b30000] border-[#fed3d1]"
                        : overview.status === "DEGRADED"
                          ? "bg-[#fffbeb] text-[#b54708] border-[#fef3c7]"
                          : "bg-[#edfcf3] text-[#008060] border-[#c4f0d5]"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        overview.status === "CRITICAL"
                          ? "bg-[#b30000] animate-pulse"
                          : overview.status === "DEGRADED"
                            ? "bg-[#b54708]"
                            : "bg-[#008060]"
                      }`}
                    />
                    {overview.status}
                  </span>
                )}
              </div>
              <p className="text-[12px] text-[#616161]">
                {today} • Real-time telemetry, Loki-style log tracing & SRE alerts
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/staff"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#e3e3e3] bg-white px-3 py-1.5 text-[12px] font-medium text-[#303030] hover:bg-[#f7f7f7] shadow-2xs transition"
            >
              ← Back to Portal
            </Link>

            {/* Refresh Interval Selector */}
            <div className="flex items-center gap-1.5 rounded-lg border border-[#e3e3e3] bg-[#fafafa] px-2 py-1 text-[11px]">
              <span className="text-[#616161] font-medium">Auto:</span>
              <select
                value={autoRefreshInterval}
                onChange={(e) => setAutoRefreshInterval(Number(e.target.value))}
                className="bg-transparent font-medium text-[#1a1a1a] outline-none cursor-pointer"
              >
                <option value={3}>3s (Fast)</option>
                <option value={5}>5s</option>
                <option value={10}>10s</option>
                <option value={30}>30s</option>
                <option value={0}>Paused</option>
              </select>
            </div>

            <button
              onClick={() => token && void loadData(token, false)}
              disabled={loading || refreshing}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#e3e3e3] bg-white px-3 py-1.5 text-[12px] font-medium text-[#303030] hover:bg-[#f7f7f7] shadow-2xs transition disabled:opacity-50"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                className={refreshing ? "animate-spin text-[#008060]" : ""}
              >
                <path d="M4 4v5h5M16 16v-5h-5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M5.5 14.5a7 7 0 0 0 10.4-2.5M14.5 5.5a7 7 0 0 0-10.4 2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>{refreshing ? "Syncing..." : "Refresh"}</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs (Grafana Style: Golden Signals | Logs Stream | Alert Rules) */}
        <div className="mx-auto flex max-w-[1300px] gap-6 px-6 pt-1">
          <button
            onClick={() => setActiveTab("overview")}
            className={`border-b-2 pb-2.5 text-[13px] font-semibold transition ${
              activeTab === "overview"
                ? "border-[#008060] text-[#008060]"
                : "border-transparent text-[#616161] hover:text-[#1a1a1a]"
            }`}
          >
            📊 Golden Signals & Metrics
          </button>
          <button
            onClick={() => setActiveTab("logs")}
            className={`flex items-center gap-1.5 border-b-2 pb-2.5 text-[13px] font-semibold transition ${
              activeTab === "logs"
                ? "border-[#008060] text-[#008060]"
                : "border-transparent text-[#616161] hover:text-[#1a1a1a]"
            }`}
          >
            📜 Loki Log Stream & Tracing
            <span className="rounded-full bg-[#f1f1f1] px-1.5 py-0.2 text-[10px] font-bold text-[#616161]">
              {totalLogsCount}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("alerts")}
            className={`flex items-center gap-1.5 border-b-2 pb-2.5 text-[13px] font-semibold transition ${
              activeTab === "alerts"
                ? "border-[#008060] text-[#008060]"
                : "border-transparent text-[#616161] hover:text-[#1a1a1a]"
            }`}
          >
            🚨 Alerts & Runbooks
            {overview && overview.activeAlerts.length > 0 && (
              <span className="rounded-full bg-[#ffe5e5] px-1.5 py-0.2 text-[10px] font-bold text-[#b30000]">
                {overview.activeAlerts.filter((a) => !a.acknowledged).length} active
              </span>
            )}
          </button>
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="mx-auto max-w-[1300px] px-6 py-6 space-y-6">
        {error && (
          <div className="flex items-center justify-between rounded-xl border border-[#fed3d1] bg-[#ffe5e5] p-3.5 text-[#b30000]">
            <div className="flex items-center gap-2">
              <span className="text-[14px]">⚠️</span>
              <span className="font-medium text-[12px]">{error}</span>
            </div>
            <button
              onClick={() => token && void loadData(token)}
              className="text-[11px] font-semibold underline hover:no-underline"
            >
              Retry
            </button>
          </div>
        )}

        {/* ── TAB 1: GOLDEN SIGNALS & OVERVIEW ── */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* ── Golden Signals Grid ── */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
              {/* Throughput */}
              <div className="rounded-xl border border-[#e3e3e3] bg-white p-4 shadow-2xs hover:shadow-xs transition">
                <div className="flex items-center justify-between text-[#616161] mb-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wider">Rate (Traffic)</span>
                  <span className="h-2 w-2 rounded-full bg-[#008060]" />
                </div>
                <div className="text-[22px] font-bold text-[#1a1a1a] tracking-tight">
                  {overview?.goldenSignals.throughputRps ?? 0}
                  <span className="text-[12px] font-normal text-[#616161] ml-1">req/s</span>
                </div>
                <p className="mt-1 text-[11px] text-[#8c9196]">
                  Total requests: <strong className="text-[#303030]">{overview?.statusCodes.total ?? 0}</strong>
                </p>
              </div>

              {/* Avg Latency */}
              <div className="rounded-xl border border-[#e3e3e3] bg-white p-4 shadow-2xs hover:shadow-xs transition">
                <div className="flex items-center justify-between text-[#616161] mb-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wider">Avg Duration</span>
                  <span className="h-2 w-2 rounded-full bg-[#0ea5e9]" />
                </div>
                <div className="text-[22px] font-bold text-[#1a1a1a] tracking-tight">
                  {overview?.goldenSignals.avgLatencyMs ?? 0}
                  <span className="text-[12px] font-normal text-[#616161] ml-1">ms</span>
                </div>
                <p className="mt-1 text-[11px] text-[#8c9196]">
                  Min: {apiMetrics?.latencyPercentiles.min ?? 0}ms • Max: {apiMetrics?.latencyPercentiles.max ?? 0}ms
                </p>
              </div>

              {/* p95 Latency */}
              <div className="rounded-xl border border-[#e3e3e3] bg-white p-4 shadow-2xs hover:shadow-xs transition">
                <div className="flex items-center justify-between text-[#616161] mb-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wider">p95 Latency</span>
                  <span className="h-2 w-2 rounded-full bg-[#7c3aed]" />
                </div>
                <div className="text-[22px] font-bold text-[#1a1a1a] tracking-tight">
                  {overview?.goldenSignals.p95LatencyMs ?? 0}
                  <span className="text-[12px] font-normal text-[#616161] ml-1">ms</span>
                </div>
                <p className="mt-1 text-[11px] text-[#8c9196]">
                  p90: {apiMetrics?.latencyPercentiles.p90 ?? 0}ms • p99: {apiMetrics?.latencyPercentiles.p99 ?? 0}ms
                </p>
              </div>

              {/* Error Rate */}
              <div className="rounded-xl border border-[#e3e3e3] bg-white p-4 shadow-2xs hover:shadow-xs transition">
                <div className="flex items-center justify-between text-[#616161] mb-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wider">Errors (4xx+5xx)</span>
                  <span
                    className={`h-2 w-2 rounded-full ${
                      (overview?.goldenSignals.errorRatePercent ?? 0) > 5
                        ? "bg-[#b30000]"
                        : "bg-[#008060]"
                    }`}
                  />
                </div>
                <div className="text-[22px] font-bold text-[#1a1a1a] tracking-tight">
                  {overview?.goldenSignals.errorRatePercent ?? 0}
                  <span className="text-[12px] font-normal text-[#616161] ml-1">%</span>
                </div>
                <p className="mt-1 text-[11px] text-[#8c9196]">
                  5xx: <strong className="text-[#b30000]">{overview?.statusCodes.status5xx ?? 0}</strong> • 4xx: {overview?.statusCodes.status4xx ?? 0}
                </p>
              </div>

              {/* Node Process Heap */}
              <div className="rounded-xl border border-[#e3e3e3] bg-white p-4 shadow-2xs hover:shadow-xs transition">
                <div className="flex items-center justify-between text-[#616161] mb-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wider">Node Heap (Used)</span>
                  <span className="h-2 w-2 rounded-full bg-[#10b981]" />
                </div>
                <div className="text-[22px] font-bold text-[#1a1a1a] tracking-tight">
                  {resources ? formatBytes(resources.processMemory.heapUsedBytes) : "0 MB"}
                </div>
                <p className="mt-1 text-[11px] text-[#8c9196]">
                  Total: {resources ? formatBytes(resources.processMemory.heapTotalBytes) : "0 MB"} • RSS: {resources ? formatBytes(resources.processMemory.rssBytes) : "0 MB"}
                </p>
              </div>

              {/* DB Ping */}
              <div className="rounded-xl border border-[#e3e3e3] bg-white p-4 shadow-2xs hover:shadow-xs transition">
                <div className="flex items-center justify-between text-[#616161] mb-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wider">PostgreSQL</span>
                  <span
                    className={`h-2 w-2 rounded-full ${
                      overview?.database.status === "CONNECTED"
                        ? "bg-[#008060]"
                        : "bg-[#b30000]"
                    }`}
                  />
                </div>
                <div className="text-[22px] font-bold text-[#1a1a1a] tracking-tight">
                  {overview?.database.latencyMs ?? 0}
                  <span className="text-[12px] font-normal text-[#616161] ml-1">ms</span>
                </div>
                <p className="mt-1 text-[11px] text-[#8c9196]">
                  Status: <strong className="text-[#008060]">{overview?.database.status ?? "CONNECTED"}</strong>
                </p>
              </div>
            </div>

            {/* ── Live Visualizations Grid ── */}
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Chart 1: Real-time Throughput & p95 Area Chart */}
              <div className="lg:col-span-2 overflow-hidden rounded-xl border border-[#e3e3e3] bg-white p-5 shadow-xs flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-[14px] font-semibold text-[#1a1a1a]">Throughput & Latency Trend</h3>
                    <p className="text-[12px] text-[#8c9196]">Sliding live window (last 20 sample intervals)</p>
                  </div>
                  <div className="flex items-center gap-3 text-[11px]">
                    <span className="flex items-center gap-1.5 font-medium text-[#008060]">
                      <span className="h-2 w-2 rounded-full bg-[#008060]" /> Req/s
                    </span>
                    <span className="flex items-center gap-1.5 font-medium text-[#7c3aed]">
                      <span className="h-2 w-2 rounded-full bg-[#7c3aed]" /> p95 (ms)
                    </span>
                  </div>
                </div>

                <div className="h-[220px] w-full">
                  {timeline.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-[12px] text-[#8c9196]">
                      Collecting telemetry samples...
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={timeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorThroughput" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#008060" stopOpacity={0.25} />
                            <stop offset="95%" stopColor="#008060" stopOpacity={0.0} />
                          </linearGradient>
                          <linearGradient id="colorP95" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.25} />
                            <stop offset="95%" stopColor="#7c3aed" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f1f1" />
                        <XAxis dataKey="time" tick={{ fontSize: 11, fill: "#8c9196" }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: "#8c9196" }} tickLine={false} axisLine={false} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#ffffff",
                            borderColor: "#e3e3e3",
                            borderRadius: "10px",
                            fontSize: "12px",
                            boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="throughput"
                          name="Throughput (req/s)"
                          stroke="#008060"
                          strokeWidth={2}
                          fillOpacity={1}
                          fill="url(#colorThroughput)"
                        />
                        <Area
                          type="monotone"
                          dataKey="p95Latency"
                          name="p95 Latency (ms)"
                          stroke="#7c3aed"
                          strokeWidth={2}
                          fillOpacity={1}
                          fill="url(#colorP95)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Chart 2: Latency Percentiles Bar Chart */}
              <div className="overflow-hidden rounded-xl border border-[#e3e3e3] bg-white p-5 shadow-xs flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-[14px] font-semibold text-[#1a1a1a]">Latency Percentiles</h3>
                    <p className="text-[12px] text-[#8c9196]">Distribution across all active endpoints</p>
                  </div>
                </div>

                <div className="h-[220px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={latencyBarData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f1f1" />
                      <XAxis dataKey="percentile" tick={{ fontSize: 11, fill: "#8c9196" }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "#8c9196" }} tickLine={false} axisLine={false} unit="ms" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#ffffff",
                          borderColor: "#e3e3e3",
                          borderRadius: "10px",
                          fontSize: "12px",
                        }}
                      />
                      <Bar dataKey="duration" name="Duration (ms)" radius={[4, 4, 0, 0]}>
                        {latencyBarData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* ── Status Code Distribution & Routes Breakdown ── */}
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Donut Chart: HTTP Status Breakdown */}
              <div className="overflow-hidden rounded-xl border border-[#e3e3e3] bg-white p-5 shadow-xs flex flex-col">
                <div className="mb-4">
                  <h3 className="text-[14px] font-semibold text-[#1a1a1a]">HTTP Status Code Distribution</h3>
                  <p className="text-[12px] text-[#8c9196]">Breakdown of response codes in buffer</p>
                </div>

                <div className="h-[180px] w-full">
                  {statusPieData.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-[12px] text-[#8c9196]">
                      No traffic recorded yet
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={statusPieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={75}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {statusPieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] pt-3 border-t border-[#f1f1f1]">
                  <div className="flex items-center gap-1.5 font-medium text-[#008060]">
                    <span className="h-2 w-2 rounded-full bg-[#008060]" />
                    2xx: {overview?.statusCodes.status2xx ?? 0}
                  </div>
                  <div className="flex items-center gap-1.5 font-medium text-[#0ea5e9]">
                    <span className="h-2 w-2 rounded-full bg-[#0ea5e9]" />
                    3xx: {overview?.statusCodes.status3xx ?? 0}
                  </div>
                  <div className="flex items-center gap-1.5 font-medium text-[#f59e0b]">
                    <span className="h-2 w-2 rounded-full bg-[#f59e0b]" />
                    4xx: {overview?.statusCodes.status4xx ?? 0}
                  </div>
                  <div className="flex items-center gap-1.5 font-medium text-[#dc2626]">
                    <span className="h-2 w-2 rounded-full bg-[#dc2626]" />
                    5xx: {overview?.statusCodes.status5xx ?? 0}
                  </div>
                </div>
              </div>

              {/* Endpoint Table */}
              <div className="lg:col-span-2 overflow-hidden rounded-xl border border-[#e3e3e3] bg-white shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e3e3e3] px-5 py-3.5 bg-[#fafafa]">
                  <div>
                    <h3 className="text-[14px] font-semibold text-[#1a1a1a]">Top Endpoints by Latency & Volume</h3>
                    <p className="text-[12px] text-[#8c9196]">Real-time per-route latency percentiles</p>
                  </div>
                  <input
                    type="text"
                    value={routeSearch}
                    onChange={(e) => setRouteSearch(e.target.value)}
                    placeholder="Search route or method..."
                    className="rounded-lg border border-[#e3e3e3] bg-white px-3 py-1 text-[11px] text-[#1a1a1a] placeholder-[#8c9196] focus:border-[#008060] focus:outline-none"
                  />
                </div>

                <div className="max-h-[260px] overflow-auto">
                  <table className="w-full text-left text-[12px]">
                    <thead className="bg-[#fafafa] text-[#616161] font-medium border-b border-[#e3e3e3] sticky top-0">
                      <tr>
                        <th className="py-2 px-4">Method & Route</th>
                        <th className="py-2 px-4 text-right">Requests</th>
                        <th className="py-2 px-4 text-right">Avg Latency</th>
                        <th className="py-2 px-4 text-right">p95 Latency</th>
                        <th className="py-2 px-4 text-right">Errors</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f1f1f1]">
                      {filteredRoutes.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-6 text-center text-[#8c9196]">
                            No routes matched filter
                          </td>
                        </tr>
                      ) : (
                        filteredRoutes.map((r, i) => (
                          <tr key={i} className="hover:bg-[#fafafa] transition">
                            <td className="py-2.5 px-4 font-mono font-medium text-[#1a1a1a]">
                              <span
                                className={`mr-2 rounded px-1.5 py-0.5 text-[10px] font-bold ${
                                  r.method === "GET"
                                    ? "bg-[#edfcf3] text-[#008060]"
                                    : r.method === "POST"
                                      ? "bg-[#eff6ff] text-[#2563eb]"
                                      : r.method === "PATCH" || r.method === "PUT"
                                        ? "bg-[#fffbeb] text-[#d97706]"
                                        : "bg-[#ffe5e5] text-[#b30000]"
                                }`}
                              >
                                {r.method}
                              </span>
                              {r.path}
                            </td>
                            <td className="py-2.5 px-4 text-right font-medium text-[#303030]">{r.count}</td>
                            <td className="py-2.5 px-4 text-right text-[#616161]">{r.avgDurationMs} ms</td>
                            <td className="py-2.5 px-4 text-right font-semibold text-[#7c3aed]">
                              {r.p95DurationMs} ms
                            </td>
                            <td className="py-2.5 px-4 text-right font-medium">
                              {r.errorCount > 0 ? (
                                <span className="text-[#b30000]">{r.errorCount}</span>
                              ) : (
                                <span className="text-[#8c9196]">0</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* ── Collapsible Infrastructure & Dependencies ── */}
            <section className="overflow-hidden rounded-xl border border-[#e3e3e3] bg-white shadow-xs">
              <div
                onClick={() => setInfraOpen((v) => !v)}
                className="flex items-center justify-between border-b border-[#e3e3e3] px-5 py-3 cursor-pointer bg-[#fafafa] hover:bg-[#f7f7f7] transition"
              >
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[#1a1a1a]">🖥️ Node.js Container & Process Memory</span>
                  <span className="text-[12px] text-[#8c9196]">• Safe container limits (Render MVP)</span>
                </div>
                <span className="text-[12px] text-[#616161]">{infraOpen ? "Collapse ▲" : "Expand ▼"}</span>
              </div>

              {infraOpen && resources && (
                <div className="p-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-xl border border-[#e3e3e3] p-3.5 bg-[#fafafa]">
                    <div className="text-[11px] font-medium text-[#616161]">Heap Used / Total</div>
                    <div className="text-[18px] font-bold text-[#1a1a1a] mt-1">
                      {formatBytes(resources.processMemory.heapUsedBytes)}{" "}
                      <span className="text-[12px] font-normal text-[#616161]">
                        / {formatBytes(resources.processMemory.heapTotalBytes)}
                      </span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-[#e3e3e3] p-3.5 bg-[#fafafa]">
                    <div className="text-[11px] font-medium text-[#616161]">Process RSS (Resident Set)</div>
                    <div className="text-[18px] font-bold text-[#1a1a1a] mt-1">
                      {formatBytes(resources.processMemory.rssBytes)}
                    </div>
                  </div>

                  <div className="rounded-xl border border-[#e3e3e3] p-3.5 bg-[#fafafa]">
                    <div className="text-[11px] font-medium text-[#616161]">Runtime Uptime</div>
                    <div className="text-[18px] font-bold text-[#1a1a1a] mt-1">
                      {formatUptime(resources.uptimeSeconds)}
                    </div>
                  </div>

                  <div className="rounded-xl border border-[#e3e3e3] p-3.5 bg-[#fafafa]">
                    <div className="text-[11px] font-medium text-[#616161]">Node & Platform</div>
                    <div className="text-[16px] font-semibold text-[#1a1a1a] mt-1">
                      {resources.nodeVersion} ({resources.platform})
                    </div>
                  </div>
                </div>
              )}
            </section>
          </div>
        )}

        {/* ── TAB 2: LOKI LOG STREAM & TRACE EXPLORER ── */}
        {activeTab === "logs" && (
          <div className="space-y-4">
            {/* Filter & Search Bar */}
            <div className="rounded-xl border border-[#e3e3e3] bg-white p-4 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-1 items-center gap-2 min-w-[280px]">
                  <span className="text-[14px] text-[#616161]">🔍</span>
                  <input
                    type="text"
                    value={logSearch}
                    onChange={(e) => setLogSearch(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && void refreshLogsOnly()}
                    placeholder="Search logs by keyword, endpoint, message, or error..."
                    className="flex-1 rounded-lg border border-[#e3e3e3] bg-[#fafafa] px-3 py-1.5 text-[12px] text-[#1a1a1a] placeholder-[#8c9196] focus:border-[#008060] focus:bg-white focus:outline-none"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Correlation Request ID filter */}
                  <input
                    type="text"
                    value={selectedRequestId}
                    onChange={(e) => setSelectedRequestId(e.target.value)}
                    placeholder="Filter by Request ID (x-request-id)..."
                    className="w-56 font-mono rounded-lg border border-[#e3e3e3] bg-[#fafafa] px-3 py-1.5 text-[11px] text-[#1a1a1a] placeholder-[#8c9196] focus:border-[#008060] focus:bg-white focus:outline-none"
                  />

                  {/* Level Pill filters */}
                  <div className="flex rounded-lg border border-[#e3e3e3] bg-[#fafafa] p-0.5">
                    {["ALL", "INFO", "WARN", "ERROR"].map((lvl) => (
                      <button
                        key={lvl}
                        onClick={() => setSelectedLogLevel(lvl)}
                        className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition ${
                          selectedLogLevel === lvl
                            ? lvl === "ERROR"
                              ? "bg-[#dc2626] text-white shadow-2xs"
                              : lvl === "WARN"
                                ? "bg-[#d97706] text-white shadow-2xs"
                                : "bg-[#008060] text-white shadow-2xs"
                            : "text-[#616161] hover:text-[#1a1a1a]"
                        }`}
                      >
                        {lvl}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => void refreshLogsOnly()}
                    className="rounded-lg bg-[#008060] px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-[#006e52] transition shadow-2xs"
                  >
                    Query Logs
                  </button>
                </div>
              </div>
            </div>

            {/* Logs Viewer (Grafana Loki Style Console) */}
            <div className="overflow-hidden rounded-xl border border-[#e3e3e3] bg-[#1e1e1e] text-[#d4d4d4] font-mono text-[12px] shadow-sm">
              <div className="flex items-center justify-between border-b border-[#333] px-4 py-2.5 bg-[#252526]">
                <div className="flex items-center gap-2 text-[11px] text-[#888]">
                  <span className="h-2 w-2 rounded-full bg-[#008060]" />
                  <span>LOG BUFFER: {logs.length} entries shown (capacity 2,000)</span>
                </div>
                <div className="text-[11px] text-[#888]">
                  Click any row to view correlation trace and stack trace
                </div>
              </div>

              <div className="max-h-[580px] overflow-auto divide-y divide-[#2a2a2a]">
                {logs.length === 0 ? (
                  <div className="py-12 text-center text-[#888]">
                    No log records match current query filter.
                  </div>
                ) : (
                  logs.map((log) => {
                    const isExpanded = expandedLogId === log.id;
                    const isError = log.level === "error";
                    const isWarn = log.level === "warn";

                    return (
                      <div
                        key={log.id}
                        className={`p-3 transition cursor-pointer hover:bg-[#2a2a2d] ${
                          isError ? "bg-[#2b1616]" : isWarn ? "bg-[#2b2516]" : ""
                        }`}
                        onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                      >
                        {/* Summary Line */}
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="text-[#888] text-[11px] shrink-0">
                            {new Date(log.timestamp).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            })}
                          </span>

                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase shrink-0 ${
                              isError
                                ? "bg-[#dc2626] text-white"
                                : isWarn
                                  ? "bg-[#d97706] text-white"
                                  : "bg-[#008060] text-white"
                            }`}
                          >
                            {log.level}
                          </span>

                          <span className="rounded bg-[#333] px-1.5 py-0.5 text-[10px] text-[#ccc]">
                            {log.module}
                          </span>

                          {log.method && (
                            <span className="font-semibold text-[#9cdcfe]">
                              {log.method} {log.route}
                            </span>
                          )}

                          {log.statusCode && (
                            <span
                              className={`text-[11px] font-bold ${
                                log.statusCode >= 500
                                  ? "text-[#f87171]"
                                  : log.statusCode >= 400
                                    ? "text-[#fbbf24]"
                                    : "text-[#4ade80]"
                              }`}
                            >
                              [{log.statusCode}]
                            </span>
                          )}

                          {log.durationMs !== undefined && (
                            <span className="text-[#888] text-[11px]">{log.durationMs}ms</span>
                          )}

                          <span className="text-[#e2e8f0] flex-1 truncate">{log.message}</span>

                          {/* Quick copy request ID */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              void navigator.clipboard.writeText(log.requestId);
                              alert(`Copied Request ID: ${log.requestId}`);
                            }}
                            title="Copy correlation trace ID"
                            className="text-[10px] rounded border border-[#444] px-1.5 py-0.5 text-[#aaa] hover:bg-[#333] hover:text-white"
                          >
                            Trace: {log.requestId.slice(0, 8)}...
                          </button>
                        </div>

                        {/* Expanded Drawer (Full Details, Headers, Stack Trace) */}
                        {isExpanded && (
                          <div className="mt-3 rounded-lg border border-[#444] bg-[#141414] p-3 text-[11px] space-y-2">
                            <div className="grid grid-cols-2 gap-2 text-[#aaa]">
                              <div>
                                <span className="text-[#888]">Correlation Request ID: </span>
                                <strong className="text-white font-mono select-all">{log.requestId}</strong>
                              </div>
                              <div>
                                <span className="text-[#888]">Event: </span>
                                <strong className="text-white">{log.event}</strong>
                              </div>
                              <div>
                                <span className="text-[#888]">Client IP: </span>
                                <strong className="text-white">{log.ip ?? "unknown"}</strong>
                              </div>
                              <div>
                                <span className="text-[#888]">User ID: </span>
                                <strong className="text-white">{log.userId ?? "unauthenticated"}</strong>
                              </div>
                            </div>

                            {log.stackTrace && (
                              <div className="mt-2">
                                <div className="text-[11px] font-semibold text-[#f87171] mb-1">
                                  Exception Stack Trace:
                                </div>
                                <pre className="max-h-48 overflow-auto rounded bg-[#000] p-2 text-[10.5px] text-[#fca5a5] whitespace-pre font-mono">
                                  {log.stackTrace}
                                </pre>
                              </div>
                            )}

                            {log.metadata && Object.keys(log.metadata).length > 0 && (
                              <div className="mt-2">
                                <div className="text-[11px] font-semibold text-[#9cdcfe] mb-1">Metadata:</div>
                                <pre className="max-h-36 overflow-auto rounded bg-[#000] p-2 text-[10.5px] text-[#ce9178] whitespace-pre font-mono">
                                  {JSON.stringify(log.metadata, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 3: SRE ALERTS & RUNBOOKS ── */}
        {activeTab === "alerts" && (
          <div className="space-y-6">
            {/* Active Triggered Alerts Banner */}
            <div className="overflow-hidden rounded-xl border border-[#e3e3e3] bg-white shadow-xs">
              <div className="border-b border-[#e3e3e3] px-5 py-3.5 bg-[#fafafa]">
                <h3 className="text-[14px] font-semibold text-[#1a1a1a]">
                  Active System Health Alerts ({overview?.activeAlerts.length ?? 0})
                </h3>
                <p className="text-[12px] text-[#8c9196]">
                  Actionable symptom-based alerts. Every alert has a designated troubleshooting runbook.
                </p>
              </div>

              <div className="divide-y divide-[#e3e3e3]">
                {!overview || overview.activeAlerts.length === 0 ? (
                  <div className="py-8 text-center text-[#008060] font-medium text-[13px]">
                    ✅ All alert monitors operational. Zero symptom breaches.
                  </div>
                ) : (
                  overview.activeAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={`p-4 transition ${
                        alert.acknowledged
                          ? "bg-[#fafafa] opacity-60"
                          : alert.severity === "CRITICAL"
                            ? "bg-[#fff5f5]"
                            : "bg-[#fffdf5]"
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`rounded px-2 py-0.5 text-[10.5px] font-bold ${
                                alert.severity === "CRITICAL"
                                  ? "bg-[#b30000] text-white"
                                  : "bg-[#d97706] text-white"
                              }`}
                            >
                              {alert.severity}
                            </span>
                            <span className="rounded bg-[#f1f1f1] px-1.5 py-0.5 text-[10.5px] font-semibold text-[#616161]">
                              {alert.type}
                            </span>
                            <span className="font-semibold text-[#1a1a1a] text-[13px]">{alert.title}</span>
                          </div>
                          <p className="text-[12px] text-[#303030]">{alert.message}</p>
                          <div className="text-[11px] text-[#8c9196]">
                            Triggered: {new Date(alert.timestamp).toLocaleTimeString()} • Current:{" "}
                            <strong className="text-[#1a1a1a]">{alert.value}</strong> (Threshold: {alert.threshold})
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {alert.runbook && (
                            <button
                              onClick={() =>
                                setExpandedRunbookId(expandedRunbookId === alert.id ? null : alert.id)
                              }
                              className="rounded-lg border border-[#e3e3e3] bg-white px-3 py-1.5 text-[11px] font-semibold text-[#303030] hover:bg-[#f7f7f7] shadow-2xs transition"
                            >
                              📖 {expandedRunbookId === alert.id ? "Hide Runbook" : "View Runbook"}
                            </button>
                          )}

                          {!alert.acknowledged ? (
                            <button
                              onClick={() => void handleAcknowledge(alert.id)}
                              disabled={ackLoadingId === alert.id}
                              className="rounded-lg bg-[#1a1a1a] px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-[#333] transition shadow-2xs disabled:opacity-50"
                            >
                              {ackLoadingId === alert.id ? "Acknowledging..." : "Acknowledge"}
                            </button>
                          ) : (
                            <span className="rounded-lg bg-[#edfcf3] px-2.5 py-1 text-[11px] font-medium text-[#008060] border border-[#c4f0d5]">
                              ✓ Acknowledged
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Expandable Runbook Instructions */}
                      {expandedRunbookId === alert.id && alert.runbook && (
                        <div className="mt-3 rounded-lg border border-[#fed3d1] bg-white p-4 text-[12px]">
                          <div className="font-semibold text-[#b30000] mb-1">
                            📋 SRE Incident Runbook:
                          </div>
                          <p className="text-[#303030] leading-relaxed whitespace-pre-line">
                            {alert.runbook}
                          </p>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Configured Alert Rules */}
            <div className="overflow-hidden rounded-xl border border-[#e3e3e3] bg-white shadow-xs">
              <div className="border-b border-[#e3e3e3] px-5 py-3.5 bg-[#fafafa]">
                <h3 className="text-[14px] font-semibold text-[#1a1a1a]">Alert Rules & Thresholds</h3>
                <p className="text-[12px] text-[#8c9196]">
                  Tune thresholds or toggle alerting rules without restarting the API
                </p>
              </div>

              <div className="divide-y divide-[#e3e3e3]">
                {alertRules.map((rule) => (
                  <div key={rule.id} className="p-4 flex flex-wrap items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[#1a1a1a]">{rule.name}</span>
                        <span className="rounded bg-[#f1f1f1] px-1.5 py-0.5 text-[10px] font-semibold text-[#616161]">
                          {rule.category}
                        </span>
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                            rule.severity === "CRITICAL"
                              ? "bg-[#ffe5e5] text-[#b30000]"
                              : "bg-[#fffbeb] text-[#b54708]"
                          }`}
                        >
                          {rule.severity}
                        </span>
                      </div>
                      <p className="text-[12px] text-[#616161]">{rule.description}</p>
                      <div className="text-[11px] text-[#8c9196]">
                        Condition: &gt; <strong>{rule.threshold} {rule.unit}</strong>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => void handleToggleRule(rule)}
                        disabled={ruleToggleLoadingId === rule.id}
                        className={`rounded-lg px-3 py-1.5 text-[11px] font-semibold transition shadow-2xs ${
                          rule.enabled
                            ? "bg-[#edfcf3] text-[#008060] border border-[#c4f0d5] hover:bg-[#d8f9e6]"
                            : "bg-[#f1f1f1] text-[#616161] hover:bg-[#e3e3e3]"
                        }`}
                      >
                        {rule.enabled ? "Active (Enabled)" : "Disabled"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
