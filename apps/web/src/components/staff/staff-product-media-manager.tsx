"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
} from "react";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3000";

type Media = {
  id: string | number;
  mediaType: string;
  storageKey: string;
  url: string | null;
  altText: string | null;
  width: number | null;
  height: number | null;
  displayOrder: number;
  isPrimary: boolean;
  productVariantId?: string | number | null;
};

type Props = { productId: string; token: string };

async function request<T>(
  path: string,
  token: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (!(init.body instanceof FormData))
    headers.set("Content-Type", "application/json");
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });
  const raw = await response.text();
  let data: unknown = null;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = raw;
  }
  if (!response.ok) {
    const message =
      typeof data === "object" && data !== null && "message" in data
        ? String((data as { message?: unknown }).message)
        : typeof data === "string"
          ? data
          : `Request failed (${response.status}).`;
    throw new Error(message);
  }
  return data as T;
}

const MAX_VISIBLE = 9;

/** Sort helper: primary first, then displayOrder. */
function sortMedia(rows: Media[]): Media[] {
  return [...rows].sort((a, b) => {
    if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
    return (a.displayOrder ?? 0) - (b.displayOrder ?? 0);
  });
}

export default function StaffProductMediaManager({
  productId,
  token,
}: Props) {
  const [media, setMedia] = useState<Media[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [variantId, setVariantId] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const [altEditorId, setAltEditorId] = useState<string | null>(null);
  const [altDraft, setAltDraft] = useState("");

  const [showAll, setShowAll] = useState(false);

  const picker = useRef<HTMLInputElement>(null);
  const isSelecting = selectedIds.size > 0;

  /* ---------- Initial load only ---------- */

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await request<Media[]>(
        `/staff/catalogue/products/${productId}/media`,
        token,
      );
      const rows = Array.isArray(result) ? result : [];
      setMedia(sortMedia(rows));
      setSelectedIds(new Set());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load media.");
    } finally {
      setLoading(false);
    }
  }, [productId, token]);

  useEffect(() => {
    void load();
  }, [load]);

  const visibleMedia = useMemo(() => media.slice(0, MAX_VISIBLE), [media]);
  const hiddenCount = Math.max(media.length - MAX_VISIBLE, 0);

  /* ---------- Upload (append to local array) ---------- */

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    setError("");
    setNotice("");
    try {
      const uploaded: Media[] = [];
      for (const file of Array.from(files)) {
        const body = new FormData();
        body.append("file", file);
        if (variantId.trim()) body.append("variantId", variantId.trim());
        const result = await request<Media | Media[]>(
          `/staff/catalogue/products/${productId}/media/upload`,
          token,
          { method: "POST", body },
        );
        if (Array.isArray(result)) uploaded.push(...result);
        else if (result) uploaded.push(result);
      }

      // If the API returned the created rows, append them. Otherwise,
      // append optimistic placeholders so the user sees them immediately.
      setMedia((current) => {
        if (uploaded.length) {
          return sortMedia([...current, ...uploaded]);
        }
        return current;
      });
      // If we couldn't get the created rows, do a soft refresh:
      if (!uploaded.length) {
        const result = await request<Media[]>(
          `/staff/catalogue/products/${productId}/media`,
          token,
        );
        setMedia(sortMedia(Array.isArray(result) ? result : []));
      }

      setNotice(`${files.length} image${files.length === 1 ? "" : "s"} uploaded.`);
      if (picker.current) picker.current.value = "";
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  /* ---------- Set primary (swap locally, persist, keep new order) ---------- */

  async function setPrimary(item: Media) {
    const previous = media;
    const next = sortMedia(
      media.map((m) => ({
        ...m,
        isPrimary: String(m.id) === String(item.id),
      })),
    );
    setMedia(next);
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await request(
        `/staff/catalogue/products/${productId}/media/${item.id}/primary`,
        token,
        { method: "POST" },
      );
      setNotice("Primary image updated.");
    } catch (e) {
      setMedia(previous);
      setError(e instanceof Error ? e.message : "Unable to set primary image.");
    } finally {
      setBusy(false);
    }
  }

  /* ---------- Remove selected (drop locally) ---------- */

  async function removeSelected() {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    const confirmed = window.confirm(
      `Remove ${ids.length} image${ids.length === 1 ? "" : "s"}? This cannot be undone.`,
    );
    if (!confirmed) return;

    const previous = media;
    setMedia((current) =>
      current.filter((m) => !selectedIds.has(String(m.id))),
    );
    setSelectedIds(new Set());
    setBusy(true);
    setError("");
    setNotice("");
    try {
      for (const id of ids) {
        await request(
          `/staff/catalogue/products/${productId}/media/${id}`,
          token,
          { method: "DELETE" },
        );
      }
      setNotice(`${ids.length} image${ids.length === 1 ? "" : "s"} removed.`);
    } catch (e) {
      setMedia(previous);
      setError(e instanceof Error ? e.message : "Unable to remove image.");
    } finally {
      setBusy(false);
    }
  }

  /* ---------- Alt text (update in place) ---------- */

  async function saveAlt() {
    if (!altEditorId) return;
    const id = altEditorId;
    const value = altDraft.trim() || null;

    const previous = media;
    setMedia((current) =>
      current.map((m) => (String(m.id) === id ? { ...m, altText: value } : m)),
    );
    setAltEditorId(null);
    setAltDraft("");
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await request(
        `/staff/catalogue/products/${productId}/media/${id}/alt-text`,
        token,
        {
          method: "PATCH",
          body: JSON.stringify({ altText: value }),
        },
      );
      setNotice("Alt text saved.");
    } catch (e) {
      setMedia(previous);
      setError(e instanceof Error ? e.message : "Unable to save alt text.");
    } finally {
      setBusy(false);
    }
  }

  /* ---------- Reorder (already reorders locally) ---------- */

  async function persistOrder(next: Media[]) {
    const previous = media;
    setMedia(next);
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await request(
        `/staff/catalogue/products/${productId}/media/reorder`,
        token,
        {
          method: "POST",
          body: JSON.stringify({
            orderedIds: next.map((m) => String(m.id)),
          }),
        },
      );
      setNotice("Gallery order saved.");
    } catch (e) {
      setMedia(previous);
      setError(e instanceof Error ? e.message : "Unable to save gallery order.");
    } finally {
      setBusy(false);
    }
  }

  /* ---------- Selection ---------- */

  function toggleSelect(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  /* ---------- Drag & drop ---------- */

  function handleDragStart(id: string) {
    if (isSelecting) return;
    setDraggingId(id);
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>, id: string) {
    if (!draggingId) return;
    e.preventDefault();
    if (id !== dragOverId) setDragOverId(id);
  }

  function handleDragLeave() {
    setDragOverId(null);
  }

  async function handleDrop(e: DragEvent<HTMLDivElement>, targetId: string) {
    e.preventDefault();
    const sourceId = draggingId;
    setDraggingId(null);
    setDragOverId(null);
    if (!sourceId || sourceId === targetId) return;

    const sourceIndex = media.findIndex((m) => String(m.id) === sourceId);
    const targetIndex = media.findIndex((m) => String(m.id) === targetId);
    if (sourceIndex === -1 || targetIndex === -1) return;

    const droppedOnHero = targetIndex === 0;
    const draggedFromHero = sourceIndex === 0;

    if (droppedOnHero || draggedFromHero) {
      const promoted = droppedOnHero ? media[sourceIndex] : media[targetIndex];
      await setPrimary(promoted);
      return;
    }

    const next = [...media];
    const [moved] = next.splice(sourceIndex, 1);
    next.splice(targetIndex, 0, moved);
    await persistOrder(next);
  }

  function openAltEditor(item: Media) {
    setAltEditorId(String(item.id));
    setAltDraft(item.altText ?? "");
  }

  const selectedSingleId =
    selectedIds.size === 1 ? Array.from(selectedIds)[0] : null;
  const selectedSingleMedia = selectedSingleId
    ? media.find((m) => String(m.id) === selectedSingleId) ?? null
    : null;

  return (
    <div className="text-[13px] text-neutral-800">
      {isSelecting ? (
        <div className="mb-3 flex items-center justify-between rounded-lg border border-neutral-200 bg-white px-3 py-2">
          <div className="flex items-center gap-3">
            <span className="flex h-4 w-4 items-center justify-center rounded-[4px] bg-white ring-1 ring-neutral-300">
              <svg
                viewBox="0 0 16 16"
                fill="none"
                className="h-3 w-3 text-neutral-900"
              >
                <path
                  d="m3.5 8 3 3 6-6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <span className="text-[13px] font-medium text-neutral-800">
              {selectedIds.size} file{selectedIds.size === 1 ? "" : "s"} selected
            </span>
          </div>
          <div className="flex items-center gap-3">
            {selectedSingleMedia ? (
              <button
                type="button"
                onClick={() => openAltEditor(selectedSingleMedia)}
                className="text-[12.5px] font-medium text-neutral-700 hover:underline"
              >
                Edit alt text
              </button>
            ) : null}
            <button
              type="button"
              onClick={clearSelection}
              className="text-[12.5px] font-medium text-neutral-500 hover:text-neutral-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void removeSelected()}
              disabled={busy}
              className="text-[12.5px] font-medium text-red-600 hover:underline disabled:opacity-50"
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[12px] text-neutral-500">
            {media.length === 0
              ? "Upload JPEG, PNG, WebP or AVIF · max 8 MB each"
              : `${media.length} ${media.length === 1 ? "image" : "images"} · drag onto the large image to make it primary`}
          </span>
        </div>
      )}

      {error ? (
        <div
          role="alert"
          className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-[12.5px] text-red-700"
        >
          {error}
        </div>
      ) : null}
      {notice ? (
        <div
          role="status"
          className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-[12.5px] text-emerald-700"
        >
          {notice}
        </div>
      ) : null}

      <input
        ref={picker}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        multiple
        className="hidden"
        onChange={(e) => void upload(e.target.files)}
      />

      {loading ? (
        <div className="grid auto-rows-fr grid-cols-6 gap-2.5">
          <div className="col-span-2 row-span-2 animate-pulse rounded-lg border border-neutral-200 bg-neutral-100" />
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="aspect-square animate-pulse rounded-lg border border-neutral-200 bg-neutral-100"
            />
          ))}
        </div>
      ) : media.length === 0 ? (
        <EmptyDropZone
          uploading={uploading}
          onClick={() => picker.current?.click()}
          onDropFiles={upload}
        />
      ) : (
        <div className="grid auto-rows-fr grid-cols-6 gap-2.5">
          {visibleMedia.map((item, i) => (
            <MediaTile
              key={String(item.id)}
              item={item}
              hero={i === 0}
              isSelecting={isSelecting}
              isSelected={selectedIds.has(String(item.id))}
              draggingId={draggingId}
              dragOverId={dragOverId}
              onToggleSelect={() => toggleSelect(String(item.id))}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            />
          ))}

          {hiddenCount > 0 ? (
            <button
              type="button"
              onClick={() => setShowAll(true)}
              aria-label={`Show ${hiddenCount} more images`}
              className="relative aspect-square overflow-hidden rounded-lg border border-neutral-200 bg-neutral-500/70 text-white transition hover:bg-neutral-500"
            >
              <span className="absolute inset-0 flex items-center justify-center text-[15px] font-medium">
                +{hiddenCount}
              </span>
            </button>
          ) : null}

          <button
            type="button"
            onClick={() => picker.current?.click()}
            disabled={uploading}
            aria-label="Add image"
            className="flex aspect-square items-center justify-center rounded-lg border border-dashed border-neutral-300 bg-white text-neutral-500 hover:border-neutral-400 hover:bg-neutral-50 disabled:opacity-50"
          >
            {uploading ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-800" />
            ) : (
              <svg
                viewBox="0 0 20 20"
                fill="none"
                className="h-5 w-5"
                stroke="currentColor"
                strokeWidth="1.6"
                aria-hidden="true"
              >
                <path d="M10 4v12M4 10h12" strokeLinecap="round" />
              </svg>
            )}
          </button>
        </div>
      )}

      {altEditorId ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setAltEditorId(null)}
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-neutral-200 bg-[#f7f7f7] px-4 py-2.5">
              <h3 className="text-[13px] font-medium text-neutral-800">
                Alt text
              </h3>
              <button
                type="button"
                onClick={() => setAltEditorId(null)}
                aria-label="Close"
                className="flex h-6 w-6 items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-100"
              >
                <svg
                  viewBox="0 0 16 16"
                  fill="none"
                  className="h-3.5 w-3.5"
                  aria-hidden="true"
                >
                  <path
                    d="m4 4 8 8M12 4l-8 8"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
            <div className="space-y-3 p-4">
              <p className="text-[12px] text-neutral-500">
                Describe the image for screen readers and search engines.
              </p>
              <textarea
                autoFocus
                value={altDraft}
                onChange={(e) => setAltDraft(e.target.value)}
                maxLength={500}
                rows={3}
                placeholder="Describe this image…"
                className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-[13px] outline-none placeholder:text-neutral-400 focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200"
              />
              <div className="flex items-center justify-between text-[11.5px] text-neutral-400">
                <span>Optional</span>
                <span>{altDraft.length}/500</span>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-neutral-200 bg-[#f7f7f7] px-4 py-2.5">
              <button
                type="button"
                onClick={() => setAltEditorId(null)}
                className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-[12.5px] font-medium text-neutral-700 hover:bg-neutral-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void saveAlt()}
                disabled={busy}
                className="rounded-lg bg-neutral-900 px-3 py-1.5 text-[12.5px] font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
              >
                {busy ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showAll ? (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-black/40 p-6"
          onClick={() => setShowAll(false)}
        >
          <div
            className="mx-auto max-w-4xl overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-neutral-200 bg-[#f7f7f7] px-4 py-2.5">
              <h3 className="text-[13px] font-medium text-neutral-800">
                All images ({media.length})
              </h3>
              <button
                type="button"
                onClick={() => setShowAll(false)}
                aria-label="Close"
                className="flex h-6 w-6 items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-100"
              >
                <svg
                  viewBox="0 0 16 16"
                  fill="none"
                  className="h-3.5 w-3.5"
                  aria-hidden="true"
                >
                  <path
                    d="m4 4 8 8M12 4l-8 8"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
            <div className="grid grid-cols-6 gap-2.5 p-4">
              {media.map((item) => (
                <MediaTile
                  key={String(item.id)}
                  item={item}
                  hero={false}
                  isSelecting={isSelecting}
                  isSelected={selectedIds.has(String(item.id))}
                  draggingId={draggingId}
                  dragOverId={dragOverId}
                  onToggleSelect={() => toggleSelect(String(item.id))}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                />
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* ---------- Empty state ---------- */

function EmptyDropZone({
  uploading,
  onClick,
  onDropFiles,
}: {
  uploading: boolean;
  onClick: () => void;
  onDropFiles: (files: FileList | null) => void | Promise<void>;
}) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onClick={onClick}
      onDragOver={(e) => {
        e.preventDefault();
        setHover(true);
      }}
      onDragLeave={() => setHover(false)}
      onDrop={(e) => {
        e.preventDefault();
        setHover(false);
        void onDropFiles(e.dataTransfer.files);
      }}
      role="button"
      tabIndex={0}
      className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-12 text-center transition ${
        hover
          ? "border-neutral-400 bg-neutral-50"
          : "border-neutral-200 bg-neutral-50/60 hover:border-neutral-300 hover:bg-neutral-50"
      }`}
    >
      <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-white text-neutral-500 shadow-sm">
        <svg
          viewBox="0 0 20 20"
          fill="none"
          className="h-5 w-5"
          stroke="currentColor"
          strokeWidth="1.6"
          aria-hidden="true"
        >
          <path d="M10 4v12M4 10h12" strokeLinecap="round" />
        </svg>
      </div>
      <p className="text-[13px] font-medium text-neutral-800">
        {uploading ? "Uploading…" : "Add images"}
      </p>
      <p className="mt-0.5 text-[12px] text-neutral-500">
        Drop files here or click to browse
      </p>
    </div>
  );
}

/* ---------- Tile ---------- */

function MediaTile({
  item,
  hero,
  isSelecting,
  isSelected,
  draggingId,
  dragOverId,
  onToggleSelect,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
}: {
  item: Media;
  hero: boolean;
  isSelecting: boolean;
  isSelected: boolean;
  draggingId: string | null;
  dragOverId: string | null;
  onToggleSelect: () => void;
  onDragStart: (id: string) => void;
  onDragOver: (e: DragEvent<HTMLDivElement>, id: string) => void;
  onDragLeave: () => void;
  onDrop: (e: DragEvent<HTMLDivElement>, id: string) => void;
}) {
  const id = String(item.id);
  const isDragging = draggingId === id;
  const isOver = dragOverId === id;

  return (
    <div
      draggable={!isSelecting}
      onDragStart={() => onDragStart(id)}
      onDragOver={(e) => onDragOver(e, id)}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, id)}
      onClick={onToggleSelect}
      className={`group relative overflow-hidden rounded-lg border bg-white transition ${
        hero ? "col-span-2 row-span-2" : "aspect-square"
      } ${
        isOver ? "border-neutral-500 ring-2 ring-neutral-300" : "border-neutral-200"
      } ${isDragging ? "opacity-50" : ""} ${
        isSelected ? "ring-2 ring-neutral-900 ring-offset-0" : ""
      } ${isSelecting ? "cursor-pointer" : "cursor-grab active:cursor-grabbing"}`}
    >
      <div className="flex h-full w-full items-center justify-center bg-neutral-50 p-2">
        {item.url ? (
          <img
            src={item.url}
            alt={item.altText ?? ""}
            draggable={false}
            className="max-h-full max-w-full object-contain"
          />
        ) : (
          <div className="text-[12px] text-neutral-400">Image unavailable</div>
        )}
      </div>

      <div
        className={`pointer-events-none absolute inset-0 transition ${
          isSelected || isSelecting
            ? "bg-black/20 opacity-100"
            : "bg-black/35 opacity-0 group-hover:opacity-100"
        }`}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect();
          }}
          aria-label={isSelected ? "Deselect image" : "Select image"}
          className="pointer-events-auto absolute top-2 left-2 flex h-6 w-6 items-center justify-center rounded-md border border-white/90 bg-white text-neutral-900 shadow-sm"
        >
          {isSelected ? (
            <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
              <path
                d="m3.5 8 3 3 6-6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : null}
        </button>
      </div>
    </div>
  );
}