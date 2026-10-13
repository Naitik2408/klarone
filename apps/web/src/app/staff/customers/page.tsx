"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  clearStaffAccessToken,
  getStaffAccessToken,
} from "../../../lib/staff-auth-api";

import {
  getStaffCustomers,
  deleteStaffCustomer,
  StaffCustomersApiError,
} from "../../../lib/staff-customers-api";

import type { StaffCustomerListItem } from "../../../types/staff-customers";

function customerName(customer: StaffCustomerListItem) {
  return (
    [
      customer.person.firstName,
      customer.person.middleName,
      customer.person.lastName,
    ]
      .filter(Boolean)
      .join(" ")
      .trim() || "Unnamed customer"
  );
}

function money(value: string, currency = "INR") {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return value;

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export default function StaffCustomersPage() {
  const router = useRouter();

  const [token, setToken] = useState<string | null>(null);
  const [customers, setCustomers] = useState<StaffCustomerListItem[]>([]);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successNotice, setSuccessNotice] = useState("");

  // Delete Confirmation State
  const [customerToDelete, setCustomerToDelete] = useState<StaffCustomerListItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  async function loadCustomers(activeToken: string, currentPage: number, currentSearch: string) {
    try {
      setLoading(true);
      setError("");
      setSelectedIds([]);

      const result = await getStaffCustomers(activeToken, {
        search: currentSearch,
        page: currentPage,
        pageSize: 20,
      });

      setCustomers(result.customers);
      setTotal(result.pagination.total);
      setTotalPages(Math.max(result.pagination.totalPages, 1));
    } catch (caught) {
      if (caught instanceof StaffCustomersApiError && caught.status === 401) {
        clearStaffAccessToken();
        router.replace("/staff/login");
        return;
      }
      setError(caught instanceof Error ? caught.message : "Unable to load customers.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const activeToken = getStaffAccessToken();
    if (!activeToken) {
      router.replace("/staff/login");
      return;
    }
    setToken(activeToken);
    void loadCustomers(activeToken, 1, "");
  }, [router]);

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setPage(1);
    void loadCustomers(token, 1, search);
  }

  function changePage(nextPage: number) {
    if (!token || nextPage < 1 || nextPage > totalPages || nextPage === page) return;
    setPage(nextPage);
    void loadCustomers(token, nextPage, search);
  }

  async function confirmDeleteCustomer() {
    if (!token || !customerToDelete) return;
    setIsDeleting(true);
    setError("");
    try {
      await deleteStaffCustomer(token, customerToDelete.customerCode);
      setSuccessNotice(`Customer "${customerName(customerToDelete)}" deleted successfully.`);
      setCustomerToDelete(null);
      void loadCustomers(token, page, search);
      setTimeout(() => setSuccessNotice(""), 3500);
    } catch (caught) {
      if (caught instanceof StaffCustomersApiError && caught.status === 401) {
        clearStaffAccessToken();
        router.replace("/staff/login");
        return;
      }
      setError(caught instanceof Error ? caught.message : "Failed to delete customer.");
    } finally {
      setIsDeleting(false);
    }
  }

  const allSelected =
    customers.length > 0 && selectedIds.length === customers.length;
  const someSelected =
    selectedIds.length > 0 && selectedIds.length < customers.length;

  return (
    <div className="min-h-screen bg-white text-[13px] text-[#303030]">
      <div className="mx-auto max-w-[1300px] px-6 pt-5 pb-4">
        {/* -------------------- Top Bar / Header -------------------- */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white border border-[#e3e3e3] text-[#303030] shadow-xs">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
              >
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </span>
            <h1 className="text-[20px] font-semibold text-[#1a1a1a]">
              Customers
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled
              title="Coming soon"
              className="inline-flex h-8 items-center justify-center rounded-lg border border-[#d4d4d4] bg-white px-3 text-[13px] font-medium text-[#303030] shadow-xs hover:bg-[#f7f7f7] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Export
            </button>

            <Link
              href="/staff/customers/new"
              style={{ color: "#ffffff", backgroundColor: "#1a1a1a" }}
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg px-4 text-[13px] font-medium !text-white shadow-sm hover:!bg-[#303030] transition-colors active:!bg-[#000]"
            >
              <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
                <path
                  d="M8 3v10M3 8h10"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
              <span className="!text-white" style={{ color: "#ffffff" }}>
                Add customer
              </span>
            </Link>
          </div>
        </div>

        {/* Notices */}
        {successNotice ? (
          <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-[13px] text-emerald-800">
            {successNotice}
          </div>
        ) : null}

        {error ? (
          <div
            className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-[13px] text-red-700"
            role="alert"
          >
            <svg
              viewBox="0 0 20 20"
              fill="currentColor"
              className="mt-0.5 h-4 w-4 shrink-0"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16ZM9 5.75a1 1 0 0 1 2 0v4.5a1 1 0 0 1-2 0v-4.5Zm1 8.5a1.125 1.125 0 1 0 0-2.25 1.125 1.125 0 0 0 0 2.25Z"
                clipRule="evenodd"
              />
            </svg>
            <span>{error}</span>
          </div>
        ) : null}

        {/* Search Bar */}
        <div className="flex items-stretch gap-0 rounded-xl border border-neutral-200 bg-white">
          <form onSubmit={submitSearch} className="relative flex-1">
            <svg
              viewBox="0 0 16 16"
              fill="none"
              className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-neutral-500"
              aria-hidden="true"
            >
              <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5" />
              <path
                d="m10.5 10.5 3 3"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search customers by name, email, phone, or code..."
              className="h-full w-full bg-transparent py-2.5 pr-3 pl-9 text-[13px] text-neutral-800 outline-none placeholder:text-neutral-500"
            />
          </form>

          <div className="flex items-center gap-2 border-l border-neutral-200 px-3 py-2">
            <button
              type="button"
              onClick={() => token && void loadCustomers(token, 1, search)}
              disabled={loading}
              aria-label="Refresh"
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-neutral-600 hover:bg-neutral-100 disabled:opacity-50"
            >
              <svg
                viewBox="0 0 16 16"
                fill="none"
                className="h-4 w-4"
                aria-hidden="true"
              >
                <path
                  d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9M13.5 3v3h-3"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="mt-3 overflow-hidden rounded-xl border border-neutral-200 bg-white">
          <div className="overflow-x-auto">
            <div className="min-w-[800px]">
              <div className="grid grid-cols-[36px_minmax(240px,2fr)_minmax(120px,1fr)_minmax(90px,0.8fr)_minmax(120px,1fr)_minmax(130px,1.1fr)] items-center gap-3 border-b border-neutral-200 bg-[#f7f7f7] px-4 py-2.5 text-[12px] font-medium text-neutral-600">
                <div className="flex justify-center">
                  <input
                    type="checkbox"
                    aria-label="Select all customers"
                    checked={allSelected}
                    ref={(element) => {
                      if (element) element.indeterminate = someSelected;
                    }}
                    onChange={(event) =>
                      setSelectedIds(
                        event.target.checked ? customers.map((c) => c.id) : [],
                      )
                    }
                    className="h-3.5 w-3.5 rounded border-neutral-300 accent-neutral-800"
                  />
                </div>
                <div>Customer</div>
                <div>Status</div>
                <div className="text-center">Orders</div>
                <div className="text-right">Spent</div>
                <div className="text-right pr-2">Joined</div>
              </div>

              {loading ? (
                <div className="flex items-center justify-center gap-2 py-16 text-[13px] text-neutral-500">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-800" />
                  Loading customers...
                </div>
              ) : customers.length === 0 ? (
                <div className="py-20 text-center">
                  <p className="text-[13px] text-neutral-500">
                    {search
                      ? "No customers match your search"
                      : "No customers found"}
                  </p>
                  {!search ? (
                    <Link
                      href="/staff/customers/new"
                      className="mt-3 inline-block text-[13px] font-medium text-blue-600 hover:underline"
                    >
                      Add customer
                    </Link>
                  ) : null}
                </div>
              ) : (
                customers.map((c) => {
                  const isActive = c.status === "ACTIVE";
                  const isChecked = selectedIds.includes(c.id);

                  return (
                    <div
                      key={c.id}
                      role="link"
                      tabIndex={0}
                      aria-label={`Open ${customerName(c)}`}
                      onClick={() =>
                        router.push(`/staff/customers/${encodeURIComponent(c.customerCode)}`)
                      }
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          router.push(`/staff/customers/${encodeURIComponent(c.customerCode)}`);
                        }
                      }}
                      className="grid cursor-pointer grid-cols-[36px_minmax(240px,2fr)_minmax(120px,1fr)_minmax(90px,0.8fr)_minmax(120px,1fr)_minmax(130px,1.1fr)] items-center gap-3 border-b border-neutral-100 px-4 py-3 last:border-b-0 hover:bg-[#f7f7f7] focus-visible:bg-[#f7f7f7] focus-visible:outline-none"
                    >
                      <div
                        className="flex justify-center"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          aria-label={`Select ${customerName(c)}`}
                          checked={isChecked}
                          onChange={(event) =>
                            setSelectedIds((prev) =>
                              event.target.checked
                                ? [...prev, c.id]
                                : prev.filter((id) => id !== c.id),
                            )
                          }
                          className="h-3.5 w-3.5 rounded border-neutral-300 accent-neutral-800"
                        />
                      </div>

                      <div className="flex min-w-0 items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-neutral-200 bg-neutral-100 text-[11px] font-semibold text-neutral-600">
                          {customerName(c).slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <Link
                            href={`/staff/customers/${encodeURIComponent(c.customerCode)}`}
                            onClick={(event) => event.stopPropagation()}
                            className="block truncate text-[13px] font-medium text-neutral-900 hover:underline"
                          >
                            {customerName(c)}
                          </Link>
                        </div>
                      </div>

                      <div>
                        {isActive ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#cbf4c9] px-2.5 py-0.5 text-[11px] font-normal text-[#0e6245]">
                            <svg
                              width="10"
                              height="10"
                              viewBox="0 0 20 20"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <circle cx="10" cy="10" r="7" />
                            </svg>
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-2.5 py-0.5 text-[11px] font-normal text-neutral-600 border border-neutral-200">
                            <svg
                              width="10"
                              height="10"
                              viewBox="0 0 20 20"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <circle cx="10" cy="10" r="7" />
                            </svg>
                            {c.status}
                          </span>
                        )}
                      </div>

                      <div className="text-center text-[13px] text-neutral-800">
                        {c.orderCount}
                      </div>

                      <div className="text-right text-[13px] font-medium text-neutral-900">
                        {money(c.totalSpent)}
                      </div>

                      <div className="text-right pr-2 text-[13px] text-neutral-500">
                        {formatDate(c.createdAt)}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Pagination Footer */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e3e3e3] px-4 py-3 bg-white text-[12px] text-[#616161]">
            <div>
              Showing {customers.length} of {total} customer{total === 1 ? "" : "s"}
              {totalPages > 1 && ` · Page ${page} of ${totalPages}`}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={page <= 1 || loading}
                  onClick={() => changePage(page - 1)}
                  className="inline-flex h-7 items-center justify-center rounded-lg border border-[#d4d4d4] bg-white px-2.5 font-medium text-[#303030] shadow-xs hover:bg-[#f7f7f7] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages || loading}
                  onClick={() => changePage(page + 1)}
                  className="inline-flex h-7 items-center justify-center rounded-lg border border-[#d4d4d4] bg-white px-2.5 font-medium text-[#303030] shadow-xs hover:bg-[#f7f7f7] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Delete Confirmation Modal (used when triggered) */}
        {customerToDelete ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-neutral-100 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M3 6h18" />
                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                  </svg>
                </span>
                <div>
                  <h3 className="text-[15px] font-semibold text-neutral-900">
                    Delete customer
                  </h3>
                  <p className="text-[12px] text-neutral-500">
                    This action is permanent and cannot be undone.
                  </p>
                </div>
              </div>

              <p className="mt-4 text-[13px] text-neutral-600">
                Are you sure you want to delete{" "}
                <span className="font-semibold text-neutral-900">
                  {customerName(customerToDelete)}
                </span>
                ? This will permanently remove their profile and authentication identity.
              </p>

              <div className="mt-6 flex items-center justify-end gap-2">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setCustomerToDelete(null)}
                  className="rounded-lg border border-neutral-200 px-3.5 py-1.5 text-[13px] font-medium text-neutral-700 hover:bg-neutral-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={confirmDeleteCustomer}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3.5 py-1.5 text-[13px] font-medium text-white hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {isDeleting ? "Deleting..." : "Delete customer"}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}