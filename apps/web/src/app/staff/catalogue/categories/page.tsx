"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  clearStaffAccessToken,
  getStaffAccessToken,
} from "@/lib/staff-auth-api";
import {
  createStaffCategory,
  deactivateStaffCategory,
  deleteStaffCategory,
  getStaffCategories,
  StaffCatalogueApiError,
  updateStaffCategory,
} from "@/lib/staff-catalogue-api";
import {
  createMetafieldDefinition,
  deleteMetafieldDefinition,
  listMetafieldDefinitions,
} from "@/lib/staff-metaobjects-api";
import type { StaffCategoryNode } from "@/types/staff-catalogue";
import type { StaffMetafieldDefinition } from "@/types/staff-metaobjects";

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

  const fileInputRef = useRef<HTMLInputElement>(null);

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
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [formDescription, setFormDescription] = useState("");
  const [formImageUrl, setFormImageUrl] = useState("");
  const [formParentId, setFormParentId] = useState<string>("");
  const [formDisplayOrder, setFormDisplayOrder] = useState("0");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Metafield definitions for category in edit mode
  const [metafields, setMetafields] = useState<StaffMetafieldDefinition[]>([]);
  const [metafieldsLoading, setMetafieldsLoading] = useState(false);
  const [newMetafieldName, setNewMetafieldName] = useState("");
  const [newMetafieldType, setNewMetafieldType] = useState<"text" | "number" | "boolean" | "select">("text");
  const [addingMetafield, setAddingMetafield] = useState(false);

  function handleImageFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
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
        const compressed = canvas.toDataURL("image/jpeg", 0.85);
        setFormImageUrl(compressed);
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
    setPage(1);
  }

  function clearAllFilters() {
    setSearch("");
    setStatus("ALL");
    setPage(1);
  }

  function openCreate(parentId: number | null) {
    setFormName("");
    setFormSlug("");
    setSlugManuallyEdited(false);
    setFormDescription("");
    setFormImageUrl("");
    setFormParentId(parentId === null ? "" : String(parentId));
    setFormDisplayOrder("0");
    setFormError("");
    setFieldErrors({});
    setEditor({ mode: "create", parentId });
  }

  async function loadCategoryMetafields(catId: number, currentToken: string) {
    setMetafieldsLoading(true);
    try {
      const res = await listMetafieldDefinitions(currentToken, catId);
      setMetafields(res.items || []);
    } catch {
      // non-fatal
    } finally {
      setMetafieldsLoading(false);
    }
  }

  function openEdit(node: StaffCategoryNode) {
    setFormName(node.name);
    setFormSlug(node.slug);
    setSlugManuallyEdited(true);
    setFormDescription(node.description ?? "");
    setFormImageUrl(node.imageUrl ?? "");
    setFormParentId(node.parentId === null ? "" : String(node.parentId));
    setFormDisplayOrder(String(node.displayOrder));
    setFormError("");
    setFieldErrors({});
    setNewMetafieldName("");
    setEditor({ mode: "edit", node });
    if (token) {
      void loadCategoryMetafields(node.id, token);
    }
  }

  async function handleAddMetafield(catId: number) {
    if (!token || !newMetafieldName.trim()) return;
    setAddingMetafield(true);
    try {
      await createMetafieldDefinition(token, {
        name: newMetafieldName.trim(),
        type: newMetafieldType,
        categoryId: catId,
      });
      setNewMetafieldName("");
      await loadCategoryMetafields(catId, token);
    } catch (caught) {
      alert(caught instanceof Error ? caught.message : "Unable to add metafield.");
    } finally {
      setAddingMetafield(false);
    }
  }

  async function handleDeleteMetafield(catId: number, defId: number) {
    if (!token || !confirm("Delete this metafield definition?")) return;
    try {
      await deleteMetafieldDefinition(token, defId);
      await loadCategoryMetafields(catId, token);
    } catch (caught) {
      alert(caught instanceof Error ? caught.message : "Unable to delete metafield.");
    }
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
      setFieldErrors({ name: "Category name is required." });
      return;
    }

    if (formDescription.trim().length > 500) {
      setFieldErrors({
        description: `Description is too long (${formDescription.trim().length}/500 characters).`,
      });
      return;
    }

    const parentId =
      formParentId === "" ? null : Number.parseInt(formParentId, 10);
    if (parentId !== null && (!Number.isInteger(parentId) || parentId <= 0)) {
      setFieldErrors({ parentId: "Parent category is invalid." });
      return;
    }

    const displayOrder = Number.parseInt(formDisplayOrder || "0", 10);

    setSaving(true);
    setFormError("");
    setFieldErrors({});
    setError("");
    setNotice("");

    try {
      if (editor.mode === "create") {
        await createStaffCategory(token, {
          name: trimmedName,
          slug: formSlug.trim() || undefined,
          description: formDescription.trim() || null,
          imageUrl: formImageUrl.trim() || null,
          parentId,
          displayOrder: Number.isFinite(displayOrder) ? displayOrder : 0,
        });
        setNotice(`Category "${trimmedName}" created.`);
      } else if (editor.mode === "edit") {
        if (parentId === editor.node.id) {
          setFieldErrors({ parentId: "A category cannot be its own parent." });
          setSaving(false);
          return;
        }

        await updateStaffCategory(token, editor.node.id, {
          name: trimmedName,
          slug: formSlug.trim() || undefined,
          description: formDescription.trim() || null,
          imageUrl: formImageUrl.trim() || null,
          parentId,
          displayOrder: Number.isFinite(displayOrder) ? displayOrder : 0,
        });
        setNotice(`Category "${trimmedName}" updated.`);
      }

      setEditor({ mode: "closed" });
      await load(token);
    } catch (caught) {
      const msg =
        caught instanceof Error ? caught.message : "Unable to save category.";
      const lower = msg.toLowerCase();
      if (lower.includes("name")) {
        setFieldErrors({ name: msg });
      } else if (lower.includes("slug")) {
        setFieldErrors({ slug: msg });
      } else if (lower.includes("parent")) {
        setFieldErrors({ parentId: msg });
      } else if (lower.includes("description")) {
        setFieldErrors({ description: msg });
      } else {
        setFormError(msg);
      }
    } finally {
      setSaving(false);
    }
  }

  async function deleteCategoryAction(node: StaffCategoryNode) {
    if (!token) return;

    if (node.childCount > 0) {
      window.alert(
        `Cannot delete category "${node.name}" because it contains ${node.childCount} subcategor${
          node.childCount === 1 ? "y" : "ies"
        }.\n\nStandard E-commerce Rule: To prevent orphaned subcategories and broken menus, please reassign or delete the subcategories first.`
      );
      return;
    }

    if (node.productCount > 0) {
      window.alert(
        `Cannot delete category "${node.name}" because it currently has ${node.productCount} product${
          node.productCount === 1 ? "" : "s"
        }.\n\nStandard E-commerce Rule: Please reassign those products to another category first, or click "Deactivate" instead.`
      );
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to permanently delete category "${node.name}"? This action cannot be undone.`
    );
    if (!confirmed) return;

    setError("");
    setNotice("");
    try {
      await deleteStaffCategory(token, node.id);
      setNotice(`Category "${node.name}" permanently deleted.`);
      closeEditor();
      await load(token);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to delete category."
      );
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

  const [page, setPage] = useState(1);
  const pageSize = 15;

  const flatForParentPicker = flattenTree(tree);

  const filteredTree = useMemo(
    () => filterTree(tree, search, status),
    [tree, search, status],
  );

  const totalRootCategories = filteredTree.length;
  const totalPages = Math.max(Math.ceil(totalRootCategories / pageSize), 1);

  const pagedTree = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredTree.slice(start, start + pageSize);
  }, [filteredTree, page, pageSize]);

  const hasActiveFilters = search.trim() !== "" || status !== "ALL";

  function changePage(nextPage: number) {
    if (nextPage < 1 || nextPage > totalPages || nextPage === page) return;
    setPage(nextPage);
  }

  const activeStatusLabel =
    STATUS_OPTIONS.find((option) => option.value === status)?.label ?? "All";

  function renderRow(node: StaffCategoryNode, depth: number): React.ReactNode {
    const hasChildren = node.children.length > 0;
    const isCollapsed = collapsed.has(node.id);

    return (
      <div key={node.id}>
        <div
          role="link"
          tabIndex={0}
          onClick={() => openEdit(node)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              openEdit(node);
            }
          }}
          className="grid grid-cols-[minmax(280px,3fr)_minmax(160px,1.5fr)_minmax(120px,1fr)_minmax(100px,1fr)] items-center gap-3 px-4 py-3 hover:bg-[#fbfbfb] cursor-pointer transition-colors group border-b border-[#f1f1f1] last:border-b-0"
        >
          {/* Category Name & Hierarchy Indentation */}
          <div
            className="flex min-w-0 items-center gap-2"
            style={{ paddingLeft: depth * 24 }}
          >
            {hasChildren ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleCollapse(node.id);
                }}
                aria-label={isCollapsed ? "Expand" : "Collapse"}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-100"
              >
                <svg
                  viewBox="0 0 16 16"
                  fill="none"
                  className={`h-3.5 w-3.5 transition-transform ${
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
            ) : depth > 0 ? (
              <span className="flex h-6 w-6 shrink-0 items-center justify-center text-neutral-300">
                <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3">
                  <path
                    d="M4 2v6h6"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            ) : (
              <span className="inline-block h-6 w-6 shrink-0" />
            )}

            {/* Category Thumbnail / Icon */}
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-neutral-200 bg-neutral-50 text-[11px] font-semibold text-neutral-500">
              {node.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={node.imageUrl}
                  alt=""
                  className="h-full w-full object-contain p-1"
                />
              ) : (
                node.name.slice(0, 2).toUpperCase()
              )}
            </div>

            <div className="min-w-0">
              <span className="truncate text-[13px] font-medium text-neutral-900 group-hover:underline block">
                {node.name}
              </span>
              {node.description ? (
                <span className="mt-0.5 truncate text-[11.5px] text-neutral-500 block">
                  {node.description}
                </span>
              ) : null}
            </div>
          </div>

          {/* Slug */}
          <div className="truncate text-[12.5px] text-neutral-600">
            {node.slug}
          </div>

          {/* Products count */}
          <div>
            <span className="inline-flex items-center rounded-md bg-neutral-100 px-2 py-0.5 text-[11.5px] font-medium text-neutral-700">
              {node.productCount} {node.productCount === 1 ? "product" : "products"}
            </span>
          </div>

          {/* Status */}
          <div className="text-right pr-2">
            {node.status === "ACTIVE" ? (
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
            <div className="min-w-[700px]">
              {/* Header Row */}
              <div className="grid grid-cols-[minmax(280px,3fr)_minmax(160px,1.5fr)_minmax(120px,1fr)_minmax(100px,1fr)] items-center gap-3 border-b border-neutral-200 bg-[#f7f7f7] px-4 py-2.5 text-[12px] font-medium text-neutral-600">
                <div>Name</div>
                <div>Slug</div>
                <div>Products</div>
                <div className="text-right pr-2">Status</div>
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
                pagedTree.map((node) => renderRow(node, 0))
              )}
            </div>
          </div>

          {/* Pagination Footer */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e3e3e3] px-4 py-3 bg-white text-[12px] text-[#616161]">
            <div>
              Showing {pagedTree.length} of {totalRootCategories} root category{totalRootCategories === 1 ? "" : "ies"}
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
                  placeholder="e.g. Laptops"
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
                <span className="mb-1.5 block text-[12px] font-medium text-neutral-700">
                  Parent category
                </span>
                <select
                  value={formParentId}
                  onChange={(e) => {
                    setFormParentId(e.target.value);
                    if (fieldErrors.parentId) {
                      setFieldErrors((prev) => {
                        const copy = { ...prev };
                        delete copy.parentId;
                        return copy;
                      });
                    }
                  }}
                  className={`${inputClass} ${
                    fieldErrors.parentId
                      ? "!border-red-500 !ring-1 !ring-red-500/30 bg-red-50/20"
                      : ""
                  }`}
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
                {fieldErrors.parentId ? (
                  <p className="mt-1 text-[12px] text-red-600 font-medium">
                    {fieldErrors.parentId}
                  </p>
                ) : null}
              </label>

              <label className="block">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="block text-[12px] font-medium text-neutral-700">
                    Display order
                  </span>
                  <span className="text-[11px] text-neutral-400">
                    Lower numbers appear first (e.g. 0 before 10)
                  </span>
                </div>
                <input
                  type="number"
                  value={formDisplayOrder}
                  onChange={(e) => setFormDisplayOrder(e.target.value)}
                  className={inputClass}
                />
              </label>

              <div>
                <span className="mb-1.5 block text-[12px] font-medium text-neutral-700">
                  Image
                </span>
                <div className="flex items-center gap-3">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-neutral-200 bg-neutral-50 text-[12px] font-medium text-neutral-400">
                    {formImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={formImageUrl}
                        alt="Category preview"
                        className="h-full w-full object-contain p-1"
                      />
                    ) : (
                      "No image"
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5 flex-1">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageFileSelect}
                      className="hidden"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex h-8 items-center justify-center rounded-lg border border-neutral-200 bg-white px-3 text-[12px] font-medium text-neutral-700 shadow-xs hover:bg-neutral-50"
                      >
                        Upload image
                      </button>
                      {formImageUrl && (
                        <button
                          type="button"
                          onClick={() => setFormImageUrl("")}
                          className="text-[12px] text-red-600 hover:underline"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <input
                      value={formImageUrl}
                      onChange={(e) => setFormImageUrl(e.target.value)}
                      placeholder="Or enter image URL https://…"
                      className="w-full rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-[12px] text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-neutral-400"
                    />
                  </div>
                </div>
              </div>

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

              {/* Attributes & Metafields Management (Edit mode only) */}
              {editor.mode === "edit" ? (
                <div className="rounded-xl border border-neutral-200 bg-neutral-50/50 p-3.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-[12.5px] font-semibold text-neutral-800">
                        Category Attributes & Metafields
                      </h3>
                      <p className="text-[11px] text-neutral-500">
                        Specifications pinned to all products in this category.
                      </p>
                    </div>
                    <span className="rounded-md bg-neutral-200/70 px-2 py-0.5 text-[11px] font-medium text-neutral-700">
                      {metafields.length} {metafields.length === 1 ? "field" : "fields"}
                    </span>
                  </div>

                  {/* List of existing metafields */}
                  {metafieldsLoading ? (
                    <div className="py-2 text-[12px] text-neutral-500">Loading fields…</div>
                  ) : metafields.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-neutral-200 bg-white p-3 text-center text-[12px] text-neutral-500">
                      No attributes defined yet. Add fields below like &quot;Processor&quot;, &quot;Screen Size&quot;, &quot;Refresh Rate&quot;.
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {metafields.map((field) => (
                        <div
                          key={field.id}
                          className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-[12px]"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-neutral-800">{field.name}</span>
                            <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10.5px] text-neutral-500 uppercase">
                              {field.type}
                            </span>
                            <span className="text-[10.5px] text-neutral-400 font-mono">
                              key: {field.key}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteMetafield(editor.node.id, field.id)}
                            className="text-neutral-400 hover:text-red-600 transition"
                            title="Delete field"
                          >
                            <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                              <path fillRule="evenodd" d="M5 3.25V4H2.75a.75.75 0 0 0 0 1.5h.3l.815 8.15A1.5 1.5 0 0 0 5.357 15h5.285a1.5 1.5 0 0 0 1.493-1.35l.815-8.15h.3a.75.75 0 0 0 0-1.5H11v-.75A1.25 1.25 0 0 0 9.75 2h-3.5A1.25 1.25 0 0 0 5 3.25Zm1.5 0V4h3v-.75a.25.25 0 0 0-.25-.25h-2.5a.25.25 0 0 0-.25.25Z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add field form */}
                  <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-neutral-200/60">
                    <input
                      value={newMetafieldName}
                      onChange={(e) => setNewMetafieldName(e.target.value)}
                      placeholder="New field name (e.g. Refresh Rate)"
                      className="flex-1 min-w-[150px] rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-[12px] outline-none placeholder:text-neutral-400 focus:border-neutral-400"
                    />
                    <select
                      value={newMetafieldType}
                      onChange={(e) => setNewMetafieldType(e.target.value as any)}
                      className="rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-[12px] outline-none text-neutral-700"
                    >
                      <option value="text">Text</option>
                      <option value="number">Number</option>
                      <option value="boolean">Boolean (Yes/No)</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => handleAddMetafield(editor.node.id)}
                      disabled={addingMetafield || !newMetafieldName.trim()}
                      className="rounded-lg bg-neutral-900 px-3 py-1.5 text-[12px] font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
                    >
                      {addingMetafield ? "Adding…" : "+ Add Field"}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="mt-auto flex items-center justify-between border-t border-neutral-200 bg-white px-5 py-3">
              {editor.mode === "edit" ? (
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (editor.mode === "edit") {
                        void deleteCategoryAction(editor.node);
                      }
                    }}
                    disabled={saving}
                    className="text-[12.5px] font-medium text-red-600 hover:underline disabled:opacity-50"
                  >
                    Delete category
                  </button>
                  <span className="text-neutral-300">|</span>
                  {editor.node.status === "ACTIVE" ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (editor.mode === "edit") {
                          void deactivate(editor.node);
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
                          void reactivate(editor.node);
                          closeEditor();
                        }
                      }}
                      disabled={saving}
                      className="text-[12.5px] font-medium text-emerald-600 hover:underline disabled:opacity-50"
                    >
                      Reactivate
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      if (editor.mode === "edit") {
                        const parentNodeId = editor.node.id;
                        openCreate(parentNodeId);
                      }
                    }}
                    disabled={saving}
                    className="text-[12.5px] font-medium text-neutral-600 hover:text-neutral-900 hover:underline disabled:opacity-50"
                  >
                    + Add subcategory
                  </button>
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
                      ? "Create category"
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