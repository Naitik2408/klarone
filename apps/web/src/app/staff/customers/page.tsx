"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  clearStaffAccessToken,
  getStaffAccessToken,
} from "../../../lib/staff-auth-api";

import {
  getStaffCustomers,
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

  if (!Number.isFinite(amount)) {
    return value;
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

export default function StaffCustomersPage() {
  const router = useRouter();

  const [token, setToken] = useState<string | null>(null);
  const [customers, setCustomers] = useState<
    StaffCustomerListItem[]
  >([]);

  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load(
    activeToken: string,
    currentPage: number,
    currentSearch: string,
  ) {
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
      setTotalPages(
        Math.max(result.pagination.totalPages, 1),
      );
    } catch (caught) {
      if (
        caught instanceof StaffCustomersApiError &&
        caught.status === 401
      ) {
        clearStaffAccessToken();
        router.replace("/staff/login");
        return;
      }

      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to load customers.",
      );
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
    void load(activeToken, 1, "");

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  function submitSearch(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!token) return;

    setPage(1);
    void load(token, 1, search);
  }

  function changePage(nextPage: number) {
    if (!token || nextPage < 1 || nextPage > totalPages) {
      return;
    }

    setPage(nextPage);
    void load(token, nextPage, search);
  }

  function openCustomer(customerCode: string) {
    router.push(
      `/staff/customers/${encodeURIComponent(customerCode)}`,
    );
  }

  const allSelected =
    customers.length > 0 &&
    selectedIds.length === customers.length;

  const someSelected =
    selectedIds.length > 0 &&
    selectedIds.length < customers.length;

  const selectedCount = selectedIds.length;

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
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
              >
                <circle cx="10" cy="7" r="3" />
                <path d="M3.5 17c.7-3 3.3-5 6.5-5s5.8 2 6.5 5" strokeLinecap="round" />
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

            <button
              type="button"
              disabled
              title="Coming soon"
              className="inline-flex h-8 items-center justify-center rounded-lg border border-[#d4d4d4] bg-white px-3 text-[13px] font-medium text-[#303030] shadow-xs hover:bg-[#f7f7f7] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Import
            </button>

            <Link
              href="/staff/customers/new"
              style={{ color: "#ffffff", backgroundColor: "#1a1a1a" }}
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg px-4 text-[13px] font-medium !text-white shadow-sm hover:!bg-[#303030] transition-colors active:!bg-[#000]"
            >
              <svg
                viewBox="0 0 16 16"
                fill="none"
                className="h-3.5 w-3.5"
              >
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

        {/* Body */}
        <div>
        {error ? (
          <div
            className="mb-4 flex items-start gap-2 rounded-lg border border-[#fed3d1] bg-[#fff4f4] px-4 py-2.5 text-[13px] text-[#8a1c14]"
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

        {/* Search bar */}
        <form onSubmit={submitSearch}>
          <div className="flex items-center gap-0 overflow-hidden rounded-xl border border-neutral-200 bg-white">
            <div className="flex items-center gap-1 border-r border-neutral-200 px-3 py-2 text-[13px] text-neutral-700">
              <span className="font-medium">All</span>
              <svg
                viewBox="0 0 16 16"
                fill="none"
                className="h-3.5 w-3.5 text-neutral-500"
                aria-hidden="true"
              >
                <path
                  d="m5 7 3-3 3 3M5 9l3 3 3-3"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <div className="relative flex-1">
              <svg
                viewBox="0 0 16 16"
                fill="none"
                className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-neutral-500"
                aria-hidden="true"
              >
                <circle
                  cx="7"
                  cy="7"
                  r="4.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <path
                  d="m10.5 10.5 3 3"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search customers"
                className="w-full bg-transparent py-2.5 pr-3 pl-9 text-[13px] text-neutral-800 outline-none placeholder:text-neutral-500"
              />
            </div>

            <div className="flex items-center gap-2 border-l border-neutral-200 px-3 py-2">
              <button
                type="submit"
                aria-label="Search"
                className="inline-flex h-7 w-7 items-center justify-center rounded-md text-neutral-600 hover:bg-neutral-100"
              >
                <svg
                  viewBox="0 0 16 16"
                  fill="none"
                  className="h-4 w-4"
                  aria-hidden="true"
                >
                  <circle
                    cx="7"
                    cy="7"
                    r="4.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                  <path
                    d="m10.5 10.5 3 3"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </button>

              <button
                type="button"
                aria-label="Toggle columns"
                className="inline-flex h-7 w-7 items-center justify-center rounded-md text-neutral-600 hover:bg-neutral-100"
              >
                <svg
                  viewBox="0 0 16 16"
                  fill="none"
                  className="h-4 w-4"
                  aria-hidden="true"
                >
                  <rect
                    x="2"
                    y="3"
                    width="12"
                    height="10"
                    rx="1.5"
                    stroke="currentColor"
                    strokeWidth="1.3"
                  />
                  <path
                    d="M10 3v10"
                    stroke="currentColor"
                    strokeWidth="1.3"
                  />
                </svg>
              </button>
            </div>
          </div>
        </form>

        {/* Bulk action bar */}
        {selectedCount > 0 ? (
          <div className="mt-3 flex items-center gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-[13px]">
            <span className="font-medium">
              {selectedCount} selected
            </span>
            <span className="text-neutral-400">·</span>
            <button
              type="button"
              disabled
              title="Coming soon"
              className="text-neutral-700 hover:underline disabled:opacity-60"
            >
              Add tags
            </button>
            <span className="text-neutral-400">·</span>
            <button
              type="button"
              disabled
              title="Coming soon"
              className="text-neutral-700 hover:underline disabled:opacity-60"
            >
              Subscribe to email
            </button>
            <span className="text-neutral-400">·</span>
            <button
              type="button"
              disabled
              title="Coming soon"
              className="text-neutral-700 hover:underline disabled:opacity-60"
            >
              Delete
            </button>
          </div>
        ) : null}

        {/* Table */}
        <div className="mt-3 overflow-hidden rounded-xl border border-neutral-200 bg-white">
          <div className="overflow-x-auto">
            <div className="min-w-[900px]">
              <div className="grid grid-cols-[36px_minmax(220px,2.4fr)_minmax(160px,1.2fr)_minmax(140px,1fr)_minmax(90px,0.7fr)_minmax(140px,1fr)] items-center gap-3 border-b border-neutral-200 bg-[#f7f7f7] px-4 py-2.5 text-[12px] font-medium text-neutral-600">
                <div className="flex justify-center">
                  <input
                    type="checkbox"
                    aria-label="Select all customers"
                    checked={allSelected}
                    ref={(element) => {
                      if (element)
                        element.indeterminate = someSelected;
                    }}
                    onChange={(event) =>
                      setSelectedIds(
                        event.target.checked
                          ? customers.map((c) => c.id)
                          : [],
                      )
                    }
                    className="h-3.5 w-3.5 rounded border-neutral-300 accent-neutral-800"
                  />
                </div>
                <div>Customer name</div>
                <div>Email subscription</div>
                <div>Location</div>
                <div className="text-right">Orders</div>
                <div className="text-right">
                  Amount spent
                </div>
              </div>

              {loading ? (
                <div className="flex items-center justify-center gap-2 py-16 text-[13px] text-neutral-500">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-800" />
                  Loading customers...
                </div>
              ) : customers.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-20 text-center">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    className="h-6 w-6 text-neutral-400"
                    aria-hidden="true"
                  >
                    <circle
                      cx="11"
                      cy="11"
                      r="7"
                      stroke="currentColor"
                      strokeWidth="1.6"
                    />
                    <path
                      d="m21 21-4.3-4.3"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                    />
                  </svg>
                  <p className="text-[13px] font-medium text-neutral-800">
                    No customers found
                  </p>
                  <p className="text-[13px] text-neutral-500">
                    {search
                      ? "Try a different search"
                      : "Try adding a customer to get started"}
                  </p>
                  {!search ? (
                    <Link
                      href="/staff/customers/new"
                      className="mt-1 text-[13px] font-medium text-blue-600 hover:underline"
                    >
                      Add customer
                    </Link>
                  ) : null}
                </div>
              ) : (
                customers.map((customer) => {
                  const checked = selectedIds.includes(
                    customer.id,
                  );

                  return (
                    <div
                      key={customer.id}
                      role="link"
                      tabIndex={0}
                      aria-label={`Open ${customerName(
                        customer,
                      )}`}
                      onClick={() =>
                        openCustomer(customer.customerCode)
                      }
                      onKeyDown={(event) => {
                        if (
                          event.key === "Enter" ||
                          event.key === " "
                        ) {
                          event.preventDefault();
                          openCustomer(
                            customer.customerCode,
                          );
                        }
                      }}
                      className="grid cursor-pointer grid-cols-[36px_minmax(220px,2.4fr)_minmax(160px,1.2fr)_minmax(140px,1fr)_minmax(90px,0.7fr)_minmax(140px,1fr)] items-center gap-3 border-b border-neutral-100 px-4 py-3 last:border-b-0 hover:bg-[#f7f7f7] focus-visible:bg-[#f7f7f7] focus-visible:outline-none"
                    >
                      <div
                        className="flex justify-center"
                        onClick={(event) =>
                          event.stopPropagation()
                        }
                      >
                        <input
                          type="checkbox"
                          aria-label={`Select ${customerName(
                            customer,
                          )}`}
                          checked={checked}
                          onChange={(event) =>
                            setSelectedIds((current) =>
                              event.target.checked
                                ? [...current, customer.id]
                                : current.filter(
                                  (id) =>
                                    id !== customer.id,
                                ),
                            )
                          }
                          className="h-3.5 w-3.5 rounded border-neutral-300 accent-neutral-800"
                        />
                      </div>

                      <div className="min-w-0">
                        <Link
                          href={`/staff/customers/${encodeURIComponent(
                            customer.customerCode,
                          )}`}
                          onClick={(event) =>
                            event.stopPropagation()
                          }
                          className="block truncate text-[13px] font-medium text-neutral-900 hover:underline"
                        >
                          {customerName(customer)}
                        </Link>
                        {customer.person.email ? (
                          <p className="mt-0.5 truncate text-[12px] text-neutral-500">
                            {customer.person.email}
                          </p>
                        ) : null}
                      </div>

                      <div>
                        {customer.emailMarketing ? (
                          <span className="inline-flex items-center rounded-md bg-[#a6e8b1] px-2 py-0.5 text-[12px] font-medium text-[#0b5c2a]">
                            Subscribed
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-md bg-neutral-100 px-2 py-0.5 text-[12px] font-medium text-neutral-600">
                            Not subscribed
                          </span>
                        )}
                      </div>

                      <div className="truncate text-[13px] text-neutral-700">
                        {customer.location?.country ?? "—"}
                      </div>

                      <div className="text-right text-[13px] text-neutral-800">
                        {customer.orderCount}
                      </div>

                      <div className="text-right text-[13px] text-neutral-800">
                        {money(customer.totalSpent)}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Footer + pagination */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[12px] text-neutral-500">
          <span>
            {total} customer{total === 1 ? "" : "s"}
            {total > 0
              ? ` · Page ${page} of ${totalPages}`
              : null}
          </span>

          {totalPages > 1 ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1 || loading}
                onClick={() => changePage(page - 1)}
                className="inline-flex h-7 items-center rounded-lg border border-neutral-200 bg-white px-3 text-[12px] font-medium text-neutral-800 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>

              <button
                type="button"
                disabled={page >= totalPages || loading}
                onClick={() => changePage(page + 1)}
                className="inline-flex h-7 items-center rounded-lg border border-neutral-200 bg-white px-3 text-[12px] font-medium text-neutral-800 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          ) : null}
        </div>
        </div>
      </div>
    </div>
  );
}