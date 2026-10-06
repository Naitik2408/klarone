"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  clearStaffAccessToken,
  getStaffAccessToken,
} from "../../../../lib/staff-auth-api";

import {
  createStaffCustomer,
  StaffCustomersApiError,
} from "../../../../lib/staff-customers-api";

import type { CreateStaffCustomerInput } from "../../../../types/staff-customers";

const inputClass =
  "w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-[13px] text-neutral-900 outline-none transition placeholder:text-neutral-400 hover:border-neutral-300 focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200";

const labelClass =
  "mb-1.5 block text-[12px] font-medium text-neutral-700";

export default function NewStaffCustomerPage() {
  const router = useRouter();

  const [token, setToken] = useState<string | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [language, setLanguage] = useState("en-IN");

  const [emailMarketing, setEmailMarketing] = useState(false);
  const [smsMarketing, setSmsMarketing] = useState(false);
  const [whatsappMarketing, setWhatsappMarketing] = useState(false);

  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState("");
  const [showTagInput, setShowTagInput] = useState(false);

  const [showAddress, setShowAddress] = useState(false);
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [landmark, setLandmark] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("India");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const activeToken = getStaffAccessToken();

    if (!activeToken) {
      router.replace("/staff/login");
      return;
    }

    setToken(activeToken);
  }, [router]);

  function addTag() {
    const value = tagDraft.trim();

    if (!value || tags.includes(value)) {
      setTagDraft("");
      setShowTagInput(false);
      return;
    }

    setTags([...tags, value]);
    setTagDraft("");
    setShowTagInput(false);
  }

  function removeTag(value: string) {
    setTags(tags.filter((t) => t !== value));
  }

  async function handleSave() {
    if (!token) return;

    if (!firstName.trim()) {
      setError("First name is required.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const payload: CreateStaffCustomerInput = {
        firstName: firstName.trim(),
        lastName: lastName.trim() || null,
        email: email.trim() || null,
        phone: phone.trim() || null,
        emailMarketing,
        smsMarketing,
        whatsappMarketing,
        notes: notes.trim() || null,
        tags,
        defaultAddress:
          showAddress && addressLine1.trim()
            ? {
                addressLine1: addressLine1.trim(),
                addressLine2: addressLine2.trim() || null,
                landmark: landmark.trim() || null,
                city: city.trim(),
                state: state.trim(),
                postalCode: postalCode.trim(),
                country: country.trim() || "India",
              }
            : null,
      };

      const created = await createStaffCustomer(token, payload);

      router.push(
        `/staff/customers/${encodeURIComponent(
          created.customerCode,
        )}`,
      );
    } catch (caught) {
      if (
        caught instanceof StaffCustomersApiError &&
        caught.status === 401
      ) {
        clearStaffAccessToken();
        router.replace("/staff/login");
        return;
      }

      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to create customer.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="text-[13px] text-neutral-800">
      {/* Header */}
      <div className="border-b border-neutral-200 bg-white px-6 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <Link
              href="/staff/customers"
              aria-label="Back to customers"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-neutral-200 text-neutral-600 hover:bg-neutral-50"
            >
              <svg
                viewBox="0 0 16 16"
                fill="none"
                className="h-3.5 w-3.5"
              >
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
              <span className="text-neutral-500">Customers</span>
              <span className="text-neutral-300">/</span>
              <span className="truncate font-medium text-neutral-800">
                New customer
              </span>
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/staff/customers"
              className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-[13px] font-medium text-neutral-700 hover:bg-neutral-50"
            >
              Cancel
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

      <div className="px-6 py-5">
        {error ? (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-[13px] text-red-700">
            {error}
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          {/* LEFT */}
          <div className="space-y-6">
            <h1 className="text-[20px] font-semibold text-neutral-900">
              New customer
            </h1>

            {/* Customer overview card */}
            <section>
              <h2 className="mb-2 text-[14px] font-medium text-neutral-900">
                Customer overview
              </h2>

              <div className="rounded-xl border border-neutral-200 bg-white">
                <div className="space-y-5 px-4 py-5">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <label className={labelClass}>First name</label>
                      <input
                        value={firstName}
                        onChange={(e) =>
                          setFirstName(e.target.value)
                        }
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label className={labelClass}>Last name</label>
                      <input
                        value={lastName}
                        onChange={(e) =>
                          setLastName(e.target.value)
                        }
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>Language</label>
                    <select
                      value={language}
                      onChange={(e) =>
                        setLanguage(e.target.value)
                      }
                      className={inputClass}
                    >
                      <option value="en-IN">
                        English [Default]
                      </option>
                      <option value="hi-IN">Hindi</option>
                    </select>
                    <p className="mt-1 text-[11.5px] text-neutral-500">
                      This customer will receive notifications in
                      this language.
                    </p>
                  </div>

                  <div>
                    <label className={labelClass}>Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>
                      Phone number
                    </label>
                    <div className="flex">
                      <button
                        type="button"
                        className="flex items-center gap-2 rounded-l-lg border border-r-0 border-neutral-200 bg-neutral-50 px-3 text-[13px] text-neutral-700 hover:bg-neutral-100"
                        aria-label="Country code"
                      >
                        <span className="text-[15px] leading-none">
                          🇮🇳
                        </span>
                        <svg
                          viewBox="0 0 16 16"
                          fill="none"
                          className="h-3 w-3 text-neutral-500"
                        >
                          <path
                            d="m5 7 3 3 3-3"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                      <input
                        value={phone}
                        onChange={(e) =>
                          setPhone(e.target.value)
                        }
                        placeholder="+91"
                        className="w-full rounded-r-lg border border-neutral-200 bg-white px-3 py-2 text-[13px] text-neutral-900 outline-none placeholder:text-neutral-400 hover:border-neutral-300 focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200"
                      />
                    </div>
                  </div>

                  {/* Marketing consent */}
                  <div className="space-y-3 pt-2">
                    <label className="flex items-start gap-2.5 text-[13px] text-neutral-700">
                      <input
                        type="checkbox"
                        checked={emailMarketing}
                        onChange={(e) =>
                          setEmailMarketing(e.target.checked)
                        }
                        className="mt-0.5 h-4 w-4 rounded border-neutral-300 accent-neutral-900"
                      />
                      <span>
                        Customer agreed to receive marketing
                        emails.
                      </span>
                    </label>

                    <label className="flex items-start gap-2.5 text-[13px] text-neutral-700">
                      <input
                        type="checkbox"
                        checked={smsMarketing}
                        onChange={(e) =>
                          setSmsMarketing(e.target.checked)
                        }
                        className="mt-0.5 h-4 w-4 rounded border-neutral-300 accent-neutral-900"
                      />
                      <span>
                        Customer agreed to receive SMS marketing
                        text messages.
                      </span>
                    </label>

                    <label className="flex items-start gap-2.5 text-[13px] text-neutral-700">
                      <input
                        type="checkbox"
                        checked={whatsappMarketing}
                        onChange={(e) =>
                          setWhatsappMarketing(e.target.checked)
                        }
                        className="mt-0.5 h-4 w-4 rounded border-neutral-300 accent-neutral-900"
                      />
                      <span>
                        Customer agreed to receive WhatsApp
                        marketing messages.
                      </span>
                    </label>
                  </div>
                </div>

                {/* Info footer */}
                <div className="rounded-b-xl border-t border-neutral-100 bg-neutral-50 px-4 py-3 text-[12px] text-neutral-600">
                  You should ask your customers for permission
                  before you subscribe them to your marketing
                  emails, SMS, or WhatsApp messages.
                </div>
              </div>
            </section>

            {/* Default address */}
            <section>
              <h2 className="mb-1 text-[14px] font-medium text-neutral-900">
                Default address
              </h2>
              <p className="mb-2 text-[12px] text-neutral-500">
                The primary address of this customer
              </p>

              <div className="rounded-xl border border-neutral-200 bg-white">
                <button
                  type="button"
                  onClick={() =>
                    setShowAddress(!showAddress)
                  }
                  className="flex w-full items-center justify-between px-4 py-3.5 text-left hover:bg-neutral-50"
                >
                  <span className="flex items-center gap-2 text-[13px] font-medium text-neutral-800">
                    <span className="grid h-5 w-5 place-items-center rounded-full border border-neutral-300 text-[13px] leading-none text-neutral-500">
                      +
                    </span>
                    Add address
                  </span>
                  <svg
                    viewBox="0 0 16 16"
                    fill="none"
                    className={`h-3.5 w-3.5 text-neutral-500 transition-transform ${
                      showAddress ? "rotate-180" : ""
                    }`}
                  >
                    <path
                      d="m5 7 3 3 3-3"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>

                {showAddress ? (
                  <div className="border-t border-neutral-100 px-4 py-5">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="sm:col-span-2">
                        <label className={labelClass}>
                          Address line 1
                        </label>
                        <input
                          value={addressLine1}
                          onChange={(e) =>
                            setAddressLine1(e.target.value)
                          }
                          className={inputClass}
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className={labelClass}>
                          Address line 2
                        </label>
                        <input
                          value={addressLine2}
                          onChange={(e) =>
                            setAddressLine2(e.target.value)
                          }
                          className={inputClass}
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className={labelClass}>
                          Landmark
                        </label>
                        <input
                          value={landmark}
                          onChange={(e) =>
                            setLandmark(e.target.value)
                          }
                          className={inputClass}
                        />
                      </div>

                      <div>
                        <label className={labelClass}>
                          City
                        </label>
                        <input
                          value={city}
                          onChange={(e) =>
                            setCity(e.target.value)
                          }
                          className={inputClass}
                        />
                      </div>

                      <div>
                        <label className={labelClass}>
                          State
                        </label>
                        <input
                          value={state}
                          onChange={(e) =>
                            setState(e.target.value)
                          }
                          className={inputClass}
                        />
                      </div>

                      <div>
                        <label className={labelClass}>
                          Postal code
                        </label>
                        <input
                          value={postalCode}
                          onChange={(e) =>
                            setPostalCode(e.target.value)
                          }
                          className={inputClass}
                        />
                      </div>

                      <div>
                        <label className={labelClass}>
                          Country
                        </label>
                        <input
                          value={country}
                          onChange={(e) =>
                            setCountry(e.target.value)
                          }
                          className={inputClass}
                        />
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </section>
          </div>

          {/* RIGHT RAIL */}
          <aside className="space-y-5 lg:sticky lg:top-4 lg:self-start">
            {/* Notes */}
            <div className="rounded-xl border border-neutral-200 bg-white">
              <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
                <h2 className="text-[13px] font-medium text-neutral-800">
                  Notes
                </h2>
                <svg
                  viewBox="0 0 16 16"
                  fill="none"
                  className="h-3.5 w-3.5 text-neutral-500"
                >
                  <path
                    d="M11.5 2.5 13.5 4.5l-7.5 7.5-3 1 1-3 7.5-7.5Z"
                    stroke="currentColor"
                    strokeWidth="1.3"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div className="px-4 py-4">
                <p className="text-[12px] text-neutral-500">
                  Notes are private and won&apos;t be shared with
                  the customer.
                </p>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  className={`${inputClass} mt-2`}
                />
              </div>
            </div>

            {/* Tags */}
            <div className="rounded-xl border border-neutral-200 bg-white">
              <div className="border-b border-neutral-100 px-4 py-3">
                <h2 className="text-[13px] font-medium text-neutral-800">
                  Tags
                </h2>
              </div>
              <div className="px-4 py-4">
                {tags.length > 0 ? (
                  <div className="mb-3 flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 rounded-md border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-[12px] text-neutral-700"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="text-neutral-500 hover:text-neutral-900"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                ) : null}

                {showTagInput ? (
                  <div className="flex gap-2">
                    <input
                      autoFocus
                      value={tagDraft}
                      onChange={(e) =>
                        setTagDraft(e.target.value)
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addTag();
                        }
                        if (e.key === "Escape") {
                          setShowTagInput(false);
                          setTagDraft("");
                        }
                      }}
                      placeholder="Tag name"
                      className={inputClass}
                    />
                    <button
                      type="button"
                      onClick={addTag}
                      className="shrink-0 rounded-lg bg-neutral-900 px-3 py-2 text-[12px] font-medium text-white hover:bg-neutral-800"
                    >
                      Add
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowTagInput(true)}
                    className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-neutral-300 bg-white px-3 py-2 text-[12px] font-medium text-neutral-700 hover:bg-neutral-50"
                  >
                    <svg
                      viewBox="0 0 16 16"
                      fill="none"
                      className="h-3.5 w-3.5"
                    >
                      <path
                        d="M8 3v10M3 8h10"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                      />
                    </svg>
                    Add tags
                  </button>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Sticky bottom bar */}
      <div className="sticky bottom-0 z-20 flex justify-end gap-2 border-t border-neutral-200 bg-white/95 px-6 py-3 backdrop-blur">
        <Link
          href="/staff/customers"
          className="rounded-lg border border-neutral-200 bg-white px-4 py-2 text-[13px] font-medium text-neutral-700 hover:bg-neutral-50"
        >
          Cancel
        </Link>
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving}
          className="rounded-lg bg-neutral-900 px-4 py-2 text-[13px] font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save customer"}
        </button>
      </div>
    </div>
  );
}