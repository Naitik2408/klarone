"use client";

import { useEffect, useRef, useState } from "react";
import {
  listProductMedia,
  StaffCatalogueApiError,
  uploadVariantMedia,
  type StaffProductMedia,
} from "../../../lib/staff-catalogue-api";

/* ------------------------------------------------------------------ */
/* Props                                                               */
/* ------------------------------------------------------------------ */

export interface VariantImagePickerModalProps {
  open: boolean;
  token: string;
  productId: string;
  variantId: string;
  /** Currently attached variant image (if any). */
  currentImageUrl: string | null;
  onAttached: () => void;
  onClose: () => void;
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function VariantImagePickerModal({
  open,
  token,
  productId,
  variantId,
  currentImageUrl,
  onAttached,
  onClose,
}: VariantImagePickerModalProps) {
  const [tab, setTab] = useState<"upload" | "library">("upload");
  const [productMedia, setProductMedia] = useState<StaffProductMedia[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  /* ------------------ Load product library ------------------ */

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError("");

    listProductMedia(token, productId)
      .then((media) => {
        if (cancelled) return;
        setProductMedia(media);
      })
      .catch((caught) => {
        if (cancelled) return;
        setError(
          caught instanceof StaffCatalogueApiError
            ? caught.message
            : "Unable to load media.",
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, token, productId]);

  /* ------------------ Upload ------------------ */

  async function handleFile(file: File) {
    setUploading(true);
    setError("");
    try {
      await uploadVariantMedia(token, productId, file, variantId);
      onAttached();
      onClose();
    } catch (caught) {
      setError(
        caught instanceof StaffCatalogueApiError
          ? caught.message
          : "Unable to upload image.",
      );
    } finally {
      setUploading(false);
    }
  }

  /* ------------------ Attach existing ------------------ */

  async function attachExisting(media: StaffProductMedia) {
    // Media is attached to the product; to attach it to the variant, we
    // need to fetch the file and re-upload it with variantId. Simpler path:
    // download via fetch, then upload as File. For large images this is
    // slower but works without additional backend endpoints.
    if (!media.url) {
      setError("This media item has no URL to copy from.");
      return;
    }

    setUploading(true);
    setError("");
    try {
      const response = await fetch(media.url);
      const blob = await response.blob();
      const extension = blob.type.split("/")[1] || "jpg";
      const file = new File(
        [blob],
        `variant-${variantId}.${extension}`,
        { type: blob.type },
      );
      await uploadVariantMedia(
        token,
        productId,
        file,
        variantId,
        media.altText ?? undefined,
      );
      onAttached();
      onClose();
    } catch (caught) {
      setError(
        caught instanceof StaffCatalogueApiError
          ? caught.message
          : "Unable to attach image.",
      );
    } finally {
      setUploading(false);
    }
  }

  /* ------------------ Render ------------------ */

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto py-10">
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close"
        onClick={() => {
          if (!uploading) onClose();
        }}
        className="fixed inset-0 cursor-default bg-neutral-900/40"
      />

      {/* Modal */}
      <div className="relative w-full max-w-[720px] overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-3">
          <h2 className="text-[14px] font-semibold text-neutral-900">
            Select image
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={uploading}
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

        {/* Tabs */}
        <div className="flex gap-1 border-b border-neutral-200 px-5">
          <button
            type="button"
            onClick={() => setTab("upload")}
            className={`-mb-px border-b-2 px-2 py-2 text-[12.5px] font-medium transition ${
              tab === "upload"
                ? "border-neutral-900 text-neutral-900"
                : "border-transparent text-neutral-500 hover:text-neutral-800"
            }`}
          >
            Upload
          </button>
          <button
            type="button"
            onClick={() => setTab("library")}
            className={`-mb-px border-b-2 px-2 py-2 text-[12.5px] font-medium transition ${
              tab === "library"
                ? "border-neutral-900 text-neutral-900"
                : "border-transparent text-neutral-500 hover:text-neutral-800"
            }`}
          >
            From library
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5">
          {error ? (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12.5px] text-red-700">
              {error}
            </div>
          ) : null}

          {tab === "upload" ? (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const file = e.dataTransfer.files?.[0];
                if (file) void handleFile(file);
              }}
              className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition ${
                dragOver
                  ? "border-neutral-400 bg-neutral-50"
                  : "border-neutral-200 bg-white"
              }`}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="mb-3 h-8 w-8 text-neutral-400"
              >
                <path
                  d="M12 6v12M6 12h12"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
              <p className="mb-3 text-[13px] text-neutral-600">
                Drag and drop an image here, or
              </p>
              <button
                type="button"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
                className="rounded-lg bg-neutral-900 px-4 py-2 text-[13px] font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
              >
                {uploading ? "Uploading…" : "Add file"}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleFile(file);
                }}
              />
              <p className="mt-3 text-[11.5px] text-neutral-500">
                JPEG, PNG, WebP, or AVIF · max 8 MB
              </p>
            </div>
          ) : (
            <div>
              {loading ? (
                <div className="py-8 text-center text-[12.5px] text-neutral-500">
                  Loading library…
                </div>
              ) : productMedia.length === 0 ? (
                <div className="py-8 text-center text-[12.5px] text-neutral-500">
                  No product images yet.
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-3">
                  {productMedia.map((media) => {
                    const isCurrent =
                      currentImageUrl && media.url === currentImageUrl;
                    return (
                      <button
                        key={media.id}
                        type="button"
                        disabled={uploading}
                        onClick={() => void attachExisting(media)}
                        className={`group relative aspect-square overflow-hidden rounded-lg border-2 transition disabled:opacity-50 ${
                          isCurrent
                            ? "border-neutral-900"
                            : "border-transparent hover:border-neutral-400"
                        }`}
                      >
                        {media.url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={media.url}
                            alt={media.altText ?? ""}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center bg-neutral-100 text-[11px] text-neutral-500">
                            No preview
                          </span>
                        )}
                        {isCurrent ? (
                          <span className="absolute right-1 top-1 rounded bg-neutral-900 px-1.5 py-0.5 text-[10px] font-medium text-white">
                            Current
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}