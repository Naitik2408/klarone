"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  clearStaffAccessToken,
  getStaffAccessToken,
} from "../../lib/staff-auth-api";
import {
  getStaffProducts,
  StaffCatalogueApiError,
} from "../../lib/staff-catalogue-api";
import {
  getStaffOrders,
  StaffOrdersApiError,
} from "../../lib/staff-orders-api";
import {
  getStaffCustomers,
  StaffCustomersApiError,
} from "../../lib/staff-customers-api";
import type { StaffCatalogueProduct } from "../../types/staff-catalogue";
import type { StaffOrderListItem } from "../../types/staff-orders";

type DashboardData = {
  products: StaffCatalogueProduct[];
  orders: StaffOrderListItem[];
  orderTotal: number;
  customerTotal: number;
};

const EMPTY_DATA: DashboardData = {
  products: [],
  orders: [],
  orderTotal: 0,
  customerTotal: 0,
};

function money(value: string, currency = "INR") {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return value;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currency || "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function customerName(order: StaffOrderListItem) {
  return [
    order.customer.person.firstName,
    order.customer.person.middleName,
    order.customer.person.lastName,
  ]
    .filter(Boolean)
    .join(" ")
    .trim() || "Unnamed customer";
}

function dateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function statusStyle(value: string) {
  if (["PAID", "DELIVERED", "FULFILLED", "PUBLISHED"].includes(value)) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (["FAILED", "CANCELLED", "INACTIVE", "SUSPENDED"].includes(value)) {
    return "border-red-200 bg-red-50 text-red-700";
  }
  return "border-amber-200 bg-amber-50 text-amber-700";
}

function MetricCard({
  label,
  value,
  detail,
  icon,
  href,
}: {
  label: string;
  value: string;
  detail: string;
  icon: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-black/[0.07] bg-white p-5 transition hover:-translate-y-0.5 hover:border-black/15 hover:shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="text-sm font-medium text-neutral-500">{label}</div>
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f1f3f5] text-xs font-bold text-[#263442]">
          {icon}
        </span>
      </div>
      <div className="mt-4 text-3xl font-semibold tracking-tight text-[#17212b]">
        {value}
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-neutral-500">
        <span>{detail}</span>
        <span className="font-medium text-neutral-700 transition group-hover:translate-x-0.5">
          View <span aria-hidden="true">→</span>
        </span>
      </div>
    </Link>
  );
}

export default function StaffDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState("");

  async function loadDashboard(activeToken: string, quiet = false) {
    if (quiet) setRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      const results = await Promise.allSettled([
        getStaffProducts(activeToken, { search: "", status: "ALL" }),
        getStaffOrders(activeToken, {
          search: "",
          status: "",
          paymentStatus: "",
          fulfillmentStatus: "",
          page: 1,
          pageSize: 6,
        }),
        getStaffCustomers(activeToken, {
          search: "",
          status: "",
          customerType: "",
          page: 1,
          pageSize: 1,
        }),
      ]);

      const unauthorized = results.some((result) => {
        if (result.status !== "rejected") return false;
        const reason = result.reason;
        return (
          (reason instanceof StaffCatalogueApiError ||
            reason instanceof StaffOrdersApiError ||
            reason instanceof StaffCustomersApiError) &&
          reason.status === 401
        );
      });

      if (unauthorized) {
        clearStaffAccessToken();
        router.replace("/staff/login");
        return;
      }

      const next = { ...EMPTY_DATA };
      const issues: string[] = [];

      if (results[0].status === "fulfilled") {
        next.products = results[0].value.items;
      } else {
        issues.push("catalogue");
      }

      if (results[1].status === "fulfilled") {
        next.orders = results[1].value.orders;
        next.orderTotal = results[1].value.pagination.total;
      } else {
        issues.push("orders");
      }

      if (results[2].status === "fulfilled") {
        next.customerTotal = results[2].value.pagination.total;
      } else {
        issues.push("customers");
      }

      setData(next);
      setLastUpdated(new Date().toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      }));
      if (issues.length) {
        setError(`Some dashboard data could not be loaded: ${issues.join(", ")}. Use refresh to try again.`);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load dashboard data.");
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
    void loadDashboard(activeToken);
    // Initial auth and dashboard load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const lowStockProducts = useMemo(
    () => data.products.filter(
      (product) => product.quantityAvailable - product.quantityReserved <= 0,
    ),
    [data.products],
  );

  const pendingOrders = useMemo(
    () => data.orders.filter(
      (order) => !["DELIVERED", "CANCELLED"].includes(order.status),
    ).length,
    [data.orders],
  );

  async function refresh() {
    const activeToken = getStaffAccessToken();
    if (!activeToken) {
      clearStaffAccessToken();
      router.replace("/staff/login");
      return;
    }
    await loadDashboard(activeToken, true);
  }

  return (
    <div className="min-h-[calc(100vh-62px)] bg-[#f6f7f5]">
      <div className="mx-auto max-w-[1440px] px-5 py-7 sm:px-7 lg:px-9">
        <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-400">
              Store overview
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-[#17212b] sm:text-3xl">
              Welcome back to Klarone
            </h1>
            <p className="mt-2 text-sm text-neutral-500">
              Here’s what’s happening across your Klarone store.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-xs text-neutral-400">
              {lastUpdated ? `Updated ${lastUpdated}` : "Live workspace data"}
            </span>
            <button
              type="button"
              onClick={() => void refresh()}
              disabled={loading || refreshing}
              className="rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-50"
            >
              <span className="mr-2" aria-hidden="true">↻</span>
              {refreshing ? "Refreshing…" : "Refresh"}
            </button>
            <Link
              href="/staff/catalogue/products"
              className="rounded-xl bg-[#17212b] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#263442]"
            >
              + Add product
            </Link>
          </div>
        </div>

        {error ? (
          <div role="alert" className="mb-5 flex flex-col justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:flex-row sm:items-center">
            <span>{error}</span>
            <button type="button" onClick={() => void refresh()} className="shrink-0 font-semibold underline underline-offset-2">
              Try again
            </button>
          </div>
        ) : null}

        <section aria-label="Store metrics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Total orders"
            value={loading ? "—" : data.orderTotal.toLocaleString("en-IN")}
            detail="All recorded orders"
            icon="ORD"
            href="/staff/orders"
          />
          <MetricCard
            label="Customers"
            value={loading ? "—" : data.customerTotal.toLocaleString("en-IN")}
            detail="Registered customer records"
            icon="CUS"
            href="/staff/customers"
          />
          <MetricCard
            label="Catalogue products"
            value={loading ? "—" : data.products.length.toLocaleString("en-IN")}
            detail="Products in loaded catalogue result"
            icon="PRD"
            href="/staff/catalogue/products"
          />
          <MetricCard
            label="Open orders"
            value={loading ? "—" : pendingOrders.toLocaleString("en-IN")}
            detail="Among the 6 most recent orders"
            icon="OPEN"
            href="/staff/orders"
          />
        </section>

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,.85fr)]">
          <section className="overflow-hidden rounded-2xl border border-black/[0.07] bg-white">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/[0.06] px-5 py-4 sm:px-6">
              <div>
                <h2 className="text-base font-semibold text-[#17212b]">Recent orders</h2>
                <p className="mt-1 text-xs text-neutral-500">Latest orders received by your store</p>
              </div>
              <Link href="/staff/orders" className="text-sm font-medium text-neutral-700 hover:underline">
                View all <span aria-hidden="true">→</span>
              </Link>
            </div>

            {loading ? (
              <div className="space-y-4 p-6">
                {[1, 2, 3, 4].map((item) => (
                  <div key={item} className="h-10 animate-pulse rounded-lg bg-neutral-100" />
                ))}
              </div>
            ) : data.orders.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-neutral-100 text-lg">▤</div>
                <p className="text-sm font-medium text-neutral-800">No orders yet</p>
                <p className="mt-1 text-xs text-neutral-500">New customer orders will appear here.</p>
              </div>
            ) : (
              <>
                <div className="hidden grid-cols-[1.1fr_1.2fr_1fr_1fr] gap-4 bg-neutral-50/80 px-6 py-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-400 md:grid">
                  <span>Order</span><span>Customer</span><span>Date</span><span className="text-right">Total / Status</span>
                </div>
                <div className="divide-y divide-black/[0.05]">
                  {data.orders.map((order) => (
                    <Link
                      key={order.orderNumber}
                      href={`/staff/orders/${encodeURIComponent(order.orderNumber)}`}
                      className="grid gap-2 px-5 py-4 transition hover:bg-neutral-50/70 sm:px-6 md:grid-cols-[1.1fr_1.2fr_1fr_1fr] md:items-center md:gap-4"
                    >
                      <div className="min-w-0">
                        <span className="text-sm font-semibold text-neutral-900">{order.orderNumber}</span>
                        <span className="mt-1 block text-xs text-neutral-400 md:hidden">{dateTime(order.createdAt)}</span>
                      </div>
                      <div className="truncate text-sm text-neutral-600">{customerName(order)}</div>
                      <div className="hidden text-xs text-neutral-500 md:block">{dateTime(order.createdAt)}</div>
                      <div className="flex items-center justify-between gap-3 md:justify-end">
                        <span className="text-sm font-medium tabular-nums text-neutral-900">{money(order.totalAmount, order.currency)}</span>
                        <span className={`rounded-full border px-2 py-1 text-[10px] font-semibold ${statusStyle(order.status)}`}>{order.status}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </>
            )}
          </section>

          <div className="space-y-6">
            <section className="rounded-2xl border border-black/[0.07] bg-white p-5 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-[#17212b]">Inventory attention</h2>
                  <p className="mt-1 text-xs text-neutral-500">Products with no currently sellable units</p>
                </div>
                <span className="rounded-xl bg-amber-50 px-3 py-2 text-sm font-semibold tabular-nums text-amber-700">
                  {loading ? "—" : lowStockProducts.length}
                </span>
              </div>
              {loading ? (
                <div className="mt-5 h-16 animate-pulse rounded-lg bg-neutral-100" />
              ) : lowStockProducts.length === 0 ? (
                <div className="mt-5 rounded-xl bg-emerald-50 px-4 py-4 text-sm text-emerald-800">
                  No zero-sellable products in the loaded catalogue result.
                </div>
              ) : (
                <div className="mt-4 divide-y divide-black/[0.06]">
                  {lowStockProducts.slice(0, 4).map((product) => (
                    <Link key={product.id} href={`/staff/catalogue/products/${product.id}`} className="flex items-center justify-between gap-3 py-3 hover:opacity-75">
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-neutral-800">{product.name}</span>
                        <span className="mt-1 block text-xs text-neutral-400">{product.brand.name} · {product.category.name}</span>
                      </span>
                      <span className="shrink-0 text-xs font-semibold text-amber-700">0 sellable</span>
                    </Link>
                  ))}
                </div>
              )}
              <Link href="/staff/inventory" className="mt-4 inline-flex text-sm font-medium text-neutral-700 hover:underline">
                Manage inventory <span className="ml-1" aria-hidden="true">→</span>
              </Link>
            </section>

            <section className="rounded-2xl border border-black/[0.07] bg-white p-5 sm:p-6">
              <h2 className="text-base font-semibold text-[#17212b]">Quick actions</h2>
              <p className="mt-1 text-xs text-neutral-500">Common store management tasks</p>
              <div className="mt-4 grid gap-2">
                <Link href="/staff/catalogue/products" className="flex items-center justify-between rounded-xl border border-black/[0.07] px-4 py-3 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50">
                  <span><span className="mr-3 text-neutral-400">＋</span>Create a product</span><span aria-hidden="true">→</span>
                </Link>
                <Link href="/staff/orders" className="flex items-center justify-between rounded-xl border border-black/[0.07] px-4 py-3 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50">
                  <span><span className="mr-3 text-neutral-400">▤</span>Review orders</span><span aria-hidden="true">→</span>
                </Link>
                <Link href="/staff/inventory" className="flex items-center justify-between rounded-xl border border-black/[0.07] px-4 py-3 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50">
                  <span><span className="mr-3 text-neutral-400">▦</span>Adjust stock</span><span aria-hidden="true">→</span>
                </Link>
                <Link href="/staff/customers" className="flex items-center justify-between rounded-xl border border-black/[0.07] px-4 py-3 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50">
                  <span><span className="mr-3 text-neutral-400">♙</span>View customers</span><span aria-hidden="true">→</span>
                </Link>
              </div>
            </section>
          </div>
        </div>

        <p className="mt-5 text-[11px] leading-5 text-neutral-400">
          Dashboard counts use the existing staff APIs. Product and inventory attention figures reflect the catalogue records returned by the current catalogue endpoint; open orders are calculated from the six most recent orders shown above. Revenue analytics and full inventory reporting can be added when a dedicated reporting endpoint is available.
        </p>
      </div>
    </div>
  );
}
