"use client";

import Link from "next/link";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  clearStaffAccessToken,
  getStaffAccessToken,
} from "../../../../lib/staff-auth-api";

import {
  deleteStaffProduct,
  getCatalogueBrands,
  getCatalogueCategories,
  getStaffProducts,
  publishStaffProduct,
  StaffCatalogueApiError,
} from "../../../../lib/staff-catalogue-api";

import type {
  StaffCatalogueBrand,
  StaffCatalogueCategory,
  StaffCatalogueProduct,
} from "../../../../types/staff-catalogue";

function money(value: string | null) {
  if (value === null) return "—";
  const amount = Number(value);
  if (!Number.isFinite(amount)) return value;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

const STATUS_OPTIONS = [
  { value: "ALL", label: "All" },
  { value: "PUBLISHED", label: "Active" },
  { value: "DRAFT", label: "Draft" },
] as const;

export default function StaffCatalogueProductsPage() {
  const router = useRouter();

  const [token, setToken] = useState<string | null>(null);
  const [products, setProducts] = useState<StaffCatalogueProduct[]>([]);
  const [brands, setBrands] = useState<StaffCatalogueBrand[]>([]);
  const [categories, setCategories] = useState<StaffCatalogueCategory[]>([]);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [productToDelete, setProductToDelete] = useState<StaffCatalogueProduct | null>(null);

  async function handleDeleteProduct(targetProduct: StaffCatalogueProduct) {
    if (!token) return;
    setDeletingId(targetProduct.id);
    setError("");
    try {
      await deleteStaffProduct(token, targetProduct.id);
      setProductToDelete(null);
      await loadProducts(token, page, search, status);
    } catch (err) {
      if (err instanceof StaffCatalogueApiError && err.status === 401) {
        clearStaffAccessToken();
        router.replace("/staff/login");
        return;
      }
      setError(
        err instanceof Error ? err.message : "Unable to delete product.",
      );
      setProductToDelete(null);
    } finally {
      setDeletingId(null);
    }
  }

  async function loadProducts(
    activeToken: string,
    targetPage = page,
    nextSearch = search,
    nextStatus = status,
  ) {
    setSelectedProductIds([]);
    try {
      setLoading(true);
      setError("");
      const result = await getStaffProducts(activeToken, {
        search: nextSearch,
        status: nextStatus,
        page: targetPage,
        pageSize: 20,
      });
      setProducts(result.items);
      setTotal(result.pagination.total);
      setTotalPages(Math.max(result.pagination.totalPages, 1));
      setPage(result.pagination.page);
    } catch (error) {
      if (error instanceof StaffCatalogueApiError && error.status === 401) {
        clearStaffAccessToken();
        router.replace("/staff/login");
        return;
      }
      setError(
        error instanceof Error ? error.message : "Unable to load catalogue.",
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
    const staffToken = activeToken;
    setToken(staffToken);

    async function load() {
      try {
        setError("");
        const [brandResult, categoryResult] = await Promise.all([
          getCatalogueBrands(),
          getCatalogueCategories(),
          loadProducts(staffToken, 1, "", "ALL"),
        ]);
        setBrands(brandResult);
        setCategories(categoryResult);
      } catch (error) {
        if (error instanceof StaffCatalogueApiError && error.status === 401) {
          clearStaffAccessToken();
          router.replace("/staff/login");
          return;
        }
        setError(
          error instanceof Error
            ? error.message
            : "Unable to load staff catalogue.",
        );
        setLoading(false);
      }
    }

    void load();
  }, [router]);

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

  function openCreate() {
    router.push("/staff/catalogue/products/new");
  }

  function changePage(nextPage: number) {
    if (!token || nextPage < 1 || nextPage > totalPages || nextPage === page) return;
    void loadProducts(token, nextPage, search, status);
  }

  function selectStatus(nextStatus: string) {
    setStatusMenuOpen(false);
    if (nextStatus === status) return;
    setStatus(nextStatus);
    if (token) void loadProducts(token, 1, search, nextStatus);
  }

  async function publishProduct(productId: string) {
    if (!token) return;
    setSaving(true);
    setError("");
    try {
      await publishStaffProduct(token, productId);
      await loadProducts(token, page, search, status);
    } catch (error) {
      if (error instanceof StaffCatalogueApiError && error.status === 401) {
        clearStaffAccessToken();
        router.replace("/staff/login");
        return;
      }
      setError(
        error instanceof Error ? error.message : "Unable to publish product.",
      );
    } finally {
      setSaving(false);
    }
  }

  const allSelected =
    products.length > 0 && selectedProductIds.length === products.length;
  const someSelected =
    selectedProductIds.length > 0 &&
    selectedProductIds.length < products.length;

  const activeStatusLabel =
    STATUS_OPTIONS.find((option) => option.value === status)?.label ?? "All";

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
            <h1 className="text-[20px] font-semibold text-[#1a1a1a]">
              Products
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
              onClick={openCreate}
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
                Add product
              </span>
            </button>
          </div>
        </div>

        {/* Body */}
        <div>
        {error ? (
          <div
            className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700"
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

        {/* Search + filter bar */}
        <div className="flex items-stretch gap-0 rounded-xl border border-neutral-200 bg-white">
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
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={status === option.value}
                    onClick={() => selectStatus(option.value)}
                    className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-[13px] hover:bg-neutral-50 ${
                      status === option.value
                        ? "font-medium text-neutral-900"
                        : "text-neutral-700"
                    }`}
                  >
                    {option.label}
                    {status === option.value ? (
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
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && token) {
                  void loadProducts(token, 1, search, status);
                }
              }}
              placeholder="Search and filter"
              className="h-full w-full bg-transparent py-2.5 pr-3 pl-9 text-[13px] text-neutral-800 outline-none placeholder:text-neutral-500"
            />
          </div>

          <div className="flex items-center gap-2 border-l border-neutral-200 px-3 py-2">
            <button
              type="button"
              onClick={() => token && void loadProducts(token, 1, search, status)}
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
            <div className="min-w-[960px]">
              <div className="grid grid-cols-[36px_minmax(260px,2.5fr)_minmax(110px,0.9fr)_minmax(140px,1fr)_minmax(120px,0.9fr)_minmax(80px,0.7fr)_minmax(110px,0.9fr)_44px] items-center gap-3 border-b border-neutral-200 bg-[#f7f7f7] px-4 py-2.5 text-[12px] font-medium text-neutral-600">
                <div className="flex justify-center">
                  <input
                    type="checkbox"
                    aria-label="Select all products"
                    checked={allSelected}
                    ref={(element) => {
                      if (element) element.indeterminate = someSelected;
                    }}
                    onChange={(event) =>
                      setSelectedProductIds(
                        event.target.checked
                          ? products.map((product) => product.id)
                          : [],
                      )
                    }
                    className="h-3.5 w-3.5 rounded border-neutral-300 accent-neutral-800"
                  />
                </div>
                <div>Product</div>
                <div>Status</div>
                <div>Inventory</div>
                <div>Category</div>
                <div>Variants</div>
                <div>Price from</div>
                <div className="text-right sr-only">Actions</div>
              </div>

              {loading ? (
                <div className="flex items-center justify-center gap-2 py-16 text-[13px] text-neutral-500">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-800" />
                  Loading products...
                </div>
              ) : products.length === 0 ? (
                <div className="py-20 text-center">
                  <p className="text-[13px] text-neutral-500">
                    {search || status !== "ALL"
                      ? "No products match your search or filters"
                      : "Learn more about products"}
                  </p>
                  {!search && status === "ALL" ? (
                    <button
                      type="button"
                      onClick={openCreate}
                      className="mt-3 text-[13px] font-medium text-blue-600 hover:underline"
                    >
                      Add product
                    </button>
                  ) : null}
                </div>
              ) : (
                products.map((product) => {
                  const isPublished = product.status === "PUBLISHED";
                  return (
                    <div
                      key={product.id}
                      role="link"
                      tabIndex={0}
                      aria-label={`Open ${product.name}`}
                      onClick={() =>
                        router.push(`/staff/catalogue/products/${product.id}`)
                      }
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          router.push(
                            `/staff/catalogue/products/${product.id}`,
                          );
                        }
                      }}
                      className="grid cursor-pointer grid-cols-[36px_minmax(260px,2.5fr)_minmax(110px,0.9fr)_minmax(140px,1fr)_minmax(120px,0.9fr)_minmax(80px,0.7fr)_minmax(110px,0.9fr)_44px] items-center gap-3 border-b border-neutral-100 px-4 py-3 last:border-b-0 hover:bg-[#f7f7f7] focus-visible:bg-[#f7f7f7] focus-visible:outline-none"
                    >
                      <div
                        className="flex justify-center"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          aria-label={`Select ${product.name}`}
                          checked={selectedProductIds.includes(product.id)}
                          onChange={(event) =>
                            setSelectedProductIds((current) =>
                              event.target.checked
                                ? [...current, product.id]
                                : current.filter((id) => id !== product.id),
                            )
                          }
                          className="h-3.5 w-3.5 rounded border-neutral-300 accent-neutral-800"
                        />
                      </div>

                      <div className="flex min-w-0 items-center gap-2.5">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md border border-neutral-200 bg-neutral-100 text-[11px] font-semibold text-neutral-500">
                          {product.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={product.imageUrl}
                              alt={product.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            product.name.slice(0, 2).toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0">
                          <Link
                            href={`/staff/catalogue/products/${product.id}`}
                            onClick={(event) => event.stopPropagation()}
                            className="block truncate text-[13px] font-medium text-neutral-900 hover:underline"
                          >
                            {product.name}
                          </Link>
                          {product.modelNumber ||
                          product.manufacturerPartNumber ? (
                            <p className="mt-0.5 truncate text-[12px] text-neutral-500">
                              {product.modelNumber ||
                                product.manufacturerPartNumber}
                            </p>
                          ) : null}
                        </div>
                      </div>

                      <div>
                        {isPublished ? (
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
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#ffea8a] px-2.5 py-0.5 text-[11px] font-normal text-[#5c4b00]">
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
                            {product.status === "DRAFT" ? "Draft" : product.status}
                          </span>
                        )}
                      </div>

                      <div className="text-[13px] text-neutral-800">
                        {product.quantityAvailable > 0 ? (
                          `${product.quantityAvailable} in stock`
                        ) : (
                          <span className="text-red-600">Out of stock</span>
                        )}
                      </div>

                      <div className="truncate text-[13px] text-neutral-700">
                        {product.category?.name ?? "—"}
                      </div>

                      <div className="text-[13px] text-neutral-700">
                        {product.variantCount}
                      </div>

                      <div className="text-[13px] text-neutral-800">
                        {money(product.lowestSellingPrice)}
                      </div>

                      <div
                        className="flex justify-end"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <button
                          type="button"
                          title={`Delete ${product.name}`}
                          disabled={deletingId === product.id}
                          onClick={() => setProductToDelete(product)}
                          className="flex h-7 w-7 items-center justify-center rounded-md text-neutral-400 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50"
                        >
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M3 6h18" />
                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                          </svg>
                        </button>
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
              Showing {products.length} of {total} product{total === 1 ? "" : "s"}
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

        {/* Delete Confirmation Modal */}
        {productToDelete ? (
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
                    <line x1="10" y1="11" x2="10" y2="17" />
                    <line x1="14" y1="11" x2="14" y2="17" />
                  </svg>
                </span>
                <div>
                  <h3 className="text-[15px] font-semibold text-neutral-900">
                    Delete &ldquo;{productToDelete.name}&rdquo;?
                  </h3>
                  <p className="mt-0.5 text-[12.5px] text-neutral-500">
                    Are you sure you want to delete this product? All variants, option combinations, and associated media will be deleted permanently.
                  </p>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setProductToDelete(null)}
                  disabled={Boolean(deletingId)}
                  className="rounded-lg border border-neutral-200 bg-white px-3.5 py-2 text-[13px] font-medium text-neutral-700 hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleDeleteProduct(productToDelete)}
                  disabled={Boolean(deletingId)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-[13px] font-medium text-white shadow-xs hover:bg-red-700 disabled:opacity-50"
                >
                  {deletingId === productToDelete.id ? (
                    <>
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                      Deleting…
                    </>
                  ) : (
                    "Delete product"
                  )}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {/* Footer count */}
        {total > 0 ? (
          <div className="mt-3 flex items-center justify-between text-[12px] text-neutral-500">
            <span>
              {total} {total === 1 ? "product" : "products"} total
            </span>
            {selectedProductIds.length > 0 ? (
              <span>{selectedProductIds.length} selected on this page</span>
            ) : (
              <span>Click a product to view or edit its details</span>
            )}
          </div>
        ) : null}
        </div>
      </div>
    </div>
  );
}