"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import {
  clearStaffAccessToken,
  getStaffAccessToken,
} from "../../../../../lib/staff-auth-api";

import {
  createStaffProduct,
  getCatalogueBrands,
  getCatalogueCategories,
  StaffCatalogueApiError,
} from "../../../../../lib/staff-catalogue-api";

import type {
  CreateStaffProductInput,
  StaffCatalogueBrand,
  StaffCatalogueCategory,
} from "../../../../../types/staff-catalogue";

/* ---------------- shared styles ---------------- */

const inputBase =
  "w-full rounded-lg border bg-white px-3 py-2 text-[13px] text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:ring-2";

const inputClass = `${inputBase} border-neutral-200 hover:border-neutral-300 focus:border-neutral-400 focus:ring-neutral-200`;

const inputErrorClass = `${inputBase} border-red-300 bg-red-50/40 focus:border-red-400 focus:ring-red-200`;

/* ---------------- form shape ---------------- */

type FormState = {
  name: string;
  description: string;
  categoryId: string;
  brandId: string;
  productType: string;
};

type FieldErrors = Partial<Record<keyof FormState, string>>;

function emptyForm(): FormState {
  return {
    name: "",
    description: "",
    categoryId: "",
    brandId: "",
    productType: "LAPTOP",
  };
}

/* ---------------- slug + sku helpers ---------------- */

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function generatePlaceholderSku(title: string): string {
  const slug = slugify(title).toUpperCase().slice(0, 24) || "PRODUCT";
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${slug}-${suffix}`;
}

/* ---------------- small primitives ---------------- */

function SectionCard({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
      {title ? (
        <div className="border-b border-neutral-100 px-4 py-3">
          <h2 className="text-[13px] font-medium text-neutral-800">
            {title}
          </h2>
        </div>
      ) : null}
      <div className="px-4 py-4">{children}</div>
    </section>
  );
}

function FieldLabel({
  children,
  hint,
}: {
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <span className="mb-1.5 flex items-center justify-between text-[12px] font-medium text-neutral-700">
      <span>{children}</span>
      {hint ? (
        <span className="text-[11px] text-neutral-400">{hint}</span>
      ) : null}
    </span>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="mt-1 flex items-center gap-1 text-[11.5px] text-red-600">
      <svg
        viewBox="0 0 16 16"
        fill="currentColor"
        className="h-3 w-3 shrink-0"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M8 2a6 6 0 1 0 0 12A6 6 0 0 0 8 2Zm-.75 3a.75.75 0 0 1 1.5 0v3.5a.75.75 0 0 1-1.5 0V5Zm.75 7.25a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z"
          clipRule="evenodd"
        />
      </svg>
      {message}
    </p>
  );
}

/* ---------------- page ---------------- */

export default function NewProductPage() {
  const router = useRouter();

  const [token, setToken] = useState<string | null>(null);
  const [brands, setBrands] = useState<StaffCatalogueBrand[]>([]);
  const [categories, setCategories] = useState<StaffCatalogueCategory[]>([]);

  const [form, setForm] = useState<FormState>(emptyForm());
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const fieldRefs = useRef<
    Partial<Record<keyof FormState, HTMLElement | null>>
  >({});

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  /* ---------------- validation ---------------- */

  function validateField<K extends keyof FormState>(
    key: K,
    value: FormState[K],
  ): string | undefined {
    const v = String(value ?? "");

    if (key === "name") {
      if (!v.trim()) return "Title is required.";
    }
    if (key === "brandId") {
      if (!v.trim()) return "Brand is required.";
    }
    if (key === "categoryId") {
      if (!v.trim()) return "Category is required.";
    }
    return undefined;
  }

  function validateAll(): FieldErrors {
    const keys: Array<keyof FormState> = ["name", "brandId", "categoryId"];
    const next: FieldErrors = {};
    for (const key of keys) {
      const err = validateField(key, form[key]);
      if (err) next[key] = err;
    }
    return next;
  }

  function handleBlur(key: keyof FormState) {
    const err = validateField(key, form[key]);
    setFieldErrors((current) => {
      const next = { ...current };
      if (err) next[key] = err;
      else delete next[key];
      return next;
    });
  }

  function focusFirstError(errors: FieldErrors) {
    const order: Array<keyof FormState> = ["name", "brandId", "categoryId"];
    for (const key of order) {
      if (errors[key]) {
        const el = fieldRefs.current[key];
        if (el && typeof el.focus === "function") {
          el.focus();
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
        return;
      }
    }
  }

  /* ---------------- data load ---------------- */

  useEffect(() => {
    const activeToken = getStaffAccessToken();
    if (!activeToken) {
      router.replace("/staff/login");
      return;
    }
    const staffToken: string = activeToken;
    setToken(staffToken);

    async function load() {
      try {
        const [brandResult, categoryResult] = await Promise.all([
          getCatalogueBrands(),
          getCatalogueCategories(),
        ]);
        setBrands(brandResult);
        setCategories(categoryResult);
      } catch (caught) {
        if (
          caught instanceof StaffCatalogueApiError &&
          caught.status === 401
        ) {
          clearStaffAccessToken();
          router.replace("/staff/login");
          return;
        }
        setError(
          caught instanceof Error
            ? caught.message
            : "Unable to load brands and categories.",
        );
      }
    }

    void load();
  }, [router]);

  /* ---------------- save ---------------- */

  async function handleSave() {
    if (!token) return;

    setError("");

    const errors = validateAll();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      focusFirstError(errors);
      return;
    }

    const placeholderSku = generatePlaceholderSku(form.name.trim());

    const payload: CreateStaffProductInput = {
      brandId: Number(form.brandId),
      categoryId: Number(form.categoryId),
      name: form.name.trim(),
      shortDescription: null,
      description: form.description.trim() || null,
      productType: form.productType || "LAPTOP",
      variant: {
        sku: placeholderSku,
        variantName: "Default",
        color: null,
        ramGb: null,
        storageGb: null,
        operatingSystem: null,
        basePrice: 0,
        sellingPrice: 0,
        compareAtPrice: null,
        currency: "INR",
        warrantyMonths: null,
      },
    };

    setSaving(true);
    try {
      const created = await createStaffProduct(token, payload);
      router.push(`/staff/catalogue/products/${created.id}`);
    } catch (caught) {
      if (
        caught instanceof StaffCatalogueApiError &&
        caught.status === 401
      ) {
        clearStaffAccessToken();
        router.replace("/staff/login");
        return;
      }
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to create product.",
      );
      setSaving(false);
    }
  }

  /* ---------------- render ---------------- */

  return (
    <div className="text-[13px] text-neutral-800">
      {/* Header */}
      <div className="border-b border-neutral-200 bg-white px-6 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <Link
              href="/staff/catalogue/products"
              aria-label="Back to products"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-neutral-200 text-neutral-600 hover:bg-neutral-50"
            >
              <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
                <path
                  d="m10 4-4 4 4 4"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
            <nav className="flex min-w-0 items-center gap-1.5 text-[13px]">
              <Link
                href="/staff/catalogue/products"
                className="text-neutral-500 hover:text-neutral-800"
              >
                Products
              </Link>
              <span className="text-neutral-300">/</span>
              <span className="truncate font-medium text-neutral-800">
                Add product
              </span>
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/staff/catalogue/products"
              className="rounded-lg border border-neutral-200 bg-white px-3.5 py-1.5 text-[13px] font-medium text-neutral-700 hover:bg-neutral-50"
            >
              Discard
            </Link>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving}
              className="rounded-lg bg-neutral-900 px-3.5 py-1.5 text-[13px] font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="px-6 py-5">
        {error ? (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-[13px] text-red-700">
            <svg
              viewBox="0 0 20 20"
              fill="currentColor"
              className="mt-0.5 h-4 w-4 shrink-0"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16ZM9 5.75a1 1 0 0 1 2 0v4.5a1 1 0 0 1-2 0v-4.5Zm1 8.5a1.125 1.125 0 1 0 0-2.25 1.125 1.125 0 0 0 0 2.25Z"
                clipRule="evenodd"
              />
            </svg>
            <span>{error}</span>
          </div>
        ) : null}

        <div className="mb-5">
          <h1 className="text-[20px] font-semibold text-neutral-900">
            Add product
          </h1>
          <p className="mt-1 text-[12.5px] text-neutral-500">
            Just the basics. You can add images, prices, options, variants, and
            inventory on the next screen.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          {/* LEFT */}
          <div className="space-y-5">
            <SectionCard title="Title">
              <input
                ref={(el) => {
                  fieldRefs.current.name = el;
                }}
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                onBlur={() => handleBlur("name")}
                placeholder="e.g. Dell XPS 13 9315"
                className={fieldErrors.name ? inputErrorClass : inputClass}
              />
              <FieldError message={fieldErrors.name} />
            </SectionCard>

            <SectionCard title="Description">
              <textarea
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
                rows={8}
                placeholder="A short description shoppers will see on the product page."
                className={inputClass}
              />
            </SectionCard>

            <SectionCard title="What comes next">
              <ul className="list-inside list-disc space-y-1 text-[12.5px] text-neutral-600">
                <li>Upload images from the product page.</li>
                <li>Set prices per variant.</li>
                <li>
                  Add options (Color, RAM, etc.) and generate variants.
                </li>
                <li>Fill per-variant specifications and inventory.</li>
                <li>Publish the product when ready.</li>
              </ul>
            </SectionCard>
          </div>

          {/* RIGHT RAIL */}
          <aside className="space-y-5 lg:sticky lg:top-4 lg:self-start">
            <SectionCard title="Status">
              <div className="flex h-9 items-center rounded-lg border border-neutral-200 bg-neutral-50 px-3 text-[13px] text-neutral-500">
                Draft
              </div>
              <p className="mt-2 text-[11.5px] text-neutral-500">
                New products start as drafts. Publish from the product page
                once ready.
              </p>
            </SectionCard>

            <SectionCard title="Product organization">
              <div className="space-y-4">
                <div>
                  <FieldLabel hint="required">Category</FieldLabel>
                  <select
                    ref={(el) => {
                      fieldRefs.current.categoryId = el;
                    }}
                    value={form.categoryId}
                    onChange={(e) => update("categoryId", e.target.value)}
                    onBlur={() => handleBlur("categoryId")}
                    className={
                      fieldErrors.categoryId ? inputErrorClass : inputClass
                    }
                  >
                    <option value="">Choose a category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  <FieldError message={fieldErrors.categoryId} />
                  <p className="mt-1 text-[11.5px] text-neutral-500">
                    Determines which extra attributes (metafields) appear.
                  </p>
                </div>

                <div>
                  <FieldLabel hint="required">Brand</FieldLabel>
                  <select
                    ref={(el) => {
                      fieldRefs.current.brandId = el;
                    }}
                    value={form.brandId}
                    onChange={(e) => update("brandId", e.target.value)}
                    onBlur={() => handleBlur("brandId")}
                    className={
                      fieldErrors.brandId ? inputErrorClass : inputClass
                    }
                  >
                    <option value="">Choose a brand</option>
                    {brands.map((brand) => (
                      <option key={brand.id} value={brand.id}>
                        {brand.name}
                      </option>
                    ))}
                  </select>
                  <FieldError message={fieldErrors.brandId} />
                  <p className="mt-1 text-[11.5px] text-neutral-500">
                    The manufacturer. e.g. Dell, Lenovo, Apple.
                  </p>
                </div>

                <div className="border-t border-neutral-100 pt-3">
                  <button
                    type="button"
                    onClick={() => setAdvancedOpen((v) => !v)}
                    className="flex items-center gap-1.5 text-[12px] text-neutral-500 hover:text-neutral-800"
                  >
                    <svg
                      viewBox="0 0 16 16"
                      fill="none"
                      className={`h-3 w-3 transition-transform ${
                        advancedOpen ? "rotate-90" : ""
                      }`}
                    >
                      <path
                        d="m6 4 4 4-4 4"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    Advanced
                  </button>

                  {advancedOpen ? (
                    <div className="mt-3">
                      <FieldLabel hint="optional">Product type</FieldLabel>
                      <select
                        value={form.productType}
                        onChange={(e) => update("productType", e.target.value)}
                        className={inputClass}
                      >
                        <option value="LAPTOP">Laptop</option>
                        <option value="DESKTOP">Desktop</option>
                        <option value="MONITOR">Monitor</option>
                        <option value="ACCESSORY">Accessory</option>
                      </select>
                      <p className="mt-1 text-[11.5px] text-neutral-500">
                        Used for storefront filtering. Separate from the
                        category tree.
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>
            </SectionCard>
          </aside>
        </div>
      </div>
    </div>
  );
}