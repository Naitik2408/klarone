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

      <div className="overflow-hidden rounded-lg border border-neutral-200">
        <div className="grid grid-cols-[minmax(0,1fr)_100px_80px_auto] items-center gap-3 border-b border-neutral-100 bg-[#fafafa] px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-neutral-500">
          <span>Warehouse</span>
          <span className="text-right">Available</span>
          <span className="text-right">Reserved</span>
          <span />
        </div>

        {merged.length === 0 ? (
          <div className="px-3 py-3 text-[12px] text-neutral-500">
            No warehouses configured.
          </div>
        ) : (
          merged.map((row) => {
            const isBusy = busyWarehouse === row.warehouseId;
            const draftValue = draft[row.warehouseId] ?? String(row.quantityAvailable);
            const dirty = Number(draftValue) !== row.quantityAvailable;

            return (
              <div
                key={row.warehouseId}
                className="grid grid-cols-[minmax(0,1fr)_100px_80px_auto] items-center gap-3 border-t border-neutral-100 px-3 py-2 text-[12.5px]"
              >
                <span className="flex flex-col">
                  <span className="text-neutral-800">
                    {row.warehouseName}
                  </span>
                  <span className="text-[11px] text-neutral-500">
                    {row.warehouseCode}
                  </span>
                </span>
                <span className="text-right">
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
                    className="w-full rounded-md border border-neutral-200 bg-white px-2 py-1 text-right text-[12.5px] outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200 disabled:opacity-50"
                  />
                </span>
                <span className="text-right text-neutral-500">
                  {row.quantityReserved}
                </span>
                <span className="flex justify-end">
                  <button
                    type="button"
                    onClick={() =>
                      void saveRow(row.warehouseId, row.quantityAvailable)
                    }
                    disabled={isBusy || !dirty}
                    className="rounded-md border border-neutral-200 bg-white px-2.5 py-1 text-[12px] font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-40"
                  >
                    {isBusy ? "Saving…" : "Save"}
                  </button>
                </span>
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