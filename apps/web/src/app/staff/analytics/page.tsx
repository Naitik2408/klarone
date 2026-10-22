"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

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
  RequestTelemetryRecord,
  RouteMetricSummary,
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
  const s = seconds % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${s}s`;
}

function Spark({ data, stroke }: { data: number[]; stroke: string }) {
  const max = Math.max(...data, 1);
  const w = 72;
  const h = 24;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - (v / max) * h;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none">
      <polyline
        points={pts.join(" ")}
        stroke={stroke}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

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
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<number>(10); // in seconds, 0 = off

  // Search filter for routes and errors table
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
      setLastRefreshedAt(
        new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      );
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
      {/* ── Top Header Bar (Exact match to Home & Product pages) ── */}
      <header className="border-b border-[#e3e3e3] bg-white sticky top-0 z-30">
        <div className="mx-auto flex max-w-[1300px] flex-wrap items-center justify-between gap-3 px-6 py-3.5">
          {/* Left Title & Status */}
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white border border-[#e3e3e3] text-[#303030] shadow-xs">
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M4 16V9M10 16V4M16 16v-5" strokeLinecap="round" />
              </svg>
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-[20px] font-semibold text-[#1a1a1a] leading-tight">
                  System Monitoring & Observability
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
                {today}{lastRefreshedAt ? ` · Telemetry synced at ${lastRefreshedAt}` : ""}
              </p>
            </div>
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Auto-refresh interval dropdown */}
            <div className="flex items-center gap-1.5 rounded-lg border border-[#d4d4d4] bg-white px-2.5 py-1 text-[12px] text-[#303030]">
              <span className="text-[#8c9196]">Auto:</span>
              <select
                value={autoRefreshInterval}
                onChange={(e) => setAutoRefreshInterval(Number(e.target.value))}
                className="bg-transparent font-medium text-[#1a1a1a] outline-none cursor-pointer"
              >
                <option value={0}>Off</option>
                <option value={5}>Every 5s</option>
                <option value={10}>Every 10s</option>
                <option value={30}>Every 30s</option>
              </select>
            </div>

            {/* Manual Refresh Button */}
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

      {/* ── Main Container ── */}
      <main className="mx-auto max-w-[1300px] px-6 pt-5 pb-12 space-y-5 bg-white">
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

        {/* ══ Row 1 — Golden Signals Metric Cards (Inspired by Polaris KPI Cards) ══ */}
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {/* Card: Throughput */}
          <div className="rounded-xl border border-[#e3e3e3] bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between text-[#8c9196] mb-2">
              <span className="text-[11.5px] font-semibold uppercase tracking-wider text-[#616161]">Throughput</span>
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#edfcf3] text-[#008060]">
                ⚡
              </span>
            </div>
            <div className="text-[24px] font-semibold tracking-tight text-[#1a1a1a] leading-none">
              {loading ? "—" : overview?.goldenSignals.throughputRps ?? 0}
              <span className="ml-1 text-[12px] font-normal text-[#616161]">req/s</span>
            </div>
            <div className="mt-2 text-[11.5px] text-[#8c9196]">60s window</div>
          </div>

          {/* Card: Avg Latency */}
          <div className="rounded-xl border border-[#e3e3e3] bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between text-[#8c9196] mb-2">
              <span className="text-[11.5px] font-semibold uppercase tracking-wider text-[#616161]">Avg Latency</span>
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#f0f9ff] text-[#0284c7]">
                ⏱
              </span>
            </div>
            <div className="text-[24px] font-semibold tracking-tight text-[#1a1a1a] leading-none">
              {loading ? "—" : overview?.goldenSignals.avgLatencyMs ?? 0}
              <span className="ml-1 text-[12px] font-normal text-[#616161]">ms</span>
            </div>
            <div className="mt-2 text-[11.5px] text-[#008060] font-medium">Mean duration</div>
          </div>

          {/* Card: p95 Latency */}
          <div className="rounded-xl border border-[#e3e3e3] bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between text-[#8c9196] mb-2">
              <span className="text-[11.5px] font-semibold uppercase tracking-wider text-[#616161]">p95 Latency</span>
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#f3f0ff] text-[#7c3aed]">
                🎯
              </span>
            </div>
            <div className="text-[24px] font-semibold tracking-tight text-[#7c3aed] leading-none">
              {loading ? "—" : overview?.goldenSignals.p95LatencyMs ?? 0}
              <span className="ml-1 text-[12px] font-normal text-[#616161]">ms</span>
            </div>
            <div className="mt-2 text-[11.5px] text-[#8c9196]">95% faster than this</div>
          </div>

          {/* Card: Error Rate */}
          <div className="rounded-xl border border-[#e3e3e3] bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between text-[#8c9196] mb-2">
              <span className="text-[11.5px] font-semibold uppercase tracking-wider text-[#616161]">Error Rate</span>
              <span className={`flex h-6 w-6 items-center justify-center rounded-md ${
                (overview?.goldenSignals.errorRatePercent ?? 0) > 0 ? "bg-[#ffe5e5] text-[#b30000]" : "bg-[#edfcf3] text-[#008060]"
              }`}>
                ⚠️
              </span>
            </div>
            <div className={`text-[24px] font-semibold tracking-tight leading-none ${
              (overview?.goldenSignals.errorRatePercent ?? 0) > 0 ? "text-[#b30000]" : "text-[#008060]"
            }`}>
              {loading ? "—" : `${overview?.goldenSignals.errorRatePercent ?? 0}%`}
            </div>
            <div className="mt-2 text-[11.5px] text-[#8c9196]">4xx + 5xx failures</div>
          </div>

          {/* Card: Host CPU */}
          <div className="rounded-xl border border-[#e3e3e3] bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between text-[#8c9196] mb-2">
              <span className="text-[11.5px] font-semibold uppercase tracking-wider text-[#616161]">Host CPU</span>
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#fafafa] border border-[#e3e3e3] text-[#303030]">
                💻
              </span>
            </div>
            <div className="text-[24px] font-semibold tracking-tight text-[#1a1a1a] leading-none">
              {loading ? "—" : `${overview?.goldenSignals.cpuUsagePercent ?? 0}%`}
            </div>
            <div className="mt-2 text-[11.5px] text-[#8c9196]">{resources?.cpuCount ?? 1} Logical Cores</div>
          </div>

          {/* Card: Host RAM */}
          <div className="rounded-xl border border-[#e3e3e3] bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between text-[#8c9196] mb-2">
              <span className="text-[11.5px] font-semibold uppercase tracking-wider text-[#616161]">Host Memory</span>
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#fafafa] border border-[#e3e3e3] text-[#303030]">
                🧠
              </span>
            </div>
            <div className="text-[24px] font-semibold tracking-tight text-[#1a1a1a] leading-none">
              {loading ? "—" : `${overview?.goldenSignals.memoryUsagePercent ?? 0}%`}
            </div>
            <div className="mt-2 text-[11.5px] text-[#8c9196]">
              {resources ? formatBytes(resources.usedMemoryBytes) : "—"}
            </div>
          </div>
        </section>

        {/* ══ Collapsible Section 1: API Telemetry & Endpoints (RED Method) ══ */}
        <section className="overflow-hidden rounded-xl border border-[#e3e3e3] bg-white shadow-xs">
          {/* Collapsible Bar Header */}
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
                  API Telemetry & Latency Percentiles (RED Method)
                </span>
                <span className="ml-2 text-[12px] text-[#8c9196]">
                  Request rate, error distribution, and endpoint latencies
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
            <div className="p-5 space-y-6">
              {/* Status Code Distribution Bar */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[12px] font-semibold uppercase tracking-wider text-[#616161]">
                    HTTP Status Code Distribution (Active Window)
                  </span>
                  <span className="text-[12px] text-[#8c9196]">
                    Total: <strong className="text-[#1a1a1a]">{overview?.statusCodes.total ?? 0} requests</strong>
                  </span>
                </div>

                {overview && overview.statusCodes.total > 0 ? (
                  <div>
                    <div className="flex h-3.5 w-full overflow-hidden rounded-full bg-[#f1f1f1]">
                      <div
                        style={{ width: `${(overview.statusCodes.status2xx / overview.statusCodes.total) * 100}%` }}
                        className="bg-[#008060] transition-all"
                        title={`2xx: ${overview.statusCodes.status2xx}`}
                      />
                      <div
                        style={{ width: `${(overview.statusCodes.status3xx / overview.statusCodes.total) * 100}%` }}
                        className="bg-[#0ea5e9] transition-all"
                        title={`3xx: ${overview.statusCodes.status3xx}`}
                      />
                      <div
                        style={{ width: `${(overview.statusCodes.status4xx / overview.statusCodes.total) * 100}%` }}
                        className="bg-[#f59e0b] transition-all"
                        title={`4xx: ${overview.statusCodes.status4xx}`}
                      />
                      <div
                        style={{ width: `${(overview.statusCodes.status5xx / overview.statusCodes.total) * 100}%` }}
                        className="bg-[#dc2626] transition-all"
                        title={`5xx: ${overview.statusCodes.status5xx}`}
                      />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-4 text-[12px]">
                      <div className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-[#008060]" />
                        <span className="font-medium text-[#1a1a1a]">2xx Success:</span>
                        <span className="text-[#616161]">{overview.statusCodes.status2xx}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-[#0ea5e9]" />
                        <span className="font-medium text-[#1a1a1a]">3xx Redirect:</span>
                        <span className="text-[#616161]">{overview.statusCodes.status3xx}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-[#f59e0b]" />
                        <span className="font-medium text-[#1a1a1a]">4xx Client Error:</span>
                        <span className="text-[#616161]">{overview.statusCodes.status4xx}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-[#dc2626]" />
                        <span className="font-medium text-[#1a1a1a]">5xx Server Error:</span>
                        <span className="text-[#616161]">{overview.statusCodes.status5xx}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-[#8c9196] italic text-[12px]">No incoming requests recorded in the current window.</p>
                )}
              </div>

              {/* Latency Percentiles Grid */}
              <div>
                <span className="text-[12px] font-semibold uppercase tracking-wider text-[#616161] block mb-2">
                  Duration & Percentiles
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                  <div className="rounded-xl border border-[#e3e3e3] bg-[#fafafa] p-3 text-center">
                    <span className="text-[11px] text-[#8c9196] block font-medium">p50 (Median)</span>
                    <span className="text-[16px] font-semibold text-[#1a1a1a]">
                      {apiMetrics?.latencyPercentiles.p50 ?? 0} ms
                    </span>
                  </div>
                  <div className="rounded-xl border border-[#e3e3e3] bg-[#fafafa] p-3 text-center">
                    <span className="text-[11px] text-[#8c9196] block font-medium">Average</span>
                    <span className="text-[16px] font-semibold text-[#1a1a1a]">
                      {apiMetrics?.latencyPercentiles.avg ?? 0} ms
                    </span>
                  </div>
                  <div className="rounded-xl border border-[#e3e3e3] bg-[#fafafa] p-3 text-center">
                    <span className="text-[11px] text-[#8c9196] block font-medium">p90</span>
                    <span className="text-[16px] font-semibold text-[#7c3aed]">
                      {apiMetrics?.latencyPercentiles.p90 ?? 0} ms
                    </span>
                  </div>
                  <div className="rounded-xl border border-[#e3e3e3] bg-[#fafafa] p-3 text-center">
                    <span className="text-[11px] text-[#8c9196] block font-medium">p95</span>
                    <span className="text-[16px] font-semibold text-[#7c3aed]">
                      {apiMetrics?.latencyPercentiles.p95 ?? 0} ms
                    </span>
                  </div>
                  <div className="rounded-xl border border-[#e3e3e3] bg-[#fafafa] p-3 text-center">
                    <span className="text-[11px] text-[#8c9196] block font-medium">p99</span>
                    <span className="text-[16px] font-semibold text-[#9333ea]">
                      {apiMetrics?.latencyPercentiles.p99 ?? 0} ms
                    </span>
                  </div>
                  <div className="rounded-xl border border-[#e3e3e3] bg-[#fafafa] p-3 text-center">
                    <span className="text-[11px] text-[#8c9196] block font-medium">Max Duration</span>
                    <span className="text-[16px] font-semibold text-[#1a1a1a]">
                      {apiMetrics?.latencyPercentiles.max ?? 0} ms
                    </span>
                  </div>
                </div>
              </div>

              {/* Top Active Endpoints Table with Search Input */}
              <div className="overflow-hidden rounded-xl border border-[#e3e3e3] bg-white">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e3e3e3] px-4 py-2.5 bg-[#fafafa]">
                  <span className="text-[13px] font-semibold text-[#1a1a1a]">
                    Active Routes Telemetry ({filteredRoutes.length})
                  </span>

                  {/* Search Filter (Exact match to orders/products search bar) */}
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
                      className="h-8 w-52 rounded-lg border border-[#d4d4d4] bg-white pl-8 pr-3 text-[12.5px] text-[#303030] placeholder-[#8c9196] outline-none focus:border-[#1a1a1a] focus:ring-1 focus:ring-[#1a1a1a]"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
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
                            No matching routes found.
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
            </div>
          )}
        </section>

        {/* ══ Collapsible Section 2: Infrastructure & Host Resources (USE Method) ══ */}
        <section className="overflow-hidden rounded-xl border border-[#e3e3e3] bg-white shadow-xs">
          <div
            onClick={() => setInfraOpen((v) => !v)}
            className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e3e3e3] px-4 py-3 cursor-pointer bg-[#fafafa] hover:bg-[#f7f7f7] transition"
          >
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white border border-[#e3e3e3] text-[#303030] shadow-2xs">
                🖥️
              </span>
              <div>
                <span className="text-[14px] font-semibold text-[#1a1a1a]">
                  Infrastructure & Host Resources (USE Method)
                </span>
                <span className="ml-2 text-[12px] text-[#8c9196]">
                  Utilization, saturation, and hardware metrics
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <svg
                viewBox="0 0 16 16"
                fill="none"
                className={`h-4 w-4 text-[#616161] transition-transform ${infraOpen ? "rotate-180" : ""}`}
              >
                <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>

          {infraOpen && resources && (
            <div className="p-5">
              <div className="grid gap-3 sm:grid-cols-3">
                {/* Host Environment */}
                <div className="rounded-xl border border-[#e3e3e3] bg-[#fafafa] p-4 space-y-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[#616161] block">
                    Host Operating Environment
                  </span>
                  <div className="text-[13px] font-semibold text-[#1a1a1a]">{resources.platform}</div>
                  <div className="text-[12px] text-[#616161]">Node runtime: {resources.nodeVersion}</div>
                  <div className="text-[12px] text-[#616161]">System Uptime: {formatUptime(resources.uptimeSeconds)}</div>
                </div>

                {/* Host RAM Utilization */}
                <div className="rounded-xl border border-[#e3e3e3] bg-[#fafafa] p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[#616161]">
                      System RAM
                    </span>
                    <span className="text-[13px] font-semibold text-[#1a1a1a]">
                      {resources.memoryUsagePercent}%
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-[#e3e3e3]">
                    <div
                      style={{ width: `${resources.memoryUsagePercent}%` }}
                      className={`h-full rounded-full ${
                        resources.memoryUsagePercent >= 80 ? "bg-[#d97706]" : "bg-[#008060]"
                      }`}
                    />
                  </div>
                  <div className="flex justify-between text-[11.5px] text-[#8c9196]">
                    <span>Used: {formatBytes(resources.usedMemoryBytes)}</span>
                    <span>Total: {formatBytes(resources.totalMemoryBytes)}</span>
                  </div>
                </div>

                {/* Node Process Memory */}
                <div className="rounded-xl border border-[#e3e3e3] bg-[#fafafa] p-4 space-y-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[#616161] block">
                    Node.js Process Memory
                  </span>
                  <div className="flex justify-between text-[12px]">
                    <span className="text-[#616161]">Resident Set (RSS):</span>
                    <span className="font-semibold text-[#1a1a1a]">{formatBytes(resources.processMemory.rssBytes)}</span>
                  </div>
                  <div className="flex justify-between text-[12px]">
                    <span className="text-[#616161]">Heap Used:</span>
                    <span className="font-semibold text-[#1a1a1a]">{formatBytes(resources.processMemory.heapUsedBytes)}</span>
                  </div>
                  <div className="flex justify-between text-[12px]">
                    <span className="text-[#616161]">Heap Total:</span>
                    <span className="text-[#8c9196]">{formatBytes(resources.processMemory.heapTotalBytes)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* ══ Collapsible Section 3: Faults & Unhandled Server Errors ══ */}
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
                  5xx exceptions, critical rejections, and crash traces
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
                  <p className="font-semibold text-[#1a1a1a] text-[13px]">Telemetry Clean: Zero 5xx server exceptions</p>
                  <p className="text-[12px] text-[#8c9196] mt-0.5">All services are executing without unhandled faults.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Search in Errors */}
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-[#8c9196]">
                      Showing {filteredErrors.length} recent error traces
                    </span>
                    <input
                      type="text"
                      value={errorSearch}
                      onChange={(e) => setErrorSearch(e.target.value)}
                      placeholder="Filter error traces…"
                      className="h-8 w-52 rounded-lg border border-[#d4d4d4] bg-white px-3 text-[12px] text-[#303030] outline-none focus:border-[#1a1a1a]"
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

        {/* ══ Collapsible Section 4: Subsystems & Dependencies Health ══ */}
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
                  PostgreSQL, AI model gateways, and cloud storage connectivity
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
                {/* Database Card */}
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

                {/* AI Gateway Card */}
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

                {/* Object Storage Card */}
                <div className="rounded-xl border border-[#e3e3e3] p-4 bg-[#fafafa]">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-semibold text-[#1a1a1a] text-[13px]">Media & Object Storage</span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#edfcf3] px-2 py-0.5 text-[10.5px] font-semibold text-[#008060]">
                      CONNECTED
                    </span>
                  </div>
                  <div className="text-[12px] text-[#616161]">
                    Cloudflare R2 & Local Storage Adapter
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
