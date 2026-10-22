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
  getApiMetrics,
  getMonitoringOverview,
  getSystemResources,
  StaffMonitoringApiError,
} from "../../../lib/staff-monitoring-api";
import type {
  ApiMetricsResponse,
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

export default function StaffMonitoringPage() {
  const router = useRouter();

  const [token, setToken] = useState<string | null>(null);
  const [overview, setOverview] = useState<MonitoringOverview | null>(null);
  const [apiMetrics, setApiMetrics] = useState<ApiMetricsResponse | null>(null);
  const [resources, setResources] = useState<SystemResourceMetrics | null>(null);

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
      const [ov, am, res] = await Promise.all([
        getMonitoringOverview(t),
        getApiMetrics(t, 300),
        getSystemResources(t),
      ]);
      setOverview(ov);
      setApiMetrics(am);
      setResources(res);

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
  }, [token, autoRefreshInterval]);

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
                            ? "bg-[#d97706]"
                            : "bg-[#008060]"
                      }`}
                    />
                    {overview.status}
                  </span>
                )}
                {refreshing && (
                  <svg className="h-3.5 w-3.5 animate-spin text-[#616161]" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                )}
              </div>
              <p className="text-[12px] text-[#616161]">
                {today}{lastRefreshedAt ? ` · Live chart telemetry synced at ${lastRefreshedAt}` : ""}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5 rounded-lg border border-[#d4d4d4] bg-white px-2.5 py-1 text-[12px] text-[#303030]">
              <span className="text-[#8c9196]">Interval:</span>
              <select
                value={autoRefreshInterval}
                onChange={(e) => setAutoRefreshInterval(Number(e.target.value))}
                className="bg-transparent font-medium text-[#1a1a1a] outline-none cursor-pointer"
              >
                <option value={0}>Pause</option>
                <option value={3}>3s live</option>
                <option value={5}>5s</option>
                <option value={10}>10s</option>
                <option value={30}>30s</option>
              </select>
            </div>

            <button
              type="button"
              onClick={() => token && void loadData(token, true)}
              disabled={refreshing}
              title="Refresh Telemetry"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#d4d4d4] bg-white text-[#303030] shadow-xs transition hover:bg-[#f7f7f7] disabled:opacity-50"
            >
              <svg viewBox="0 0 16 16" fill="none" className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}>
                <path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9M13.5 3v3h-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            <Link
              href="/staff"
              className="inline-flex h-8 items-center justify-center rounded-lg border border-[#d4d4d4] bg-white px-3 text-[13px] font-medium text-[#303030] shadow-xs hover:bg-[#f7f7f7]"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </header>

      {/* ── Main Dashboard Body ── */}
      <main className="mx-auto max-w-[1300px] px-6 pt-5 pb-12 space-y-6 bg-white">
        {/* Error Notice */}
        {error && (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-[#fed3d1] bg-[#fff4f4] px-4 py-2.5 text-[13px] text-[#8a1c14]">
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" className="shrink-0">
                <path d="M8 1a7 7 0 1 0 7 7A7 7 0 0 0 8 1Zm-.75 4a.75.75 0 0 1 1.5 0v3.5a.75.75 0 0 1-1.5 0Zm.75 7a.875.875 0 1 1 .875-.875A.875.875 0 0 1 8 12Z" />
              </svg>
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={() => token && void loadData(token)}
              className="shrink-0 font-medium underline hover:text-[#5a100c]"
            >
              Retry
            </button>
          </div>
        )}

        {/* Active Alert Banners */}
        {overview && overview.activeAlerts.length > 0 && (
          <div className="space-y-2">
            {overview.activeAlerts.map((alert) => {
              const isCrit = alert.severity === "CRITICAL";
              return (
                <div
                  key={alert.id}
                  className={`flex items-start gap-3 rounded-xl border p-3.5 ${
                    isCrit ? "bg-[#fff4f4] border-[#fed3d1] text-[#8a1c14]" : "bg-[#fffbeb] border-[#fef3c7] text-[#92400e]"
                  }`}
                >
                  <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${
                    isCrit ? "bg-[#b30000]" : "bg-[#d97706]"
                  }`}>
                    !
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-[13px] leading-tight">{alert.title}</h4>
                      <span className="rounded bg-white/80 border border-current/20 px-1.5 py-0.2 text-[10px] font-mono uppercase">
                        {alert.type}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[12px] opacity-90">{alert.message}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ══ Row 1 — Golden Signals (Top KPI Grid) ══ */}
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <div className="rounded-xl border border-[#e3e3e3] bg-white p-4 shadow-xs">
            <span className="text-[11.5px] font-semibold uppercase tracking-wider text-[#616161]">Throughput</span>
            <div className="mt-1 text-[24px] font-semibold tracking-tight text-[#1a1a1a] leading-none">
              {loading ? "—" : overview?.goldenSignals.throughputRps ?? 0}
              <span className="ml-1 text-[12px] font-normal text-[#616161]">req/s</span>
            </div>
            <div className="mt-2 text-[11.5px] text-[#008060] font-medium">Rate (RED)</div>
          </div>

          <div className="rounded-xl border border-[#e3e3e3] bg-white p-4 shadow-xs">
            <span className="text-[11.5px] font-semibold uppercase tracking-wider text-[#616161]">Avg Duration</span>
            <div className="mt-1 text-[24px] font-semibold tracking-tight text-[#1a1a1a] leading-none">
              {loading ? "—" : overview?.goldenSignals.avgLatencyMs ?? 0}
              <span className="ml-1 text-[12px] font-normal text-[#616161]">ms</span>
            </div>
            <div className="mt-2 text-[11.5px] text-[#0284c7] font-medium">Duration (RED)</div>
          </div>

          <div className="rounded-xl border border-[#e3e3e3] bg-white p-4 shadow-xs">
            <span className="text-[11.5px] font-semibold uppercase tracking-wider text-[#616161]">p95 Latency</span>
            <div className="mt-1 text-[24px] font-semibold tracking-tight text-[#7c3aed] leading-none">
              {loading ? "—" : overview?.goldenSignals.p95LatencyMs ?? 0}
              <span className="ml-1 text-[12px] font-normal text-[#616161]">ms</span>
            </div>
            <div className="mt-2 text-[11.5px] text-[#8c9196]">95% below this</div>
          </div>

          <div className="rounded-xl border border-[#e3e3e3] bg-white p-4 shadow-xs">
            <span className="text-[11.5px] font-semibold uppercase tracking-wider text-[#616161]">Error Rate</span>
            <div className={`mt-1 text-[24px] font-semibold tracking-tight leading-none ${
              (overview?.goldenSignals.errorRatePercent ?? 0) > 0 ? "text-[#b30000]" : "text-[#008060]"
            }`}>
              {loading ? "—" : `${overview?.goldenSignals.errorRatePercent ?? 0}%`}
            </div>
            <div className="mt-2 text-[11.5px] text-[#8c9196]">Errors (RED)</div>
          </div>

          <div className="rounded-xl border border-[#e3e3e3] bg-white p-4 shadow-xs">
            <span className="text-[11.5px] font-semibold uppercase tracking-wider text-[#616161]">Host CPU</span>
            <div className="mt-1 text-[24px] font-semibold tracking-tight text-[#1a1a1a] leading-none">
              {loading ? "—" : `${overview?.goldenSignals.cpuUsagePercent ?? 0}%`}
            </div>
            <div className="mt-2 text-[11.5px] text-[#8c9196]">{resources?.cpuCount ?? 1} Cores</div>
          </div>

          <div className="rounded-xl border border-[#e3e3e3] bg-white p-4 shadow-xs">
            <span className="text-[11.5px] font-semibold uppercase tracking-wider text-[#616161]">Host RAM</span>
            <div className="mt-1 text-[24px] font-semibold tracking-tight text-[#1a1a1a] leading-none">
              {loading ? "—" : `${overview?.goldenSignals.memoryUsagePercent ?? 0}%`}
            </div>
            <div className="mt-2 text-[11.5px] text-[#8c9196]">{resources ? formatBytes(resources.usedMemoryBytes) : "—"}</div>
          </div>
        </section>

        {/* ══ Row 2 — Dual Shadcn/Recharts Charts (Live Area Stream + Latency Percentiles Bar) ══ */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Chart 1: Live Area Throughput & Latency Trend */}
          <div className="overflow-hidden rounded-xl border border-[#e3e3e3] bg-white p-5 shadow-xs flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-[14px] font-semibold text-[#1a1a1a]">Live Throughput & Latency Stream</h3>
                <p className="text-[12px] text-[#8c9196]">Continuous time series tracking requests/sec and duration</p>
              </div>
              <div className="flex items-center gap-3 text-[11.5px]">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#008060]" />
                  <span className="text-[#616161]">Throughput (req/s)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#7c3aed]" />
                  <span className="text-[#616161]">p95 Latency (ms)</span>
                </div>
              </div>
            </div>

            <div className="h-[240px] w-full">
              {timeline.length < 2 ? (
                <div className="flex h-full items-center justify-center text-xs text-[#8c9196] italic">
                  Sampling real-time requests...
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
                <h3 className="text-[14px] font-semibold text-[#1a1a1a]">Latency Percentile Distribution</h3>
                <p className="text-[12px] text-[#8c9196]">Duration metrics in milliseconds across all routes</p>
              </div>
              <span className="text-[11.5px] font-medium text-[#7c3aed] bg-[#f3f0ff] px-2.5 py-1 rounded-md">
                Active 5-min window
              </span>
            </div>

            <div className="h-[240px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={latencyBarData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f1f1" />
                  <XAxis dataKey="percentile" tick={{ fontSize: 11, fill: "#616161" }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#8c9196" }} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      borderColor: "#e3e3e3",
                      borderRadius: "10px",
                      fontSize: "12px",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                    }}
                    formatter={(val) => [`${val} ms`, "Duration"]}
                  />
                  <Bar dataKey="duration" radius={[6, 6, 0, 0]}>
                    {latencyBarData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* ══ Row 3 — Status Breakdown Donut & System Resource Gauges ══ */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Donut Chart: HTTP Status Breakdown */}
          <div className="overflow-hidden rounded-xl border border-[#e3e3e3] bg-white p-5 shadow-xs flex flex-col">
            <h3 className="text-[14px] font-semibold text-[#1a1a1a] mb-0.5">HTTP Status Codes</h3>
            <p className="text-[12px] text-[#8c9196] mb-3">Total: {overview?.statusCodes.total ?? 0} requests</p>

            <div className="h-[180px] w-full relative">
              {statusPieData.length === 0 ? (
                <div className="flex h-full items-center justify-center text-xs text-[#8c9196] italic">
                  Awaiting request traffic...
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
                      {statusPieData.map((entry, idx) => (
                        <Cell key={`slice-${idx}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#ffffff",
                        borderColor: "#e3e3e3",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 mt-2 pt-3 border-t border-[#f1f1f1] text-[12px]">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#008060]" />
                <span className="text-[#616161]">2xx:</span>
                <span className="font-semibold text-[#1a1a1a]">{overview?.statusCodes.status2xx ?? 0}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#0ea5e9]" />
                <span className="text-[#616161]">3xx:</span>
                <span className="font-semibold text-[#1a1a1a]">{overview?.statusCodes.status3xx ?? 0}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#f59e0b]" />
                <span className="text-[#616161]">4xx:</span>
                <span className="font-semibold text-[#1a1a1a]">{overview?.statusCodes.status4xx ?? 0}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#dc2626]" />
                <span className="text-[#616161]">5xx:</span>
                <span className="font-semibold text-[#1a1a1a]">{overview?.statusCodes.status5xx ?? 0}</span>
              </div>
            </div>
          </div>

          {/* Hardware CPU Gauge & Memory Meter */}
          <div className="overflow-hidden rounded-xl border border-[#e3e3e3] bg-white p-5 shadow-xs flex flex-col lg:col-span-2">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-[14px] font-semibold text-[#1a1a1a]">Host Hardware & Resource Saturation (USE)</h3>
                <p className="text-[12px] text-[#8c9196]">{resources?.platform} · Node {resources?.nodeVersion}</p>
              </div>
              <span className="text-[12px] font-mono font-medium text-[#616161] bg-[#f7f7f7] px-2.5 py-1 rounded-md border border-[#e3e3e3]">
                Uptime: {resources ? formatUptime(resources.uptimeSeconds) : "—"}
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 mt-3">
              {/* CPU Meter */}
              <div className="rounded-xl border border-[#e3e3e3] bg-[#fafafa] p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-semibold uppercase text-[#616161]">CPU Utilization</span>
                  <span className={`text-[15px] font-bold ${
                    (resources?.cpuUsagePercent ?? 0) >= 75 ? "text-[#d97706]" : "text-[#1a1a1a]"
                  }`}>
                    {resources?.cpuUsagePercent ?? 0}%
                  </span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#e3e3e3]">
                  <div
                    style={{ width: `${resources?.cpuUsagePercent ?? 0}%` }}
                    className={`h-full rounded-full transition-all ${
                      (resources?.cpuUsagePercent ?? 0) >= 75 ? "bg-[#d97706]" : "bg-[#008060]"
                    }`}
                  />
                </div>
                <span className="text-[11.5px] text-[#8c9196] block">
                  Alert threshold: &gt;75% warning, &gt;90% critical
                </span>
              </div>

              {/* Memory Meter */}
              <div className="rounded-xl border border-[#e3e3e3] bg-[#fafafa] p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-semibold uppercase text-[#616161]">RAM Utilization</span>
                  <span className={`text-[15px] font-bold ${
                    (resources?.memoryUsagePercent ?? 0) >= 80 ? "text-[#d97706]" : "text-[#1a1a1a]"
                  }`}>
                    {resources?.memoryUsagePercent ?? 0}%
                  </span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#e3e3e3]">
                  <div
                    style={{ width: `${resources?.memoryUsagePercent ?? 0}%` }}
                    className={`h-full rounded-full transition-all ${
                      (resources?.memoryUsagePercent ?? 0) >= 80 ? "bg-[#d97706]" : "bg-[#008060]"
                    }`}
                  />
                </div>
                <div className="flex justify-between text-[11.5px] text-[#8c9196]">
                  <span>Used: {resources ? formatBytes(resources.usedMemoryBytes) : "—"}</span>
                  <span>Total: {resources ? formatBytes(resources.totalMemoryBytes) : "—"}</span>
                </div>
              </div>
            </div>

            {/* Node Process Heap summary */}
            <div className="mt-4 pt-3 border-t border-[#f1f1f1] grid grid-cols-3 gap-2 text-center text-[12px]">
              <div>
                <span className="text-[#8c9196] block text-[11px]">RSS Memory</span>
                <span className="font-semibold text-[#1a1a1a]">{resources ? formatBytes(resources.processMemory.rssBytes) : "—"}</span>
              </div>
              <div>
                <span className="text-[#8c9196] block text-[11px]">Heap Used</span>
                <span className="font-semibold text-[#1a1a1a]">{resources ? formatBytes(resources.processMemory.heapUsedBytes) : "—"}</span>
              </div>
              <div>
                <span className="text-[#8c9196] block text-[11px]">Heap Allocated</span>
                <span className="font-semibold text-[#616161]">{resources ? formatBytes(resources.processMemory.heapTotalBytes) : "—"}</span>
              </div>
            </div>
          </div>
        </section>

        {/* ══ Collapsible Section 1: Detailed Route Telemetry Table ══ */}
        <section className="overflow-hidden rounded-xl border border-[#e3e3e3] bg-white shadow-xs">
          <div
            onClick={() => setApiOpen((v) => !v)}
            className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e3e3e3] px-4 py-3 cursor-pointer bg-[#fafafa] hover:bg-[#f7f7f7] transition"
          >
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white border border-[#e3e3e3] text-[#303030] shadow-2xs">
                ⚡
              </span>
              <div>
                <span className="text-[14px] font-semibold text-[#1a1a1a]">
                  Active Routes & Telemetry Drill-Down
                </span>
                <span className="ml-2 text-[12px] text-[#8c9196]">
                  Method, latency percentiles, and error counts per route
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <svg
                viewBox="0 0 16 16"
                fill="none"
                className={`h-4 w-4 text-[#616161] transition-transform ${apiOpen ? "rotate-180" : ""}`}
              >
                <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>

          {apiOpen && (
            <div className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <span className="text-[12px] text-[#8c9196]">
                  Showing {filteredRoutes.length} active routes
                </span>

                <div className="relative">
                  <svg
                    width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"
                    className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8c9196]"
                  >
                    <circle cx="7" cy="7" r="4.5" />
                    <path d="m10.5 10.5 3 3" strokeLinecap="round" />
                  </svg>
                  <input
                    type="text"
                    value={routeSearch}
                    onChange={(e) => setRouteSearch(e.target.value)}
                    placeholder="Search routes…"
                    className="h-8 w-56 rounded-lg border border-[#d4d4d4] bg-white pl-8 pr-3 text-[12.5px] text-[#303030] placeholder-[#8c9196] outline-none focus:border-[#1a1a1a] focus:ring-1 focus:ring-[#1a1a1a]"
                  />
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-[#e3e3e3]">
                <table className="w-full text-left text-[12.5px]">
                  <thead>
                    <tr className="border-b border-[#e3e3e3] bg-[#fafafa] text-[#616161]">
                      <th className="px-4 py-2.5 font-medium">Method & Route Path</th>
                      <th className="px-4 py-2.5 text-right font-medium">Calls</th>
                      <th className="px-4 py-2.5 text-right font-medium">Avg Latency</th>
                      <th className="px-4 py-2.5 text-right font-medium">p95 Latency</th>
                      <th className="px-4 py-2.5 text-right font-medium">Errors</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f1f1f1]">
                    {filteredRoutes.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-10 text-center text-[#8c9196] italic">
                          No matching routes recorded.
                        </td>
                      </tr>
                    ) : (
                      filteredRoutes.map((r, i) => (
                        <tr key={i} className="hover:bg-[#f7f7f7] transition-colors">
                          <td className="px-4 py-2.5 font-mono">
                            <span className={`inline-block w-14 text-[10.5px] font-bold ${
                              r.method === "GET"
                                ? "text-[#008060]"
                                : r.method === "POST"
                                  ? "text-[#0284c7]"
                                  : r.method === "PATCH" || r.method === "PUT"
                                    ? "text-[#d97706]"
                                    : "text-[#dc2626]"
                            }`}>
                              {r.method}
                            </span>
                            <span className="text-[#1a1a1a]">{r.path}</span>
                          </td>
                          <td className="px-4 py-2.5 text-right font-medium text-[#1a1a1a]">{r.count}</td>
                          <td className="px-4 py-2.5 text-right text-[#616161]">{r.avgDurationMs} ms</td>
                          <td className="px-4 py-2.5 text-right text-[#7c3aed] font-medium">{r.p95DurationMs} ms</td>
                          <td className="px-4 py-2.5 text-right">
                            {r.errorCount > 0 ? (
                              <span className="inline-flex rounded-full bg-[#ffe5e5] px-2 py-0.5 text-[11px] font-bold text-[#b30000]">
                                {r.errorCount}
                              </span>
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
          )}
        </section>

        {/* ══ Collapsible Section 2: Faults & Unhandled Server Errors ══ */}
        <section className="overflow-hidden rounded-xl border border-[#e3e3e3] bg-white shadow-xs">
          <div
            onClick={() => setFaultsOpen((v) => !v)}
            className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e3e3e3] px-4 py-3 cursor-pointer bg-[#fafafa] hover:bg-[#f7f7f7] transition"
          >
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white border border-[#e3e3e3] text-[#303030] shadow-2xs">
                ⚠️
              </span>
              <div>
                <span className="text-[14px] font-semibold text-[#1a1a1a]">
                  Recent Faults & Unhandled Server Errors
                </span>
                <span className="ml-2 text-[12px] text-[#8c9196]">
                  5xx exceptions, critical rejections, and error traces
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <svg
                viewBox="0 0 16 16"
                fill="none"
                className={`h-4 w-4 text-[#616161] transition-transform ${faultsOpen ? "rotate-180" : ""}`}
              >
                <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>

          {faultsOpen && (
            <div className="p-5">
              {!overview || overview.recentErrors.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[#e3e3e3] p-8 text-center bg-[#fafafa]">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#edfcf3] text-[#008060] mb-2 font-bold text-base">
                    ✓
                  </span>
                  <p className="font-semibold text-[#1a1a1a] text-[13px]">Clean Telemetry: Zero 5xx exceptions</p>
                  <p className="text-[12px] text-[#8c9196] mt-0.5">All services are executing without unhandled faults.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-[#8c9196]">
                      Showing {filteredErrors.length} recent error traces
                    </span>
                    <input
                      type="text"
                      value={errorSearch}
                      onChange={(e) => setErrorSearch(e.target.value)}
                      placeholder="Filter error traces…"
                      className="h-8 w-56 rounded-lg border border-[#d4d4d4] bg-white px-3 text-[12px] text-[#303030] outline-none focus:border-[#1a1a1a]"
                    />
                  </div>

                  <div className="divide-y divide-[#f1f1f1] rounded-xl border border-[#e3e3e3] overflow-hidden">
                    {filteredErrors.map((err, i) => (
                      <div key={i} className="p-3.5 hover:bg-[#fff9f9] transition-colors text-[12.5px]">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="rounded-md bg-[#ffe5e5] px-2 py-0.5 text-[11px] font-bold text-[#b30000]">
                              {err.statusCode}
                            </span>
                            <span className="font-mono font-semibold text-[#1a1a1a]">
                              {err.method} {err.path}
                            </span>
                          </div>
                          <span className="text-[11.5px] text-[#8c9196] font-mono">
                            {new Date(err.timestamp).toLocaleTimeString()} ({err.durationMs}ms)
                          </span>
                        </div>
                        {err.errorMessage && (
                          <pre className="mt-2 font-mono text-[11px] text-[#8a1c14] bg-[#fff4f4] border border-[#fed3d1] p-2.5 rounded-lg whitespace-pre-wrap">
                            {err.errorMessage}
                          </pre>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* ══ Collapsible Section 3: Subsystems & Dependencies Health ══ */}
        <section className="overflow-hidden rounded-xl border border-[#e3e3e3] bg-white shadow-xs">
          <div
            onClick={() => setSubsystemsOpen((v) => !v)}
            className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e3e3e3] px-4 py-3 cursor-pointer bg-[#fafafa] hover:bg-[#f7f7f7] transition"
          >
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white border border-[#e3e3e3] text-[#303030] shadow-2xs">
                📦
              </span>
              <div>
                <span className="text-[14px] font-semibold text-[#1a1a1a]">
                  Subsystems & Dependencies Health
                </span>
                <span className="ml-2 text-[12px] text-[#8c9196]">
                  PostgreSQL connection latency, AI gateways, and cloud storage
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <svg
                viewBox="0 0 16 16"
                fill="none"
                className={`h-4 w-4 text-[#616161] transition-transform ${subsystemsOpen ? "rotate-180" : ""}`}
              >
                <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>

          {subsystemsOpen && overview && (
            <div className="p-5">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-[#e3e3e3] p-4 bg-[#fafafa]">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-semibold text-[#1a1a1a] text-[13px]">PostgreSQL Database</span>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${
                      overview.database.status === "CONNECTED"
                        ? "bg-[#edfcf3] text-[#008060]"
                        : "bg-[#ffe5e5] text-[#b30000]"
                    }`}>
                      {overview.database.status}
                    </span>
                  </div>
                  <div className="text-[12px] text-[#616161]">
                    Ping Latency: <strong className="text-[#1a1a1a]">{overview.database.latencyMs} ms</strong>
                  </div>
                </div>

                <div className="rounded-xl border border-[#e3e3e3] p-4 bg-[#fafafa]">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-semibold text-[#1a1a1a] text-[13px]">AI Gateway (Groq / Gemini)</span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#edfcf3] px-2 py-0.5 text-[10.5px] font-semibold text-[#008060]">
                      OPERATIONAL
                    </span>
                  </div>
                  <div className="text-[12px] text-[#616161]">
                    Dual Fallback: Llama 3.3 70B & Gemini
                  </div>
                </div>

                <div className="rounded-xl border border-[#e3e3e3] p-4 bg-[#fafafa]">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-semibold text-[#1a1a1a] text-[13px]">Media & Object Storage</span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#edfcf3] px-2 py-0.5 text-[10.5px] font-semibold text-[#008060]">
                      CONNECTED
                    </span>
                  </div>
                  <div className="text-[12px] text-[#616161]">
                    Cloudflare R2 & Local Adapter
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
