"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  listMetafieldDefinitions,
  StaffMetaobjectsApiError,
} from "../../../lib/staff-metaobjects-api";
import type { StaffMetafieldDefinition } from "../../../types/staff-metaobjects";

/* ------------------------------------------------------------------ */
/* Props                                                               */
/* ------------------------------------------------------------------ */

export interface AddOptionDropdownProps {
  token: string;
  categoryId: number;
  existingOptionNames: string[];
  onPickOption: (definition: StaffMetafieldDefinition) => void;
  onPickCustom?: () => void;
  disabled?: boolean;
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function AddOptionDropdown({
  token,
  categoryId,
  existingOptionNames,
  onPickOption,
  onPickCustom,
  disabled = false,
}: AddOptionDropdownProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [definitions, setDefinitions] = useState<StaffMetafieldDefinition[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError("");

    listMetafieldDefinitions(token, categoryId)
      .then((response) => {
        if (cancelled) return;
        setDefinitions(response.items);
      })
      .catch((caught) => {
        if (cancelled) return;
        setError(
          caught instanceof StaffMetaobjectsApiError
            ? caught.message
            : "Unable to load options.",
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, categoryId, token]);

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
    }
  }, [open]);

  const candidateOptions = useMemo(() => {
    const used = new Set(existingOptionNames.map((n) => n.toLowerCase()));

    const pool = definitions.filter(
      (d) =>
        d.type === "metaobject" &&
        d.status === "ACTIVE" &&
        !used.has(d.name.toLowerCase()),
    );

    const q = query.trim().toLowerCase();
    const filtered = q
      ? pool.filter((d) => d.name.toLowerCase().includes(q))
      : pool;

    return filtered.sort((a, b) => {
      if (a.name === "Color") return -1;
      if (b.name === "Color") return 1;
      return a.name.localeCompare(b.name);
    });
  }, [definitions, query, existingOptionNames]);

  const recommended = candidateOptions.filter((d) => d.name === "Color");
  const others = candidateOptions.filter((d) => d.name !== "Color");

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        className="flex w-full items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-left text-[13px] font-medium text-neutral-800 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
          <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.4" />
          <path
            d="M8 5.5v5M5.5 8h5"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </svg>
        Add options like size or color
      </button>

      {open && !disabled ? (
        <div className="absolute left-0 right-0 z-40 mt-1.5 flex max-h-[380px] flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-lg">
          <div className="shrink-0 border-b border-neutral-100 p-2">
            <div className="flex items-center gap-2 rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 focus-within:border-neutral-400 focus-within:ring-2 focus-within:ring-neutral-200">
              <svg
                viewBox="0 0 16 16"
                fill="none"
                className="h-3.5 w-3.5 shrink-0 text-neutral-400"
              >
                <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.4" />
                <path
                  d="m10.5 10.5 2 2"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                />
              </svg>
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search"
                className="w-full border-0 bg-transparent text-[12.5px] outline-none placeholder:text-neutral-400"
              />
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {loading ? (
              <div className="px-3 py-3 text-center text-[12px] text-neutral-500">
                Loading…
              </div>
            ) : null}

            {!loading && error ? (
              <div className="px-3 py-3 text-center text-[12px] text-red-600">
                {error}
              </div>
            ) : null}

            {!loading && !error && recommended.length === 0 && others.length === 0 ? (
              <div className="px-3 py-3 text-center text-[12px] text-neutral-500">
                No options available.
              </div>
            ) : null}

            {!loading && recommended.length > 0 ? (
              <div>
                <div className="px-3 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wide text-neutral-400">
                  Recommended
                </div>
                <ul className="pb-1">
                  {recommended.map((def) => (
                    <li key={def.id}>
                      <button
                        type="button"
                        onClick={() => {
                          onPickOption(def);
                          setOpen(false);
                        }}
                        className="flex w-full items-center justify-between gap-2 bg-neutral-100 px-3 py-2 text-left text-[12.5px] text-neutral-800 hover:bg-neutral-200/60"
                      >
                        <span className="truncate">{def.name}</span>
                        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-600">
                          <svg viewBox="0 0 16 16" fill="none" className="h-2.5 w-2.5">
                            <circle cx="8" cy="8" r="5" stroke="currentColor" strokeWidth="1.6" />
                            <circle cx="8" cy="8" r="1.6" fill="currentColor" />
                          </svg>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {!loading && others.length > 0 ? (
              <div>
                <div className="px-3 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wide text-neutral-400">
                  Options
                </div>
                <ul className="pb-1">
                  {others.map((def) => (
                    <li key={def.id}>
                      <button
                        type="button"
                        onClick={() => {
                          onPickOption(def);
                          setOpen(false);
                        }}
                        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-[12.5px] text-neutral-800 hover:bg-neutral-50"
                      >
                        <span className="truncate">{def.name}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          <div className="shrink-0 border-t border-neutral-100">
            <button
              type="button"
              onClick={() => {
                onPickCustom?.();
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12.5px] font-medium text-neutral-800 hover:bg-neutral-50"
            >
              <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
                <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.4" />
                <path
                  d="M8 5.5v5M5.5 8h5"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                />
              </svg>
              Create custom option
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}