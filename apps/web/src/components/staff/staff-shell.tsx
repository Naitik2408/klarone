"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
  clearStaffAccessToken,
  getStaffAccessToken,
} from "@/lib/staff-auth-api";

type NavChild = { label: string; href: string };

type NavItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
  children?: NavChild[];
};

function HomeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M3 8.5 10 3l7 5.5V16a1 1 0 0 1-1 1h-3v-5H8v5H5a1 1 0 0 1-1-1V8.5Z" strokeLinejoin="round" />
    </svg>
  );
}

function OrdersIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M4 6.5A1.5 1.5 0 0 1 5.5 5h9A1.5 1.5 0 0 1 16 6.5v8A1.5 1.5 0 0 1 14.5 16h-9A1.5 1.5 0 0 1 4 14.5v-8Z" />
      <path d="M7 3.5h6" strokeLinecap="round" />
      <path d="M7.5 10h5M7.5 12.5h3" strokeLinecap="round" />
    </svg>
  );
}

function ProductsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M3 6.2 10 3l7 3.2-7 3.2L3 6.2Z" strokeLinejoin="round" />
      <path d="M3 10.2 10 13.4l7-3.2M3 13.8 10 17l7-3.2" strokeLinejoin="round" />
    </svg>
  );
}

function CustomersIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="10" cy="7" r="3" />
      <path d="M3.5 17c.7-3 3.3-5 6.5-5s5.8 2 6.5 5" strokeLinecap="round" />
    </svg>
  );
}

function AnalyticsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M4 16V9M10 16V4M16 16v-5" strokeLinecap="round" />
    </svg>
  );
}

function ChevronDownIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
    >
      <path d="m6 8 4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="7" cy="7" r="4.5" />
      <path d="m10.5 10.5 3 3" strokeLinecap="round" />
    </svg>
  );
}

function CollapseIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="1.5" y="3" width="13" height="10" rx="2" />
      <path d="M5.5 3v10" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M6 8a4 4 0 1 1 8 0c0 2.5.5 3.5 1.5 4.5h-11C5.5 11.5 6 10.5 6 8Z" strokeLinejoin="round" />
      <path d="M9 15.5a1 1 0 0 0 2 0" strokeLinecap="round" />
    </svg>
  );
}

function SignOutIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M12 7V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-2" strokeLinecap="round" />
      <path d="M9 10h8m0 0-2.5-2.5M17 10l-2.5 2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const navigation: NavItem[] = [
  { label: "Home", href: "/staff", icon: <HomeIcon /> },
  {
    label: "Orders",
    href: "/staff/orders",
    icon: <OrdersIcon />,
    children: [
      { label: "Drafts", href: "/staff/orders/drafts" },
    ],
  },
  {
    label: "Products",
    href: "/staff/catalogue/products",
    icon: <ProductsIcon />,
    children: [
      { label: "Collections", href: "/staff/catalogue/collections" },
      { label: "Inventory", href: "/staff/inventory" },
      { label: "Brands", href: "/staff/catalogue/brands" },
      { label: "Categories", href: "/staff/catalogue/categories" },
    ],
  },
  { label: "Customers", href: "/staff/customers", icon: <CustomersIcon /> },
  { label: "Analytics", href: "/staff/analytics", icon: <AnalyticsIcon /> },
];

function SidebarNavItem({
  item,
  pathname,
}: {
  item: NavItem;
  pathname: string;
}) {
  const childActive =
    item.children?.some(
      (c) => pathname === c.href || pathname.startsWith(`${c.href}/`),
    ) ?? false;

  // The parent item itself is only active if the URL matches the parent and does NOT match a known child
  const isParentActive =
    !childActive &&
    (item.href === "/staff"
      ? pathname === "/staff"
      : pathname === item.href || pathname.startsWith(`${item.href}/`));

  const [expanded, setExpanded] = useState(isParentActive || childActive);
  const hasChildren = !!item.children?.length;

  // Automatically keep section expanded if visiting a child route
  useEffect(() => {
    if (childActive || isParentActive) {
      setExpanded(true);
    }
  }, [childActive, isParentActive]);

  const rowClass = [
    "flex h-9 w-full items-center gap-3 rounded-lg px-2.5",
    "text-[13px] leading-none font-medium tracking-normal",
    "transition-colors",
    isParentActive
      ? "bg-white/[0.12] text-white font-semibold"
      : "text-[#b5b5b5] hover:bg-white/[0.06] hover:text-white",
  ].join(" ");

  const iconBox = "flex h-4 w-4 shrink-0 items-center justify-center";

  if (!hasChildren) {
    return (
      <Link href={item.href} className={rowClass}>
        <span className={iconBox}>{item.icon}</span>
        <span className="flex-1 truncate">{item.label}</span>
      </Link>
    );
  }

  return (
    <div>
      <div className="relative">
        <Link href={item.href} className={rowClass}>
          <span className={iconBox}>{item.icon}</span>
          <span className="flex-1 truncate">{item.label}</span>
          <span aria-hidden className="h-4 w-4 shrink-0" />
        </Link>

        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setExpanded((v) => !v);
          }}
          aria-label={expanded ? "Collapse section" : "Expand section"}
          className="absolute top-1/2 right-2.5 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-[#8f8f8f] hover:bg-white/[0.08] hover:text-white"
        >
          <ChevronDownIcon open={expanded} />
        </button>
      </div>

      {expanded && (
        <div className="mt-0.5 mb-1 space-y-0.5">
          {item.children!.map((child) => {
            const childIsActive =
              pathname === child.href || pathname.startsWith(`${child.href}/`);
            return (
              <Link
                key={child.href}
                href={child.href}
                className={[
                  "ml-[26px] flex h-8 items-center rounded-lg px-2.5",
                  "text-[13px] leading-none",
                  "transition-colors",
                  childIsActive
                    ? "bg-white/[0.08] font-medium text-white"
                    : "text-[#9a9a9a] hover:bg-white/[0.04] hover:text-white",
                ].join(" ")}
              >
                {child.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

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

  if (isLoginPage) return <>{children}</>;

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="text-sm text-neutral-400">Loading…</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#1c1c1c]">
      <aside className="hidden h-screen w-[240px] shrink-0 flex-col bg-[#1c1c1c] text-white md:flex">
        <div className="flex items-center gap-2.5 px-3 pt-3 pb-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#008060] text-[13px] font-bold text-white">
            K
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13.5px] leading-tight font-semibold text-white">
              Klarone
            </div>
          </div>
          <button
            type="button"
            aria-label="Collapse sidebar"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-[#8f8f8f] hover:bg-white/[0.07] hover:text-white"
          >
            <CollapseIcon />
          </button>
        </div>

        <div className="px-3 pt-1 pb-2">
          <button
            type="button"
            className="flex h-9 w-full items-center gap-2.5 rounded-lg bg-white/[0.07] px-3 text-left text-[13px] leading-none text-[#b5b5b5] transition-colors hover:bg-white/[0.12]"
          >
            <SearchIcon />
            <span className="flex-1">Search</span>
            <span className="rounded border border-white/[0.15] px-1.5 py-0.5 text-[10px] leading-none text-[#8f8f8f]">
              Ctrl K
            </span>
          </button>
        </div>

        <nav className="flex-1 space-y-[2px] overflow-y-auto px-2 pb-3">
          {navigation.map((item) => (
            <SidebarNavItem key={item.href} item={item} pathname={pathname} />
          ))}
        </nav>

        <div className="border-t border-white/[0.07] p-2">
          <div className="flex items-center gap-2 px-2 py-1.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#008060] text-[10px] font-bold text-white">
              NK
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[12px] leading-tight font-medium text-white">
                My Store
              </div>
            </div>
            <button
              type="button"
              aria-label="Notifications"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-[#8f8f8f] hover:bg-white/[0.07] hover:text-white"
            >
              <BellIcon />
            </button>
          </div>

          <button
            type="button"
            onClick={logout}
            className="mt-1 flex h-9 w-full items-center gap-3 rounded-lg px-2.5 text-[13px] leading-none text-[#b5b5b5] transition-colors hover:bg-white/[0.07] hover:text-white"
          >
            <span className="flex h-4 w-4 shrink-0 items-center justify-center">
              <SignOutIcon />
            </span>
            <span className="flex-1 text-left">Sign out</span>
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex-1 overflow-y-auto bg-[#1c1c1c] pt-1">
        <main className="min-h-[calc(100vh-4px)] min-w-0 overflow-hidden rounded-tl-2xl bg-white">
          {children}
        </main>
      </div>
    </div>
  );
}