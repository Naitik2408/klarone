"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getStaffAccessToken } from "@/lib/staff-auth-api";
import {
  getStaffCollections,
  type StaffCollectionListItem,
} from "@/lib/staff-catalogue-api";

export default function StaffCollectionsListPage() {
  const router = useRouter();
  const [collections, setCollections] = useState<StaffCollectionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const token = getStaffAccessToken();
    if (!token) {
      router.replace("/staff/login");
      return;
    }

    void load(token, 1, "");
  }, [router]);

  async function load(token: string, targetPage: number, q: string) {
    setLoading(true);
    try {
      const data = await getStaffCollections(token, {
        search: q,
        page: targetPage,
        pageSize: 20,
      });
      setCollections(data.items);
      setTotal(data.pagination.total);
      setTotalPages(Math.max(data.pagination.totalPages, 1));
      setPage(data.pagination.page);
    } catch {
      setCollections([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }

  function changePage(nextPage: number) {
    const token = getStaffAccessToken();
    if (!token || nextPage < 1 || nextPage > totalPages || nextPage === page) return;
    void load(token, nextPage, search);
  }

  const allSelected =
    collections.length > 0 && selectedIds.length === collections.length;
  const someSelected =
    selectedIds.length > 0 && selectedIds.length < collections.length;

  function toggleSelectAll(checked: boolean) {
    if (checked) {
      setSelectedIds(collections.map((c) => c.id));
    } else {
      setSelectedIds([]);
    }
  }

  function toggleSelectRow(id: number, e: React.MouseEvent) {
    e.stopPropagation();
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  }

  return (
    <div className="min-h-screen bg-white text-[13px] text-[#303030]">
      <div className="mx-auto max-w-[1400px] px-6 pt-5 pb-6">
        {/* Top Header */}
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
                <path
                  d="M3 6.2 10 3l7 3.2-7 3.2L3 6.2Z"
                  strokeLinejoin="round"
                />
                <path
                  d="M3 10.2 10 13.4l7-3.2M3 13.8 10 17l7-3.2"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <h1 className="text-[20px] font-semibold text-[#1a1a1a]">Collections</h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => router.push("/staff/catalogue/collections/new")}
              style={{ color: "#ffffff", backgroundColor: "#1a1a1a" }}
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg px-3.5 text-[13px] font-medium !text-white shadow-sm hover:!bg-[#303030] transition-colors active:!bg-[#000]"
            >
              Add collection
            </button>
          </div>
        </div>

        {/* Filter / Search Bar */}
        <div className="flex items-stretch gap-0 rounded-xl border border-neutral-200 bg-white">
          <div className="flex items-center gap-1 border-r border-neutral-200 px-3 text-[13px] font-medium text-neutral-700 bg-neutral-50/40">
            <span>All</span>
            <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5 text-neutral-500">
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
              onChange={(e) => {
                setSearch(e.target.value);
                const token = getStaffAccessToken();
                if (token) void load(token, 1, e.target.value);
              }}
              placeholder="Search and filter collections"
              className="h-full w-full bg-transparent py-2.5 pr-3 pl-9 text-[13px] text-neutral-800 outline-none placeholder:text-neutral-500"
            />
          </div>
        </div>

        {/* Collections Table: Clean, no action button, full-row clickable */}
        <div className="mt-3 overflow-hidden rounded-xl border border-neutral-200 bg-white">
          <div className="overflow-x-auto">
            <div className="min-w-[640px]">
              {/* Header */}
              <div className="grid grid-cols-[44px_minmax(280px,3fr)_minmax(120px,1fr)_minmax(120px,1fr)] items-center gap-3 border-b border-neutral-200 bg-[#f7f7f7] px-4 py-2.5 text-[12px] font-medium text-neutral-600">
                <div className="flex justify-center">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someSelected;
                    }}
                    onChange={(e) => toggleSelectAll(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-neutral-300 accent-neutral-800"
                  />
                </div>
                <div>Title</div>
                <div>Products</div>
                <div className="text-right pr-2">Status</div>
              </div>

              {/* Rows */}
              {loading ? (
                <div className="flex items-center justify-center gap-2 py-16 text-[13px] text-neutral-500">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-800" />
                  Loading collections...
                </div>
              ) : collections.length === 0 ? (
                <div className="py-20 text-center text-neutral-500">
                  No collections found. Click &ldquo;Add collection&rdquo; to create one.
                </div>
              ) : (
                <div className="divide-y divide-neutral-100">
                  {collections.map((item) => (
                    <div
                      key={item.id}
                      onClick={() =>
                        router.push(`/staff/catalogue/collections/${item.id}`)
                      }
                      className="grid grid-cols-[44px_minmax(280px,3fr)_minmax(120px,1fr)_minmax(120px,1fr)] items-center gap-3 px-4 py-3 hover:bg-[#fbfbfb] cursor-pointer transition-colors group"
                    >
                      <div
                        className="flex justify-center"
                        onClick={(e) => toggleSelectRow(item.id, e)}
                      >
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(item.id)}
                          onChange={() => {}}
                          className="h-3.5 w-3.5 rounded border-neutral-300 accent-neutral-800"
                        />
                      </div>

                      {/* Title + Thumbnail */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-neutral-200 bg-neutral-50 overflow-hidden">
                          {item.bannerImage ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={item.bannerImage}
                              alt={item.title}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <svg
                              viewBox="0 0 20 20"
                              fill="none"
                              className="h-4 w-4 text-neutral-400"
                            >
                              <rect
                                x="3"
                                y="3"
                                width="14"
                                height="14"
                                rx="2"
                                stroke="currentColor"
                                strokeWidth="1.5"
                              />
                              <circle cx="7.5" cy="7.5" r="1.5" fill="currentColor" />
                              <path
                                d="m3.5 14.5 4-4 3 3 2.5-2.5 3.5 3.5"
                                stroke="currentColor"
                                strokeWidth="1.5"
                              />
                            </svg>
                          )}
                        </div>
                        <div className="min-w-0">
                          <span className="font-medium text-neutral-900 group-hover:underline block truncate">
                            {item.title}
                          </span>
                          {item.description && (
                            <span className="text-[11.5px] text-neutral-500 truncate block">
                              {item.description}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Products count */}
                      <div className="text-neutral-600">
                        <span className="inline-flex items-center rounded-md bg-neutral-100 px-2 py-0.5 text-[11.5px] font-medium text-neutral-700">
                          {item.productCount} {item.productCount === 1 ? "product" : "products"}
                        </span>
                      </div>

                      {/* Status */}
                      <div className="text-right pr-2">
                        {item.status === "ACTIVE" ? (
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
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f1f1f1] px-2.5 py-0.5 text-[11px] font-normal text-[#616161]">
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
                            {item.status}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Pagination Footer */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e3e3e3] px-4 py-3 bg-white text-[12px] text-[#616161]">
            <div>
              Showing {collections.length} of {total} collection{total === 1 ? "" : "s"}
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

        {/* Footer info */}
        {total > 0 ? (
          <div className="mt-3 flex items-center justify-between text-[12px] text-neutral-500">
            <span>
              {total} {total === 1 ? "collection" : "collections"} total
            </span>
            {selectedIds.length > 0 ? (
              <span>{selectedIds.length} selected</span>
            ) : (
              <span>Click a collection to view products and edit rules</span>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
