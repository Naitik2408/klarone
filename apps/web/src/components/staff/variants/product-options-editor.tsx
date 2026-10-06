"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  addStaffProductOptionValue,
  createStaffProductOption,
  deleteStaffProductOption,
  deleteStaffProductOptionValue,
  getStaffProductOptions,
  StaffCatalogueApiError,
  type StaffProductOption,
  type StaffProductOptionValue,
} from "../../../lib/staff-catalogue-api";
import type { StaffMetaobjectEntry } from "../../../types/staff-metaobjects";
import AddOptionDropdown from "./add-option-dropdown";
import OptionValuePicker from "./option-value-picker";

export interface ProductOptionsEditorProps {
  token: string;
  productId: string;
  categoryId: number;
  onChange?: (options: StaffProductOption[]) => void;
}

export default function ProductOptionsEditor({
  token,
  productId,
  categoryId,
  onChange,
}: ProductOptionsEditorProps) {
  const [options, setOptions] = useState<StaffProductOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editingIds, setEditingIds] = useState<Set<string>>(new Set());

  const [isCreatingCustom, setIsCreatingCustom] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customValues, setCustomValues] = useState<string[]>([]);
  const [customValueInput, setCustomValueInput] = useState("");
  const [customTouched, setCustomTouched] = useState(false);

  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await getStaffProductOptions(token, productId);
      setOptions(result);
      onChangeRef.current?.(result);
    } catch (caught) {
      if (caught instanceof StaffCatalogueApiError) {
        setError(caught.message);
      } else if (caught instanceof Error) {
        setError(caught.message);
      } else {
        setError("Unable to load options.");
      }
    } finally {
      setLoading(false);
    }
  }, [token, productId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handlePickOption(definition: {
    id: number;
    name: string;
    metaobjectType: string | null;
  }) {
    setBusyId("new");
    setError("");
    try {
      const created = await createStaffProductOption(token, productId, {
        name: definition.name,
      });
      const next = [...options, created];
      setOptions(next);
      onChangeRef.current?.(next);
      setEditingIds((current) => {
        const copy = new Set(current);
        copy.add(created.id);
        return copy;
      });
    } catch (caught) {
      if (caught instanceof StaffCatalogueApiError) {
        setError(caught.message);
      } else {
        setError("Unable to create option.");
      }
    } finally {
      setBusyId(null);
    }
  }

  async function handleSaveCustomOption() {
    setCustomTouched(true);
    const trimmedName = customName.trim();
    const finalValues = [...customValues];
    const pendingVal = customValueInput.trim().replace(/^,+|,+$/g, "");
    if (pendingVal && !finalValues.map((v) => v.toLowerCase()).includes(pendingVal.toLowerCase())) {
      finalValues.push(pendingVal);
    }

    if (!trimmedName || finalValues.length === 0) {
      return;
    }

    // Check duplicate
    if (options.some((o) => o.name.toLowerCase() === trimmedName.toLowerCase())) {
      setError(`Option "${trimmedName}" already exists on this product.`);
      return;
    }

    setBusyId("new_custom");
    setError("");
    try {
      const created = await createStaffProductOption(token, productId, {
        name: trimmedName,
        values: finalValues,
      });
      const next = [...options, created];
      setOptions(next);
      onChangeRef.current?.(next);
      setIsCreatingCustom(false);
      setCustomName("");
      setCustomValues([]);
      setCustomValueInput("");
      setCustomTouched(false);
    } catch (caught) {
      if (caught instanceof StaffCatalogueApiError) {
        setError(caught.message);
      } else {
        setError("Unable to create custom option.");
      }
    } finally {
      setBusyId(null);
    }
  }

  function handleCancelCustomOption() {
    setIsCreatingCustom(false);
    setCustomName("");
    setCustomValues([]);
    setCustomValueInput("");
    setCustomTouched(false);
  }

  function handleAddCustomValueTag() {
    const val = customValueInput.trim().replace(/^,+|,+$/g, "");
    if (val && !customValues.map((v) => v.toLowerCase()).includes(val.toLowerCase())) {
      setCustomValues([...customValues, val]);
      setCustomValueInput("");
    }
  }

  function handleRemoveCustomValueTag(indexToRemove: number) {
    setCustomValues(customValues.filter((_, i) => i !== indexToRemove));
  }

  async function handleDeleteOption(option: StaffProductOption) {
    const confirmed = window.confirm(
      `Delete option "${option.name}"? All its values will be removed, and variants will need to be regenerated.`,
    );
    if (!confirmed) return;

    setBusyId(option.id);
    setError("");
    try {
      await deleteStaffProductOption(token, productId, option.id);
      const next = options.filter((o) => o.id !== option.id);
      setOptions(next);
      onChangeRef.current?.(next);
    } catch (caught) {
      if (caught instanceof StaffCatalogueApiError) {
        setError(caught.message);
      } else {
        setError("Unable to delete option.");
      }
    } finally {
      setBusyId(null);
    }
  }

  async function handleAddValue(
    option: StaffProductOption,
    entry: StaffMetaobjectEntry,
  ) {
    setBusyId(option.id);
    setError("");
    try {
      const created = await addStaffProductOptionValue(
        token,
        productId,
        option.id,
        {
          value: entry.displayName,
          metaobjectEntryId: entry.id,
        },
      );
      const next = options.map((o) =>
        o.id === option.id
          ? { ...o, values: [...(o.values ?? []), created] }
          : o,
      );
      setOptions(next);
      onChangeRef.current?.(next);
    } catch (caught) {
      if (caught instanceof StaffCatalogueApiError) {
        setError(caught.message);
      } else {
        setError("Unable to add value.");
      }
    } finally {
      setBusyId(null);
    }
  }

  async function handleAddTextValue(
    option: StaffProductOption,
    text: string,
  ) {
    setBusyId(option.id);
    setError("");
    try {
      const created = await addStaffProductOptionValue(
        token,
        productId,
        option.id,
        {
          value: text.trim(),
        },
      );
      const next = options.map((o) =>
        o.id === option.id
          ? { ...o, values: [...(o.values ?? []), created] }
          : o,
      );
      setOptions(next);
      onChangeRef.current?.(next);
    } catch (caught) {
      if (caught instanceof StaffCatalogueApiError) {
        setError(caught.message);
      } else {
        setError("Unable to add value.");
      }
    } finally {
      setBusyId(null);
    }
  }

  async function handleRemoveValue(
    option: StaffProductOption,
    value: StaffProductOptionValue,
  ) {
    setBusyId(option.id);
    setError("");
    try {
      await deleteStaffProductOptionValue(token, productId, option.id, value.id);
      const next = options.map((o) =>
        o.id === option.id
          ? {
              ...o,
              values: (o.values ?? []).filter((v) => v.id !== value.id),
            }
          : o,
      );
      setOptions(next);
      onChangeRef.current?.(next);
    } catch (caught) {
      if (caught instanceof StaffCatalogueApiError) {
        setError(caught.message);
      } else {
        setError("Unable to remove value.");
      }
    } finally {
      setBusyId(null);
    }
  }

  function enterEdit(optionId: string) {
    setEditingIds((current) => {
      const copy = new Set(current);
      copy.add(optionId);
      return copy;
    });
  }

  function exitEdit(optionId: string) {
    setEditingIds((current) => {
      const copy = new Set(current);
      copy.delete(optionId);
      return copy;
    });
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-neutral-200 bg-white px-4 py-4 text-[12.5px] text-neutral-500">
        Loading options…
      </div>
    );
  }

  const existingNames = options.map((o) => o.name);

  // Validation flags for custom option form
  const isNameInvalid = customTouched && !customName.trim();
  const isValueInvalid =
    customTouched &&
    customValues.length === 0 &&
    !customValueInput.trim();

  return (
    <div className="space-y-3">
      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12.5px] text-red-700">
          {error}
        </div>
      ) : null}

      {options.length > 0 || isCreatingCustom ? (
        <div className="rounded-xl border border-neutral-200 bg-white">
          {options.map((option, idx) => {
            const editing = editingIds.has(option.id);
            const isBusy = busyId === option.id;
            const values = option.values ?? [];

            return (
              <div
                key={option.id}
                className={idx === 0 ? "" : "border-t border-neutral-200"}
              >
                <div className="flex items-start gap-3 px-4 py-3.5">
                  <span className="mt-1.5 select-none text-neutral-400">
                    <svg viewBox="0 0 12 16" fill="none" className="h-4 w-4" aria-hidden="true">
                      <circle cx="3" cy="4" r="1.2" fill="currentColor" />
                      <circle cx="9" cy="4" r="1.2" fill="currentColor" />
                      <circle cx="3" cy="8" r="1.2" fill="currentColor" />
                      <circle cx="9" cy="8" r="1.2" fill="currentColor" />
                      <circle cx="3" cy="12" r="1.2" fill="currentColor" />
                      <circle cx="9" cy="12" r="1.2" fill="currentColor" />
                    </svg>
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[13.5px] font-semibold text-neutral-900">
                        {option.name}
                      </span>
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-cyan-50 text-cyan-600">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                          <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
                          <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
                          <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
                        </svg>
                      </span>
                    </div>

                    <div className="mt-2">
                      {!editing ? (
                        <div className="flex flex-wrap items-center gap-1.5">
                          {values.map((v) => (
                            <ValuePill key={v.id} value={v} />
                          ))}
                          <button
                            type="button"
                            onClick={() => enterEdit(option.id)}
                            className="inline-flex items-center gap-1 rounded-md border border-dashed border-neutral-300 px-2 py-0.5 text-[11.5px] text-neutral-600 hover:border-neutral-400 hover:bg-neutral-50"
                          >
                            <svg viewBox="0 0 12 12" fill="none" className="h-3 w-3">
                              <path
                                d="M6 2v8M2 6h8"
                                stroke="currentColor"
                                strokeWidth="1.6"
                                strokeLinecap="round"
                              />
                            </svg>
                            Add value
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2.5 pt-1">
                          <div className="relative z-30">
                            <OptionValuePicker
                              token={token}
                              productId={productId}
                              optionName={option.name}
                              existingValues={values.map(
                                (v) => v.value,
                              )}
                              disabled={isBusy}
                              onPick={(entry) => handleAddValue(option, entry)}
                              onPickText={(text) => handleAddTextValue(option, text)}
                            />
                          </div>

                          {values.length > 0 ? (
                            <div className="flex flex-wrap items-center gap-1.5">
                              {values.map((v) => (
                                <ValuePill
                                  key={v.id}
                                  value={v}
                                  onRemove={() => void handleRemoveValue(option, v)}
                                  disabled={isBusy}
                                />
                              ))}
                            </div>
                          ) : null}

                          <div className="flex items-center justify-between pt-1">
                            <button
                              type="button"
                              onClick={() => void handleDeleteOption(option)}
                              disabled={isBusy}
                              className="rounded-full bg-red-100 px-4 py-1.5 text-[12px] font-medium text-red-700 hover:bg-red-200 disabled:opacity-50"
                            >
                              Delete
                            </button>
                            <button
                              type="button"
                              onClick={() => exitEdit(option.id)}
                              disabled={isBusy}
                              className="rounded-full bg-neutral-900 px-5 py-1.5 text-[12px] font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
                            >
                              Done
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Form for Creating Custom Option */}
          {isCreatingCustom ? (
            <div className={options.length > 0 ? "border-t border-neutral-200" : ""}>
              <div className="flex items-start gap-3 px-4 py-4">
                {/* Drag handle */}
                <span className="mt-2 select-none text-neutral-400">
                  <svg viewBox="0 0 12 16" fill="none" className="h-4 w-4" aria-hidden="true">
                    <circle cx="3" cy="4" r="1.2" fill="currentColor" />
                    <circle cx="9" cy="4" r="1.2" fill="currentColor" />
                    <circle cx="3" cy="8" r="1.2" fill="currentColor" />
                    <circle cx="9" cy="8" r="1.2" fill="currentColor" />
                    <circle cx="3" cy="12" r="1.2" fill="currentColor" />
                    <circle cx="9" cy="12" r="1.2" fill="currentColor" />
                  </svg>
                </span>

                <div className="min-w-0 flex-1 space-y-3.5">
                  {/* Option Name Section */}
                  <div>
                    <div className="mb-1 flex items-center justify-between">
                      <label className="text-[13px] font-medium text-neutral-800">
                        Option name
                      </label>
                      <span className="text-neutral-500">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                          <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
                          <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
                          <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
                        </svg>
                      </span>
                    </div>
                    <input
                      type="text"
                      autoFocus
                      value={customName}
                      onChange={(e) => {
                        setCustomName(e.target.value);
                        if (error) setError("");
                      }}
                      placeholder="e.g. RAM, Storage, Material"
                      className={`w-full rounded-2xl border px-3.5 py-2 text-[13px] text-neutral-900 outline-none transition ${
                        isNameInvalid
                          ? "border-red-500 ring-1 ring-red-500"
                          : "border-neutral-300 focus:border-neutral-500"
                      }`}
                    />
                    {isNameInvalid ? (
                      <p className="mt-1 flex items-center gap-1 text-[11.5px] text-red-600">
                        <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                          <path d="M8 1a7 7 0 1 0 7 7A7 7 0 0 0 8 1zm0 3.5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 8 4.5zm0 7a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5z" />
                        </svg>
                        Option name is required.
                      </p>
                    ) : null}
                  </div>

                  {/* Option Values Section */}
                  <div>
                    <label className="mb-1 block text-[13px] font-medium text-neutral-800">
                      Option values
                    </label>

                    {/* Chips for entered values */}
                    {customValues.length > 0 ? (
                      <div className="mb-2 flex flex-wrap items-center gap-1.5">
                        {customValues.map((val, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-sky-50 px-2.5 py-1 text-[12px] font-medium text-sky-800"
                          >
                            {val}
                            <button
                              type="button"
                              onClick={() => handleRemoveCustomValueTag(idx)}
                              className="text-sky-600 hover:text-sky-900"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    ) : null}

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={customValueInput}
                        onChange={(e) => {
                          setCustomValueInput(e.target.value);
                          if (error) setError("");
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === ",") {
                            e.preventDefault();
                            handleAddCustomValueTag();
                          }
                        }}
                        placeholder="Type value (e.g. 16GB) and press Enter"
                        className={`w-full rounded-2xl border px-3.5 py-2 text-[13px] text-neutral-900 outline-none transition ${
                          isValueInvalid
                            ? "border-red-500 ring-1 ring-red-500"
                            : "border-neutral-300 focus:border-neutral-500"
                        }`}
                      />
                      {customValueInput.trim() ? (
                        <button
                          type="button"
                          onClick={handleAddCustomValueTag}
                          className="shrink-0 rounded-xl border border-neutral-300 bg-neutral-50 px-3 py-2 text-[12px] font-medium text-neutral-700 hover:bg-neutral-100"
                        >
                          Add
                        </button>
                      ) : null}
                    </div>

                    {isValueInvalid ? (
                      <p className="mt-1 flex items-center gap-1 text-[11.5px] text-red-600">
                        <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                          <path d="M8 1a7 7 0 1 0 7 7A7 7 0 0 0 8 1zm0 3.5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 8 4.5zm0 7a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5z" />
                        </svg>
                        Option value is required.
                      </p>
                    ) : null}
                  </div>

                  {/* Actions: Delete (cancel) on left, Done on right */}
                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={handleCancelCustomOption}
                      disabled={busyId === "new_custom"}
                      className="rounded-full bg-red-100 px-4 py-1.5 text-[12.5px] font-medium text-red-700 hover:bg-red-200 disabled:opacity-50"
                    >
                      Delete
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleSaveCustomOption()}
                      disabled={busyId === "new_custom"}
                      className="rounded-full bg-neutral-900 px-5 py-1.5 text-[12.5px] font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
                    >
                      {busyId === "new_custom" ? "Saving…" : "Done"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      <AddOptionDropdown
        token={token}
        categoryId={categoryId}
        existingOptionNames={existingNames}
        onPickOption={(def) =>
          void handlePickOption({
            id: def.id,
            name: def.name,
            metaobjectType: def.metaobjectType,
          })
        }
        onPickCustom={() => {
          setIsCreatingCustom(true);
          setCustomName("");
          setCustomValues([]);
          setCustomValueInput("");
          setCustomTouched(false);
        }}
        disabled={busyId !== null || isCreatingCustom}
      />
    </div>
  );
}

function ValuePill({
  value,
  onRemove,
  disabled = false,
}: {
  value: StaffProductOptionValue;
  onRemove?: () => void;
  disabled?: boolean;
}) {
  const hex = readHex(value.metaobjectEntry?.fields);

  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-neutral-100 px-2 py-0.5 text-[12px] text-neutral-800">
      {hex ? (
        <span
          className="h-3 w-3 rounded border border-neutral-300"
          style={{ backgroundColor: hex }}
        />
      ) : null}
      {value.value}
      {onRemove ? (
        <button
          type="button"
          disabled={disabled}
          onClick={onRemove}
          className="text-neutral-500 hover:text-neutral-800 disabled:opacity-40"
          aria-label={`Remove ${value.value}`}
        >
          ×
        </button>
      ) : null}
    </span>
  );
}

function readHex(fields: Record<string, unknown> | undefined): string | null {
  if (!fields) return null;
  const v = fields.hex;
  return typeof v === "string" && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v)
    ? v
    : null;
}