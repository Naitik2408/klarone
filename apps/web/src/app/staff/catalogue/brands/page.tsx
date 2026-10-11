"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  clearStaffAccessToken,
  getStaffAccessToken,
} from "@/lib/staff-auth-api";
import {
  createStaffBrand,
  deactivateStaffBrand,
  deleteStaffBrand,
  getStaffBrands,
  StaffCatalogueApiError,
  updateStaffBrand,
} from "@/lib/staff-catalogue-api";
import type { StaffBrandListItem } from "@/types/staff-catalogue";

const inputClass =
  "w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-[13px] text-neutral-900 outline-none transition placeholder:text-neutral-400 hover:border-neutral-300 focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

type EditorState =
  | { mode: "closed" }
  | { mode: "create" }
  | { mode: "edit"; brand: StaffBrandListItem };

type StatusKey = "ALL" | "ACTIVE" | "INACTIVE";

const STATUS_OPTIONS: { value: StatusKey; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
];

export default function StaffCatalogueBrandsPage() {
  const router = useRouter();

  const [token, setToken] = useState<string | null>(null);
  const [brands, setBrands] = useState<StaffBrandListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusKey>("ALL");
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editor, setEditor] = useState<EditorState>({ mode: "closed" });

  const [formName, setFormName] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [formDescription, setFormDescription] = useState("");
  const [formLogoUrl, setFormLogoUrl] = useState("");
  const [formWebsiteUrl, setFormWebsiteUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  function handleLogoFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const src = event.target?.result as string;
      if (!src) return;

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 400;
        const scale = Math.min(1, MAX_WIDTH / img.width);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        const compressed = canvas.toDataURL("image/png");
        setFormLogoUrl(compressed);
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  }

  useEffect(() => {
    const activeToken = getStaffAccessToken();
    if (!activeToken) {
      router.replace("/staff/login");
      return;
    }
    setToken(activeToken);
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

  async function load(
    activeToken: string,
    targetPage = page,
    searchOverride?: string,
    statusOverride?: StatusKey,
  ) {
    setLoading(true);
    setError("");
    try {
      const effectiveSearch = searchOverride !== undefined ? searchOverride : search;
      const effectiveStatus = statusOverride !== undefined ? statusOverride : status;

      const result = await getStaffBrands(activeToken, {
        search: effectiveSearch.trim() || undefined,
        status: effectiveStatus === "ALL" ? undefined : effectiveStatus,
        page: targetPage,
        pageSize: 20,
      });
      setBrands(result.items);
      setTotal(result.pagination.total);
      setTotalPages(Math.max(result.pagination.totalPages, 1));
      setPage(result.pagination.page);
    } catch (caught) {
      if (
        caught instanceof StaffCatalogueApiError &&
        caught.status === 401
      ) {
        clearStaffAccessToken();
        router.replace("/staff/login");
        return;
      }
      setError(
        caught instanceof Error ? caught.message : "Unable to load brands.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!token) return;
    void load(token, 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  function changePage(nextPage: number) {
    if (!token || nextPage < 1 || nextPage > totalPages || nextPage === page) return;
    void load(token, nextPage);
  }

  function selectStatus(nextStatus: StatusKey) {
    setStatusMenuOpen(false);
    if (nextStatus === status) return;
    setStatus(nextStatus);
    if (token) void load(token, 1, search, nextStatus);
  }

  function clearAllFilters() {
    setSearch("");
    setStatus("ALL");
    if (token) void load(token, 1, "", "ALL");
  }

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function openCreate() {
    setFormName("");
    setFormSlug("");
    setSlugManuallyEdited(false);
    setFormDescription("");
    setFormLogoUrl("");
    setFormWebsiteUrl("");
    setFormError("");
    setFieldErrors({});
    setEditor({ mode: "create" });
  }

  function openEdit(brand: StaffBrandListItem) {
    setFormName(brand.name);
    setFormSlug(brand.slug);
    setSlugManuallyEdited(true);
    setFormDescription(brand.description ?? "");
    setFormLogoUrl(brand.logoUrl ?? "");
    setFormWebsiteUrl(brand.websiteUrl ?? "");
    setFormError("");
    setFieldErrors({});
    setEditor({ mode: "edit", brand });
  }

  function closeEditor() {
    if (saving) return;
    setFieldErrors({});
    setEditor({ mode: "closed" });
  }

  async function submit() {
    if (!token) return;

    const trimmedName = formName.trim();
    if (!trimmedName) {
      setFieldErrors({ name: "Brand name is required." });
      return;
    }

    if (formDescription.trim().length > 500) {
      setFieldErrors({
        description: `Description is too long (${formDescription.trim().length}/500 characters).`,
      });
      return;
    }

    setSaving(true);
    setFormError("");
    setFieldErrors({});
    setError("");
    setNotice("");

    try {
      if (editor.mode === "create") {
        await createStaffBrand(token, {
          name: trimmedName,
          slug: formSlug.trim() || undefined,
          description: formDescription.trim() || null,
          logoUrl: formLogoUrl.trim() || null,
          websiteUrl: formWebsiteUrl.trim() || null,
        });
        setNotice(`Brand "${trimmedName}" created.`);
      } else if (editor.mode === "edit") {
        await updateStaffBrand(token, editor.brand.id, {
          name: trimmedName,
          slug: formSlug.trim() || undefined,
          description: formDescription.trim() || null,
          logoUrl: formLogoUrl.trim() || null,
          websiteUrl: formWebsiteUrl.trim() || null,
        });
        setNotice(`Brand "${trimmedName}" updated.`);
      }

      setEditor({ mode: "closed" });
      await load(token);
    } catch (caught) {
      const msg = caught instanceof Error ? caught.message : "Unable to save brand.";
      const lower = msg.toLowerCase();
      if (lower.includes("name")) {
        setFieldErrors({ name: msg });
      } else if (lower.includes("slug")) {
        setFieldErrors({ slug: msg });
      } else {
        setFormError(msg);
      }
    } finally {
      setSaving(false);
    }
  }

  async function deleteBrandAction(brand: StaffBrandListItem) {
    if (!token) return;

    if (brand.productCount > 0) {
      window.alert(
        `Cannot delete brand "${brand.name}" because it is currently assigned to ${brand.productCount} product${
          brand.productCount === 1 ? "" : "s"
        }.\n\nStandard E-commerce Rule: To prevent broken customer orders and orphaned products, you must reassign or delete those products first, or click "Deactivate brand" instead.`
      );
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to permanently delete brand "${brand.name}"? This action cannot be undone.`
    );
    if (!confirmed) return;

    setError("");
    setNotice("");
    try {
      await deleteStaffBrand(token, brand.id);
      setNotice(`Brand "${brand.name}" permanently deleted.`);
      closeEditor();
      await load(token);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to delete brand."
      );
    }
  }

  async function deactivate(brand: StaffBrandListItem) {
    if (!token) return;

    const confirmed = window.confirm(
      brand.productCount > 0
        ? `Deactivate "${brand.name}"? It is currently referenced by ${brand.productCount} product${brand.productCount === 1 ? "" : "s"}. Existing products keep the brand, but it will no longer appear as selectable for new products.`
        : `Deactivate "${brand.name}"?`,
    );
    if (!confirmed) return;

    setError("");
    setNotice("");
    try {
      await deactivateStaffBrand(token, brand.id);
      setNotice(`Brand "${brand.name}" deactivated.`);
      await load(token);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to deactivate brand.",
      );
    }
  }

  async function reactivate(brand: StaffBrandListItem) {
    if (!token) return;
    setError("");
    setNotice("");
    try {
      await updateStaffBrand(token, brand.id, { status: "ACTIVE" });
      setNotice(`Brand "${brand.name}" reactivated.`);
      await load(token);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to reactivate brand.",
      );
    }
  }

  const filteredEmpty = useMemo(
    () => !loading && brands.length === 0,
    [loading, brands],
  );

  const hasActiveFilters = search.trim() !== "" || status !== "ALL";

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
                <path d="M10.5 3H5.5A1.5 1.5 0 0 0 4 4.5v5a1.5 1.5 0 0 0 .44 1.06l6.5 6.5a1.5 1.5 0 0 0 2.12 0l3.88-3.88a1.5 1.5 0 0 0 0-2.12l-6.5-6.5A1.5 1.5 0 0 0 9.38 3H10.5Z" strokeLinejoin="round" />
                <circle cx="7.5" cy="6.5" r="1" fill="currentColor" />
              </svg>
            </span>
            <h1 className="text-[20px] font-semibold text-[#1a1a1a]">
              Brands
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
                Add brand
              </span>
            </button>
          </div>
        </div>

        {/* Error / notice messages */}
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
        {notice && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-[13px] text-emerald-700">
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="currentColor"
              className="shrink-0"
            >
              <path d="M8 1a7 7 0 1 0 7 7A7 7 0 0 0 8 1Zm3.28 5.28-4 4a.75.75 0 0 1-1.06 0l-2-2a.75.75 0 1 1 1.06-1.06L6.75 8.69l3.47-3.47a.75.75 0 1 1 1.06 1.06Z" />
            </svg>
            <span>{notice}</span>
          </div>
        )}

        {/* ----------------- Search & Filter bar ----------------- */}
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
            <form
              className="h-full"
              onSubmit={(e) => {
                e.preventDefault();
                if (token) void load(token, 1, search, status);
              }}
            >
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search brands by name or slug"
                className="h-full w-full bg-transparent py-2.5 pr-3 pl-9 text-[13px] text-neutral-800 outline-none placeholder:text-neutral-500"
              />
            </form>
          </div>

          {/* Right: Clear + Refresh */}
          <div className="flex items-center gap-2 border-l border-neutral-200 px-3 py-2">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="rounded-md border border-neutral-200 bg-white px-2 py-1 text-[12px] font-medium text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
              >
                Clear
              </button>
            )}

            <button
              type="button"
              onClick={() => token && void load(token, page)}
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
          <div className="overflow-x-auto">
            <div className="min-w-[700px]">
              {/* Header Row */}
              <div className="grid grid-cols-[minmax(280px,3fr)_minmax(160px,1.5fr)_minmax(120px,1fr)_minmax(100px,1fr)] items-center gap-3 border-b border-neutral-200 bg-[#f7f7f7] px-4 py-2.5 text-[12px] font-medium text-neutral-600">
                <div>Brand</div>
                <div>Slug</div>
                <div>Products</div>
                <div className="text-right pr-2">Status</div>
              </div>

              {/* Rows */}
              {loading ? (
                <div className="flex items-center justify-center gap-2 py-20 text-[13px] text-neutral-500">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-800" />
                  Loading brands…
                </div>
              ) : filteredEmpty ? (
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
                      <path d="M4 6.5A1.5 1.5 0 0 1 5.5 5h9A1.5 1.5 0 0 1 16 6.5v8A1.5 1.5 0 0 1 14.5 16h-9A1.5 1.5 0 0 1 4 14.5v-8Z" />
                      <path d="M7 3.5h6" strokeLinecap="round" />
                    </svg>
                  </div>
                  <p className="text-[14px] font-semibold text-[#1a1a1a]">
                    No brands found
                  </p>
                  <p className="max-w-sm text-[13px] text-[#616161]">
                    {hasActiveFilters
                      ? "Try changing your search term or clearing some filters."
                      : "Add your first brand to start organizing the catalogue."}
                  </p>
                  {hasActiveFilters ? (
                    <button
                      type="button"
                      onClick={clearAllFilters}
                      className="mt-2 text-[13px] font-medium text-[#005bd3] hover:underline"
                    >
                      Clear all filters
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={openCreate}
                      className="mt-2 text-[13px] font-medium text-[#005bd3] hover:underline"
                    >
                      Add brand
                    </button>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-neutral-100">
                  {brands.map((brand) => (
                    <div
                      key={brand.id}
                      role="link"
                      tabIndex={0}
                      onClick={() => openEdit(brand)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          openEdit(brand);
                        }
                      }}
                      className="grid grid-cols-[minmax(280px,3fr)_minmax(160px,1.5fr)_minmax(120px,1fr)_minmax(100px,1fr)] items-center gap-3 px-4 py-3 hover:bg-[#fbfbfb] cursor-pointer transition-colors group"
                    >
                      {/* Brand Title & Logo */}
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-neutral-200 bg-neutral-50 text-[11px] font-semibold text-neutral-500">
                          {brand.logoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={brand.logoUrl}
                              alt=""
                              className="h-full w-full object-contain p-1"
                            />
                          ) : (
                            brand.name.slice(0, 2).toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0">
                          <span className="font-medium text-neutral-900 group-hover:underline block truncate">
                            {brand.name}
                          </span>
                          {brand.description ? (
                            <span className="text-[11.5px] text-neutral-500 truncate block">
                              {brand.description}
                            </span>
                          ) : null}
                        </div>
                      </div>

                      {/* Slug */}
                      <div className="truncate text-[12.5px] text-neutral-600">
                        {brand.slug}
                      </div>

                      {/* Product Count */}
                      <div>
                        <span className="inline-flex items-center rounded-md bg-neutral-100 px-2 py-0.5 text-[11.5px] font-medium text-neutral-700">
                          {brand.productCount} {brand.productCount === 1 ? "product" : "products"}
                        </span>
                      </div>

                      {/* Status */}
                      <div className="text-right pr-2">
                        {brand.status === "ACTIVE" ? (
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
                            Inactive
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
              Showing {brands.length} of {total} brand{total === 1 ? "" : "s"}
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

        {/* Footer count */}
        {total > 0 ? (
          <div className="mt-3 flex items-center justify-between text-[12px] text-neutral-500">
            <span>
              {total} {total === 1 ? "brand" : "brands"} total
            </span>
            <span>Deactivated brands stay attached to existing products</span>
          </div>
        ) : null}
      </div>

      {/* Slide-over editor */}
      {editor.mode !== "closed" ? (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="flex-1 bg-black/40"
            onClick={closeEditor}
            aria-hidden="true"
          />
          <div className="flex w-full max-w-md flex-col overflow-y-auto border-l border-neutral-200 bg-white">
            <div className="sticky top-0 flex items-center justify-between border-b border-neutral-200 bg-white px-5 py-4">
              <h2 className="text-[15px] font-semibold text-neutral-900">
                {editor.mode === "create" ? "Add brand" : "Edit brand"}
              </h2>
              <button
                type="button"
                onClick={closeEditor}
                className="flex h-7 w-7 items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-100"
                aria-label="Close"
              >
                <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
                  <path
                    d="m4 4 8 8M12 4l-8 8"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>

            <div className="space-y-4 px-5 py-5">
              {formError ? (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-[12.5px] text-red-700">
                  {formError}
                </div>
              ) : null}

              <label className="block">
                <span className="mb-1.5 block text-[12px] font-medium text-neutral-700">
                  Name <span className="text-red-500">*</span>
                </span>
                <input
                  value={formName}
                  onChange={(e) => {
                    const nextName = e.target.value;
                    setFormName(nextName);
                    if (!slugManuallyEdited) {
                      setFormSlug(slugify(nextName));
                    }
                    if (fieldErrors.name) {
                      setFieldErrors((prev) => {
                        const copy = { ...prev };
                        delete copy.name;
                        return copy;
                      });
                    }
                  }}
                  placeholder="e.g. Lenovo"
                  className={`${inputClass} ${
                    fieldErrors.name
                      ? "!border-red-500 !ring-1 !ring-red-500/30 bg-red-50/20"
                      : ""
                  }`}
                />
                {fieldErrors.name ? (
                  <p className="mt-1 text-[12px] text-red-600 font-medium">
                    {fieldErrors.name}
                  </p>
                ) : null}
              </label>

              <label className="block">
                <span className="mb-1.5 block text-[12px] font-medium text-neutral-700">
                  Slug
                </span>
                <input
                  value={formSlug}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormSlug(val);
                    setSlugManuallyEdited(val.length > 0);
                    if (fieldErrors.slug) {
                      setFieldErrors((prev) => {
                        const copy = { ...prev };
                        delete copy.slug;
                        return copy;
                      });
                    }
                  }}
                  placeholder="auto-generated from name if left blank"
                  className={`${inputClass} ${
                    fieldErrors.slug
                      ? "!border-red-500 !ring-1 !ring-red-500/30 bg-red-50/20"
                      : ""
                  }`}
                />
                {fieldErrors.slug ? (
                  <p className="mt-1 text-[12px] text-red-600 font-medium">
                    {fieldErrors.slug}
                  </p>
                ) : null}
              </label>

              <label className="block">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="block text-[12px] font-medium text-neutral-700">
                    Description
                  </span>
                  <span
                    className={`text-[11px] ${
                      formDescription.length > 500
                        ? "text-red-600 font-semibold"
                        : "text-neutral-400"
                    }`}
                  >
                    {formDescription.length}/500 chars
                  </span>
                </div>
                <textarea
                  value={formDescription}
                  onChange={(e) => {
                    setFormDescription(e.target.value);
                    if (fieldErrors.description) {
                      setFieldErrors((prev) => {
                        const copy = { ...prev };
                        delete copy.description;
                        return copy;
                      });
                    }
                  }}
                  maxLength={600}
                  rows={3}
                  className={`${inputClass} ${
                    fieldErrors.description
                      ? "!border-red-500 !ring-1 !ring-red-500/30 bg-red-50/20"
                      : ""
                  }`}
                />
                {fieldErrors.description ? (
                  <p className="mt-1 text-[12px] text-red-600 font-medium">
                    {fieldErrors.description}
                  </p>
                ) : null}
              </label>

              <div>
                <span className="mb-1.5 block text-[12px] font-medium text-neutral-700">
                  Logo
                </span>
                <div className="flex items-center gap-3">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-neutral-200 bg-neutral-50 text-[12px] font-medium text-neutral-400">
                    {formLogoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={formLogoUrl}
                        alt="Logo preview"
                        className="h-full w-full object-contain p-1"
                      />
                    ) : (
                      "No logo"
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5 flex-1">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleLogoFileSelect}
                      className="hidden"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex h-8 items-center justify-center rounded-lg border border-neutral-200 bg-white px-3 text-[12px] font-medium text-neutral-700 shadow-xs hover:bg-neutral-50"
                      >
                        Upload logo
                      </button>
                      {formLogoUrl && (
                        <button
                          type="button"
                          onClick={() => setFormLogoUrl("")}
                          className="text-[12px] text-red-600 hover:underline"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <input
                      value={formLogoUrl}
                      onChange={(e) => setFormLogoUrl(e.target.value)}
                      placeholder="Or enter image URL https://…"
                      className="w-full rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-[12px] text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-neutral-400"
                    />
                  </div>
                </div>
              </div>

              <label className="block">
                <span className="mb-1.5 block text-[12px] font-medium text-neutral-700">
                  Website URL
                </span>
                <input
                  value={formWebsiteUrl}
                  onChange={(e) => setFormWebsiteUrl(e.target.value)}
                  placeholder="https://…"
                  className={inputClass}
                />
              </label>
            </div>

            <div className="mt-auto flex items-center justify-between border-t border-neutral-200 bg-white px-5 py-3">
              {editor.mode === "edit" ? (
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (editor.mode === "edit") {
                        void deleteBrandAction(editor.brand);
                      }
                    }}
                    disabled={saving}
                    className="text-[12.5px] font-medium text-red-600 hover:underline disabled:opacity-50"
                  >
                    Delete brand
                  </button>
                  <span className="text-neutral-300">|</span>
                  {editor.brand.status === "ACTIVE" ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (editor.mode === "edit") {
                          void deactivate(editor.brand);
                          closeEditor();
                        }
                      }}
                      disabled={saving}
                      className="text-[12.5px] font-medium text-neutral-600 hover:underline disabled:opacity-50"
                    >
                      Deactivate
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        if (editor.mode === "edit") {
                          void reactivate(editor.brand);
                          closeEditor();
                        }
                      }}
                      disabled={saving}
                      className="text-[12.5px] font-medium text-emerald-600 hover:underline disabled:opacity-50"
                    >
                      Reactivate
                    </button>
                  )}
                </div>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={closeEditor}
                  disabled={saving}
                  className="rounded-lg border border-neutral-200 bg-white px-4 py-2 text-[13px] font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void submit()}
                  disabled={saving}
                  className="rounded-lg bg-neutral-900 px-4 py-2 text-[13px] font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
                >
                  {saving
                    ? "Saving…"
                    : editor.mode === "create"
                      ? "Create brand"
                      : "Save changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}