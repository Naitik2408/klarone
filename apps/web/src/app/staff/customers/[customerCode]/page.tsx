"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import {
  clearStaffAccessToken,
  getStaffAccessToken,
} from "../../../../lib/staff-auth-api";

import {
  getStaffCustomer,
  updateStaffCustomer,
  deleteStaffCustomer,
  StaffCustomersApiError,
} from "../../../../lib/staff-customers-api";

import type {
  StaffCustomerDetail,
} from "../../../../types/staff-customers";

function fullName(customer: StaffCustomerDetail) {
  return [
    customer.person.firstName,
    customer.person.middleName,
    customer.person.lastName,
  ]
    .filter(Boolean)
    .join(" ")
    .trim() || "Customer";
}

function dateTime(value: string | null) {
  if (!value) return "—";

  return new Date(value).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function dateOnly(value: string | null) {
  if (!value) return "—";

  return new Date(value).toLocaleDateString("en-IN", {
    dateStyle: "medium",
  });
}

function money(value: string | number, currency = "INR") {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return String(value);
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currency || "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function paymentPill(status: string) {
  const upper = (status || "").toUpperCase();
  if (upper === "PAID") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[#cbf4c9] px-2.5 py-0.5 text-[11px] font-medium text-[#0e6245]">
        <span className="h-1.5 w-1.5 rounded-full bg-[#108043]" />
        Paid
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[#fed3d1] px-2.5 py-0.5 text-[11px] font-medium text-[#8a1c14]">
      <span className="h-1.5 w-1.5 rounded-full bg-[#d72c0d]" />
      {status || "Pending"}
    </span>
  );
}

function addressText(
  address: StaffCustomerDetail["addresses"][number],
) {
  return [
    address.recipientName,
    address.addressLine1,
    address.addressLine2,
    address.landmark,
    `${address.city}, ${address.state} ${address.postalCode}`,
    address.country,
  ]
    .filter(Boolean)
    .join(", ");
}

const inputClass =
  "w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-[13px] text-neutral-900 outline-none transition placeholder:text-neutral-400 hover:border-neutral-300 focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200";

export default function StaffCustomerDetailPage() {
  const router = useRouter();

  const params = useParams<{
    customerCode: string;
  }>();

  const customerCode = decodeURIComponent(
    params.customerCode,
  );

  const [token, setToken] = useState<string | null>(null);
  const [customer, setCustomer] =
    useState<StaffCustomerDetail | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Edit State
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState("ACTIVE");
  const [notes, setNotes] = useState("");
  const [emailMarketing, setEmailMarketing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Timeline comment
  const [timelineComment, setTimelineComment] = useState("");

  // Delete State
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function load(activeToken: string) {
    try {
      setLoading(true);
      setError("");

      const result = await getStaffCustomer(
        activeToken,
        customerCode,
      );

      setCustomer(result);
      setFirstName(result.person.firstName || "");
      setLastName(result.person.lastName || "");
      setEmail(result.person.email || "");
      setPhone(result.person.phone || "");
      setStatus(result.status || "ACTIVE");
      setNotes(result.notes || "");
      setEmailMarketing(Boolean(result.emailMarketing));
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
          : "Unable to load customer.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const activeToken = getStaffAccessToken();

    if (!activeToken) {
      router.replace("/staff/login");
      return;
    }

    setToken(activeToken);
    void load(activeToken);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, customerCode]);

  async function handleSave() {
    if (!token || !customer) return;
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const updated = await updateStaffCustomer(token, customerCode, {
        firstName: firstName.trim(),
        lastName: lastName.trim() || null,
        email: email.trim() || null,
        phone: phone.trim() || null,
        status,
        notes: notes.trim() || null,
        emailMarketing,
      });

      setCustomer(updated);
      setSuccess("Customer saved.");
      setTimeout(() => setSuccess(""), 2500);
    } catch (caught) {
      if (
        caught instanceof StaffCustomersApiError &&
        caught.status === 401
      ) {
        clearStaffAccessToken();
        router.replace("/staff/login");
        return;
      }
      setError(caught instanceof Error ? caught.message : "Failed to save customer.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!token || !customer) return;
    setDeleting(true);
    setError("");

    try {
      await deleteStaffCustomer(token, customerCode);
      router.push("/staff/customers");
    } catch (caught) {
      if (
        caught instanceof StaffCustomersApiError &&
        caught.status === 401
      ) {
        clearStaffAccessToken();
        router.replace("/staff/login");
        return;
      }
      setError(caught instanceof Error ? caught.message : "Failed to delete customer.");
      setShowDeleteConfirm(false);
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="px-6 py-6">
        <div className="rounded-xl border border-neutral-200 bg-white px-4 py-8 text-[13px] text-neutral-500">
          Loading customer…
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="px-6 py-6">
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-[13px] text-red-700">
          {error || "Customer not found."}
        </div>
      </div>
    );
  }

  const isActive = customer.status === "ACTIVE";

  // Build a timeline of customer activity
  const activities = [
    {
      id: "joined",
      title: "Account created",
      timestamp: customer.createdAt,
      description: `Customer account registered with code ${customer.customerCode}`,
    },
    ...(customer.termsAcceptedAt
      ? [
          {
            id: "terms",
            title: "Terms and conditions accepted",
            timestamp: customer.termsAcceptedAt,
            description: "Customer accepted online store purchase agreement & policies",
          },
        ]
      : []),
    ...(customer.marketingConsentAt
      ? [
          {
            id: "marketing",
            title: "Marketing consent granted",
            timestamp: customer.marketingConsentAt,
            description: "Subscribed to email & SMS promotional notifications",
          },
        ]
      : []),
    ...(customer.userAccount.lastLoginAt
      ? [
          {
            id: "login",
            title: "Last active session",
            timestamp: customer.userAccount.lastLoginAt,
            description: "Customer signed in via web storefront",
          },
        ]
      : []),
    ...customer.orders.map((o) => ({
      id: `order-${o.id}`,
      title: `Placed Order #${o.orderNumber}`,
      timestamp: o.createdAt,
      description: `${o.itemCount} items · Total: ${money(o.totalAmount, o.currency)} · Status: ${o.status} (${o.paymentStatus})`,
      link: `/staff/orders/${encodeURIComponent(o.orderNumber)}`,
    })),
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return (
    <div className="text-[13px] text-neutral-800">
      {/* ----------------- Top Header Bar (Identical to Product Details) ----------------- */}
      <div className="border-b border-neutral-200 bg-white px-6 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <Link
              href="/staff/customers"
              aria-label="Back to customers"
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
              <Link href="/staff/customers" className="text-neutral-500 hover:text-neutral-800">
                Customers
              </Link>
              <span className="text-neutral-300">/</span>
              <span className="truncate font-medium text-neutral-800">
                {fullName(customer)}
              </span>
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={deleting}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-[13px] font-medium text-red-600 hover:bg-red-50 hover:border-red-300 disabled:opacity-50"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 6h18" />
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
              </svg>
              Delete customer
            </button>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 px-3.5 py-1.5 text-[13px] font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>

      {/* ----------------- Body Container ----------------- */}
      <div className="px-6 py-5">
        {error ? (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-[13px] text-red-700">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-[13px] text-emerald-700">
            {success}
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          {/* ===================== LEFT COLUMN ===================== */}
          <div className="space-y-6">
            {/* Title & Status */}
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="truncate text-[20px] font-semibold text-neutral-900">
                {fullName(customer)}
              </h1>
              <span
                className={`inline-flex items-center rounded-md px-2 py-0.5 text-[12px] font-medium ${
                  isActive
                    ? "bg-[#a6e8b1] text-[#0b5c2a]"
                    : "bg-[#ffe9a8] text-[#6b4d00]"
                }`}
              >
                {isActive ? "Active" : customer.status}
              </span>
            </div>

            {/* Customer Details Form */}
            <div className="rounded-xl border border-neutral-200 bg-white p-5">
              <h2 className="mb-4 text-[13px] font-medium text-neutral-800">
                Customer overview
              </h2>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-[12px] font-medium text-neutral-700">
                    First Name
                  </label>
                  <input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className={inputClass}
                    placeholder="First name"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-[12px] font-medium text-neutral-700">
                    Last Name
                  </label>
                  <input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className={inputClass}
                    placeholder="Last name"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-[12px] font-medium text-neutral-700">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputClass}
                    placeholder="customer@example.com"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-[12px] font-medium text-neutral-700">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className={inputClass}
                    placeholder="+91 9876543210"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="mb-1.5 block text-[12px] font-medium text-neutral-700">
                  Staff Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Internal staff notes regarding this customer..."
                  className={inputClass}
                />
              </div>

              <div className="mt-4 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="marketingConsentCheck"
                  checked={emailMarketing}
                  onChange={(e) => setEmailMarketing(e.target.checked)}
                  className="h-4 w-4 rounded border-neutral-300 accent-neutral-800"
                />
                <label htmlFor="marketingConsentCheck" className="text-[12px] text-neutral-700 cursor-pointer">
                  Customer agreed to receive marketing emails & communications
                </label>
              </div>
            </div>

            {/* Orders Section */}
            <div className="rounded-xl border border-neutral-200 bg-white">
              <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
                <h2 className="text-[13px] font-medium text-neutral-800">
                  Orders ({customer.orders.length})
                </h2>
              </div>

              {customer.orders.length === 0 ? (
                <div className="px-4 py-8 text-center text-neutral-500 text-[13px]">
                  No orders placed yet.
                </div>
              ) : (
                <div className="divide-y divide-neutral-100">
                  {customer.orders.map((order) => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between px-4 py-3.5 hover:bg-neutral-50/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-neutral-200 bg-neutral-900 text-white">
                          <svg
                            width="18"
                            height="18"
                            viewBox="0 0 20 20"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                          >
                            <rect x="3" y="4" width="14" height="10" rx="1.5" />
                            <path d="M2 15h16" />
                          </svg>
                        </div>
                        <div className="min-w-0 pr-2">
                          <Link
                            href={`/staff/orders/${encodeURIComponent(order.orderNumber)}`}
                            className="font-medium text-neutral-900 hover:underline"
                          >
                            #{order.orderNumber}
                          </Link>
                          <div className="text-[11px] text-neutral-400">
                            {order.itemCount} item{order.itemCount === 1 ? "" : "s"} · Placed {dateOnly(order.createdAt)}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 pl-3">
                        <div>{paymentPill(order.paymentStatus)}</div>
                        <span className="inline-block rounded-full bg-neutral-100 border border-neutral-200 px-2.5 py-0.5 text-[11px] text-neutral-600">
                          {order.fulfillmentStatus || order.status}
                        </span>
                        <div className="w-24 text-right font-medium text-neutral-900">
                          {money(order.totalAmount, order.currency)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Timeline Section */}
            <div className="rounded-xl border border-neutral-200 bg-white p-5">
              <h2 className="mb-4 text-[13px] font-medium text-neutral-800">
                Timeline & Activity
              </h2>

              {/* Comment Input */}
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-[11px] font-bold text-white">
                  NK
                </div>
                <div className="flex-1 rounded-xl border border-neutral-200 bg-white p-2.5 focus-within:border-neutral-400">
                  <textarea
                    value={timelineComment}
                    onChange={(e) => setTimelineComment(e.target.value)}
                    placeholder="Leave a comment or note about this customer..."
                    rows={2}
                    className="w-full text-[13px] text-neutral-900 outline-none placeholder:text-neutral-400"
                  />
                  <div className="flex items-center justify-between border-t border-neutral-100 pt-2 text-neutral-400">
                    <div className="flex items-center gap-3 text-[14px]">
                      <button type="button" className="hover:text-neutral-700">☺</button>
                      <button type="button" className="hover:text-neutral-700">@</button>
                      <button type="button" className="hover:text-neutral-700">#</button>
                    </div>
                    <button
                      type="button"
                      disabled={!timelineComment.trim()}
                      onClick={() => {
                        setNotes((prev) => (prev ? `${prev}\n${timelineComment}` : timelineComment));
                        setTimelineComment("");
                        void handleSave();
                      }}
                      className="rounded-lg bg-neutral-900 px-3 py-1 text-[12px] font-medium text-white hover:bg-neutral-800 disabled:opacity-40 transition-colors"
                    >
                      Post note
                    </button>
                  </div>
                </div>
              </div>

              {/* Activity entries */}
              <div className="mt-6 relative pl-6 space-y-5 before:absolute before:bottom-2 before:left-2.5 before:top-2 before:w-[1.5px] before:bg-neutral-200">
                {activities.map((act) => (
                  <div key={act.id} className="relative">
                    <span className="absolute -left-6 top-1 h-3 w-3 rounded-full border-2 border-white bg-neutral-900 shadow-xs" />
                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        {act.link ? (
                          <Link href={act.link} className="font-medium text-neutral-900 hover:underline">
                            {act.title}
                          </Link>
                        ) : (
                          <p className="font-medium text-neutral-900">{act.title}</p>
                        )}
                        <span className="text-[11px] text-neutral-400">
                          {dateTime(act.timestamp)}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[12px] text-neutral-500">
                        {act.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ===================== RIGHT SIDEBAR ===================== */}
          <div className="space-y-6">
            {/* Customer Status Card */}
            <div className="rounded-xl border border-neutral-200 bg-white p-4">
              <span className="text-[13px] font-medium text-neutral-800">
                Customer status
              </span>
              <div className="mt-2.5 space-y-2">
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className={inputClass}
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="SUSPENDED">Suspended</option>
                </select>
                <button
                  type="button"
                  disabled={saving || status === customer.status}
                  onClick={handleSave}
                  className="w-full rounded-lg bg-neutral-900 py-1.5 text-[12px] font-medium text-white hover:bg-neutral-800 disabled:opacity-40 transition-colors"
                >
                  {saving ? "Updating..." : "Save status"}
                </button>
              </div>
            </div>

            {/* Summary Metrics Card */}
            <div className="rounded-xl border border-neutral-200 bg-white p-4">
              <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
                <span className="text-[13px] font-medium text-neutral-800">
                  Customer overview
                </span>
                <span className="text-neutral-400 text-xs font-mono">{customer.customerCode}</span>
              </div>

              <div className="space-y-3 pt-3 text-[12px]">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500">Total spent</span>
                  <span className="font-semibold text-neutral-900">
                    {money(customer.totalSpent)}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-neutral-100 pt-2.5">
                  <span className="text-neutral-500">Total orders</span>
                  <span className="font-medium text-neutral-900">
                    {customer.orders.length}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-neutral-100 pt-2.5">
                  <span className="text-neutral-500">Customer since</span>
                  <span className="text-neutral-700">
                    {dateOnly(customer.createdAt)}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-neutral-100 pt-2.5">
                  <span className="text-neutral-500">Last active</span>
                  <span className="text-neutral-700">
                    {customer.userAccount.lastLoginAt ? dateOnly(customer.userAccount.lastLoginAt) : "Never"}
                  </span>
                </div>
              </div>
            </div>

            {/* Default Address Section */}
            <div className="rounded-xl border border-neutral-200 bg-white p-4">
              <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
                <span className="text-[13px] font-medium text-neutral-800">
                  Default address
                </span>
                <span className="text-[11px] text-neutral-400">
                  {customer.addresses.length} saved
                </span>
              </div>
              <div className="pt-3 text-[12px] text-neutral-700">
                {customer.addresses.length > 0 ? (
                  <>
                    <p className="font-medium text-neutral-900">
                      {customer.addresses[0].recipientName || fullName(customer)}
                    </p>
                    <p className="text-neutral-600 mt-1">{customer.addresses[0].addressLine1}</p>
                    {customer.addresses[0].addressLine2 && (
                      <p className="text-neutral-600">{customer.addresses[0].addressLine2}</p>
                    )}
                    <p className="text-neutral-600">
                      {customer.addresses[0].city}, {customer.addresses[0].state} {customer.addresses[0].postalCode}
                    </p>
                    <p className="text-neutral-600">{customer.addresses[0].country}</p>
                    {customer.addresses[0].phone && (
                      <p className="mt-1.5 text-neutral-400 text-[11px]">
                        Phone: {customer.addresses[0].phone}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-neutral-400">No saved address</p>
                )}
              </div>
            </div>

            {/* Account & Marketing Section */}
            <div className="rounded-xl border border-neutral-200 bg-white p-4">
              <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
                <span className="text-[13px] font-medium text-neutral-800">
                  Account & consent
                </span>
              </div>
              <div className="space-y-2.5 pt-3 text-[12px]">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500">Account status</span>
                  <span className="font-medium text-neutral-800">
                    {customer.userAccount.status}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-neutral-100 pt-2">
                  <span className="text-neutral-500">Account type</span>
                  <span className="text-neutral-700">
                    {customer.userAccount.accountType || "CUSTOMER"}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-neutral-100 pt-2">
                  <span className="text-neutral-500">Marketing consent</span>
                  <span className="font-medium text-neutral-800">
                    {customer.marketingConsent ? "Granted" : "Not granted"}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-neutral-100 pt-2">
                  <span className="text-neutral-500">Terms accepted</span>
                  <span className="text-neutral-700">
                    {customer.termsAcceptedAt ? "Accepted" : "Not accepted"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-neutral-100 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M3 6h18" />
                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                  </svg>
                </span>
                <div>
                  <h3 className="text-[15px] font-semibold text-neutral-900">
                    Delete customer
                  </h3>
                  <p className="text-[12px] text-neutral-500">
                    This action is permanent and cannot be undone.
                  </p>
                </div>
              </div>

              <p className="mt-4 text-[13px] text-neutral-600">
                Are you sure you want to delete{" "}
                <span className="font-semibold text-neutral-900">
                  {fullName(customer)}
                </span>
                ? This will permanently remove their profile, authentication record, and saved information.
              </p>

              <div className="mt-6 flex items-center justify-end gap-2">
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => setShowDeleteConfirm(false)}
                  className="rounded-lg border border-neutral-200 px-3.5 py-1.5 text-[13px] font-medium text-neutral-700 hover:bg-neutral-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => void handleDelete()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3.5 py-1.5 text-[13px] font-medium text-white hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {deleting ? "Deleting..." : "Delete customer"}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}