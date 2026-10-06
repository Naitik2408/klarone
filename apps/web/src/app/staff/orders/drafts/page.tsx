"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  clearStaffAccessToken,
  getStaffAccessToken,
} from "@/lib/staff-auth-api";
import {
  getStaffDrafts,
  StaffOrdersApiError,
} from "@/lib/staff-orders-api";
import type { StaffDraftListItem } from "@/types/staff-orders";

type TabKey = "all" | "open" | "invoice_sent" | "completed";

const TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "open", label: "Open" },
  { key: "invoice_sent", label: "Invoice sent" },
  { key: "completed", label: "Completed" },
];

const STATUS_OPTIONS = [
  { value: "", label: "All" },
  { value: "OPEN", label: "Open" },
  { value: "INVOICE_SENT", label: "Invoice sent" },
  { value: "COMPLETED", label: "Completed" },
] as const;

function money(value: string, currency: string) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return value;

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currency || "INR",
    maximumFractionDigits: 2,
  }).format(amount);
}

function customerName(draft: StaffDraftListItem) {
  if (!draft.customer?.person) return "No customer";
  return (
    [
      draft.customer.person.firstName,
      draft.customer.person.middleName,
      draft.customer.person.lastName,
    ]
      .filter(Boolean)
      .join(" ")
      .trim() || "Unnamed customer"
  );
}

function formatDraftTime(value: string) {
  const date = new Date(value);
  const now = new Date();

  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (isToday) {
    return date.toLocaleTimeString("en-IN", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

// Status badge matching order page Polaris style
function draftStatusBadge(status: string) {
  const upper = status.toUpperCase();

  if (upper === "OPEN") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#ffea8a] px-2 py-0.5 text-[11px] font-normal text-[#5c4b00]">
        <svg width="10" height="10" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="10" cy="10" r="7" />
        </svg>
        Open
      </span>
    );
  }
  if (upper === "INVOICE_SENT") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e0ecfc] px-2 py-0.5 text-[11px] font-normal text-[#123a91]">
        <svg width="10" height="10" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="10" cy="10" r="7" />
        </svg>
        Invoice sent
      </span>
    );
  }
  if (upper === "COMPLETED") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#cbf4c9] px-2 py-0.5 text-[11px] font-normal text-[#0e6245]">
        <svg width="10" height="10" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="10" cy="10" r="7" />
        </svg>
        Completed
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

export default function StaffDraftOrdersPage() {
  const router = useRouter();

  const [token, setToken] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<StaffDraftListItem[]>([]);

  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Filter dropdown state
  const [filterStatus, setFilterStatus] = useState("");
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Close the status dropdown when clicking outside
  useEffect(() => {
    if (!statusMenuOpen) return;
    function handleClick(event: MouseEvent) {
      const target = event.target as HTMLElement;
      if (!target.closest("[data-status-filter]")) {
        setStatusMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [statusMenuOpen]);

  function getEffectiveStatus(tab: TabKey) {
    if (filterStatus) return filterStatus;
    if (tab === "open") return "OPEN";
    if (tab === "invoice_sent") return "INVOICE_SENT";
    if (tab === "completed") return "COMPLETED";
    return undefined;
  }

  async function load(
    activeToken: string,
    currentPage: number,
    tab: TabKey = activeTab,
    searchTerm: string = search,
    statusOverride?: string,
  ) {
    try {
      setLoading(true);
      setError("");
      setSelectedIds([]);

      const statusParam =
        statusOverride !== undefined
          ? statusOverride || undefined
          : getEffectiveStatus(tab);

      const result = await getStaffDrafts(activeToken, {
        search: searchTerm.trim() || undefined,
        status: statusParam,
        page: currentPage,
        pageSize: 20,
      });

      setDrafts(result.drafts);
      setTotal(result.pagination.total);
      setTotalPages(Math.max(result.pagination.totalPages, 1));
    } catch (caught) {
      if (caught instanceof StaffOrdersApiError && caught.status === 401) {
        clearStaffAccessToken();
        router.replace("/staff/login");
        return;
      }
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to load draft orders.",
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
    void load(activeToken, 1, "all", "", "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  function handleTabChange(nextTab: TabKey) {
    setActiveTab(nextTab);
    setFilterStatus("");
    setPage(1);
    if (token) {
      void load(token, 1, nextTab, search, "");
    }
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setPage(1);
    void load(token, 1, activeTab, search, filterStatus);
  }

  function selectStatus(nextStatus: string) {
    setStatusMenuOpen(false);
    if (nextStatus === filterStatus) return;
    setFilterStatus(nextStatus);
    if (!token) return;
    setPage(1);
    void load(token, 1, activeTab, search, nextStatus);
  }

  function clearAllFilters() {
    setSearch("");
    setFilterStatus("");
    setActiveTab("all");
    setPage(1);
    if (token) {
      void load(token, 1, "all", "", "");
    }
  }

  function changePage(nextPage: number) {
    if (!token || nextPage < 1 || nextPage > totalPages) return;
    setPage(nextPage);
    void load(token, nextPage, activeTab, search, filterStatus);
  }

  function openDraft(draftNumber: string) {
    router.push(`/staff/orders/drafts/${encodeURIComponent(draftNumber)}`);
  }

  const allSelected =
    drafts.length > 0 && selectedIds.length === drafts.length;
  const someSelected =
    selectedIds.length > 0 && selectedIds.length < drafts.length;

  const hasActiveFilters =
    search.trim() !== "" ||
    activeTab !== "all" ||
    filterStatus !== "";

  const activeStatusLabel =
    STATUS_OPTIONS.find((option) => option.value === filterStatus)?.label ??
    "All";

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
                <path d="M14 3H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2Z" />
                <path d="M8 7h4M8 10h4M8 13h2" strokeLinecap="round" />
              </svg>
            </span>
            <h1 className="text-[20px] font-semibold text-[#1a1a1a]">Drafts</h1>
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
              href="/staff/orders/new"
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-[#1a1a1a] px-4 text-[13px] font-medium text-white shadow-sm hover:bg-[#303030] transition-colors active:bg-[#000]"
            >
              Create order
            </Link>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-[#fed3d1] bg-[#fff4f4] px-4 py-2.5 text-[13px] text-[#8a1c14]">
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="currentColor"
              className="shrink-0"
            >
              <path d="M8 1a7 7 0 1 0 7 7A7 7 0 0 0 8 1Zm-.75 4a.75.75 0 0 1 1.5 0v3.5a.75.75 0 0 1-1.5 0Zm.75 7a.875.875 0 1 1 .875-.875A.875.875 0 0 1 8 12Z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* ----------------- Search & Filter bar (matches Products / Orders page) ----------------- */}
        <div className="flex items-stretch gap-0 rounded-xl border border-neutral-200 bg-white">
          {/* Left: Status filter dropdown */}
          <div className="relative" data-status-filter>
            <button
              type="button"
              onClick={() => setStatusMenuOpen((open) => !open)}
              aria-haspopup="listbox"
              aria-expanded={statusMenuOpen}
              className="flex h-full items-center gap-1 border-r border-neutral-200 px-3 text-[13px] text-neutral-700 hover:bg-neutral-50"
            >
              <span className="font-medium">{activeStatusLabel}</span>
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
            </button>

            {statusMenuOpen ? (
              <div
                role="listbox"
                className="absolute top-full left-0 z-50 mt-1 w-40 overflow-hidden rounded-lg border border-neutral-200 bg-white py-1 shadow-lg"
              >
                {STATUS_OPTIONS.map((option) => (
                  <button
                    key={option.value || "all"}
                    type="button"
                    role="option"
                    aria-selected={filterStatus === option.value}
                    onClick={() => selectStatus(option.value)}
                    className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-[13px] hover:bg-neutral-50 ${
                      filterStatus === option.value
                        ? "font-medium text-neutral-900"
                        : "text-neutral-700"
                    }`}
                  >
                    {option.label}
                    {filterStatus === option.value ? (
                      <svg
                        viewBox="0 0 16 16"
                        fill="none"
                        className="h-3.5 w-3.5 text-neutral-800"
                        aria-hidden="true"
                      >
                        <path
                          d="m3.5 8.5 3 3 6-6.5"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    ) : null}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          {/* Center: Search input */}
          <div className="relative flex-1">
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
            <form onSubmit={handleSearchSubmit} className="h-full">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search and filter draft orders"
                className="h-full w-full bg-transparent py-2.5 pr-3 pl-9 text-[13px] text-neutral-800 outline-none placeholder:text-neutral-500"
              />
            </form>
          </div>

          {/* Right: Clear + Refresh */}
          <div className="flex items-center gap-2 border-l border-neutral-200 px-3 py-2">
            {/* Clear button */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="rounded-md border border-neutral-200 bg-white px-2 py-1 text-[12px] font-medium text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
              >
                Clear
              </button>
            )}

            {/* Refresh button matching product page */}
            <button
              type="button"
              onClick={() => {
                if (token)
                  void load(token, page, activeTab, search, filterStatus);
              }}
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

        {/* ----------------- Table Card (with matching gap) ----------------- */}
        <div className="mt-3 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-xs">
          {/* Bulk Action Bar */}
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-3 border-b border-[#e3e3e3] bg-[#f7f7f7] px-4 py-2 text-[13px]">
              <span className="font-semibold text-[#1a1a1a]">
                {selectedIds.length} selected
              </span>
              <span className="text-[#8c9196]">·</span>
              <button
                type="button"
                onClick={() => setSelectedIds([])}
                className="text-[#616161] hover:text-[#1a1a1a]"
              >
                Deselect all
              </button>
            </div>
          )}

          {/* Table Container */}
          <div className="overflow-x-auto">
            <div className="min-w-[800px]">
              {/* Header Row */}
              <div className="grid grid-cols-[40px_minmax(140px,1.5fr)_minmax(120px,1fr)_minmax(180px,1.5fr)_minmax(130px,1fr)_minmax(110px,1fr)] items-center gap-2 border-b border-[#e3e3e3] bg-[#fafafa] px-4 py-2.5 text-[12px] font-medium text-[#616161]">
                <div className="flex justify-center">
                  <input
                    type="checkbox"
                    aria-label="Select all drafts"
                    checked={allSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someSelected;
                    }}
                    onChange={(e) =>
                      setSelectedIds(
                        e.target.checked ? drafts.map((d) => d.id) : [],
                      )
                    }
                    className="h-4 w-4 rounded border-[#d4d4d4] accent-[#1a1a1a] cursor-pointer"
                  />
                </div>
                <div>Draft order</div>
                <div>Date</div>
                <div>Customer</div>
                <div>Status</div>
                <div className="text-right pr-2">Total</div>
              </div>

              {/* Rows */}
              {loading ? (
                <div className="flex items-center justify-center gap-2 py-20 text-[13px] text-[#616161]">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#d4d4d4] border-t-[#1a1a1a]" />
                  Loading drafts...
                </div>
              ) : drafts.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-20 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f1f1f1] text-[#8c9196]">
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 20 20"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    >
                      <path d="M14 3H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2Z" />
                      <path d="M8 7h4M8 10h4M8 13h2" strokeLinecap="round" />
                    </svg>
                  </div>
                  <p className="text-[14px] font-semibold text-[#1a1a1a]">
                    No drafts found
                  </p>
                  <p className="max-w-sm text-[13px] text-[#616161]">
                    {hasActiveFilters
                      ? "Try changing your search term or clearing some filters."
                      : "Draft orders allow you to create custom quotes and invoices for customers."}
                  </p>
                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={clearAllFilters}
                      className="mt-2 text-[13px] font-medium text-[#005bd3] hover:underline"
                    >
                      Clear all filters
                    </button>
                  )}
                </div>
              ) : (
                drafts.map((draft) => {
                  const checked = selectedIds.includes(draft.id);

                  return (
                    <div
                      key={draft.id}
                      onClick={() => openDraft(draft.draftNumber)}
                      className={`grid cursor-pointer grid-cols-[40px_minmax(140px,1.5fr)_minmax(120px,1fr)_minmax(180px,1.5fr)_minmax(130px,1fr)_minmax(110px,1fr)] items-center gap-2 border-b border-[#f1f1f1] px-4 py-3 transition-colors hover:bg-[#f7f7f7] ${
                        checked ? "bg-[#f2f7fe]" : "bg-white"
                      }`}
                    >
                      {/* Checkbox */}
                      <div
                        className="flex justify-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) =>
                            setSelectedIds((curr) =>
                              e.target.checked
                                ? [...curr, draft.id]
                                : curr.filter((id) => id !== draft.id),
                            )
                          }
                          className="h-4 w-4 rounded border-[#d4d4d4] accent-[#1a1a1a] cursor-pointer"
                        />
                      </div>

                      {/* Draft Number */}
                      <div className="min-w-0 pr-2">
                        <Link
                          href={`/staff/orders/drafts/${encodeURIComponent(
                            draft.draftNumber,
                          )}`}
                          onClick={(e) => e.stopPropagation()}
                          className="font-medium text-[#1a1a1a] hover:underline truncate block"
                        >
                          {draft.draftNumber}
                        </Link>
                      </div>

                      {/* Date */}
                      <div className="whitespace-nowrap text-[12px] font-normal text-[#616161]">
                        {formatDraftTime(draft.createdAt)}
                      </div>

                      {/* Customer */}
                      <div className="min-w-0 pr-2">
                        <div className="truncate font-normal text-[#303030]">
                          {customerName(draft)}
                        </div>
                      </div>

                      {/* Status */}
                      <div>{draftStatusBadge(draft.status)}</div>

                      {/* Total */}
                      <div className="text-right pr-2 font-normal text-[#1a1a1a]">
                        {money(draft.totalAmount, draft.currency)}
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
              Showing {drafts.length} of {total} draft{total === 1 ? "" : "s"}
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

        {/* Learn more helper */}
        <div className="mt-6 text-center text-[12px] text-[#616161]">
          <span>Learn more about </span>
          <a href="#" className="text-[#303030] font-medium hover:underline">
            managing draft orders
          </a>
        </div>
      </div>
    </div>
  );
}