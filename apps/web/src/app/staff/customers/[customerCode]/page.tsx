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
    .trim() || "Unnamed customer";
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

function money(value: string, currency: string) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return value;
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currency || "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function badgeClass(value: string) {
  if (
    ["ACTIVE", "PAID", "DELIVERED", "FULFILLED"].includes(
      value,
    )
  ) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (
    ["INACTIVE", "SUSPENDED", "FAILED", "CANCELLED"].includes(
      value,
    )
  ) {
    return "border-red-200 bg-red-50 text-red-700";
  }

  return "border-amber-200 bg-amber-50 text-amber-700";
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

  async function load(activeToken: string) {
    try {
      setLoading(true);
      setError("");

      const result = await getStaffCustomer(
        activeToken,
        customerCode,
      );

      setCustomer(result);
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

  function logout() {
    clearStaffAccessToken();
    router.replace("/staff/login");
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f6f6f3] p-8">
        <div className="mx-auto max-w-7xl rounded-2xl border border-black/10 bg-white p-8">
          Loading customer…
        </div>
      </main>
    );
  }

  if (!customer) {
    return (
      <main className="min-h-screen bg-[#f6f6f3] p-8">
        <div className="mx-auto max-w-3xl rounded-2xl border border-red-200 bg-red-50 p-8 text-red-800">
          {error || "Customer not found."}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f6f6f3] text-neutral-950">
      <header className="border-b border-black/10 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-xs font-semibold tracking-[0.22em] text-neutral-400">
              KLARONE STAFF
            </p>

            <h1 className="mt-1 text-2xl font-semibold">
              {fullName(customer)}
            </h1>

            <p className="mt-1 text-sm text-neutral-500">
              {customer.customerCode} · Created{" "}
              {dateTime(customer.createdAt)}
            </p>
          </div>

          <div className="flex gap-3">
            <Link
              href="/staff/customers"
              className="rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-medium hover:bg-neutral-50"
            >
              Back to customers
            </Link>

            <button
              type="button"
              onClick={logout}
              className="rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-medium hover:bg-neutral-50"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-8">
        {error ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            <section className="rounded-2xl border border-black/10 bg-white p-6">
              <h2 className="text-lg font-semibold">
                Customer profile
              </h2>

              <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <p className="text-xs text-neutral-400">
                    Name
                  </p>
                  <p className="mt-1 font-medium">
                    {fullName(customer)}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-neutral-400">
                    Customer code
                  </p>
                  <p className="mt-1 font-medium">
                    {customer.customerCode}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-neutral-400">
                    Customer type
                  </p>
                  <p className="mt-1 font-medium">
                    {customer.customerType}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-neutral-400">
                    Email
                  </p>
                  <p className="mt-1">
                    {customer.person.email || "—"}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-neutral-400">
                    Phone
                  </p>
                  <p className="mt-1">
                    {customer.person.phone || "—"}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-neutral-400">
                    Gender
                  </p>
                  <p className="mt-1">
                    {customer.person.gender || "—"}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-neutral-400">
                    Date of birth
                  </p>
                  <p className="mt-1">
                    {dateOnly(
                      customer.person.dateOfBirth ?? null,
                    )}
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-black/10 bg-white p-6">
              <h2 className="text-lg font-semibold">
                Addresses
              </h2>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {customer.addresses.length === 0 ? (
                  <p className="text-sm text-neutral-500">
                    No saved addresses.
                  </p>
                ) : (
                  customer.addresses.map((address) => (
                    <div
                      key={address.id}
                      className="rounded-xl border border-black/10 p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium">
                          {address.addressType}
                        </p>

                        {address.isDefault ? (
                          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                            Default
                          </span>
                        ) : null}
                      </div>

                      <p className="mt-3 text-sm leading-6 text-neutral-600">
                        {addressText(address)}
                      </p>

                      {address.phone ? (
                        <p className="mt-2 text-xs text-neutral-400">
                          Phone: {address.phone}
                        </p>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-black/10 bg-white p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">
                    Order history
                  </h2>

                  <p className="mt-1 text-sm text-neutral-500">
                    {customer.orders.length} order
                    {customer.orders.length === 1
                      ? ""
                      : "s"}
                  </p>
                </div>
              </div>

              <div className="mt-5 overflow-x-auto">
                {customer.orders.length === 0 ? (
                  <p className="text-sm text-neutral-500">
                    No orders found.
                  </p>
                ) : (
                  <table className="min-w-full text-left text-sm">
                    <thead className="border-b border-black/10 bg-neutral-50">
                      <tr>
                        <th className="px-4 py-3 font-medium">
                          Order
                        </th>
                        <th className="px-4 py-3 font-medium">
                          Items
                        </th>
                        <th className="px-4 py-3 font-medium">
                          Total
                        </th>
                        <th className="px-4 py-3 font-medium">
                          Status
                        </th>
                        <th className="px-4 py-3 font-medium">
                          Payment
                        </th>
                        <th className="px-4 py-3 font-medium">
                          Created
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {customer.orders.map((order) => (
                        <tr
                          key={order.id}
                          className="border-b border-black/5 last:border-b-0"
                        >
                          <td className="px-4 py-4">
                            <Link
                              href={`/staff/orders/${encodeURIComponent(
                                order.orderNumber,
                              )}`}
                              className="font-semibold hover:underline"
                            >
                              {order.orderNumber}
                            </Link>
                          </td>

                          <td className="px-4 py-4">
                            {order.itemCount}
                          </td>

                          <td className="px-4 py-4 font-medium">
                            {money(
                              order.totalAmount,
                              order.currency,
                            )}
                          </td>

                          <td className="px-4 py-4">
                            <span
                              className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${badgeClass(
                                order.status,
                              )}`}
                            >
                              {order.status}
                            </span>
                          </td>

                          <td className="px-4 py-4">
                            <span
                              className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${badgeClass(
                                order.paymentStatus,
                              )}`}
                            >
                              {order.paymentStatus}
                            </span>
                          </td>

                          <td className="whitespace-nowrap px-4 py-4 text-neutral-500">
                            {dateTime(order.createdAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </section>
          </div>

          <aside className="space-y-6">
            <section className="rounded-2xl border border-black/10 bg-white p-6">
              <h2 className="text-lg font-semibold">
                Account status
              </h2>

              <div className="mt-5 space-y-4">
                <div>
                  <p className="text-xs text-neutral-400">
                    Customer status
                  </p>

                  <span
                    className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${badgeClass(
                      customer.status,
                    )}`}
                  >
                    {customer.status}
                  </span>
                </div>

                <div>
                  <p className="text-xs text-neutral-400">
                    User account status
                  </p>

                  <span
                    className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${badgeClass(
                      customer.userAccount.status,
                    )}`}
                  >
                    {customer.userAccount.status}
                  </span>
                </div>

                <div>
                  <p className="text-xs text-neutral-400">
                    Person status
                  </p>

                  <span
                    className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${badgeClass(
                      customer.person.status,
                    )}`}
                  >
                    {customer.person.status}
                  </span>
                </div>

                <div className="border-t border-black/10 pt-4">
                  <p className="text-xs text-neutral-400">
                    Last login
                  </p>

                  <p className="mt-1 text-sm">
                    {dateTime(
                      customer.userAccount.lastLoginAt,
                    )}
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-black/10 bg-white p-6">
              <h2 className="text-lg font-semibold">
                Consent & terms
              </h2>

              <div className="mt-5 space-y-4 text-sm">
                <div>
                  <p className="text-xs text-neutral-400">
                    Marketing consent
                  </p>

                  <p className="mt-1 font-medium">
                    {customer.marketingConsent
                      ? "Granted"
                      : "Not granted"}
                  </p>

                  {customer.marketingConsentAt ? (
                    <p className="mt-1 text-xs text-neutral-400">
                      {dateTime(
                        customer.marketingConsentAt,
                      )}
                    </p>
                  ) : null}
                </div>

                <div className="border-t border-black/10 pt-4">
                  <p className="text-xs text-neutral-400">
                    Terms accepted
                  </p>

                  <p className="mt-1 font-medium">
                    {customer.termsAcceptedAt
                      ? "Accepted"
                      : "Not accepted"}
                  </p>

                  {customer.termsAcceptedAt ? (
                    <p className="mt-1 text-xs text-neutral-400">
                      {dateTime(
                        customer.termsAcceptedAt,
                      )}
                    </p>
                  ) : null}
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-black/10 bg-white p-6">
              <h2 className="text-lg font-semibold">
                Customer summary
              </h2>

              <div className="mt-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neutral-500">
                    Orders
                  </span>

                  <span className="font-semibold">
                    {customer.orders.length}
                  </span>
                </div>

                <div className="flex items-center justify-between border-t border-black/10 pt-4">
                  <span className="text-sm text-neutral-500">
                    Joined
                  </span>

                  <span className="text-sm">
                    {dateOnly(customer.createdAt)}
                  </span>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}