"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  createMetaobjectEntry,
  getMetaobjectEntry,
  listMetaobjectEntries,
  StaffMetaobjectsApiError,
} from "../../../lib/staff-metaobjects-api";
import type {
  MetaobjectType,
  StaffMetaobjectEntry,
} from "../../../types/staff-metaobjects";

/* ------------------------------------------------------------------ */
/* Props                                                               */
/* ------------------------------------------------------------------ */

export interface MetaobjectSelectProps {
  token: string;
  type: MetaobjectType;
  /**
   * Narrows the search to entries whose `fields.group` matches.
   * Omit for `color`-typed entries (they have no group).
   */
  groupId?: string;
  value: string[];
  multiple?: boolean;
  disabled?: boolean;
  placeholder?: string;
  /** Placeholder for the search input inside the dropdown. */
  searchPlaceholder?: string;
  onChange: (next: StaffMetaobjectEntry[]) => void;
  onEntryCreated?: (entry: StaffMetaobjectEntry) => void;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function entryHex(entry: StaffMetaobjectEntry): string | null {
  const v = entry.fields?.hex;
  return typeof v === "string" && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v)
    ? v
    : null;
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function MetaobjectSelect({
  token,
  type,
  groupId,
  value,
  multiple = true,
  disabled = false,
  placeholder = "Select values",
  searchPlaceholder,
  onChange,
  onEntryCreated,
}: MetaobjectSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [entries, setEntries] = useState<StaffMetaobjectEntry[]>([]);
  const [loadedById, setLoadedById] = useState<
    Record<string, StaffMetaobjectEntry>
  >({});
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [createSuccess, setCreateSuccess] = useState("");

  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /* ------------------ Fetch entries when open ------------------ */

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setLoading(true);
    setError("");

    const handle = window.setTimeout(() => {
      listMetaobjectEntries(token, type, {
        q: query.trim() || undefined,
        groupId: groupId || undefined,
        take: 200,
      })
        .then((response) => {
          if (cancelled) return;
          setEntries(response.items);
          setLoadedById((current) => {
            const next = { ...current };
            for (const item of response.items) next[item.id] = item;
            return next;
          });
        })
        .catch((caught) => {
          if (cancelled) return;
          setError(
            caught instanceof StaffMetaobjectsApiError
              ? caught.message
              : "Unable to load entries.",
          );
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 150);

    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [open, query, groupId, token, type]);

  /* ------------------ Load already-selected entries by id ------------------ */

  useEffect(() => {
    if (value.length === 0) return;

    let cancelled = false;
    const missing = value.filter((id) => !loadedById[id]);
    if (missing.length === 0) return;

    (async () => {
      const results: StaffMetaobjectEntry[] = [];
      for (const id of missing) {
        try {
          const entry = await getMetaobjectEntry(token, type, id);
          results.push(entry);
        } catch {
          // entry was deleted; ignore
        }
      }
      if (cancelled) return;
      setLoadedById((current) => {
        const next = { ...current };
        for (const entry of results) next[entry.id] = entry;
        return next;
      });
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, token, type]);

  /* ------------------ Close on outside click / Escape ------------------ */

  useEffect(() => {
    if (!open) return;

    function onClick(event: MouseEvent) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    window.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      window.setTimeout(() => inputRef.current?.focus(), 20);
    } else {
      setQuery("");
      setCreateSuccess("");
      setError("");
    }
  }, [open]);

  /* ------------------ Selection ------------------ */

  const selected = useMemo(() => {
    return value
      .map((id) => loadedById[id])
      .filter((e): e is StaffMetaobjectEntry => Boolean(e));
  }, [value, loadedById]);

  function isSelected(id: string): boolean {
    return value.includes(id);
  }

  function toggle(entry: StaffMetaobjectEntry) {
    if (isSelected(entry.id)) {
      onChange(selected.filter((e) => e.id !== entry.id));
    } else {
      const next = multiple ? [...selected, entry] : [entry];
      onChange(next);
      if (!multiple) setOpen(false);
    }
  }

  /* ------------------ Create new ------------------ */

  async function createNew() {
    const label = query.trim();
    if (!label) {
      setError("Type a label first, then click Add new entry.");
      return;
    }

    setCreating(true);
    setError("");
    setCreateSuccess("");

    try {
      const created = await createMetaobjectEntry(token, type, {
        displayName: label,
        fields: groupId ? { group: groupId } : {},
      });

      setLoadedById((current) => ({ ...current, [created.id]: created }));
      const next = multiple ? [...selected, created] : [created];
      onChange(next);
      onEntryCreated?.(created);
      setEntries((current) => [created, ...current]);
      setQuery("");
      setCreateSuccess(`Added "${created.displayName}".`);
      window.setTimeout(() => setCreateSuccess(""), 2000);
    } catch (caught) {
      setError(
        caught instanceof StaffMetaobjectsApiError
          ? caught.message
          : "Unable to create entry.",
      );
    } finally {
      setCreating(false);
    }
  }

  /* ------------------ Group for display ------------------ */

  const grouped = useMemo(() => {
    // No groupId → everything is a "default" entry.
    if (!groupId) {
      return { defaultEntries: entries, otherEntries: [] };
    }
    const defaultEntries: StaffMetaobjectEntry[] = [];
    const otherEntries: StaffMetaobjectEntry[] = [];
    for (const entry of entries) {
      const group = (entry.fields?.group as string | undefined) ?? "";
      if (group === groupId || group === "") {
        defaultEntries.push(entry);
      } else {
        otherEntries.push(entry);
      }
    }
    return { defaultEntries, otherEntries };
  }, [entries, groupId]);

  /* ------------------ Render ------------------ */

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        className={`flex w-full items-center justify-between gap-2 rounded-lg border bg-white px-3 py-2 text-left text-[13px] transition ${
          disabled
            ? "cursor-not-allowed border-neutral-200 bg-neutral-50 text-neutral-500"
            : "border-neutral-200 text-neutral-900 hover:border-neutral-300 focus:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-200"
        }`}
      >
        <span className="flex min-w-0 flex-wrap items-center gap-1.5">
          {selected.length === 0 ? (
            <span className="text-neutral-400">{placeholder}</span>
          ) : (
            selected.map((entry) => {
              const hex = entryHex(entry);
              return (
                <span
                  key={entry.id}
                  className="inline-flex items-center gap-1.5 rounded-md bg-neutral-100 px-2 py-0.5 text-[12px] text-neutral-800"
                >
                  {hex ? (
                    <span
                      className="h-3 w-3 rounded border border-neutral-300"
                      style={{ backgroundColor: hex }}
                    />
                  ) : null}
                  {entry.displayName}
                </span>
              );
            })
          )}
        </span>
        <svg
          viewBox="0 0 16 16"
          fill="none"
          className="h-3.5 w-3.5 shrink-0 text-neutral-500"
          aria-hidden="true"
        >
          <path
            d="M4 6l4 4 4-4"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && !disabled ? (
        <div
          className="absolute left-0 right-0 z-50 mt-1.5 flex flex-col rounded-lg border border-neutral-200 bg-white shadow-lg"
          style={{ maxHeight: 380 }}
        >
          <div className="shrink-0 border-b border-neutral-100 p-2">
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder ?? "Search or type a new entry"}
              className="w-full rounded-md border border-neutral-200 px-2.5 py-1.5 text-[12.5px] outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200"
            />
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {loading ? (
              <div className="px-3 py-3 text-center text-[12px] text-neutral-500">
                Loading…
              </div>
            ) : null}

            {!loading &&
            grouped.defaultEntries.length === 0 &&
            grouped.otherEntries.length === 0 ? (
              <div className="px-3 py-3 text-center text-[12px] text-neutral-500">
                No entries.
              </div>
            ) : null}

            {!loading && grouped.defaultEntries.length > 0 ? (
              <div>
                <div className="px-3 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wide text-neutral-400">
                  Default entries
                </div>
                <ul className="pb-1">
                  {grouped.defaultEntries.map((entry) => {
                    const hex = entryHex(entry);
                    const checked = isSelected(entry.id);
                    return (
                      <li key={entry.id}>
                        <button
                          type="button"
                          onClick={() => toggle(entry)}
                          className="flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-[12.5px] text-neutral-800 hover:bg-neutral-50"
                        >
                          <span
                            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                              checked
                                ? "border-neutral-900 bg-neutral-900 text-white"
                                : "border-neutral-300 bg-white"
                            }`}
                          >
                            {checked ? (
                              <svg
                                viewBox="0 0 12 12"
                                className="h-3 w-3"
                                fill="none"
                              >
                                <path
                                  d="M2.5 6.5 5 9l4.5-6"
                                  stroke="currentColor"
                                  strokeWidth="1.6"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            ) : null}
                          </span>
                          {hex ? (
                            <span
                              className="h-4 w-4 shrink-0 rounded border border-neutral-200"
                              style={{ backgroundColor: hex }}
                            />
                          ) : null}
                          <span className="truncate">{entry.displayName}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}

            {!loading && grouped.otherEntries.length > 0 ? (
              <div>
                <div className="px-3 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wide text-neutral-400">
                  Other entries
                </div>
                <ul className="pb-1">
                  {grouped.otherEntries.map((entry) => {
                    const hex = entryHex(entry);
                    const checked = isSelected(entry.id);
                    return (
                      <li key={entry.id}>
                        <button
                          type="button"
                          onClick={() => toggle(entry)}
                          className="flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-[12.5px] text-neutral-800 hover:bg-neutral-50"
                        >
                          <span
                            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                              checked
                                ? "border-neutral-900 bg-neutral-900 text-white"
                                : "border-neutral-300 bg-white"
                            }`}
                          >
                            {checked ? (
                              <svg
                                viewBox="0 0 12 12"
                                className="h-3 w-3"
                                fill="none"
                              >
                                <path
                                  d="M2.5 6.5 5 9l4.5-6"
                                  stroke="currentColor"
                                  strokeWidth="1.6"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            ) : null}
                          </span>
                          {hex ? (
                            <span
                              className="h-4 w-4 shrink-0 rounded border border-neutral-200"
                              style={{ backgroundColor: hex }}
                            />
                          ) : null}
                          <span className="truncate">{entry.displayName}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}
          </div>

          <div className="shrink-0 border-t border-neutral-100">
            {error ? (
              <div className="px-3 py-1.5 text-[11.5px] text-red-600">
                {error}
              </div>
            ) : null}
            {createSuccess ? (
              <div className="px-3 py-1.5 text-[11.5px] text-emerald-600">
                {createSuccess}
              </div>
            ) : null}
            <button
              type="button"
              onClick={() => void createNew()}
              disabled={creating || query.trim() === ""}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12.5px] font-medium text-neutral-800 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:text-neutral-400"
            >
              <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
                <path
                  d="M8 3v10M3 8h10"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
              {creating
                ? "Adding…"
                : query.trim()
                  ? `Add new entry "${query.trim()}"`
                  : "Add new entry"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}