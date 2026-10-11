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
  slug: string;
  description: string;
  categoryId: string;
  brandId: string;
  productType: string;
};

type FieldErrors = Partial<Record<keyof FormState, string>>;

function emptyForm(): FormState {
  return {
    name: "",
    slug: "",
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
  overflowVisible = false,
}: {
  title?: string;
  children: React.ReactNode;
  overflowVisible?: boolean;
}) {
  return (
    <section
      className={`rounded-xl border border-neutral-200 bg-white ${
        overflowVisible ? "overflow-visible" : "overflow-hidden"
      }`}
    >
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
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
  const [brandMenuOpen, setBrandMenuOpen] = useState(false);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (!target.closest("[data-category-picker]")) {
        setCategoryMenuOpen(false);
      }
      if (!target.closest("[data-brand-picker]")) {
        setBrandMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

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

  function handleNameChange(name: string) {
    setForm((current) => ({
      ...current,
      name,
      slug: slugManuallyEdited ? current.slug : slugify(name),
    }));
    setFieldErrors((current) => {
      if (!current.name && !current.slug) return current;
      const next = { ...current };
      delete next.name;
      delete next.slug;
      return next;
    });
  }

  function handleSlugChange(slug: string) {
    setSlugManuallyEdited(slug.length > 0);
    update("slug", slug);
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
      slug: form.slug.trim() || undefined,
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
            <SectionCard title="Title & Handle">
              <div className="space-y-4">
                <div>
                  <FieldLabel hint="required">Title</FieldLabel>
                  <input
                    ref={(el) => {
                      fieldRefs.current.name = el;
                    }}
                    value={form.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    onBlur={() => handleBlur("name")}
                    placeholder="e.g. Dell XPS 13 9315"
                    className={fieldErrors.name ? inputErrorClass : inputClass}
                  />
                  <FieldError message={fieldErrors.name} />
                </div>

                <div>
                  <FieldLabel hint="auto-generated / editable">URL Slug</FieldLabel>
                  <input
                    ref={(el) => {
                      fieldRefs.current.slug = el;
                    }}
                    value={form.slug}
                    onChange={(e) => handleSlugChange(e.target.value)}
                    placeholder="e.g. dell-xps-13-9315"
                    className={fieldErrors.slug ? inputErrorClass : inputClass}
                  />
                  <FieldError message={fieldErrors.slug} />
                  <p className="mt-1 text-[11.5px] text-neutral-400">
                    Auto-generated from title for search engines and direct links. You can edit it manually.
                  </p>
                </div>
              </div>
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
            <SectionCard title="Product organization" overflowVisible>
              <div className="space-y-4">
                {/* Category Dropdown */}
                <div>
                  <FieldLabel hint="required">Category</FieldLabel>
                  <div className="relative" data-category-picker>
                    <button
                      ref={(el) => {
                        fieldRefs.current.categoryId = el;
                      }}
                      type="button"
                      onClick={() => {
                        setCategoryMenuOpen((open) => !open);
                        setBrandMenuOpen(false);
                      }}
                      aria-haspopup="listbox"
                      aria-expanded={categoryMenuOpen}
                      className={`flex h-9 w-full items-center justify-between rounded-lg border bg-white px-3 text-left text-[13px] transition hover:bg-neutral-50 ${
                        fieldErrors.categoryId
                          ? "border-red-300 bg-red-50/40 text-red-900 focus:border-red-400 focus:ring-2 focus:ring-red-200"
                          : "border-neutral-200 text-neutral-800 hover:border-neutral-300 focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200"
                      }`}
                    >
                      <span className={form.categoryId ? "font-normal text-neutral-900" : "text-neutral-400"}>
                        {categories.find((c) => String(c.id) === form.categoryId)?.name ?? "Choose a category"}
                      </span>
                      <svg
                        viewBox="0 0 16 16"
                        fill="none"
                        className="h-3.5 w-3.5 text-neutral-500 shrink-0"
                        aria-hidden="true"
                      >
                        <path
                          d="m5 7 3-3 3 3M5 9l3 3 3-3"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>

                    {categoryMenuOpen ? (
                      <div
                        role="listbox"
                        className="absolute top-full left-0 z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-neutral-200 bg-white py-1 shadow-lg"
                      >
                        <button
                          type="button"
                          role="option"
                          aria-selected={!form.categoryId}
                          onClick={() => {
                            update("categoryId", "");
                            setCategoryMenuOpen(false);
                          }}
                          className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-[13px] hover:bg-neutral-50 ${
                            !form.categoryId
                              ? "font-medium text-neutral-900"
                              : "text-neutral-600"
                          }`}
                        >
                          <span>Choose a category</span>
                          {!form.categoryId ? (
                            <svg
                              viewBox="0 0 16 16"
                              fill="none"
                              className="h-3.5 w-3.5 text-neutral-800 shrink-0"
                              aria-hidden="true"
                            >
                              <path
                                d="m3.5 8.5 3 3 6-6.5"
                                stroke="currentColor"
                                strokeWidth="1.6"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          ) : null}
                        </button>
                        {categories.map((c) => {
                          const isSelected = form.categoryId === String(c.id);
                          return (
                            <button
                              key={c.id}
                              type="button"
                              role="option"
                              aria-selected={isSelected}
                              onClick={() => {
                                update("categoryId", String(c.id));
                                setCategoryMenuOpen(false);
                              }}
                              className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-[13px] hover:bg-neutral-50 ${
                                isSelected
                                  ? "font-medium text-neutral-900"
                                  : "text-neutral-700"
                              }`}
                            >
                              <span>{c.name}</span>
                              {isSelected ? (
                                <svg
                                  viewBox="0 0 16 16"
                                  fill="none"
                                  className="h-3.5 w-3.5 text-neutral-800 shrink-0"
                                  aria-hidden="true"
                                >
                                  <path
                                    d="m3.5 8.5 3 3 6-6.5"
                                    stroke="currentColor"
                                    strokeWidth="1.6"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                              ) : null}
                            </button>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                  <FieldError message={fieldErrors.categoryId} />
                  <p className="mt-1 text-[11.5px] text-neutral-500">
                    Determines technical specifications, GST rate and HSN classification.
                  </p>
                </div>

                {/* Brand Dropdown */}
                <div>
                  <FieldLabel hint="required">Brand</FieldLabel>
                  <div className="relative" data-brand-picker>
                    <button
                      ref={(el) => {
                        fieldRefs.current.brandId = el;
                      }}
                      type="button"
                      onClick={() => {
                        setBrandMenuOpen((open) => !open);
                        setCategoryMenuOpen(false);
                      }}
                      aria-haspopup="listbox"
                      aria-expanded={brandMenuOpen}
                      className={`flex h-9 w-full items-center justify-between rounded-lg border bg-white px-3 text-left text-[13px] transition hover:bg-neutral-50 ${
                        fieldErrors.brandId
                          ? "border-red-300 bg-red-50/40 text-red-900 focus:border-red-400 focus:ring-2 focus:ring-red-200"
                          : "border-neutral-200 text-neutral-800 hover:border-neutral-300 focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200"
                      }`}
                    >
                      <span className={form.brandId ? "font-normal text-neutral-900" : "text-neutral-400"}>
                        {brands.find((b) => String(b.id) === form.brandId)?.name ?? "Choose a brand"}
                      </span>
                      <svg
                        viewBox="0 0 16 16"
                        fill="none"
                        className="h-3.5 w-3.5 text-neutral-500 shrink-0"
                        aria-hidden="true"
                      >
                        <path
                          d="m5 7 3-3 3 3M5 9l3 3 3-3"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>

                    {brandMenuOpen ? (
                      <div
                        role="listbox"
                        className="absolute top-full left-0 z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-neutral-200 bg-white py-1 shadow-lg"
                      >
                        <button
                          type="button"
                          role="option"
                          aria-selected={!form.brandId}
                          onClick={() => {
                            update("brandId", "");
                            setBrandMenuOpen(false);
                          }}
                          className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-[13px] hover:bg-neutral-50 ${
                            !form.brandId
                              ? "font-medium text-neutral-900"
                              : "text-neutral-600"
                          }`}
                        >
                          <span>Choose a brand</span>
                          {!form.brandId ? (
                            <svg
                              viewBox="0 0 16 16"
                              fill="none"
                              className="h-3.5 w-3.5 text-neutral-800 shrink-0"
                              aria-hidden="true"
                            >
                              <path
                                d="m3.5 8.5 3 3 6-6.5"
                                stroke="currentColor"
                                strokeWidth="1.6"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          ) : null}
                        </button>
                        {brands.map((b) => {
                          const isSelected = form.brandId === String(b.id);
                          return (
                            <button
                              key={b.id}
                              type="button"
                              role="option"
                              aria-selected={isSelected}
                              onClick={() => {
                                update("brandId", String(b.id));
                                setBrandMenuOpen(false);
                              }}
                              className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-[13px] hover:bg-neutral-50 ${
                                isSelected
                                  ? "font-medium text-neutral-900"
                                  : "text-neutral-700"
                              }`}
                            >
                              <span>{b.name}</span>
                              {isSelected ? (
                                <svg
                                  viewBox="0 0 16 16"
                                  fill="none"
                                  className="h-3.5 w-3.5 text-neutral-800 shrink-0"
                                  aria-hidden="true"
                                >
                                  <path
                                    d="m3.5 8.5 3 3 6-6.5"
                                    stroke="currentColor"
                                    strokeWidth="1.6"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                              ) : null}
                            </button>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                  <FieldError message={fieldErrors.brandId} />
                  <p className="mt-1 text-[11.5px] text-neutral-500">
                    The manufacturer. e.g. Dell, Lenovo, Apple.
                  </p>
                </div>
              </div>
            </SectionCard>
          </aside>
        </div>
      </div>
    </div>
  );
}