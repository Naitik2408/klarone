"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  createMetaobjectEntry,
  StaffMetaobjectsApiError,
  updateMetaobjectEntry,
} from "../../../lib/staff-metaobjects-api";
import type { StaffMetaobjectEntry } from "../../../types/staff-metaobjects";

/* ------------------------------------------------------------------ */
/* Props                                                               */
/* ------------------------------------------------------------------ */

export interface AddColorSlideOverProps {
  open: boolean;
  token: string;
  /**
   * When provided, the slide-over opens in edit mode for this entry.
   * When null, it opens in create mode.
   */
  entry?: StaffMetaobjectEntry | null;
  /** Called after a successful create or update. */
  onSaved: (entry: StaffMetaobjectEntry) => void;
  onClose: () => void;
}

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

const BASE_COLORS: Array<{ label: string; hex: string }> = [
  { label: "Black",  hex: "#000000" },
  { label: "White",  hex: "#FFFFFF" },
  { label: "Grey",   hex: "#808080" },
  { label: "Silver", hex: "#C0C0C0" },
  { label: "Red",    hex: "#FF0000" },
  { label: "Orange", hex: "#FFA500" },
  { label: "Yellow", hex: "#FFFF00" },
  { label: "Green",  hex: "#008000" },
  { label: "Blue",   hex: "#0000FF" },
  { label: "Navy",   hex: "#000080" },
  { label: "Teal",   hex: "#008080" },
  { label: "Purple", hex: "#800080" },
  { label: "Pink",   hex: "#FFC0CB" },
  { label: "Brown",  hex: "#8B4513" },
  { label: "Beige",  hex: "#F5F5DC" },
  { label: "Gold",   hex: "#FFD700" },
  { label: "Maroon", hex: "#800000" },
  { label: "Multi",  hex: "#A0A0A0" },
];

const BASE_PATTERNS = [
  "Solid",
  "Striped",
  "Checked",
  "Dotted",
  "Floral",
  "Geometric",
  "Gradient",
  "Patterned",
  "Camouflage",
  "Glitter",
];

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function fieldString(
  entry: StaffMetaobjectEntry | null | undefined,
  key: string,
): string {
  if (!entry) return "";
  const value = entry.fields?.[key];
  return value == null ? "" : String(value);
}

const inputClass =
  "w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-[13px] text-neutral-900 outline-none transition placeholder:text-neutral-400 hover:border-neutral-300 focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200";

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function AddColorSlideOver({
  open,
  token,
  entry,
  onSaved,
  onClose,
}: AddColorSlideOverProps) {
  const isEdit = Boolean(entry);

  const [displayName, setDisplayName] = useState("");
  const [hex, setHex] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [baseColor, setBaseColor] = useState("");
  const [basePattern, setBasePattern] = useState("Solid");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ------------------ Hydrate on open ------------------ */

  useEffect(() => {
    if (!open) return;
    if (entry) {
      setDisplayName(entry.displayName);
      setHex(fieldString(entry, "hex"));
      setImageUrl(fieldString(entry, "imageUrl"));
      setBaseColor(fieldString(entry, "baseColor"));
      setBasePattern(fieldString(entry, "basePattern") || "Solid");
    } else {
      setDisplayName("");
      setHex("");
      setImageUrl("");
      setBaseColor("");
      setBasePattern("Solid");
    }
    setError("");
    setSaving(false);
  }, [open, entry]);

  /* ------------------ Escape to close ------------------ */

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !saving) {
        onClose();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, saving, onClose]);

  /* ------------------ Dirty tracking ------------------ */

  const isDirty = useMemo(() => {
    if (!open) return false;
    if (!isEdit) {
      return (
        displayName.trim() !== "" ||
        hex.trim() !== "" ||
        imageUrl.trim() !== "" ||
        baseColor.trim() !== "" ||
        basePattern !== "Solid"
      );
    }
    return (
      displayName !== entry!.displayName ||
      hex !== fieldString(entry, "hex") ||
      imageUrl !== fieldString(entry, "imageUrl") ||
      baseColor !== fieldString(entry, "baseColor") ||
      basePattern !== (fieldString(entry, "basePattern") || "Solid")
    );
  }, [
    open,
    isEdit,
    entry,
    displayName,
    hex,
    imageUrl,
    baseColor,
    basePattern,
  ]);

  /* ------------------ Save ------------------ */

  async function save() {
    setError("");

    const trimmedName = displayName.trim();
    if (!trimmedName) {
      setError("Label is required.");
      return;
    }

    const trimmedHex = hex.trim();
    if (!trimmedHex) {
      setError("Color is required.");
      return;
    }
    if (!/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(trimmedHex)) {
      setError("Color must be a valid hex value like #A54DCF.");
      return;
    }

    if (!baseColor.trim()) {
      setError("Base color is required.");
      return;
    }
    if (!basePattern.trim()) {
      setError("Base pattern is required.");
      return;
    }

    const fields = {
      hex: trimmedHex,
      imageUrl: imageUrl.trim() || null,
      baseColor: baseColor.trim(),
      basePattern: basePattern.trim(),
    };

    setSaving(true);
    try {
      const saved = isEdit
        ? await updateMetaobjectEntry(token, "color", entry!.id, {
            displayName: trimmedName,
            fields,
          })
        : await createMetaobjectEntry(token, "color", {
            displayName: trimmedName,
            handle: slugify(trimmedName),
            fields,
          });

      onSaved(saved);
    } catch (caught) {
      if (caught instanceof StaffMetaobjectsApiError) {
        setError(caught.message);
      } else if (caught instanceof Error) {
        setError(caught.message);
      } else {
        setError("Unable to save the color.");
      }
    } finally {
      setSaving(false);
    }
  }

  function discard() {
    if (entry) {
      setDisplayName(entry.displayName);
      setHex(fieldString(entry, "hex"));
      setImageUrl(fieldString(entry, "imageUrl"));
      setBaseColor(fieldString(entry, "baseColor"));
      setBasePattern(fieldString(entry, "basePattern") || "Solid");
    } else {
      setDisplayName("");
      setHex("");
      setImageUrl("");
      setBaseColor("");
      setBasePattern("Solid");
    }
    setError("");
  }

  /* ------------------ Preview swatch ------------------ */

  const previewHex =
    /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex.trim()) ? hex.trim() : null;

  const handle = slugify(displayName || "");

  /* ------------------ Render ------------------ */

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-center">
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close"
        onClick={() => {
          if (!saving) onClose();
        }}
        className="absolute inset-0 cursor-default bg-neutral-900/20"
      />

      {/* Slide-over */}
      <div className="relative flex h-full w-full max-w-[980px] flex-col bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-3">
          <div className="flex items-center gap-2">
            <svg
              viewBox="0 0 16 16"
              fill="none"
              className="h-4 w-4 text-neutral-500"
              aria-hidden="true"
            >
              <rect
                x="2.5"
                y="2.5"
                width="11"
                height="11"
                rx="1.5"
                stroke="currentColor"
                strokeWidth="1.4"
              />
            </svg>
            <h2 className="text-[14px] font-semibold text-neutral-900">
              {isEdit ? "Edit Color" : "Add Color"}
            </h2>
          </div>

          {/* Dirty pill */}
          <div className="flex items-center gap-2">
            {isDirty ? (
              <div className="flex items-center gap-2 rounded-full bg-neutral-900 px-1 py-1 pl-3 text-[12px] text-white">
                <span className="pr-1">Unsaved changes</span>
                <button
                  type="button"
                  onClick={discard}
                  disabled={saving}
                  className="rounded-full bg-white/10 px-2.5 py-1 text-[12px] font-medium hover:bg-white/20 disabled:opacity-50"
                >
                  Discard
                </button>
                <button
                  type="button"
                  onClick={() => void save()}
                  disabled={saving}
                  className="rounded-full bg-white px-2.5 py-1 text-[12px] font-medium text-neutral-900 hover:bg-neutral-100 disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            ) : null}

            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              aria-label="Close"
              className="flex h-8 w-8 items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-100 disabled:opacity-40"
            >
              <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4">
                <path
                  d="M4 4l8 8M12 4l-8 8"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex min-h-0 flex-1">
          {/* Main column */}
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-[640px] px-6 py-6">
              {error ? (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12.5px] text-red-700">
                  {error}
                </div>
              ) : null}

              <div className="rounded-xl border border-neutral-200 bg-white">
                <div className="space-y-5 px-4 py-4">
                  {/* Label */}
                  <label className="block">
                    <span className="mb-1.5 flex items-center justify-between text-[12px] font-medium text-neutral-700">
                      <span>
                        Label <span className="text-red-500">*</span>
                      </span>
                      <span className="text-[11px] text-neutral-400">
                        Display name
                      </span>
                    </span>
                    <input
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="e.g. purple"
                      className={inputClass}
                      autoFocus
                    />
                  </label>

                  {/* Hex */}
                  <label className="block">
                    <span className="mb-1.5 flex items-center justify-between text-[12px] font-medium text-neutral-700">
                      <span>
                        Color <span className="text-red-500">*</span>
                      </span>
                    </span>
                    <div className="flex items-center rounded-lg border border-neutral-200 bg-white focus-within:border-neutral-400 focus-within:ring-2 focus-within:ring-neutral-200">
                      <span className="flex h-9 w-10 items-center justify-center">
                        <span
                          className="h-5 w-5 rounded border border-neutral-300"
                          style={{
                            backgroundColor: previewHex ?? "transparent",
                          }}
                        />
                      </span>
                      <input
                        value={hex}
                        onChange={(e) => setHex(e.target.value)}
                        placeholder="#A54DCF"
                        className="w-full border-0 bg-transparent px-2 py-2 text-[13px] uppercase outline-none placeholder:text-neutral-400"
                      />
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {BASE_COLORS.map((c) => (
                        <button
                          key={c.label}
                          type="button"
                          onClick={() => setHex(c.hex)}
                          title={c.label}
                          className="h-6 w-6 rounded border border-neutral-200 transition hover:scale-110"
                          style={{ backgroundColor: c.hex }}
                        />
                      ))}
                    </div>
                  </label>

                  {/* Image */}
                  <div>
                    <span className="mb-1.5 block text-[12px] font-medium text-neutral-700">
                      Image
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="rounded-lg border border-neutral-200 bg-neutral-100 px-3 py-1.5 text-[12.5px] font-medium text-neutral-800 hover:bg-neutral-200"
                      >
                        Select image
                      </button>
                      {imageUrl ? (
                        <span className="truncate text-[12px] text-neutral-500">
                          {imageUrl}
                        </span>
                      ) : null}
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          // Phase 4 will wire this to the media upload service.
                          // For now, show the local object URL so the picker is
                          // honest about the selection.
                          setImageUrl(URL.createObjectURL(file));
                        }
                      }}
                    />
                  </div>

                  {/* Base color */}
                  <label className="block">
                    <span className="mb-1.5 block text-[12px] font-medium text-neutral-700">
                      Base color <span className="text-red-500">*</span>
                    </span>
                    <select
                      value={baseColor}
                      onChange={(e) => setBaseColor(e.target.value)}
                      className={inputClass}
                    >
                      <option value="">Select values</option>
                      {BASE_COLORS.map((c) => (
                        <option key={c.label} value={c.label}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-[11.5px] text-neutral-500">
                      Base values map to standards for better search and
                      organization
                    </p>
                  </label>

                  {/* Base pattern */}
                  <label className="block">
                    <span className="mb-1.5 block text-[12px] font-medium text-neutral-700">
                      Base pattern <span className="text-red-500">*</span>
                    </span>
                    <select
                      value={basePattern}
                      onChange={(e) => setBasePattern(e.target.value)}
                      className={inputClass}
                    >
                      {BASE_PATTERNS.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-[11.5px] text-neutral-500">
                      Base values map to standards for better search and
                      organization
                    </p>
                  </label>
                </div>
              </div>

              <p className="mt-4 text-center text-[12px] text-neutral-500">
                Learn more about entries
              </p>
            </div>
          </div>

          {/* Right rail */}
          <aside className="hidden w-[280px] shrink-0 border-l border-neutral-200 bg-white px-5 py-6 lg:block">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-medium text-neutral-800">
                Color
              </span>
              <button
                type="button"
                aria-label="More options"
                className="flex h-6 w-6 items-center justify-center rounded text-neutral-400 hover:bg-neutral-100"
              >
                <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
                  <circle cx="3" cy="8" r="1" fill="currentColor" />
                  <circle cx="8" cy="8" r="1" fill="currentColor" />
                  <circle cx="13" cy="8" r="1" fill="currentColor" />
                </svg>
              </button>
            </div>

            <div className="mt-1 text-[12px] text-neutral-500">
              by Klarone
            </div>

            <div className="mt-5 border-t border-neutral-100 pt-4">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-medium text-neutral-700">
                  Handle
                </span>
                <svg
                  viewBox="0 0 16 16"
                  fill="none"
                  className="h-3.5 w-3.5 text-neutral-400"
                >
                  <path
                    d="M2.5 11.5 11 3l2 2-8.5 8.5H2.5v-2Z"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div className="mt-1.5 truncate text-[13px] text-neutral-800">
                {handle || "—"}
              </div>
              <p className="mt-1 text-[11.5px] text-neutral-500">
                The entry's auto-generated identifier
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}