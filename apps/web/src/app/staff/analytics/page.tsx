"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

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
  const s = seconds % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${s}s`;
}

export default function StaffMonitoringPage() {
  const router = useRouter();

  const [token, setToken] = useState<string | null>(null);
  const [overview, setOverview] = useState<MonitoringOverview | null>(null);
  const [apiMetrics, setApiMetrics] = useState<ApiMetricsResponse | null>(null);
  const [resources, setResources] = useState<SystemResourceMetrics | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<number>(10); // in seconds, 0 = off

  // Collapsible section states
  const [infraOpen, setInfraOpen] = useState(true);
  const [apiOpen, setApiOpen] = useState(true);
  const [faultsOpen, setFaultsOpen] = useState(true);
  const [subsystemsOpen, setSubsystemsOpen] = useState(true);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  async function loadData(t: string, silent = false) {
    if (!silent) setLoading(true);
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
      setLastRefreshedAt(new Date());
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
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    const activeToken = getStaffAccessToken();
    if (!activeToken) {
      router.replace("/staff/login");
      return;
    }
    setToken(activeToken);
    loadData(activeToken);
  }, []);

  // Handle auto-refresh interval
  useEffect(() => {
    if (!token || autoRefreshInterval <= 0) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      loadData(token, true);
    }, autoRefreshInterval * 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [token, autoRefreshInterval]);

  const statusColor =
    overview?.status === "CRITICAL"
      ? "bg-red-50 text-red-700 border-red-200"
      : overview?.status === "DEGRADED"
        ? "bg-amber-50 text-amber-800 border-amber-200"
        : "bg-emerald-50 text-emerald-800 border-emerald-200";

  const statusDot =
    overview?.status === "CRITICAL"
      ? "bg-red-500 animate-pulse"
      : overview?.status === "DEGRADED"
        ? "bg-amber-500"
        : "bg-emerald-500";

  return (
    <div className="min-h-screen bg-white text-[13px] text-[#303030]">
      <div className="mx-auto max-w-[1300px] px-6 pt-5 pb-12">
        {/* Top Bar / Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white border border-[#e3e3e3] text-[#303030] shadow-xs">
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M4 16V9M10 16V4M16 16v-5" strokeLinecap="round" />
              </svg>
            </span>
            <div>
              <h1 className="text-[20px] font-semibold text-[#1a1a1a] leading-tight">
                System Monitoring & Observability
              </h1>
              <p className="text-[12px] text-neutral-500">
                Live RED & USE metrics, host resource utilization, and fault detection
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Health Badge */}
            {overview && (
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold border ${statusColor}`}>
                <span className={`h-2 w-2 rounded-full ${statusDot}`} />
                {overview.status}
              </span>
            )}

            {/* Auto-refresh selector */}
            <div className="flex items-center gap-1.5 rounded-lg border border-[#d4d4d4] bg-white px-2.5 py-1 text-[12px] text-neutral-700">
              <span className="text-neutral-500">Refresh:</span>
              <select
                value={autoRefreshInterval}
                onChange={(e) => setAutoRefreshInterval(Number(e.target.value))}
                className="bg-transparent font-medium outline-none cursor-pointer"
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
              onClick={() => token && loadData(token)}
              disabled={loading}
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-[#d4d4d4] bg-white px-3 text-[13px] font-medium text-[#303030] shadow-xs hover:bg-[#f7f7f7] disabled:opacity-50"
            >
              <svg viewBox="0 0 16 16" fill="none" className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}>
                <path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9M13.5 3v3h-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Error Notice */}
        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700" role="alert">
            <svg viewBox="0 0 20 20" fill="currentColor" className="mt-0.5 h-4 w-4 shrink-0">
              <path fillRule="evenodd" d="M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16ZM9 5.75a1 1 0 0 1 2 0v4.5a1 1 0 0 1-2 0v-4.5Zm1 8.5a1.125 1.125 0 1 0 0-2.25 1.125 1.125 0 0 0 0 2.25Z" clipRule="evenodd" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Active Alert Banners (if any) */}
        {overview && overview.activeAlerts.length > 0 && (
          <div className="mb-5 space-y-2">
            {overview.activeAlerts.map((alert) => {
              const isCrit = alert.severity === "CRITICAL";
              return (
                <div
                  key={alert.id}
                  className={`flex items-start gap-3 rounded-xl border p-3.5 ${
                    isCrit ? "bg-red-50/80 border-red-200 text-red-900" : "bg-amber-50/80 border-amber-200 text-amber-900"
                  }`}
                >
                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${
                    isCrit ? "bg-red-600" : "bg-amber-500"
                  }`}>
                    !
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-[13px]">{alert.title}</h4>
                      <span className="rounded bg-white/70 px-1.5 py-0.2 text-[10px] font-mono uppercase tracking-wider">
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

        {/* -------------------- 1. Golden Signals Summary Cards -------------------- */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 mb-6">
          {/* Card: Throughput */}
          <div className="rounded-xl border border-neutral-200 bg-white p-3.5 shadow-2xs">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Throughput</span>
            <p className="mt-1 text-2xl font-bold text-neutral-900">
              {overview?.goldenSignals.throughputRps ?? 0} <span className="text-xs font-normal text-neutral-500">req/s</span>
            </p>
            <span className="mt-1 block text-[11px] text-neutral-500">60s sliding window</span>
          </div>

          {/* Card: Avg Latency */}
          <div className="rounded-xl border border-neutral-200 bg-white p-3.5 shadow-2xs">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Avg Duration</span>
            <p className="mt-1 text-2xl font-bold text-neutral-900">
              {overview?.goldenSignals.avgLatencyMs ?? 0} <span className="text-xs font-normal text-neutral-500">ms</span>
            </p>
            <span className="mt-1 block text-[11px] text-neutral-500">Across active endpoints</span>
          </div>

          {/* Card: p95 Latency */}
          <div className="rounded-xl border border-neutral-200 bg-white p-3.5 shadow-2xs">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">p95 Latency</span>
            <p className="mt-1 text-2xl font-bold text-indigo-600">
              {overview?.goldenSignals.p95LatencyMs ?? 0} <span className="text-xs font-normal text-neutral-500">ms</span>
            </p>
            <span className="mt-1 block text-[11px] text-neutral-500">95% faster than this</span>
          </div>

          {/* Card: Error Rate */}
          <div className="rounded-xl border border-neutral-200 bg-white p-3.5 shadow-2xs">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Error Rate</span>
            <p className={`mt-1 text-2xl font-bold ${
              (overview?.goldenSignals.errorRatePercent ?? 0) > 5 ? "text-red-600" : "text-emerald-700"
            }`}>
              {overview?.goldenSignals.errorRatePercent ?? 0}%
            </p>
            <span className="mt-1 block text-[11px] text-neutral-500">4xx + 5xx failures</span>
          </div>

          {/* Card: Host CPU */}
          <div className="rounded-xl border border-neutral-200 bg-white p-3.5 shadow-2xs">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Host CPU</span>
            <p className={`mt-1 text-2xl font-bold ${
              (overview?.goldenSignals.cpuUsagePercent ?? 0) >= 75 ? "text-amber-600" : "text-neutral-900"
            }`}>
              {overview?.goldenSignals.cpuUsagePercent ?? 0}%
            </p>
            <span className="mt-1 block text-[11px] text-neutral-500">{resources?.cpuCount ?? 1} Cores</span>
          </div>

          {/* Card: RAM Usage */}
          <div className="rounded-xl border border-neutral-200 bg-white p-3.5 shadow-2xs">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">System RAM</span>
            <p className={`mt-1 text-2xl font-bold ${
              (overview?.goldenSignals.memoryUsagePercent ?? 0) >= 80 ? "text-amber-600" : "text-neutral-900"
            }`}>
              {overview?.goldenSignals.memoryUsagePercent ?? 0}%
            </p>
            <span className="mt-1 block text-[11px] text-neutral-500">
              {resources ? formatBytes(resources.usedMemoryBytes) : "—"} used
            </span>
          </div>
        </div>

        {/* -------------------- 2. Collapsible: API & Route Telemetry (RED Method) -------------------- */}
        <section className="rounded-xl border border-neutral-200 bg-white shadow-xs overflow-hidden mb-5">
          <button
            type="button"
            onClick={() => setApiOpen((v) => !v)}
            className="w-full flex items-center justify-between border-b border-neutral-200 bg-[#f7f7f7] px-5 py-3 text-left transition hover:bg-neutral-100"
          >
            <div className="flex items-center gap-2.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-white border border-neutral-200 text-neutral-700 text-xs font-semibold">
                ⚡
              </span>
              <div>
                <h3 className="font-semibold text-[14px] text-neutral-900">API Telemetry & Latency Percentiles (RED Method)</h3>
                <span className="text-[11px] text-neutral-500">Rate, Errors, and Duration across endpoints</span>
              </div>
            </div>
            <svg
              className={`h-4 w-4 text-neutral-500 transition-transform ${apiOpen ? "rotate-180" : ""}`}
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>

          {apiOpen && (
            <div className="p-5 space-y-6">
              {/* Status Code Distribution Bar */}
              <div>
                <h4 className="text-[12px] font-semibold text-neutral-700 uppercase tracking-wider mb-2">
                  Status Code Distribution (Last 5 Minutes)
                </h4>
                {overview && overview.statusCodes.total > 0 ? (
                  <div>
                    <div className="flex h-3 w-full overflow-hidden rounded-full bg-neutral-100">
                      <div
                        style={{ width: `${(overview.statusCodes.status2xx / overview.statusCodes.total) * 100}%` }}
                        className="bg-emerald-500 transition-all"
                        title={`2xx: ${overview.statusCodes.status2xx}`}
                      />
                      <div
                        style={{ width: `${(overview.statusCodes.status3xx / overview.statusCodes.total) * 100}%` }}
                        className="bg-sky-400 transition-all"
                        title={`3xx: ${overview.statusCodes.status3xx}`}
                      />
                      <div
                        style={{ width: `${(overview.statusCodes.status4xx / overview.statusCodes.total) * 100}%` }}
                        className="bg-amber-400 transition-all"
                        title={`4xx: ${overview.statusCodes.status4xx}`}
                      />
                      <div
                        style={{ width: `${(overview.statusCodes.status5xx / overview.statusCodes.total) * 100}%` }}
                        className="bg-red-500 transition-all"
                        title={`5xx: ${overview.statusCodes.status5xx}`}
                      />
                    </div>
                    <div className="mt-2.5 flex flex-wrap gap-4 text-[12px]">
                      <div className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                        <span className="font-medium text-neutral-800">2xx Success:</span>
                        <span className="text-neutral-500">{overview.statusCodes.status2xx}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-sky-400" />
                        <span className="font-medium text-neutral-800">3xx Redirect:</span>
                        <span className="text-neutral-500">{overview.statusCodes.status3xx}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                        <span className="font-medium text-neutral-800">4xx Client Fault:</span>
                        <span className="text-neutral-500">{overview.statusCodes.status4xx}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
                        <span className="font-medium text-neutral-800">5xx Server Error:</span>
                        <span className="text-neutral-500">{overview.statusCodes.status5xx}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-neutral-400 italic text-[12px]">No incoming requests recorded in this window yet.</p>
                )}
              </div>

              {/* Latency Percentiles Grid */}
              <div>
                <h4 className="text-[12px] font-semibold text-neutral-700 uppercase tracking-wider mb-2">
                  Latency Percentile Distribution
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 text-center">
                  <div className="rounded-lg border border-neutral-200 bg-neutral-50/50 p-2.5">
                    <span className="text-[11px] text-neutral-500 block font-medium">p50 (Median)</span>
                    <span className="text-base font-bold text-neutral-800">{apiMetrics?.latencyPercentiles.p50 ?? 0} ms</span>
                  </div>
                  <div className="rounded-lg border border-neutral-200 bg-neutral-50/50 p-2.5">
                    <span className="text-[11px] text-neutral-500 block font-medium">Average</span>
                    <span className="text-base font-bold text-neutral-800">{apiMetrics?.latencyPercentiles.avg ?? 0} ms</span>
                  </div>
                  <div className="rounded-lg border border-neutral-200 bg-neutral-50/50 p-2.5">
                    <span className="text-[11px] text-neutral-500 block font-medium">p90</span>
                    <span className="text-base font-bold text-indigo-600">{apiMetrics?.latencyPercentiles.p90 ?? 0} ms</span>
                  </div>
                  <div className="rounded-lg border border-neutral-200 bg-neutral-50/50 p-2.5">
                    <span className="text-[11px] text-neutral-500 block font-medium">p95</span>
                    <span className="text-base font-bold text-indigo-700">{apiMetrics?.latencyPercentiles.p95 ?? 0} ms</span>
                  </div>
                  <div className="rounded-lg border border-neutral-200 bg-neutral-50/50 p-2.5">
                    <span className="text-[11px] text-neutral-500 block font-medium">p99</span>
                    <span className="text-base font-bold text-purple-700">{apiMetrics?.latencyPercentiles.p99 ?? 0} ms</span>
                  </div>
                  <div className="rounded-lg border border-neutral-200 bg-neutral-50/50 p-2.5">
                    <span className="text-[11px] text-neutral-500 block font-medium">Max Duration</span>
                    <span className="text-base font-bold text-neutral-800">{apiMetrics?.latencyPercentiles.max ?? 0} ms</span>
                  </div>
                </div>
              </div>

              {/* Top Active Endpoints Table */}
              <div>
                <h4 className="text-[12px] font-semibold text-neutral-700 uppercase tracking-wider mb-2">
                  Top Active Routes & Response Times
                </h4>
                <div className="overflow-x-auto rounded-lg border border-neutral-200">
                  <table className="w-full text-left text-[12px]">
                    <thead className="bg-[#f7f7f7] text-neutral-600 border-b border-neutral-200 font-medium">
                      <tr>
                        <th className="px-3 py-2">Method & Route Path</th>
                        <th className="px-3 py-2 text-right">Requests</th>
                        <th className="px-3 py-2 text-right">Avg Latency</th>
                        <th className="px-3 py-2 text-right">p95 Latency</th>
                        <th className="px-3 py-2 text-right">Errors</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200">
                      {!apiMetrics || apiMetrics.topRoutes.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-3 py-6 text-center text-neutral-400 italic">
                            No route activity recorded yet.
                          </td>
                        </tr>
                      ) : (
                        apiMetrics.topRoutes.map((r, i) => (
                          <tr key={i} className="hover:bg-neutral-50 transition">
                            <td className="px-3 py-2 font-mono">
                              <span className={`inline-block w-12 text-[10px] font-bold ${
                                r.method === "GET"
                                  ? "text-blue-600"
                                  : r.method === "POST"
                                    ? "text-emerald-600"
                                    : r.method === "PATCH" || r.method === "PUT"
                                      ? "text-amber-600"
                                      : "text-red-600"
                              }`}>
                                {r.method}
                              </span>
                              <span className="text-neutral-800">{r.path}</span>
                            </td>
                            <td className="px-3 py-2 text-right font-medium text-neutral-900">{r.count}</td>
                            <td className="px-3 py-2 text-right text-neutral-700">{r.avgDurationMs} ms</td>
                            <td className="px-3 py-2 text-right text-indigo-600 font-medium">{r.p95DurationMs} ms</td>
                            <td className="px-3 py-2 text-right">
                              {r.errorCount > 0 ? (
                                <span className="inline-flex rounded bg-red-50 px-1.5 py-0.5 font-bold text-red-600">
                                  {r.errorCount}
                                </span>
                              ) : (
                                <span className="text-neutral-400">0</span>
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

        {/* -------------------- 3. Collapsible: Infrastructure & Host Resources (USE Method) -------------------- */}
        <section className="rounded-xl border border-neutral-200 bg-white shadow-xs overflow-hidden mb-5">
          <button
            type="button"
            onClick={() => setInfraOpen((v) => !v)}
            className="w-full flex items-center justify-between border-b border-neutral-200 bg-[#f7f7f7] px-5 py-3 text-left transition hover:bg-neutral-100"
          >
            <div className="flex items-center gap-2.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-white border border-neutral-200 text-neutral-700 text-xs font-semibold">
                🖥️
              </span>
              <div>
                <h3 className="font-semibold text-[14px] text-neutral-900">Infrastructure & Host Resources (USE Method)</h3>
                <span className="text-[11px] text-neutral-500">Utilization, Saturation, and Hardware Telemetry</span>
              </div>
            </div>
            <svg
              className={`h-4 w-4 text-neutral-500 transition-transform ${infraOpen ? "rotate-180" : ""}`}
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>

          {infraOpen && resources && (
            <div className="p-5 space-y-5">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {/* Host Environment */}
                <div className="rounded-lg border border-neutral-200 bg-neutral-50/60 p-3.5 space-y-1.5">
                  <span className="text-[11px] font-semibold uppercase text-neutral-500 block">Host Platform</span>
                  <div className="text-[13px] font-medium text-neutral-800">{resources.platform}</div>
                  <div className="text-[11px] text-neutral-500">Node runtime: {resources.nodeVersion}</div>
                  <div className="text-[11px] text-neutral-500">System Uptime: {formatUptime(resources.uptimeSeconds)}</div>
                </div>

                {/* Host Memory Details */}
                <div className="rounded-lg border border-neutral-200 bg-neutral-50/60 p-3.5 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase text-neutral-500">RAM Allocation</span>
                    <span className="font-bold text-[12px] text-neutral-800">{resources.memoryUsagePercent}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-200">
                    <div
                      style={{ width: `${resources.memoryUsagePercent}%` }}
                      className={`h-full rounded-full ${
                        resources.memoryUsagePercent >= 80 ? "bg-amber-500" : "bg-emerald-500"
                      }`}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-neutral-500">
                    <span>Used: {formatBytes(resources.usedMemoryBytes)}</span>
                    <span>Total: {formatBytes(resources.totalMemoryBytes)}</span>
                  </div>
                </div>

                {/* Node Process Memory */}
                <div className="rounded-lg border border-neutral-200 bg-neutral-50/60 p-3.5 space-y-1.5">
                  <span className="text-[11px] font-semibold uppercase text-neutral-500 block">Process Heap & RSS</span>
                  <div className="flex justify-between text-[12px]">
                    <span className="text-neutral-600">Resident Set (RSS):</span>
                    <span className="font-medium text-neutral-900">{formatBytes(resources.processMemory.rssBytes)}</span>
                  </div>
                  <div className="flex justify-between text-[12px]">
                    <span className="text-neutral-600">Heap Used:</span>
                    <span className="font-medium text-neutral-900">{formatBytes(resources.processMemory.heapUsedBytes)}</span>
                  </div>
                  <div className="flex justify-between text-[12px]">
                    <span className="text-neutral-600">Heap Allocated:</span>
                    <span className="font-medium text-neutral-500">{formatBytes(resources.processMemory.heapTotalBytes)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* -------------------- 4. Collapsible: Faults & Error Log Stream -------------------- */}
        <section className="rounded-xl border border-neutral-200 bg-white shadow-xs overflow-hidden mb-5">
          <button
            type="button"
            onClick={() => setFaultsOpen((v) => !v)}
            className="w-full flex items-center justify-between border-b border-neutral-200 bg-[#f7f7f7] px-5 py-3 text-left transition hover:bg-neutral-100"
          >
            <div className="flex items-center gap-2.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-white border border-neutral-200 text-neutral-700 text-xs font-semibold">
                ⚠️
              </span>
              <div>
                <h3 className="font-semibold text-[14px] text-neutral-900">Recent Faults & Unhandled Server Errors</h3>
                <span className="text-[11px] text-neutral-500">5xx exceptions and critical failures</span>
              </div>
            </div>
            <svg
              className={`h-4 w-4 text-neutral-500 transition-transform ${faultsOpen ? "rotate-180" : ""}`}
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>

          {faultsOpen && (
            <div className="p-5">
              {!overview || overview.recentErrors.length === 0 ? (
                <div className="rounded-lg border border-dashed border-neutral-200 p-8 text-center text-neutral-400">
                  <svg className="mx-auto h-8 w-8 text-emerald-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <p className="font-medium text-neutral-700">Clean Telemetry: No 5xx server faults detected</p>
                  <p className="text-[12px] text-neutral-400 mt-0.5">All services and routes are functioning within operational parameters.</p>
                </div>
              ) : (
                <div className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 overflow-hidden">
                  {overview.recentErrors.map((err, i) => (
                    <div key={i} className="p-3.5 hover:bg-red-50/30 transition text-[12px]">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="rounded bg-red-100 px-2 py-0.5 font-bold text-red-700">
                            {err.statusCode}
                          </span>
                          <span className="font-mono font-medium text-neutral-900">
                            {err.method} {err.path}
                          </span>
                        </div>
                        <span className="text-[11px] text-neutral-400 font-mono">
                          {new Date(err.timestamp).toLocaleTimeString()} ({err.durationMs}ms)
                        </span>
                      </div>
                      {err.errorMessage && (
                        <p className="mt-1 font-mono text-[11px] text-red-700 bg-red-50 p-2 rounded">
                          {err.errorMessage}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>

        {/* -------------------- 5. Collapsible: Subsystems & Database Health -------------------- */}
        <section className="rounded-xl border border-neutral-200 bg-white shadow-xs overflow-hidden">
          <button
            type="button"
            onClick={() => setSubsystemsOpen((v) => !v)}
            className="w-full flex items-center justify-between border-b border-neutral-200 bg-[#f7f7f7] px-5 py-3 text-left transition hover:bg-neutral-100"
          >
            <div className="flex items-center gap-2.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-white border border-neutral-200 text-neutral-700 text-xs font-semibold">
                📦
              </span>
              <div>
                <h3 className="font-semibold text-[14px] text-neutral-900">Subsystems & Database Health</h3>
                <span className="text-[11px] text-neutral-500">PostgreSQL connection pool, AI providers, and storage</span>
              </div>
            </div>
            <svg
              className={`h-4 w-4 text-neutral-500 transition-transform ${subsystemsOpen ? "rotate-180" : ""}`}
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>

          {subsystemsOpen && overview && (
            <div className="p-5">
              <div className="grid gap-3 sm:grid-cols-3">
                {/* Database Card */}
                <div className="rounded-lg border border-neutral-200 p-3.5 bg-neutral-50/50">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-neutral-900 text-[13px]">PostgreSQL Database</span>
                    <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-bold ${
                      overview.database.status === "CONNECTED"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-red-100 text-red-800"
                    }`}>
                      {overview.database.status}
                    </span>
                  </div>
                  <div className="text-[11px] text-neutral-500">
                    Ping Round-trip Latency: <strong className="text-neutral-800">{overview.database.latencyMs} ms</strong>
                  </div>
                </div>

                {/* AI Gateway Card */}
                <div className="rounded-lg border border-neutral-200 p-3.5 bg-neutral-50/50">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-neutral-900 text-[13px]">AI Gateway (Groq / Gemini)</span>
                    <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                      OPERATIONAL
                    </span>
                  </div>
                  <div className="text-[11px] text-neutral-500">
                    Dual Fallback: Groq Llama 3.3 70B & Google Gemini
                  </div>
                </div>

                {/* Object Storage Card */}
                <div className="rounded-lg border border-neutral-200 p-3.5 bg-neutral-50/50">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-neutral-900 text-[13px]">Media & Object Storage</span>
                    <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                      CONNECTED
                    </span>
                  </div>
                  <div className="text-[11px] text-neutral-500">
                    Local & Cloudflare R2 / S3 Storage Adapter
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Footer Note */}
        <div className="mt-4 text-right text-[11px] text-neutral-400">
          Telemetry synchronized at {lastRefreshedAt.toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}
