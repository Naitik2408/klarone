"use client";

import { useState } from "react";
import Link from "next/link";
import { useCustomerAuth } from "@/components/auth/customer-auth-provider";
import { OrdersList } from "@/components/orders/orders-list";

export function AccountHub() {
  const { customer, logout } = useCustomerAuth();
  const [activeTab, setActiveTab] = useState<"orders" | "profile">("orders");

  const person = customer?.person;
  const displayName = [person?.firstName, person?.lastName].filter(Boolean).join(" ") || "Valued Customer";
  const displayEmail = person?.email || "Not added";
  const displayPhone = person?.phone || "Not added";

  return (
    <div className="space-y-8">
      {/* 1. Account Header Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-b border-stone-200/80 pb-6">
        <div>
          <h1
            style={{ fontFamily: "var(--font-serif), 'Instrument Serif', Georgia, serif" }}
            className="text-4xl font-normal tracking-tight text-slate-950 sm:text-5xl"
          >
            My Account
          </h1>
          <p className="mt-2 text-sm text-stone-500">
            Welcome back, <span className="font-semibold text-slate-900">{displayName}</span>
          </p>
        </div>

        <button
          type="button"
          onClick={logout}
          className="self-start sm:self-auto rounded-full border border-stone-300 px-5 py-2 text-xs font-semibold text-slate-900 transition hover:bg-stone-100 hover:border-slate-900 active:scale-95"
        >
          Sign Out
        </button>
      </div>

      {/* 2. Navigation Tabs (Orders / Profile Details) */}
      <div className="flex items-center gap-3 border-b border-stone-200 pb-px">
        <button
          type="button"
          onClick={() => setActiveTab("orders")}
          className={`pb-3 text-sm font-semibold transition-all relative ${
            activeTab === "orders"
              ? "text-slate-950"
              : "text-stone-400 hover:text-slate-700"
          }`}
        >
          <span>Orders & History</span>
          {activeTab === "orders" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-950" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("profile")}
          className={`pb-3 text-sm font-semibold transition-all relative ${
            activeTab === "profile"
              ? "text-slate-950"
              : "text-stone-400 hover:text-slate-700"
          }`}
        >
          <span>Profile & Details</span>
          {activeTab === "profile" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-950" />
          )}
        </button>
      </div>

      {/* 3. Tab Content */}
      {activeTab === "orders" ? (
        <OrdersList />
      ) : (
        <div className="max-w-2xl space-y-6">
          <div className="rounded-3xl bg-[#f0f2ee] p-6 sm:p-8 space-y-6">
            <h2
              style={{ fontFamily: "var(--font-serif), 'Instrument Serif', Georgia, serif" }}
              className="text-2xl font-normal text-slate-950"
            >
              Contact Information
            </h2>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium text-stone-500 uppercase tracking-wide">Full Name</p>
                <p className="mt-1 text-base font-semibold text-slate-900">{displayName}</p>
              </div>

              <div>
                <p className="text-xs font-medium text-stone-500 uppercase tracking-wide">Customer Code</p>
                <p className="mt-1 text-base font-semibold text-slate-900">{customer?.customerCode || "KLAR-MEMBER"}</p>
              </div>

              <div>
                <p className="text-xs font-medium text-stone-500 uppercase tracking-wide">Email Address</p>
                <p className="mt-1 text-base font-semibold text-slate-900">{displayEmail}</p>
              </div>

              <div>
                <p className="text-xs font-medium text-stone-500 uppercase tracking-wide">Phone Number</p>
                <p className="mt-1 text-base font-semibold text-slate-900">{displayPhone}</p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl bg-[#f0f2ee] p-6 sm:p-8 space-y-4">
            <h2
              style={{ fontFamily: "var(--font-serif), 'Instrument Serif', Georgia, serif" }}
              className="text-2xl font-normal text-slate-950"
            >
              Account Privileges
            </h2>
            <p className="text-sm text-stone-600 leading-relaxed">
              As a verified Klarone customer, you enjoy expedited delivery across Kolkata & India, priority hardware service support, and direct consultation for laptop selections.
            </p>
            <div className="pt-2">
              <Link
                href="/laptops"
                className="inline-flex h-11 items-center justify-center rounded-full bg-slate-950 px-6 text-xs font-semibold text-white transition hover:bg-stone-800"
              >
                Explore Laptops Catalog
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
