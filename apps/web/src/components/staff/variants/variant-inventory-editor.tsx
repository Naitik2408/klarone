"use client";

import { useEffect, useMemo, useState } from "react";
import {
  adjustInventory,
  listWarehouses,
  StaffCatalogueApiError,
} from "../../../lib/staff-catalogue-api";

/* ------------------------------------------------------------------ */
/* Props                                                               */
/* ------------------------------------------------------------------ */

export interface VariantInventoryRow {
  warehouseId: number;
  warehouseName: string;
  warehouseCode: string;
  quantityAvailable: number;
  quantityReserved: number;
}

export interface VariantInventoryEditorProps {
  token: string;
  variantId: string;
  /** Stock rows for this variant. Empty means the variant isn't stocked yet. */
  rows: VariantInventoryRow[];
  onAdjusted: () => void;
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function VariantInventoryEditor({
  token,
  variantId,
  rows,
  onAdjusted,
}: VariantInventoryEditorProps) {
  const [warehouses, setWarehouses] = useState<
    Array<{ id: number; name: string; code: string; status: string }>
  >([]);
  const [draft, setDraft] = useState<Record<number, string>>({});
  const [busyWarehouse, setBusyWarehouse] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  /* ------------------ Load warehouses ------------------ */

  useEffect(() => {
    let cancelled = false;
    listWarehouses(token)
      .then((list) => {
        if (cancelled) return;
        setWarehouses(list.filter((w) => w.status === "ACTIVE"));
      })
      .catch(() => {
        // Non-fatal — the section renders empty if we can't load warehouses.
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  /* ------------------ Initialize drafts from rows ------------------ */

  useEffect(() => {
    const next: Record<number, string> = {};
    for (const row of rows) {
      next[row.warehouseId] = String(row.quantityAvailable);
    }
    setDraft(next);
  }, [rows]);

  /* ------------------ Merge rows with warehouse list ------------------ */

  const merged = useMemo(() => {
    const byWarehouse = new Map(rows.map((r) => [r.warehouseId, r]));
    const result: Array<{
      warehouseId: number;
      warehouseName: string;
      warehouseCode: string;
      quantityAvailable: number;
      quantityReserved: number;
      hasStock: boolean;
    }> = [];

    for (const w of warehouses) {
      const row = byWarehouse.get(w.id);
      result.push({
        warehouseId: w.id,
        warehouseName: w.name,
        warehouseCode: w.code,
        quantityAvailable: row?.quantityAvailable ?? 0,
        quantityReserved: row?.quantityReserved ?? 0,
        hasStock: Boolean(row),
      });
    }

    // Include any rows whose warehouse wasn't in the list (shouldn't happen,
    // but keeps data visible if it does).
    for (const row of rows) {
      if (!result.some((r) => r.warehouseId === row.warehouseId)) {
        result.push({
          warehouseId: row.warehouseId,
          warehouseName: row.warehouseName,
          warehouseCode: row.warehouseCode,
          quantityAvailable: row.quantityAvailable,
          quantityReserved: row.quantityReserved,
          hasStock: true,
        });
      }
    }

    return result;
  }, [warehouses, rows]);

  /* ------------------ Save one row ------------------ */

  async function saveRow(warehouseId: number, currentQty: number) {
    const draftValue = draft[warehouseId] ?? String(currentQty);
    const next = Number(draftValue);
    if (!Number.isFinite(next) || next < 0) {
      setError("Quantity must be a non-negative number.");
      return;
    }

    const delta = next - currentQty;
    if (delta === 0) {
      setSuccess("No change.");
      window.setTimeout(() => setSuccess(""), 1500);
      return;
    }

    setBusyWarehouse(warehouseId);
    setError("");
    setSuccess("");
    try {
      await adjustInventory(token, {
        productVariantId: variantId,
        warehouseId,
        quantityDelta: delta,
        notes: "Adjusted from variant editor",
      });
      onAdjusted();
      setSuccess(`Updated ${delta > 0 ? "+" : ""}${delta}.`);
      window.setTimeout(() => setSuccess(""), 2000);
    } catch (caught) {
      setError(
        caught instanceof StaffCatalogueApiError
          ? caught.message
          : "Unable to adjust inventory.",
      );
    } finally {
      setBusyWarehouse(null);
    }
  }

  /* ------------------ Render ------------------ */

  return (
    <div className="space-y-2">
      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12px] text-emerald-700">
          {success}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-neutral-200">
        <div className="grid grid-cols-[minmax(0,2fr)_80px_85px_110px_80px_auto] items-center gap-2 border-b border-neutral-200 bg-[#fafafa] px-3.5 py-2.5 text-[11.5px] font-medium text-neutral-600">
          <span>Location</span>
          <span className="text-right">Unavailable</span>
          <span className="text-right">Committed</span>
          <span className="text-right font-semibold text-neutral-800">Available</span>
          <span className="text-right">On hand</span>
          <span />
        </div>

        {merged.length === 0 ? (
          <div className="px-3.5 py-4 text-[12.5px] text-neutral-500">
            No active warehouse locations configured.
          </div>
        ) : (
          merged.map((row) => {
            const isBusy = busyWarehouse === row.warehouseId;
            const draftValue = draft[row.warehouseId] ?? String(row.quantityAvailable);
            const dirty = Number(draftValue) !== row.quantityAvailable;
            const draftNum = Number(draftValue);
            const validNum = Number.isFinite(draftNum) && draftNum >= 0 ? draftNum : row.quantityAvailable;
            const onHand = validNum + row.quantityReserved;

            return (
              <div
                key={row.warehouseId}
                className="grid grid-cols-[minmax(0,2fr)_80px_85px_110px_80px_auto] items-center gap-2 border-t border-neutral-100 px-3.5 py-2.5 text-[12.5px] hover:bg-neutral-50/50 transition-colors first:border-t-0"
              >
                <div className="flex flex-col min-w-0 pr-2">
                  <span className="truncate font-medium text-neutral-900">
                    {row.warehouseName}
                  </span>
                  <span className="text-[11px] text-neutral-500">
                    {row.warehouseCode}
                  </span>
                </div>

                {/* Unavailable */}
                <div className="text-right tabular-nums text-neutral-400">
                  0
                </div>

                {/* Committed */}
                <div className="text-right tabular-nums text-neutral-500">
                  {row.quantityReserved}
                </div>

                {/* Available (Input) */}
                <div className="flex items-center justify-end">
                  <input
                    type="number"
                    min={0}
                    value={draftValue}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        [row.warehouseId]: e.target.value,
                      }))
                    }
                    disabled={isBusy}
                    aria-label={`Available stock for ${row.warehouseName}`}
                    className="w-20 rounded-lg border border-neutral-200 bg-white px-2 py-1 text-right text-[12.5px] font-medium text-neutral-900 tabular-nums outline-none transition focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200 disabled:opacity-50"
                  />
                </div>

                {/* On Hand */}
                <div className="text-right tabular-nums font-medium text-neutral-800">
                  {onHand}
                </div>

                {/* Action button */}
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() =>
                      void saveRow(row.warehouseId, row.quantityAvailable)
                    }
                    disabled={isBusy || !dirty}
                    className="rounded-lg border border-neutral-200 bg-white px-2.5 py-1 text-[11.5px] font-medium text-neutral-700 shadow-2xs hover:bg-neutral-50 disabled:opacity-30 disabled:hover:bg-white"
                  >
                    {isBusy ? "Saving…" : "Save"}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <p className="text-[11.5px] text-neutral-500">
        Changes are sent to the inventory service as a delta. Reserved stock
        is deducted automatically by orders.
      </p>
    </div>
  );
}