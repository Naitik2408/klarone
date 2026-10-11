"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
    getProductMetafields,
    StaffMetaobjectsApiError,
    setProductMetafields,
} from "../../../lib/staff-metaobjects-api";
import type {
    StaffProductMetafield,
    StaffProductMetafieldsResponse,
} from "../../../types/staff-metaobjects";
import MetaobjectSelect from "./metaobject-select";
import AddColorSlideOver from "./add-color-slide-over";
import type {
    MetaobjectType,
    StaffMetaobjectEntry,
} from "../../../types/staff-metaobjects";

import type { StaffProductOption } from "../../../lib/staff-catalogue-api";

/* ------------------------------------------------------------------ */
/* Props                                                               */
/* ------------------------------------------------------------------ */

export interface CategoryMetafieldsPanelProps {
    token: string;
    productId: string;
    /** Called with the product's current category name for the pill. */
    categoryLabel?: string | null;
    /** Existing product options defined on this product's variants. */
    variantOptions?: StaffProductOption[];
}

/* ------------------------------------------------------------------ */
/* Local state shape                                                   */
/* ------------------------------------------------------------------ */

type LocalValue =
    | string
    | number
    | boolean
    | { entryId: number | null }
    | { entryIds: string[] }
    | null;

interface LocalDraft {
    [definitionId: number]: LocalValue;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function toLocalValue(def: StaffProductMetafield): LocalValue {
    if (def.value === null || def.value === undefined) {
        if (def.type === "metaobject" && def.multiple) return { entryIds: [] };
        if (def.type === "metaobject") return { entryId: null };
        return null;
    }
    return def.value as LocalValue;
}

function selectedIdsFromDraft(
    def: StaffProductMetafield,
    draft: LocalValue,
): string[] {
    if (draft === null || draft === undefined) return [];
    if (def.multiple && typeof draft === "object" && "entryIds" in draft) {
        const ids = (draft as { entryIds?: unknown }).entryIds;
        return Array.isArray(ids) ? ids.map(String) : [];
    }
    if (!def.multiple && typeof draft === "object" && "entryId" in draft) {
        const id = (draft as { entryId?: unknown }).entryId;
        return id == null ? [] : [String(id)];
    }
    return [];
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function CategoryMetafieldsPanel({
    token,
    productId,
    categoryLabel,
    variantOptions = [],
}: CategoryMetafieldsPanelProps) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const [data, setData] = useState<StaffProductMetafieldsResponse | null>(
        null,
    );
    const [draft, setDraft] = useState<LocalDraft>({});

    // The panel renders either "pinned" fields or "addable chips".
    const [chipsExpanded, setChipsExpanded] = useState(false);

    // Slide-over state for creating new Color entries.
    const [colorSlideOverOpen, setColorSlideOverOpen] = useState(false);

    /* ------------------ Load ------------------ */

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError("");
        getProductMetafields(token, productId)
            .then((response) => {
                if (cancelled) return;
                setData(response);
                const next: LocalDraft = {};
                for (const def of response.definitions) {
                    next[def.id] = toLocalValue(def);
                }
                setDraft(next);
            })
            .catch((caught) => {
                if (cancelled) return;
                setError(
                    caught instanceof StaffMetaobjectsApiError
                        ? caught.message
                        : "Unable to load metafields.",
                );
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [token, productId]);

    /* ------------------ Dirty tracking ------------------ */

    const pinned = useMemo(
        () => (data?.definitions ?? []).filter((d) => d.displayOrder <= 6),
        [data],
    );
    const chips = useMemo(
        () => (data?.definitions ?? []).filter((d) => d.displayOrder > 6),
        [data],
    );

    const isDirty = useMemo(() => {
        if (!data) return false;
        for (const def of data.definitions) {
            const before = JSON.stringify(toLocalValue(def));
            const after = JSON.stringify(draft[def.id] ?? null);
            if (before !== after) return true;
        }
        return false;
    }, [data, draft]);

    /* ------------------ Save ------------------ */

    async function save() {
        if (!data) return;
        setSaving(true);
        setError("");
        setSuccess("");
        try {
            const values = data.definitions
                .filter((def) => def.displayOrder <= 6) // pinned only
                .map((def) => ({
                    definitionId: def.id,
                    value: draft[def.id] ?? null,
                }));

            const response = await setProductMetafields(token, productId, {
                values,
            });

            setData(response);
            const next: LocalDraft = {};
            for (const def of response.definitions) {
                next[def.id] = toLocalValue(def);
            }
            setDraft(next);
            setSuccess("Category metafields saved.");
            window.setTimeout(() => setSuccess(""), 2000);
        } catch (caught) {
            setError(
                caught instanceof StaffMetaobjectsApiError
                    ? caught.message
                    : "Unable to save metafields.",
            );
        } finally {
            setSaving(false);
        }
    }

    function discard() {
        if (!data) return;
        const next: LocalDraft = {};
        for (const def of data.definitions) {
            next[def.id] = toLocalValue(def);
        }
        setDraft(next);
        setError("");
    }

    /* ------------------ Rendering a single row ------------------ */

    function renderRow(def: StaffProductMetafield) {
        const value = draft[def.id] ?? null;

        // metaobject-typed field → MetaobjectSelect
        if (def.type === "metaobject" && def.metaobjectType) {
            const selectedIds = selectedIdsFromDraft(def, value);
            const isColor = def.metaobjectType === "color";
            return (
                <MetaobjectSelect
                    token={token}
                    type={def.metaobjectType as MetaobjectType}
                    groupId={isColor ? undefined : def.name}
                    searchPlaceholder={
                        isColor ? "Search or add a color" : `Add ${def.name.toLowerCase()}`
                    }
                    value={selectedIds}
                    multiple={def.multiple}
                    placeholder={def.multiple ? "Select values" : "Select value"}
                    onChange={(entries) => {
                        const next: LocalValue = def.multiple
                            ? { entryIds: entries.map((e) => e.id) }
                            : { entryId: entries[0] ? Number(entries[0].id) : null };
                        setDraft((current) => ({ ...current, [def.id]: next }));
                    }}
                    onEntryCreated={(entry: StaffMetaobjectEntry) => {
                        // MetaobjectSelect already auto-selects on create; nothing
                        // extra to do here.
                        void entry;
                    }}
                />
            );
        }

        // select-typed field → native select
        if (def.type === "select") {
            const options = Array.isArray(def.options)
                ? (def.options as string[])
                : [];
            return (
                <select
                    value={typeof value === "string" ? value : ""}
                    onChange={(e) =>
                        setDraft((current) => ({
                            ...current,
                            [def.id]: e.target.value || null,
                        }))
                    }
                    className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-[13px] text-neutral-900 outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200"
                >
                    <option value="">—</option>
                    {options.map((o) => (
                        <option key={o} value={o}>
                            {o}
                        </option>
                    ))}
                </select>
            );
        }

        // boolean-typed field
        if (def.type === "boolean") {
            return (
                <select
                    value={value === true ? "true" : value === false ? "false" : ""}
                    onChange={(e) =>
                        setDraft((current) => ({
                            ...current,
                            [def.id]:
                                e.target.value === ""
                                    ? null
                                    : e.target.value === "true",
                        }))
                    }
                    className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-[13px] text-neutral-900 outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200"
                >
                    <option value="">Not specified</option>
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                </select>
            );
        }

        // number-typed field
        if (def.type === "number") {
            return (
                <input
                    type="number"
                    value={
                        typeof value === "number" || typeof value === "string"
                            ? String(value)
                            : ""
                    }
                    onChange={(e) =>
                        setDraft((current) => ({
                            ...current,
                            [def.id]:
                                e.target.value === "" ? null : Number(e.target.value),
                        }))
                    }
                    className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-[13px] text-neutral-900 outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200"
                />
            );
        }

        // text-typed fallback
        return (
            <input
                value={typeof value === "string" ? value : ""}
                onChange={(e) =>
                    setDraft((current) => ({
                        ...current,
                        [def.id]: e.target.value || null,
                    }))
                }
                className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-[13px] text-neutral-900 outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200"
            />
        );
    }

    /* ------------------ Render ------------------ */

    if (loading) {
        return (
            <section className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
                <div className="px-4 py-6 text-[13px] text-neutral-500">
                    Loading category metafields…
                </div>
            </section>
        );
    }

    if (!data) {
        return (
            <section className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
                <div className="px-4 py-4 text-[13px] text-red-700">
                    {error || "Unable to load metafields."}
                </div>
            </section>
        );
    }

    /* Empty panel — no definitions pinned to this category. */
    if (pinned.length === 0) {
        return (
            <section className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
                <div className="flex items-center justify-between border-b border-neutral-200 bg-[#f7f7f7] px-4 py-2.5">
                    <h2 className="text-[13px] font-medium text-neutral-800">
                        Category metafields
                    </h2>
                    <Link
                        href="/staff/catalogue/categories"
                        className="text-[12px] font-medium text-neutral-600 hover:text-neutral-900 flex items-center gap-1"
                    >
                        <span>Manage attributes</span>
                        <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3">
                            <path d="M6 3.5l4.5 4.5-4.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </Link>
                </div>
                <div className="px-4 py-4 text-[12.5px] text-neutral-500 flex items-center justify-between">
                    <span>No specifications pinned to this category yet.</span>
                    <Link
                        href="/staff/catalogue/categories"
                        className="rounded-lg border border-neutral-200 bg-white px-3 py-1 text-[12px] font-medium text-neutral-700 hover:bg-neutral-50 shadow-xs"
                    >
                        + Define Category Attributes
                    </Link>
                </div>
            </section>
        );
    }

    return (
        <section className="rounded-xl border border-neutral-200 bg-white">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-neutral-200 bg-[#f7f7f7] px-4 py-2.5">
                <h2 className="text-[13px] font-medium text-neutral-800">
                    Category metafields
                </h2>
                <div className="flex items-center gap-2">
                    {isDirty ? (
                        <>
                            <button
                                type="button"
                                onClick={discard}
                                disabled={saving}
                                className="rounded-md border border-neutral-200 bg-white px-2.5 py-1 text-[11.5px] font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
                            >
                                Discard
                            </button>
                            <button
                                type="button"
                                onClick={() => void save()}
                                disabled={saving}
                                className="rounded-md bg-neutral-900 px-2.5 py-1 text-[11.5px] font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
                            >
                                {saving ? "Saving…" : "Save"}
                            </button>
                        </>
                    ) : null}
                    {categoryLabel ? (
                        <span className="rounded-md bg-neutral-200 px-2 py-0.5 text-[11.5px] font-medium text-neutral-700">
                            {categoryLabel}
                        </span>
                    ) : null}
                </div>
            </div>

            {/* Pinned fields */}
            <div className="divide-y divide-neutral-100">
                {pinned.map((def) => {
                    const matchedOption = variantOptions.find(
                        (vo) => vo.name.trim().toLowerCase() === def.name.trim().toLowerCase(),
                    );
                    const hasVariantOption = Boolean(matchedOption && (matchedOption.values ?? []).length > 0);

                    return (
                        <div
                            key={def.id}
                            className="grid items-start gap-3 px-4 py-3 md:grid-cols-[180px_minmax(0,1fr)]"
                        >
                            <div>
                                <label className="block text-[12.5px] font-medium text-neutral-800">
                                    {def.name}
                                </label>
                                {hasVariantOption ? (
                                    <span className="mt-0.5 inline-block text-[11px] text-cyan-700">
                                        Managed by variants
                                    </span>
                                ) : null}
                            </div>
                            <div className="space-y-1.5">
                                {hasVariantOption ? (
                                    <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-cyan-100 bg-cyan-50/60 px-3 py-2 text-[12px] text-cyan-900">
                                        <span className="font-medium text-cyan-800">
                                            Variants define {def.name.toLowerCase()}:
                                        </span>
                                        {(matchedOption?.values ?? []).map((v) => (
                                            <span
                                                key={v.id}
                                                className="inline-flex items-center rounded-md bg-white px-2 py-0.5 text-[11.5px] font-medium text-cyan-800 shadow-sm"
                                            >
                                                {v.value}
                                            </span>
                                        ))}
                                    </div>
                                ) : (
                                    renderRow(def)
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Chips row */}
            {chips.length > 0 ? (
                <div className="border-t border-neutral-100 bg-neutral-50/60 px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                        {(chipsExpanded ? chips : chips.slice(0, 5)).map((def) => (
                            <button
                                key={def.id}
                                type="button"
                                onClick={() => {
                                    setChipsExpanded(true);
                                    // Pin the chip by setting a placeholder value so it
                                    // moves into the pinned list after save. For now,
                                    // just reveal the full set.
                                    void def;
                                }}
                                className="inline-flex items-center gap-1 rounded-md bg-neutral-200/80 px-2 py-0.5 text-[11.5px] font-medium text-neutral-700 hover:bg-neutral-300/80"
                            >
                                <svg
                                    viewBox="0 0 12 12"
                                    fill="none"
                                    className="h-3 w-3"
                                    aria-hidden="true"
                                >
                                    <path
                                        d="M6 2v8M2 6h8"
                                        stroke="currentColor"
                                        strokeWidth="1.6"
                                        strokeLinecap="round"
                                    />
                                </svg>
                                {def.name}
                            </button>
                        ))}
                    </div>
                </div>
            ) : null}

            {/* Error / success */}
            {error ? (
                <div className="border-t border-neutral-100 bg-red-50 px-4 py-2 text-[12px] text-red-700">
                    {error}
                </div>
            ) : null}
            {success ? (
                <div className="border-t border-neutral-100 bg-emerald-50 px-4 py-2 text-[12px] text-emerald-700">
                    {success}
                </div>
            ) : null}

            {/* Color slide-over, opened from MetaobjectSelect's "+ Add new entry"
          when a color entry is being created. For now the panel owns one
          instance, keyed by which definition opened it. */}
            <AddColorSlideOver
                open={colorSlideOverOpen}
                token={token}
                entry={null}
                onSaved={() => {
                    setColorSlideOverOpen(false);
                    // Re-fetch to pick up the new entry in the dropdown on next open.
                }}
                onClose={() => setColorSlideOverOpen(false)}
            />
        </section>
    );
}