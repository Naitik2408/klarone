"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
  clearStaffAccessToken,
  getStaffAccessToken,
} from "@/lib/staff-auth-api";

const navigation = [
  {
    label: "Overview",
    description: "Store performance",
    href: "/staff",
    short: "OVR",
  },
  {
    label: "Catalogue",
    description: "Products and media",
    href: "/staff/catalogue/products",
    short: "CAT",
  },
  {
    label: "Inventory",
    description: "Stock and availability",
    href: "/staff/inventory",
    short: "INV",
  },
  {
    label: "Orders",
    description: "Order management",
    href: "/staff/orders",
    short: "ORD",
  },
  {
    label: "Customers",
    description: "Customer records",
    href: "/staff/customers",
    short: "CUS",
  },
];

export function StaffShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  const isLoginPage = pathname === "/staff/login";

  useEffect(() => {
    if (isLoginPage) {
      setReady(true);
      return;
    }

    if (!getStaffAccessToken()) {
      router.replace("/staff/login");
      return;
    }

    setReady(true);
  }, [isLoginPage, router]);

  function logout() {
    clearStaffAccessToken();
    router.replace("/staff/login");
  }

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f6f8]">
        <div className="text-sm text-neutral-500">Loading workspace...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f6f8] text-[#17212b] md:flex">
      <aside className="flex w-full flex-col bg-[#17212b] text-white md:sticky md:top-0 md:h-screen md:w-[250px] md:shrink-0">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-5 md:block">
          <Link href="/staff" className="block">
            <div className="text-lg font-bold tracking-[0.16em]">KLARONE</div>
            <div className="mt-1 text-[10px] font-medium tracking-[0.22em] text-slate-400">
              ADMIN WORKSPACE
            </div>
          </Link>
          <div className="rounded-lg border border-white/10 px-2 py-1 text-[10px] font-semibold tracking-wide text-slate-300 md:hidden">
            STAFF
          </div>
        </div>

        <nav className="flex gap-1 overflow-x-auto p-3 md:flex-1 md:flex-col md:gap-2 md:overflow-y-auto md:p-4">
          <div className="hidden px-3 pb-2 pt-3 text-[10px] font-semibold tracking-[0.18em] text-slate-500 md:block">
            WORKSPACE
          </div>

          {navigation.map((item) => {
            const active =
              item.href === "/staff"
                ? pathname === "/staff"
                : pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-w-fit items-center gap-3 rounded-xl px-3 py-2.5 transition md:w-full ${
                  active
                    ? "bg-white text-[#17212b] shadow-sm"
                    : "text-slate-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                <span
                  className={`flex h-8 w-9 items-center justify-center rounded-lg text-[9px] font-bold tracking-wide ${
                    active
                      ? "bg-[#e9edf2] text-[#17212b]"
                      : "bg-white/10 text-slate-300"
                  }`}
                >
                  {item.short}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{item.label}</span>
                  <span className="hidden text-[11px] text-slate-500 md:block">
                    {item.description}
                  </span>
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="hidden border-t border-white/10 p-4 md:block">
          <div className="mb-3 rounded-xl bg-white/5 px-3 py-3">
            <div className="text-xs font-medium text-white">Staff account</div>
            <div className="mt-1 text-[11px] text-slate-400">Klarone administration</div>
          </div>
          <button
            type="button"
            onClick={logout}
            className="w-full rounded-xl px-3 py-2.5 text-left text-sm text-slate-300 transition hover:bg-white/10 hover:text-white"
          >
            Sign out
          </button>
        </div>

        <div className="border-t border-white/10 p-2 md:hidden">
          <button
            type="button"
            onClick={logout}
            className="w-full rounded-lg px-3 py-2 text-left text-xs text-slate-300 hover:bg-white/10"
          >
            Sign out
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex h-[62px] items-center justify-between border-b border-black/[0.06] bg-white/90 px-4 backdrop-blur md:px-8">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-400">
              Klarone / Staff
            </div>
            <div className="mt-0.5 text-sm font-semibold">
              {navigation.find((item) =>
                item.href === "/staff"
                  ? pathname === "/staff"
                  : pathname.startsWith(item.href),
              )?.label ?? "Workspace"}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-neutral-500 sm:block">Admin workspace</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#e9edf2] text-xs font-semibold text-[#17212b]">
              NK
            </div>
          </div>
        </header>

        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
