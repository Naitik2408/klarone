"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  clearStaffAccessToken,
  getStaffAccessToken,
} from "@/lib/staff-auth-api";
import {
  createStaffCategory,
  deactivateStaffCategory,
  getStaffCategories,
  StaffCatalogueApiError,
  updateStaffCategory,
} from "@/lib/staff-catalogue-api";
import type { StaffCategoryNode } from "@/types/staff-catalogue";

const inputClass =
  "w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-[13px] text-neutral-900 outline-none transition placeholder:text-neutral-400 hover:border-neutral-300 focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200";

type EditorState =
  | { mode: "closed" }
  | { mode: "create"; parentId: number | null }
  | { mode: "edit"; node: StaffCategoryNode };

type StatusKey = "ALL" | "ACTIVE" | "INACTIVE";

const STATUS_OPTIONS: { value: StatusKey; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
];

/** Flatten a category tree into a sorted list with depth for dropdowns. */
function flattenTree(
  nodes: StaffCategoryNode[],
  depth = 0,
): Array<{ id: number; name: string; depth: number }> {
  const out: Array<{ id: number; name: string; depth: number }> = [];
  for (const node of nodes) {
    out.push({ id: node.id, name: node.name, depth });
    if (node.children.length) {
      out.push(...flattenTree(node.children, depth + 1));
    }
  }
  return out;
}

/** Filter a category tree by search term and status, preserving ancestors. */
function filterTree(
  nodes: StaffCategoryNode[],
  search: string,
  status: StatusKey,
): StaffCategoryNode[] {
  const term = search.trim().toLowerCase();

  function matches(node: StaffCategoryNode): boolean {
    if (status !== "ALL" && node.status !== status) return false;
    if (term) {
      const haystack = `${node.name} ${node.slug}`.toLowerCase();
      if (!haystack.includes(term)) return false;
    }
    return true;
  }

  function walk(list: StaffCategoryNode[]): StaffCategoryNode[] {
    const out: StaffCategoryNode[] = [];
    for (const node of list) {
      const filteredChildren = walk(node.children);
      if (matches(node) || filteredChildren.length > 0) {
        out.push({ ...node, children: filteredChildren });
      }
    }
    return out;
  }

  return walk(nodes);
}

export default function StaffCatalogueCategoriesPage() {
  const router = useRouter();

  const [token, setToken] = useState<string | null>(null);
  const [tree, setTree] = useState<StaffCategoryNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusKey>("ALL");
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);

  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());

  const [editor, setEditor] = useState<EditorState>({ mode: "closed" });

  const [formName, setFormName] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formParentId, setFormParentId] = useState<string>("");
  const [formDisplayOrder, setFormDisplayOrder] = useState("0");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

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

  async function load(activeToken: string) {
    setLoading(true);
    setError("");
    try {
      const result = await getStaffCategories(activeToken);
      setTree(result);
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
        caught instanceof Error
          ? caught.message
          : "Unable to load categories.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!token) return;
    void load(token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  function toggleCollapse(id: number) {
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectStatus(nextStatus: StatusKey) {
    setStatusMenuOpen(false);
    if (nextStatus === status) return;
    setStatus(nextStatus);
  }

  function clearAllFilters() {
    setSearch("");
    setStatus("ALL");
  }

  function openCreate(parentId: number | null) {
    setFormName("");
    setFormSlug("");
    setFormDescription("");
    setFormParentId(parentId === null ? "" : String(parentId));
    setFormDisplayOrder("0");
    setFormError("");
    setEditor({ mode: "create", parentId });
  }

  function openEdit(node: StaffCategoryNode) {
    setFormName(node.name);
    setFormSlug(node.slug);
    setFormDescription(node.description ?? "");
    setFormParentId(node.parentId === null ? "" : String(node.parentId));
    setFormDisplayOrder(String(node.displayOrder));
    setFormError("");
    setEditor({ mode: "edit", node });
  }

  function closeEditor() {
    if (saving) return;
    setEditor({ mode: "closed" });
  }

  async function submit() {
    if (!token) return;

    const trimmedName = formName.trim();
    if (!trimmedName) {
      setFormError("Category name is required.");
      return;
    }

    const parentId =
      formParentId === "" ? null : Number.parseInt(formParentId, 10);
    if (parentId !== null && (!Number.isInteger(parentId) || parentId <= 0)) {
      setFormError("Parent category is invalid.");
      return;
    }

    const displayOrder = Number.parseInt(formDisplayOrder || "0", 10);

    setSaving(true);
    setFormError("");
    setError("");
    setNotice("");

    try {
      if (editor.mode === "create") {
        await createStaffCategory(token, {
          name: trimmedName,
          slug: formSlug.trim() || undefined,
          description: formDescription.trim() || null,
          parentId,
          displayOrder: Number.isFinite(displayOrder) ? displayOrder : 0,
        });
        setNotice(`Category "${trimmedName}" created.`);
      } else if (editor.mode === "edit") {
        if (parentId === editor.node.id) {
          setFormError("A category cannot be its own parent.");
          setSaving(false);
          return;
        }

        await updateStaffCategory(token, editor.node.id, {
          name: trimmedName,
          slug: formSlug.trim() || undefined,
          description: formDescription.trim() || null,
          parentId,
          displayOrder: Number.isFinite(displayOrder) ? displayOrder : 0,
        });
        setNotice(`Category "${trimmedName}" updated.`);
      }

      setEditor({ mode: "closed" });
      await load(token);
    } catch (caught) {
      setFormError(
        caught instanceof Error ? caught.message : "Unable to save category.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function deactivate(node: StaffCategoryNode) {
    if (!token) return;

    const confirmed = window.confirm(
      node.productCount > 0 || node.childCount > 0
        ? `Deactivate "${node.name}"? It currently has ${node.productCount} product${node.productCount === 1 ? "" : "s"} and ${node.childCount} child categor${node.childCount === 1 ? "y" : "ies"}.`
        : `Deactivate "${node.name}"?`,
    );
    if (!confirmed) return;

    setError("");
    setNotice("");
    try {
      await deactivateStaffCategory(token, node.id);
      setNotice(`Category "${node.name}" deactivated.`);
      await load(token);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to deactivate category.",
      );
    }
  }

  async function reactivate(node: StaffCategoryNode) {
    if (!token) return;
    setError("");
    setNotice("");
    try {
      await updateStaffCategory(token, node.id, { status: "ACTIVE" });
      setNotice(`Category "${node.name}" reactivated.`);
      await load(token);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to reactivate category.",
      );
    }
  }

  const flatForParentPicker = flattenTree(tree);

  const filteredTree = useMemo(
    () => filterTree(tree, search, status),
    [tree, search, status],
  );

  const hasActiveFilters = search.trim() !== "" || status !== "ALL";

  const activeStatusLabel =
    STATUS_OPTIONS.find((option) => option.value === status)?.label ?? "All";

  function renderRow(node: StaffCategoryNode, depth: number): React.ReactNode {
    const hasChildren = node.children.length > 0;
    const isCollapsed = collapsed.has(node.id);

    return (
      <div key={node.id}>
        <div
          className="grid grid-cols-[minmax(240px,2.4fr)_minmax(160px,1.2fr)_minmax(90px,0.7fr)_minmax(90px,0.7fr)_minmax(200px,1.3fr)] items-center gap-3 border-b border-[#f1f1f1] px-4 py-3 transition-colors last:border-b-0 hover:bg-[#f7f7f7]"
        >
          <div
            className="flex min-w-0 items-center gap-2"
            style={{ paddingLeft: depth * 20 }}
          >
            {hasChildren ? (
              <button
                type="button"
                onClick={() => toggleCollapse(node.id)}
                aria-label={isCollapsed ? "Expand" : "Collapse"}
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-neutral-500 hover:bg-neutral-100"
              >
                <svg
                  viewBox="0 0 16 16"
                  fill="none"
                  className={`h-3 w-3 transition-transform ${
                    isCollapsed ? "" : "rotate-90"
                  }`}
                >
                  <path
                    d="m6 4 4 4-4 4"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            ) : (
              <span className="inline-block h-5 w-5 shrink-0" />
            )}

            <div className="min-w-0">
              <div className="truncate text-[13px] font-medium text-neutral-900">
                {node.name}
              </div>
              {node.description ? (
                <p className="mt-0.5 truncate text-[12px] text-neutral-500">
                  {node.description}
                </p>
              ) : null}
            </div>
          </div>

          <div className="truncate text-[12.5px] text-neutral-600">
            {node.slug}
          </div>

          <div>
            <span
              className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11.5px] font-medium ${
                node.status === "ACTIVE"
                  ? "bg-[#a6e8b1] text-[#0b5c2a]"
                  : "bg-neutral-200 text-neutral-700"
              }`}
            >
              {node.status === "ACTIVE" ? "Active" : "Inactive"}
            </span>
          </div>

          <div className="text-[12.5px] text-neutral-700">
            {node.productCount}
          </div>

          <div className="flex justify-end gap-1.5 pr-2">
            <button
              type="button"
              onClick={() => openCreate(node.id)}
              className="rounded-lg border border-neutral-200 bg-white px-2.5 py-1 text-[11.5px] font-medium text-neutral-700 hover:bg-neutral-50"
            >
              Add subcategory
            </button>
            <button
              type="button"
              onClick={() => openEdit(node)}
              className="rounded-lg border border-neutral-200 bg-white px-2.5 py-1 text-[11.5px] font-medium text-neutral-700 hover:bg-neutral-50"
            >
              Edit
            </button>
            {node.status === "ACTIVE" ? (
              <button
                type="button"
                onClick={() => void deactivate(node)}
                className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-[11.5px] font-medium text-red-700 hover:bg-red-100"
              >
                Deactivate
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void reactivate(node)}
                className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11.5px] font-medium text-emerald-700 hover:bg-emerald-100"
              >
                Reactivate
              </button>
            )}
          </div>
        </div>

        {!isCollapsed &&
          node.children.map((child) => renderRow(child, depth + 1))}
      </div>
    );
  }

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
                <path d="M3 6.5A1.5 1.5 0 0 1 4.5 5h3A1.5 1.5 0 0 1 9 6.5V9a1.5 1.5 0 0 1-1.5 1.5h-3A1.5 1.5 0 0 1 3 9V6.5Z" />
                <path d="M11 6.5A1.5 1.5 0 0 1 12.5 5h3A1.5 1.5 0 0 1 17 6.5V9a1.5 1.5 0 0 1-1.5 1.5h-3A1.5 1.5 0 0 1 11 9V6.5Z" />
                <path d="M3 13.5A1.5 1.5 0 0 1 4.5 12h3A1.5 1.5 0 0 1 9 13.5V15A1.5 1.5 0 0 1 7.5 16.5h-3A1.5 1.5 0 0 1 3 15v-1.5Z" />
                <path d="M11 13.5A1.5 1.5 0 0 1 12.5 12h3A1.5 1.5 0 0 1 17 13.5V15a1.5 1.5 0 0 1-1.5 1.5h-3A1.5 1.5 0 0 1 11 15v-1.5Z" />
              </svg>
            </span>
            <h1 className="text-[20px] font-semibold text-[#1a1a1a]">
              Categories
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
              onClick={() => openCreate(null)}
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
                Add category
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
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search categories by name or slug"
              className="h-full w-full bg-transparent py-2.5 pr-3 pl-9 text-[13px] text-neutral-800 outline-none placeholder:text-neutral-500"
            />
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
              onClick={() => token && void load(token)}
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
            <div className="min-w-[900px]">
              {/* Header Row */}
              <div className="grid grid-cols-[minmax(240px,2.4fr)_minmax(160px,1.2fr)_minmax(90px,0.7fr)_minmax(90px,0.7fr)_minmax(200px,1.3fr)] items-center gap-3 border-b border-neutral-200 bg-[#fafafa] px-4 py-2.5 text-[12px] font-medium text-[#616161]">
                <div>Name</div>
                <div>Slug</div>
                <div>Status</div>
                <div>Products</div>
                <div className="text-right pr-2">Actions</div>
              </div>

              {/* Rows */}
              {loading ? (
                <div className="flex items-center justify-center gap-2 py-20 text-[13px] text-[#616161]">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#d4d4d4] border-t-[#1a1a1a]" />
                  Loading categories…
                </div>
              ) : tree.length === 0 ? (
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
                      <path d="M3 6.5A1.5 1.5 0 0 1 4.5 5h3A1.5 1.5 0 0 1 9 6.5V9a1.5 1.5 0 0 1-1.5 1.5h-3A1.5 1.5 0 0 1 3 9V6.5Z" />
                      <path d="M11 6.5A1.5 1.5 0 0 1 12.5 5h3A1.5 1.5 0 0 1 17 6.5V9a1.5 1.5 0 0 1-1.5 1.5h-3A1.5 1.5 0 0 1 11 9V6.5Z" />
                    </svg>
                  </div>
                  <p className="text-[14px] font-semibold text-[#1a1a1a]">
                    No categories yet
                  </p>
                  <p className="max-w-sm text-[13px] text-[#616161]">
                    Add your first category to start organizing the catalogue.
                  </p>
                  <button
                    type="button"
                    onClick={() => openCreate(null)}
                    className="mt-2 text-[13px] font-medium text-[#005bd3] hover:underline"
                  >
                    Add category
                  </button>
                </div>
              ) : filteredTree.length === 0 ? (
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
                      <circle cx="9" cy="9" r="5.5" />
                      <path d="m13 13 3.5 3.5" strokeLinecap="round" />
                    </svg>
                  </div>
                  <p className="text-[14px] font-semibold text-[#1a1a1a]">
                    No categories found
                  </p>
                  <p className="max-w-sm text-[13px] text-[#616161]">
                    Try changing your search term or clearing some filters.
                  </p>
                  <button
                    type="button"
                    onClick={clearAllFilters}
                    className="mt-2 text-[13px] font-medium text-[#005bd3] hover:underline"
                  >
                    Clear all filters
                  </button>
                </div>
              ) : (
                filteredTree.map((node) => renderRow(node, 0))
              )}
            </div>
          </div>
        </div>

        {/* Footer count */}
        {tree.length > 0 ? (
          <div className="mt-3 flex items-center justify-between text-[12px] text-neutral-500">
            <span>
              {flatForParentPicker.length}{" "}
              {flatForParentPicker.length === 1 ? "category" : "categories"}
            </span>
            <span>
              Deactivating a category keeps existing product assignments intact
            </span>
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
                {editor.mode === "create" ? "Add category" : "Edit category"}
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
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Laptops"
                  className={inputClass}
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-[12px] font-medium text-neutral-700">
                  Slug
                </span>
                <input
                  value={formSlug}
                  onChange={(e) => setFormSlug(e.target.value)}
                  placeholder="auto-generated from name if left blank"
                  className={inputClass}
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-[12px] font-medium text-neutral-700">
                  Parent category
                </span>
                <select
                  value={formParentId}
                  onChange={(e) => setFormParentId(e.target.value)}
                  className={inputClass}
                >
                  <option value="">— None (top level) —</option>
                  {flatForParentPicker
                    .filter((option) =>
                      editor.mode === "edit"
                        ? option.id !== editor.node.id
                        : true,
                    )
                    .map((option) => (
                      <option key={option.id} value={String(option.id)}>
                        {"— ".repeat(option.depth)}
                        {option.name}
                      </option>
                    ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-[12px] font-medium text-neutral-700">
                  Display order
                </span>
                <input
                  type="number"
                  value={formDisplayOrder}
                  onChange={(e) => setFormDisplayOrder(e.target.value)}
                  className={inputClass}
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-[12px] font-medium text-neutral-700">
                  Description
                </span>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={3}
                  className={inputClass}
                />
              </label>
            </div>

            <div className="mt-auto flex justify-end gap-2 border-t border-neutral-200 bg-white px-5 py-3">
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
                    ? "Create category"
                    : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}