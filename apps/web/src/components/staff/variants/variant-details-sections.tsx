"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type {
  StaffFeature,
  StaffPort,
  StaffVariantSpecification,
} from "../../../types/staff-catalogue";

/* ------------------------------------------------------------------ */
/* Field catalog                                                       */
/* ------------------------------------------------------------------ */

type SpecFieldKey = keyof StaffVariantSpecification;

const SPEC_FIELDS: Array<{
  key: SpecFieldKey;
  label: string;
  type?: "text" | "number" | "boolean";
}> = [
  { key: "cpuBrand", label: "CPU brand" },
  { key: "cpuModel", label: "CPU model" },
  { key: "cpuGeneration", label: "CPU generation" },
  { key: "cpuCores", label: "CPU cores", type: "number" },
  { key: "cpuThreads", label: "CPU threads", type: "number" },
  { key: "gpuBrand", label: "GPU brand" },
  { key: "gpuModel", label: "GPU model" },
  { key: "gpuVramGb", label: "GPU VRAM (GB)", type: "number" },
  { key: "ramType", label: "RAM type" },
  { key: "ramSpeedMhz", label: "RAM speed (MHz)", type: "number" },
  { key: "maxRamGb", label: "Max RAM (GB)", type: "number" },
  { key: "ramSlots", label: "RAM slots", type: "number" },
  { key: "storageType", label: "Storage type" },
  { key: "storageInterface", label: "Storage interface" },
  { key: "storageSlots", label: "Storage slots", type: "number" },
  { key: "maxStorageGb", label: "Max storage (GB)", type: "number" },
  { key: "displaySizeInches", label: "Display size (in)", type: "number" },
  { key: "displayResolution", label: "Display resolution" },
  { key: "displayPanelType", label: "Panel type" },
  { key: "displayRefreshRateHz", label: "Refresh rate (Hz)", type: "number" },
  { key: "displayBrightnessNits", label: "Brightness (nits)", type: "number" },
  { key: "displayColorGamut", label: "Color gamut" },
  { key: "batteryCapacityWh", label: "Battery (Wh)", type: "number" },
  { key: "weightKg", label: "Weight (kg)", type: "number" },
  { key: "widthMm", label: "Width (mm)", type: "number" },
  { key: "depthMm", label: "Depth (mm)", type: "number" },
  { key: "heightMm", label: "Height (mm)", type: "number" },
  { key: "webcamResolution", label: "Webcam" },
  { key: "wifiVersion", label: "Wi-Fi" },
  { key: "bluetoothVersion", label: "Bluetooth" },
  { key: "keyboardType", label: "Keyboard type" },
  { key: "keyboardBacklight", label: "Keyboard backlight", type: "boolean" },
  { key: "fingerprintSensor", label: "Fingerprint sensor", type: "boolean" },
];

const inputClass =
  "w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-[13px] text-neutral-900 outline-none transition placeholder:text-neutral-400 hover:border-neutral-300 focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200";

/* ------------------------------------------------------------------ */
/* Props                                                               */
/* ------------------------------------------------------------------ */

export interface VariantDetailsSectionsProps {
  specification: StaffVariantSpecification | null;
  ports: StaffPort[];
  features: StaffFeature[];
  tags: string[];
  disabled?: boolean;
  onSpecificationChange: (next: StaffVariantSpecification) => void;
  onPortsChange: (next: StaffPort[]) => void;
  onFeaturesChange: (next: StaffFeature[]) => void;
  onTagsChange: (next: string[]) => void;
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function VariantDetailsSections({
  specification,
  ports,
  features,
  tags,
  disabled = false,
  onSpecificationChange,
  onPortsChange,
  onFeaturesChange,
  onTagsChange,
}: VariantDetailsSectionsProps) {
  const [openSpec, setOpenSpec] = useState(true);
  const [openPorts, setOpenPorts] = useState(false);
  const [openFeatures, setOpenFeatures] = useState(false);
  const [openTags, setOpenTags] = useState(false);

  /* ------------------ Which spec fields to render ------------------ */

  const [shownFields, setShownFields] = useState<Set<SpecFieldKey>>(() => {
    const initial = new Set<SpecFieldKey>();
    for (const [key, value] of Object.entries(specification ?? {})) {
      if (
        value !== null &&
        value !== undefined &&
        value !== "" &&
        key !== "id"
      ) {
        initial.add(key as SpecFieldKey);
      }
    }
    return initial;
  });

  const [specPickerOpen, setSpecPickerOpen] = useState(false);
  const [specPickerQuery, setSpecPickerQuery] = useState("");
  const [specPickerDirection, setSpecPickerDirection] = useState<"down" | "up">(
    "down",
  );

  const specPickerAnchorRef = useRef<HTMLDivElement>(null);
  const specPickerMenuRef = useRef<HTMLDivElement>(null);

  /* ------------------ Spec value helpers ------------------ */

  function specValue(key: SpecFieldKey): string {
    const value = specification?.[key];
    return value == null ? "" : String(value);
  }

  function updateSpec(
    key: SpecFieldKey,
    raw: string,
    type: "text" | "number" | "boolean",
  ) {
    const next: StaffVariantSpecification = { ...(specification ?? {}) };
    const target = next as Record<string, unknown>;
    if (type === "number") {
      target[key as string] = raw.trim() === "" ? null : Number(raw);
    } else if (type === "boolean") {
      target[key as string] = raw === "" ? null : raw === "true";
    } else {
      target[key as string] = raw.trim() === "" ? null : raw.trim();
    }
    onSpecificationChange(next);
  }

  function addSpecField(key: SpecFieldKey) {
    setShownFields((current) => {
      const copy = new Set(current);
      copy.add(key);
      return copy;
    });
    setSpecPickerOpen(false);
    setSpecPickerQuery("");
  }

  function removeSpecField(key: SpecFieldKey) {
    const next: StaffVariantSpecification = { ...(specification ?? {}) };
    const target = next as Record<string, unknown>;
    target[key as string] = null;
    onSpecificationChange(next);

    setShownFields((current) => {
      const copy = new Set(current);
      copy.delete(key);
      return copy;
    });
  }

  /* ------------------ Flip direction on open ------------------ */

  useEffect(() => {
    if (!specPickerOpen) return;

    // Measure available space below/above the anchor. If there's less than
    // ~340px below, flip the menu upward.
    const anchor = specPickerAnchorRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    setSpecPickerDirection(
      spaceBelow < 340 && spaceAbove > spaceBelow ? "up" : "down",
    );
  }, [specPickerOpen]);

  /* ------------------ Close on outside click / Escape ------------------ */

  useEffect(() => {
    if (!specPickerOpen) return;

    function onClick(event: MouseEvent) {
      const anchor = specPickerAnchorRef.current;
      const menu = specPickerMenuRef.current;
      if (
        anchor &&
        !anchor.contains(event.target as Node) &&
        menu &&
        !menu.contains(event.target as Node)
      ) {
        setSpecPickerOpen(false);
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSpecPickerOpen(false);
        setSpecPickerQuery("");
      }
    }

    window.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [specPickerOpen]);

  /* ------------------ Spec picker results ------------------ */

  const specCandidates = useMemo(() => {
    const q = specPickerQuery.trim().toLowerCase();
    return SPEC_FIELDS.filter((f) => {
      if (shownFields.has(f.key)) return false;
      if (!q) return true;
      return f.label.toLowerCase().includes(q);
    });
  }, [shownFields, specPickerQuery]);

  const visibleSpecFields = useMemo(
    () => SPEC_FIELDS.filter((f) => shownFields.has(f.key)),
    [shownFields],
  );

  /* ------------------ Ports helpers ------------------ */

  function updatePort(index: number, patch: Partial<StaffPort>) {
    onPortsChange(ports.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  }

  function addPort() {
    onPortsChange([
      ...ports,
      {
        portType: "",
        quantity: 1,
        version: null,
        supportsCharging: false,
        supportsDisplay: false,
      },
    ]);
  }

  function removePort(index: number) {
    onPortsChange(ports.filter((_, i) => i !== index));
  }

  /* ------------------ Features helpers ------------------ */

  function updateFeature(index: number, patch: Partial<StaffFeature>) {
    onFeaturesChange(
      features.map((f, i) => (i === index ? { ...f, ...patch } : f)),
    );
  }

  function addFeature() {
    onFeaturesChange([
      ...features,
      { featureType: "", featureName: "", description: null, score: null },
    ]);
  }

  function removeFeature(index: number) {
    onFeaturesChange(features.filter((_, i) => i !== index));
  }

  /* ------------------ Tags helpers ------------------ */

  const [tagDraft, setTagDraft] = useState("");

  function commitTag() {
    const value = tagDraft.trim();
    if (!value) return;
    if (tags.some((t) => t.toLowerCase() === value.toLowerCase())) {
      setTagDraft("");
      return;
    }
    onTagsChange([...tags, value]);
    setTagDraft("");
  }

  /* ------------------ Render ------------------ */

  return (
    <div className="space-y-4">
      {/* Specification */}
      <Section
        title="Specification"
        open={openSpec}
        onToggle={() => setOpenSpec((v) => !v)}
        count={visibleSpecFields.length}
      >
        <div className="space-y-2">
          {visibleSpecFields.length === 0 ? (
            <p className="text-[12.5px] text-neutral-500">
              No specifications added yet.
            </p>
          ) : (
            visibleSpecFields.map((field) => {
              const value = specValue(field.key);
              return (
                <div
                  key={field.key}
                  className="group grid grid-cols-[180px_minmax(0,1fr)_28px] items-center gap-3"
                >
                  <span className="truncate text-[12.5px] text-neutral-700">
                    {field.label}
                  </span>
                  <div>
                    {field.type === "boolean" ? (
                      <select
                        value={value}
                        onChange={(e) =>
                          updateSpec(field.key, e.target.value, "boolean")
                        }
                        disabled={disabled}
                        className={inputClass}
                      >
                        <option value="">Not specified</option>
                        <option value="true">Yes</option>
                        <option value="false">No</option>
                      </select>
                    ) : (
                      <input
                        type={field.type === "number" ? "number" : "text"}
                        value={value}
                        onChange={(e) =>
                          updateSpec(
                            field.key,
                            e.target.value,
                            field.type ?? "text",
                          )
                        }
                        disabled={disabled}
                        placeholder="—"
                        className={inputClass}
                      />
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeSpecField(field.key)}
                    disabled={disabled}
                    aria-label={`Remove ${field.label}`}
                    className="flex h-6 w-6 items-center justify-center rounded-md text-neutral-400 opacity-0 transition group-hover:opacity-100 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                  >
                    <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
                      <path
                        d="M4 4l8 8M12 4l-8 8"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                      />
                    </svg>
                  </button>
                </div>
              );
            })
          )}

          {/* Add specification */}
          <div ref={specPickerAnchorRef} className="relative pt-1">
            <button
              type="button"
              onClick={() => setSpecPickerOpen((v) => !v)}
              disabled={disabled}
              className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-[12.5px] font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-40"
            >
              <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
                <path
                  d="M8 3v10M3 8h10"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
              Add specification
            </button>

            {specPickerOpen ? (
              <div
                ref={specPickerMenuRef}
                className={`absolute left-0 right-0 z-50 flex max-h-[320px] flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-lg ${
                  specPickerDirection === "up"
                    ? "bottom-full mb-1.5"
                    : "top-full mt-1.5"
                }`}
              >
                <div className="shrink-0 border-b border-neutral-100 p-2">
                  <input
                    autoFocus
                    value={specPickerQuery}
                    onChange={(e) => setSpecPickerQuery(e.target.value)}
                    placeholder="Search specifications"
                    className="w-full rounded-md border border-neutral-200 px-2.5 py-1.5 text-[12.5px] outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200"
                  />
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto">
                  {specCandidates.length === 0 ? (
                    <div className="px-3 py-3 text-center text-[12px] text-neutral-500">
                      {specPickerQuery.trim()
                        ? "No matching specifications."
                        : "All specifications are already added."}
                    </div>
                  ) : (
                    <ul className="py-1">
                      {specCandidates.map((field) => (
                        <li key={field.key}>
                          <button
                            type="button"
                            onClick={() => addSpecField(field.key)}
                            className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-[12.5px] text-neutral-800 hover:bg-neutral-50"
                          >
                            <span className="truncate">{field.label}</span>
                            <svg
                              viewBox="0 0 16 16"
                              fill="none"
                              className="h-3.5 w-3.5 text-neutral-400"
                            >
                              <path
                                d="M8 3v10M3 8h10"
                                stroke="currentColor"
                                strokeWidth="1.6"
                                strokeLinecap="round"
                              />
                            </svg>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="flex shrink-0 justify-end border-t border-neutral-100 px-2 py-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setSpecPickerOpen(false);
                      setSpecPickerQuery("");
                    }}
                    className="rounded-md px-2 py-1 text-[12px] text-neutral-500 hover:bg-neutral-100"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </Section>

      {/* Ports */}
      <Section
        title="Ports"
        open={openPorts}
        onToggle={() => setOpenPorts((v) => !v)}
        count={ports.length}
      >
        <div className="space-y-2">
          {ports.length === 0 ? (
            <p className="text-[12.5px] text-neutral-500">No ports specified.</p>
          ) : (
            ports.map((port, index) => (
              <div
                key={index}
                className="grid gap-2 rounded-lg border border-neutral-200 bg-white p-2.5 md:grid-cols-[minmax(140px,1.4fr)_70px_minmax(100px,1fr)_auto_auto_auto]"
              >
                <input
                  value={port.portType}
                  onChange={(e) => updatePort(index, { portType: e.target.value })}
                  placeholder="Type (e.g. USB-C)"
                  disabled={disabled}
                  className={inputClass}
                />
                <input
                  type="number"
                  min={1}
                  value={port.quantity}
                  onChange={(e) =>
                    updatePort(index, { quantity: Number(e.target.value) || 1 })
                  }
                  placeholder="Qty"
                  disabled={disabled}
                  className={inputClass}
                />
                <input
                  value={port.version ?? ""}
                  onChange={(e) =>
                    updatePort(index, { version: e.target.value || null })
                  }
                  placeholder="Version"
                  disabled={disabled}
                  className={inputClass}
                />
                <label className="flex items-center gap-1 text-[12px] text-neutral-700">
                  <input
                    type="checkbox"
                    checked={port.supportsCharging ?? false}
                    onChange={(e) =>
                      updatePort(index, { supportsCharging: e.target.checked })
                    }
                    disabled={disabled}
                    className="h-4 w-4 rounded border-neutral-300"
                  />
                  Charge
                </label>
                <label className="flex items-center gap-1 text-[12px] text-neutral-700">
                  <input
                    type="checkbox"
                    checked={port.supportsDisplay ?? false}
                    onChange={(e) =>
                      updatePort(index, { supportsDisplay: e.target.checked })
                    }
                    disabled={disabled}
                    className="h-4 w-4 rounded border-neutral-300"
                  />
                  Display
                </label>
                <button
                  type="button"
                  onClick={() => removePort(index)}
                  disabled={disabled}
                  className="rounded-md border border-neutral-200 px-2 text-neutral-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                >
                  ×
                </button>
              </div>
            ))
          )}
          <button
            type="button"
            onClick={addPort}
            disabled={disabled}
            className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-[12.5px] font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-40"
          >
            + Add port
          </button>
        </div>
      </Section>

      {/* Features */}
      <Section
        title="Features"
        open={openFeatures}
        onToggle={() => setOpenFeatures((v) => !v)}
        count={features.length}
      >
        <div className="space-y-2">
          {features.length === 0 ? (
            <p className="text-[12.5px] text-neutral-500">
              No features specified.
            </p>
          ) : (
            features.map((feature, index) => (
              <div
                key={index}
                className="grid gap-2 rounded-lg border border-neutral-200 bg-white p-2.5 md:grid-cols-[minmax(120px,1fr)_minmax(160px,1.4fr)_80px_auto]"
              >
                <input
                  value={feature.featureType}
                  onChange={(e) =>
                    updateFeature(index, { featureType: e.target.value })
                  }
                  placeholder="Type (e.g. Performance)"
                  disabled={disabled}
                  className={inputClass}
                />
                <input
                  value={feature.featureName}
                  onChange={(e) =>
                    updateFeature(index, { featureName: e.target.value })
                  }
                  placeholder="Name"
                  disabled={disabled}
                  className={inputClass}
                />
                <input
                  type="number"
                  step={0.1}
                  value={feature.score ?? ""}
                  onChange={(e) =>
                    updateFeature(index, {
                      score: e.target.value === "" ? null : e.target.value,
                    })
                  }
                  placeholder="Score"
                  disabled={disabled}
                  className={inputClass}
                />
                <button
                  type="button"
                  onClick={() => removeFeature(index)}
                  disabled={disabled}
                  className="rounded-md border border-neutral-200 px-2 text-neutral-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                >
                  ×
                </button>
                <textarea
                  value={feature.description ?? ""}
                  onChange={(e) =>
                    updateFeature(index, {
                      description: e.target.value || null,
                    })
                  }
                  placeholder="Description"
                  rows={2}
                  disabled={disabled}
                  className={`${inputClass} md:col-span-4`}
                />
              </div>
            ))
          )}
          <button
            type="button"
            onClick={addFeature}
            disabled={disabled}
            className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-[12.5px] font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-40"
          >
            + Add feature
          </button>
        </div>
      </Section>

      {/* Tags */}
      <Section
        title="Tags"
        open={openTags}
        onToggle={() => setOpenTags((v) => !v)}
        count={tags.length}
      >
        <div className="flex min-h-[42px] flex-wrap items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-2 py-1.5">
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-md bg-neutral-100 px-2 py-0.5 text-[12px] text-neutral-700"
            >
              {tag}
              <button
                type="button"
                disabled={disabled}
                onClick={() => onTagsChange(tags.filter((t) => t !== tag))}
                className="text-neutral-500 hover:text-neutral-800 disabled:opacity-40"
              >
                ×
              </button>
            </span>
          ))}
          <input
            value={tagDraft}
            onChange={(e) => setTagDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                commitTag();
              } else if (
                e.key === "Backspace" &&
                tagDraft === "" &&
                tags.length > 0
              ) {
                onTagsChange(tags.slice(0, -1));
              }
            }}
            onBlur={commitTag}
            disabled={disabled}
            placeholder="Add tag and press Enter"
            className="min-w-[140px] flex-1 bg-transparent px-1 py-1 text-[12.5px] outline-none placeholder:text-neutral-400"
          />
        </div>
      </Section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Collapsible section shell (no overflow-hidden on the wrapper)       */
/* ------------------------------------------------------------------ */

function Section({
  title,
  open,
  onToggle,
  count,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white">
      <button
        type="button"
        onClick={onToggle}
        className={`flex w-full items-center justify-between bg-white px-4 py-2.5 text-left hover:bg-neutral-50 ${
          open ? "border-b border-neutral-100" : "rounded-xl"
        }`}
      >
        <span className="flex items-center gap-2 text-[13px] font-medium text-neutral-800">
          {title}
          {typeof count === "number" && count > 0 ? (
            <span className="rounded-md bg-neutral-100 px-1.5 py-0.5 text-[11px] text-neutral-600">
              {count}
            </span>
          ) : null}
        </span>
        <svg
          viewBox="0 0 16 16"
          fill="none"
          className={`h-3.5 w-3.5 text-neutral-500 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        >
          <path
            d="m4 6 4 4 4-4"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {open ? <div className="px-4 py-4">{children}</div> : null}
    </div>
  );
}