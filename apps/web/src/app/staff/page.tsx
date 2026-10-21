"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  clearStaffAccessToken,
  getCurrentStaffProfile,
  getStaffAccessToken,
  type CurrentStaffProfile,
} from "../../lib/staff-auth-api";
import {
  getStaffProducts,
  StaffCatalogueApiError,
} from "../../lib/staff-catalogue-api";
import {
  getStaffOrders,
  getStaffDrafts,
  StaffOrdersApiError,
} from "../../lib/staff-orders-api";
import {
  getStaffCustomers,
  StaffCustomersApiError,
} from "../../lib/staff-customers-api";
import {
  getInventory,
  StaffInventoryApiError,
} from "../../lib/staff-inventory-api";

import type { StaffCatalogueProduct } from "../../types/staff-catalogue";
import type { StaffOrderListItem } from "../../types/staff-orders";
import type { StaffInventoryItem } from "../../types/staff-inventory";

/* ─────────── Types ─────────── */
type DashboardData = {
  products: StaffCatalogueProduct[];
  orders: StaffOrderListItem[];
  inventoryItems: StaffInventoryItem[];
  orderTotal: number;
  customerTotal: number;
  draftsTotal: number;
};

const EMPTY_DATA: DashboardData = {
  products: [],
  orders: [],
  inventoryItems: [],
  orderTotal: 0,
  customerTotal: 0,
  draftsTotal: 0,
};

/* ─────────── Helpers ─────────── */
function money(value: string | number, currency = "INR") {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return String(value);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currency || "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function customerName(order: StaffOrderListItem) {
  return (
    [
      order.customer.person.firstName,
      order.customer.person.middleName,
      order.customer.person.lastName,
    ]
      .filter(Boolean)
      .join(" ")
      .trim() || "Guest Customer"
  );
}

function timeAgo(isoDate: string) {
  const diff = Date.now() - new Date(isoDate).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

/* ─────────── SVG Sparkline ─────────── */
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

/* ─────────── Order Status Badge (matches orders page exactly) ─────────── */
function OrderStatusBadge({ status }: { status: string }) {
  const upper = (status || "").toUpperCase();

  if (
    upper === "CONFIRMED" ||
    upper === "OPEN" ||
    upper === "PENDING" ||
    upper === "PROCESSING"
  ) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#ffea8a] px-2 py-0.5 text-[11px] font-normal text-[#5c4b00]">
        <svg width="10" height="10" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="10" cy="10" r="7" />
        </svg>
        Open
      </span>
    );
  }
  if (upper === "CANCELLED") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#ffe5e5] px-2 py-0.5 text-[11px] font-normal text-[#b30000]">
        <svg width="10" height="10" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="10" cy="10" r="7" />
        </svg>
        Cancelled
      </span>
    );
  }
  if (upper === "SHIPPED") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e4f0d5] px-2 py-0.5 text-[11px] font-normal text-[#2b5914]">
        <svg width="10" height="10" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="10" cy="10" r="7" />
        </svg>
        Shipped
      </span>
    );
  }
  if (upper === "DELIVERED") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#cbf4c9] px-2 py-0.5 text-[11px] font-normal text-[#0e6245]">
        <svg width="10" height="10" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="10" cy="10" r="7" />
        </svg>
        Delivered
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f1f1f1] px-2 py-0.5 text-[11px] font-normal text-[#616161]">
      <svg width="10" height="10" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="10" cy="10" r="7" />
      </svg>
      {status}
    </span>
  );
}

/* ─────────── KPI Card ─────────── */
function KpiCard({
  label,
  value,
  sub,
  subColor,
  href,
  icon,
  iconBg,
  spark,
  sparkColor,
  loading,
}: {
  label: string;
  value: string | number;
  sub?: string;
  subColor?: string;
  href: string;
  icon: React.ReactNode;
  iconBg: string;
  spark?: number[];
  sparkColor?: string;
  loading?: boolean;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col gap-4 rounded-xl border border-[#e3e3e3] bg-white p-4 shadow-xs transition hover:border-[#c4c4c4] hover:shadow-sm"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${iconBg}`}>
            {icon}
          </span>
          <span className="text-[13px] font-medium text-[#303030]">{label}</span>
        </div>
        <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5 text-[#adadad] transition group-hover:text-[#616161]">
          <path d="M4.5 11.5 11.5 4.5M6 4.5h5.5V10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div className="flex items-end justify-between gap-2">
        <div>
          <div className="text-[26px] font-semibold tracking-tight text-[#1a1a1a] leading-none">
            {loading ? (
              <span className="inline-block h-7 w-20 animate-pulse rounded bg-[#f1f1f1]" />
            ) : (
              value
            )}
          </div>
          {sub && (
            <div className={`mt-1.5 text-[12px] font-medium ${subColor ?? "text-[#616161]"}`}>
              {sub}
            </div>
          )}
        </div>
        {spark && sparkColor && <Spark data={spark} stroke={sparkColor} />}
      </div>
    </Link>
  );
}

/* ─────────── Skeleton Table Rows ─────────── */
function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i} className="border-b border-[#f1f1f1]">
          <td className="px-4 py-3"><div className="h-3.5 w-20 animate-pulse rounded bg-[#f1f1f1]" /></td>
          <td className="px-4 py-3"><div className="h-3.5 w-28 animate-pulse rounded bg-[#f1f1f1]" /></td>
          <td className="px-4 py-3 text-right"><div className="ml-auto h-3.5 w-16 animate-pulse rounded bg-[#f1f1f1]" /></td>
          <td className="px-4 py-3 text-center"><div className="mx-auto h-3.5 w-6 animate-pulse rounded bg-[#f1f1f1]" /></td>
          <td className="px-4 py-3"><div className="h-3.5 w-16 animate-pulse rounded bg-[#f1f1f1]" /></td>
          <td className="px-4 py-3 text-right"><div className="ml-auto h-5 w-16 animate-pulse rounded-full bg-[#f1f1f1]" /></td>
        </tr>
      ))}
    </>
  );
}

/* ═══════════════════ Main Page ═══════════════════ */
export default function StaffDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData>(EMPTY_DATA);
  const [profile, setProfile] = useState<CurrentStaffProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  function canAccess(permissionCode: string): boolean {
    if (!profile) return false;
    if (profile.isSuperAdmin || profile.roles.includes("SUPER_ADMIN")) return true;
    return profile.permissions.includes(permissionCode);
  }

  async function loadDashboard(activeToken: string, quiet = false) {
    if (quiet) setRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      // 1. Get staff profile & permissions first
      const staffProfile = await getCurrentStaffProfile(activeToken);
      setProfile(staffProfile);

      const isSuper = staffProfile.isSuperAdmin || staffProfile.roles.includes("SUPER_ADMIN");
      const hasPerm = (code: string) => isSuper || staffProfile.permissions.includes(code);

      // 2. Fetch ONLY endpoints the staff member is authorized to access
      const promises: [
        Promise<any> | null, // products
        Promise<any> | null, // orders
        Promise<any> | null, // customers
        Promise<any> | null, // drafts
        Promise<any> | null, // inventory
      ] = [
        hasPerm("catalogue.read")
          ? getStaffProducts(activeToken, { search: "", status: "ALL" })
          : null,
        hasPerm("orders.read")
          ? getStaffOrders(activeToken, {
              search: "",
              status: "",
              paymentStatus: "",
              fulfillmentStatus: "",
              page: 1,
              pageSize: 12,
            })
          : null,
        hasPerm("customers.read")
          ? getStaffCustomers(activeToken, {
              search: "",
              status: "",
              customerType: "",
              page: 1,
              pageSize: 1,
            })
          : null,
        hasPerm("orders.read")
          ? getStaffDrafts(activeToken, { page: 1, pageSize: 1 })
          : null,
        hasPerm("inventory.read")
          ? getInventory(activeToken, {})
          : null,
      ];

      const results = await Promise.allSettled(
        promises.map((p) => (p ? p : Promise.resolve(null))),
      );

      const unauthorized = results.some((r) => {
        if (r.status !== "rejected") return false;
        const reason = r.reason;
        return (
          (reason instanceof StaffCatalogueApiError ||
            reason instanceof StaffOrdersApiError ||
            reason instanceof StaffCustomersApiError ||
            reason instanceof StaffInventoryApiError) &&
          reason.status === 401
        );
      });

      if (unauthorized) {
        clearStaffAccessToken();
        router.replace("/staff/login");
        return;
      }

      const next: DashboardData = { ...EMPTY_DATA };
      const issues: string[] = [];

      if (hasPerm("catalogue.read")) {
        if (results[0].status === "fulfilled" && results[0].value) {
          next.products = results[0].value.items;
        } else if (results[0].status === "rejected") {
          issues.push("catalogue");
        }
      }

      if (hasPerm("orders.read")) {
        if (results[1].status === "fulfilled" && results[1].value) {
          next.orders = results[1].value.orders;
          next.orderTotal = results[1].value.pagination.total;
        } else if (results[1].status === "rejected") {
          issues.push("orders");
        }
      }

      if (hasPerm("customers.read")) {
        if (results[2].status === "fulfilled" && results[2].value) {
          next.customerTotal = results[2].value.pagination.total;
        } else if (results[2].status === "rejected") {
          issues.push("customers");
        }
      }

      if (hasPerm("orders.read")) {
        if (results[3].status === "fulfilled" && results[3].value) {
          next.draftsTotal = results[3].value.pagination.total;
        }
      }

      if (hasPerm("inventory.read")) {
        if (results[4].status === "fulfilled" && results[4].value) {
          next.inventoryItems = results[4].value.items;
        }
      }

      setData(next);
      setLastUpdated(
        new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
      );

      if (issues.length) {
        setError(`Could not load: ${issues.join(", ")}. Some data may be stale.`);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load dashboard.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    const token = getStaffAccessToken();
    if (!token) { router.replace("/staff/login"); return; }
    void loadDashboard(token);
  }, [router]);

  /* ── Derived metrics ── */
  const totalSalesAmount = useMemo(
    () => data.orders
      .filter((o) => o.paymentStatus === "PAID" || o.status === "DELIVERED")
      .reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0),
    [data.orders],
  );

  const unfulfilledCount = useMemo(
    () => data.orders.filter(
      (o) => o.fulfillmentStatus === "UNFULFILLED" && !["CANCELLED", "DELIVERED"].includes(o.status),
    ).length,
    [data.orders],
  );

  const lowStockItems = useMemo(
    () => data.inventoryItems.filter((item) => {
      const sellable = Math.max(item.quantityAvailable - item.quantityReserved, 0);
      return sellable <= 0 || (item.reorderLevel !== null && sellable <= item.reorderLevel);
    }),
    [data.inventoryItems],
  );

  const filteredOrders = useMemo(() => {
    if (!searchQuery.trim()) return data.orders;
    const q = searchQuery.toLowerCase();
    return data.orders.filter(
      (o) =>
        o.orderNumber.toLowerCase().includes(q) ||
        customerName(o).toLowerCase().includes(q) ||
        o.status.toLowerCase().includes(q),
    );
  }, [data.orders, searchQuery]);

  const today = useMemo(
    () => new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" }),
    [],
  );

  const fulfillmentRate = useMemo(() => {
    const fulfilled = data.orders.filter((o) => o.status === "DELIVERED").length;
    return data.orders.length ? Math.round((fulfilled / data.orders.length) * 100) : 0;
  }, [data.orders]);

  async function handleRefresh() {
    const token = getStaffAccessToken();
    if (!token) { clearStaffAccessToken(); router.replace("/staff/login"); return; }
    await loadDashboard(token, true);
  }

  return (
    <div className="min-h-screen bg-white text-[13px] text-[#303030]">

      {/* ══ Header ══ */}
      <header className="sticky top-0 z-30 bg-white">
        <div className="mx-auto flex max-w-[1300px] items-center justify-between gap-4 px-6 py-3.5">
          {/* Left */}
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#e3e3e3] bg-white text-[#303030] shadow-xs">
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
                <rect x="3" y="3" width="14" height="14" rx="2" />
                <path d="M7 8h6M7 11h4" strokeLinecap="round" />
              </svg>
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-[20px] font-semibold text-[#1a1a1a]">Overview</h1>
                {refreshing && (
                  <svg className="h-3.5 w-3.5 animate-spin text-[#8c9196]" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                )}
              </div>
              <p className="text-[12px] text-[#616161]">
                {today}{lastUpdated ? ` · Updated ${lastUpdated}` : ""}
              </p>
            </div>
          </div>
          {/* Right */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => void handleRefresh()}
              disabled={refreshing}
              title="Refresh"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#d4d4d4] bg-white text-[#303030] shadow-xs transition hover:bg-[#f7f7f7] disabled:opacity-50"
            >
              <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
                <path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9M13.5 3v3h-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {canAccess("orders.create") && (
              <Link
                href="/staff/orders/new"
                style={{ color: "#ffffff", backgroundColor: "#1a1a1a" }}
                className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg px-4 text-[13px] font-medium !text-white shadow-sm hover:!bg-[#303030] transition-colors active:!bg-[#000]"
              >
                <span className="!text-white" style={{ color: "#ffffff" }}>Create order</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1300px] px-6 pt-5 pb-10 space-y-5 bg-white">

        {/* ── Error Banner ── */}
        {error && (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-[#fed3d1] bg-[#fff4f4] px-4 py-2.5 text-[13px] text-[#8a1c14]">
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" className="shrink-0">
                <path d="M8 1a7 7 0 1 0 7 7A7 7 0 0 0 8 1Zm-.75 4a.75.75 0 0 1 1.5 0v3.5a.75.75 0 0 1-1.5 0Zm.75 7a.875.875 0 1 1 .875-.875A.875.875 0 0 1 8 12Z" />
              </svg>
              {error}
            </div>
            <button type="button" onClick={() => void handleRefresh()} className="shrink-0 font-medium underline hover:text-[#5a100c]">
              Retry
            </button>
          </div>
        )}

        {/* ══ Row 1 — Dynamic Metric Cards (Filtered by Staff Permissions) ══ */}
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {canAccess("orders.read") && (
            <>
              <KpiCard
                label="Total Orders"
                value={loading ? "—" : data.orderTotal.toLocaleString("en-IN")}
                sub="▲ +4.2% vs last week"
                subColor="text-[#008060]"
                href="/staff/orders"
                iconBg="bg-[#f3f0ff]"
                spark={[12, 19, 14, 25, 22, 30, 28, 38, 32, 45]}
                sparkColor="#7c3aed"
                loading={loading}
                icon={
                  <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5 text-[#7c3aed]">
                    <path d="M3 5.5A1.5 1.5 0 0 1 4.5 4h7A1.5 1.5 0 0 1 13 5.5V13a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5.5Z" stroke="currentColor" strokeWidth="1.3" />
                    <path d="M5.5 4V3a2.5 2.5 0 0 1 5 0v1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                  </svg>
                }
              />
              <KpiCard
                label="Revenue Collected"
                value={loading ? "—" : money(totalSalesAmount)}
                sub="Paid + Delivered"
                subColor="text-[#616161]"
                href="/staff/orders"
                iconBg="bg-[#edfcf3]"
                spark={[8, 15, 12, 20, 18, 26, 22, 34, 30, 42]}
                sparkColor="#008060"
                loading={loading}
                icon={
                  <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5 text-[#008060]">
                    <path d="M8 2v12M5 5h4.5a2 2 0 0 1 0 4H5m0 3h5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                  </svg>
                }
              />
              <KpiCard
                label="Unfulfilled"
                value={loading ? "—" : unfulfilledCount}
                sub={unfulfilledCount > 0 ? "Needs attention" : "All fulfilled ✓"}
                subColor={unfulfilledCount > 0 ? "text-[#b54708]" : "text-[#008060]"}
                href="/staff/orders"
                iconBg="bg-[#fffbeb]"
                spark={[24, 30, 20, 35, 40, 28, 48, 52, 44, 60]}
                sparkColor="#d97706"
                loading={loading}
                icon={
                  <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5 text-[#d97706]">
                    <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.3" />
                    <path d="M8 5v3.5l2 2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                  </svg>
                }
              />
            </>
          )}

          {canAccess("inventory.read") && (
            <KpiCard
              label="Low / Out-of-Stock"
              value={loading ? "—" : lowStockItems.length}
              sub={lowStockItems.length > 0 ? "Reorder required" : "Stock healthy"}
              subColor={lowStockItems.length > 0 ? "text-[#b30000]" : "text-[#008060]"}
              href="/staff/inventory"
              iconBg="bg-[#fff4f4]"
              spark={[35, 32, 28, 40, 36, 45, 39, 48, 52, 46]}
              sparkColor="#dc2626"
              loading={loading}
              icon={
                <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5 text-[#dc2626]">
                  <rect x="2" y="3" width="12" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
                  <path d="M8 3v10M2 8h12" stroke="currentColor" strokeWidth="1.3" />
                </svg>
              }
            />
          )}

          {canAccess("catalogue.read") && !canAccess("orders.read") && (
            <>
              <KpiCard
                label="Active Products"
                value={loading ? "—" : data.products.length}
                sub="Live in Storefront"
                subColor="text-[#008060]"
                href="/staff/catalogue/products"
                iconBg="bg-[#fdf4ff]"
                spark={[10, 15, 18, 22, 24, 24, 25, 25, 26, 28]}
                sparkColor="#9333ea"
                loading={loading}
                icon={
                  <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5 text-[#9333ea]">
                    <path d="M3 5.5L8 3l5 2.5-5 2.5L3 5.5ZM3 9l5 2.5L13 9" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                  </svg>
                }
              />
              <KpiCard
                label="Total Inventory Units"
                value={loading ? "—" : data.inventoryItems.reduce((acc, i) => acc + i.quantityAvailable, 0)}
                sub="Physical Stock in Store"
                subColor="text-[#616161]"
                href="/staff/inventory"
                iconBg="bg-[#edfcf3]"
                spark={[40, 45, 42, 50, 48, 55, 52, 60, 58, 64]}
                sparkColor="#008060"
                loading={loading}
                icon={
                  <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5 text-[#008060]">
                    <rect x="2" y="3" width="12" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
                    <path d="M8 3v10M2 8h12" stroke="currentColor" strokeWidth="1.3" />
                  </svg>
                }
              />
            </>
          )}
        </section>

        {/* ══ Row 2 — Secondary Stats (Filtered by Permissions) ══ */}
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            {
              label: "Customers",
              permission: "customers.read",
              value: loading ? null : data.customerTotal.toLocaleString("en-IN"),
              iconBg: "bg-[#eff6ff]",
              iconColor: "text-[#2563eb]",
              icon: (
                <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5 text-[#2563eb]">
                  <circle cx="8" cy="6" r="2.5" stroke="currentColor" strokeWidth="1.3" />
                  <path d="M2.5 14.5c.7-3 2.8-5 5.5-5s4.8 2 5.5 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                </svg>
              ),
              href: "/staff/customers",
            },
            {
              label: "Draft Orders",
              permission: "orders.read",
              value: loading ? null : data.draftsTotal,
              iconBg: "bg-[#f5f3ff]",
              iconColor: "text-[#6d28d9]",
              icon: (
                <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5 text-[#6d28d9]">
                  <path d="M3 3h10v2H3zM3 7h7M3 10h5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                </svg>
              ),
              href: "/staff/orders/drafts",
            },
            {
              label: "Catalogue Products",
              permission: "catalogue.read",
              value: loading ? null : data.products.length,
              iconBg: "bg-[#fdf4ff]",
              iconColor: "text-[#9333ea]",
              icon: (
                <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5 text-[#9333ea]">
                  <path d="M3 5.5L8 3l5 2.5-5 2.5L3 5.5ZM3 9l5 2.5L13 9" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                </svg>
              ),
              href: "/staff/catalogue/products",
            },
            {
              label: "Fulfillment Rate",
              permission: "orders.read",
              value: loading ? null : `${fulfillmentRate}%`,
              iconBg: "bg-[#edfcf3]",
              iconColor: "text-[#008060]",
              icon: (
                <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5 text-[#008060]">
                  <path d="M2.5 9L6 12.5l8-8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ),
              href: "/staff/orders",
            },
            {
              label: "Catalogue Collections",
              permission: "catalogue.read",
              value: loading ? null : "Curated",
              iconBg: "bg-[#f0fdfa]",
              iconColor: "text-[#0d9488]",
              icon: (
                <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5 text-[#0d9488]">
                  <rect x="3" y="3" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.3" />
                  <path d="M6 3v10M3 7h10" stroke="currentColor" strokeWidth="1.3" />
                </svg>
              ),
              href: "/staff/catalogue/collections",
            },
          ]
            .filter((stat) => canAccess(stat.permission))
            .slice(0, 4)
            .map((stat) => (
            <Link
              key={stat.label}
              href={stat.href}
              className="flex items-center gap-3 rounded-xl border border-[#e3e3e3] bg-white px-4 py-3.5 shadow-xs transition hover:border-[#c4c4c4] hover:shadow-sm"
            >
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${stat.iconBg}`}>
                {stat.icon}
              </span>
              <div>
                <div className="text-[19px] font-semibold text-[#1a1a1a] leading-tight">
                  {stat.value === null ? (
                    <span className="inline-block h-5 w-12 animate-pulse rounded bg-[#f1f1f1]" />
                  ) : stat.value}
                </div>
                <div className="text-[11.5px] text-[#8c9196]">{stat.label}</div>
              </div>
            </Link>
          ))}
        </section>

        {/* ══ Row 3 — Orders Table (or Catalogue Quick Table if no orders permission) + Sidebar ══ */}
        <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_300px]">

          {canAccess("orders.read") ? (
            /* ── Orders Table ── */
            <div className="overflow-hidden rounded-xl border border-[#e3e3e3] bg-white shadow-xs">
              {/* Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e3e3e3] px-4 py-3">
                <div>
                  <span className="text-[14px] font-semibold text-[#1a1a1a]">Recent Orders</span>
                  <span className="ml-2 text-[12px] text-[#8c9196]">
                    {filteredOrders.length} of {data.orderTotal}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {/* Search */}
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
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search orders…"
                      className="h-8 w-44 rounded-lg border border-[#d4d4d4] bg-white pl-8 pr-3 text-[12.5px] text-[#303030] placeholder-[#8c9196] outline-none focus:border-[#1a1a1a] focus:ring-1 focus:ring-[#1a1a1a]"
                    />
                  </div>
                  <Link
                    href="/staff/orders"
                    className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#d4d4d4] bg-white px-3 text-[12.5px] font-medium text-[#303030] shadow-xs transition hover:bg-[#f7f7f7]"
                  >
                    View all
                    <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
                      <path d="M4.5 11.5 11.5 4.5M6 4.5h5.5V10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </Link>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px]">
                  <thead>
                    <tr className="border-b border-[#e3e3e3] bg-[#fafafa] text-left">
                      <th className="px-4 py-2.5 text-[12px] font-medium text-[#616161]">Order</th>
                      <th className="px-4 py-2.5 text-[12px] font-medium text-[#616161]">Customer</th>
                      <th className="px-4 py-2.5 text-right text-[12px] font-medium text-[#616161]">Total</th>
                      <th className="px-4 py-2.5 text-center text-[12px] font-medium text-[#616161]">Items</th>
                      <th className="px-4 py-2.5 text-[12px] font-medium text-[#616161]">Date</th>
                      <th className="px-4 py-2.5 text-right text-[12px] font-medium text-[#616161]">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <SkeletonRows />
                    ) : filteredOrders.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-14 text-center text-[#8c9196]">
                          No orders match your search.
                        </td>
                      </tr>
                    ) : (
                      filteredOrders.slice(0, 10).map((order) => {
                        const name = customerName(order);
                        const amt = Number(order.totalAmount) || 0;
                        const when = order.placedAt ?? order.createdAt;
                        return (
                          <tr
                            key={order.orderNumber}
                            className="border-b border-[#f1f1f1] transition-colors hover:bg-[#f7f7f7] cursor-pointer"
                            onClick={() => router.push(`/staff/orders/${encodeURIComponent(order.orderNumber)}`)}
                          >
                            <td className="px-4 py-3">
                              <span className="font-medium text-[#1a1a1a] hover:underline text-[13px]">
                                {order.orderNumber}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="truncate font-normal text-[#303030] text-[13px]">{name}</div>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className="font-normal text-[#1a1a1a] text-[13px]">
                                {money(amt, order.currency)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="text-[12px] text-[#616161]">{order._count.items}</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="whitespace-nowrap text-[12px] font-normal text-[#616161]">{timeAgo(when)}</span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <OrderStatusBadge status={order.status} />
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : canAccess("catalogue.read") ? (
            /* ── Product Catalogue Overview Table (For Product Managers) ── */
            <div className="overflow-hidden rounded-xl border border-[#e3e3e3] bg-white shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e3e3e3] px-4 py-3">
                <div>
                  <span className="text-[14px] font-semibold text-[#1a1a1a]">Catalogue Products</span>
                  <span className="ml-2 text-[12px] text-[#8c9196]">
                    {data.products.length} models
                  </span>
                </div>
                <Link
                  href="/staff/catalogue/products"
                  className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#d4d4d4] bg-white px-3 text-[12.5px] font-medium text-[#303030] shadow-xs transition hover:bg-[#f7f7f7]"
                >
                  Manage products
                  <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
                    <path d="M4.5 11.5 11.5 4.5M6 4.5h5.5V10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Link>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px]">
                  <thead>
                    <tr className="border-b border-[#e3e3e3] bg-[#fafafa] text-left">
                      <th className="px-4 py-2.5 text-[12px] font-medium text-[#616161]">Product</th>
                      <th className="px-4 py-2.5 text-[12px] font-medium text-[#616161]">Brand</th>
                      <th className="px-4 py-2.5 text-[12px] font-medium text-[#616161]">Category</th>
                      <th className="px-4 py-2.5 text-center text-[12px] font-medium text-[#616161]">Variants</th>
                      <th className="px-4 py-2.5 text-right text-[12px] font-medium text-[#616161]">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <SkeletonRows />
                    ) : data.products.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-14 text-center text-[#8c9196]">
                          No products found in catalogue.
                        </td>
                      </tr>
                    ) : (
                      data.products.slice(0, 10).map((prod) => (
                        <tr
                          key={prod.id}
                          className="border-b border-[#f1f1f1] transition-colors hover:bg-[#f7f7f7] cursor-pointer"
                          onClick={() => router.push(`/staff/catalogue/products/${prod.id}`)}
                        >
                          <td className="px-4 py-3">
                            <span className="font-medium text-[#1a1a1a] hover:underline text-[13px]">
                              {prod.name}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-[13px] text-[#303030]">
                            {prod.brand?.name ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-[13px] text-[#616161]">
                            {prod.category?.name ?? "Laptop"}
                          </td>
                          <td className="px-4 py-3 text-center text-[12px] text-[#616161]">
                            {prod.variants?.length ?? 1}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                              prod.status === "PUBLISHED" ? "bg-emerald-50 text-emerald-800" : "bg-stone-100 text-stone-600"
                            }`}>
                              {prod.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-xl border border-[#e3e3e3] bg-white p-12 text-center">
              <span className="text-2xl">⚡</span>
              <h3 className="mt-2 text-sm font-bold text-[#1a1a1a]">Welcome to Klarone Staff</h3>
              <p className="mt-1 max-w-sm text-xs text-[#616161]">
                Use the sidebar to navigate to your authorized workspaces.
              </p>
            </div>
          )}

          {/* ── Right Sidebar ── */}
          <div className="flex flex-col gap-4">

            {/* Quick Actions (Permission-Gated) */}
            <div className="rounded-xl border border-[#e3e3e3] bg-white shadow-xs">
              <div className="border-b border-[#e3e3e3] px-4 py-3">
                <span className="text-[13px] font-semibold text-[#1a1a1a]">Quick Actions</span>
              </div>
              <div className="p-2">
                {[
                  { label: "Create order", href: "/staff/orders/new", permission: "orders.create", icon: <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5"><path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg> },
                  { label: "Manage inventory", href: "/staff/inventory", permission: "inventory.read", icon: <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5"><rect x="2" y="3" width="12" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.3" /><path d="M8 3v10M2 8h12" stroke="currentColor" strokeWidth="1.3" /></svg> },
                  { label: "Browse catalogue", href: "/staff/catalogue/products", permission: "catalogue.read", icon: <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5"><path d="M3 5.5L8 3l5 2.5-5 2.5L3 5.5ZM3 9l5 2.5L13 9" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" /></svg> },
                  { label: "Add new product", href: "/staff/catalogue/products/new", permission: "catalogue.create", icon: <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5"><path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg> },
                  { label: "View customers", href: "/staff/customers", permission: "customers.read", icon: <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5"><circle cx="8" cy="6" r="2.5" stroke="currentColor" strokeWidth="1.3" /><path d="M2.5 14.5c.7-3 2.8-5 5.5-5s4.8 2 5.5 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg> },
                  { label: "Draft orders", href: "/staff/orders/drafts", permission: "orders.read", icon: <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5"><path d="M3 3h10v2H3zM3 7h7M3 10h5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg> },
                  { label: "Staff & team", href: "/staff/users", permission: "users.read", icon: <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5"><circle cx="8" cy="6" r="2.5" stroke="currentColor" strokeWidth="1.3" /><path d="M2.5 14.5c.7-3 2.8-5 5.5-5s4.8 2 5.5 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg> },
                ]
                  .filter((item) => canAccess(item.permission))
                  .map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[12.5px] text-[#303030] transition hover:bg-[#f7f7f7]"
                  >
                    <span className="text-[#616161]">{item.icon}</span>
                    {item.label}
                    <svg viewBox="0 0 16 16" fill="none" className="ml-auto h-3 w-3 text-[#adadad]">
                      <path d="M4.5 11.5 11.5 4.5M6 4.5h5.5V10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </Link>
                ))}
              </div>
            </div>

            {/* Inventory Alerts (Gated by inventory.read) */}
            {canAccess("inventory.read") && (
              <div className="flex-1 rounded-xl border border-[#e3e3e3] bg-white shadow-xs">
                <div className="flex items-center justify-between border-b border-[#e3e3e3] px-4 py-3">
                  <span className="text-[13px] font-semibold text-[#1a1a1a]">Inventory Alerts</span>
                  <Link href="/staff/inventory" className="text-[12px] text-[#8c9196] transition hover:text-[#303030]">
                    View all →
                  </Link>
                </div>
                <div className="p-3">
                  {loading ? (
                    <div className="space-y-2">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="h-11 animate-pulse rounded-lg bg-[#f1f1f1]" />
                      ))}
                    </div>
                  ) : lowStockItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <span className="mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-[#edfcf3]">
                        <svg viewBox="0 0 16 16" fill="none" className="h-4.5 w-4.5 text-[#008060]">
                          <path d="M2.5 9L6 12.5l8-8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                      <p className="text-[12px] font-medium text-[#008060]">All stock levels healthy</p>
                      <p className="mt-0.5 text-[11px] text-[#8c9196]">No items need reordering</p>
                    </div>
                  ) : (
                    <div className="max-h-[240px] space-y-1.5 overflow-y-auto">
                      {lowStockItems.slice(0, 8).map((item) => {
                        const sellable = Math.max(item.quantityAvailable - item.quantityReserved, 0);
                        const isOut = sellable <= 0;
                        return (
                          <Link
                            key={item.id}
                            href="/staff/inventory"
                            className="flex items-start gap-2.5 rounded-lg border border-[#e3e3e3] px-3 py-2 transition hover:bg-[#f7f7f7]"
                          >
                            <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md ${isOut ? "bg-[#ffe5e5]" : "bg-[#ffea8a]"}`}>
                              <svg viewBox="0 0 16 16" fill="none" className={`h-3 w-3 ${isOut ? "text-[#b30000]" : "text-[#5c4b00]"}`}>
                                <path d="M8 5v4M8 11h.01M1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                              </svg>
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-[12px] font-medium text-[#1a1a1a]">
                                {item.productVariant.product.name}
                              </div>
                              <div className="text-[11px] text-[#8c9196]">
                                {item.productVariant.sku} ·{" "}
                                <span className={`font-semibold ${isOut ? "text-[#b30000]" : "text-[#5c4b00]"}`}>
                                  {isOut ? "Out of stock" : `${sellable} left`}
                                </span>
                              </div>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
