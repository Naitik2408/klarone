"use client";

import { useState } from "react";
import Link from "next/link";
import { CartLink } from "../cart/cart-link";
import { useCustomerAuth } from "../auth/customer-auth-provider";

export function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const {
    customer,
    isLoading: isAuthLoading,
    isAuthenticated,
    logout,
  } = useCustomerAuth();

  function closeMobileMenu() {
    setIsMobileMenuOpen(false);
  }

  async function handleLogout() {
    closeMobileMenu();
    await logout();
  }

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex items-center gap-2.5"
          aria-label="Klarone home"
          onClick={closeMobileMenu}
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-sm font-bold text-white">
            K
          </span>

          <span className="text-xl font-semibold tracking-tight text-slate-950">
            Klarone
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          <Link
            href="/laptops"
            className="text-sm font-medium text-slate-700 transition-colors hover:text-slate-950"
          >
            Laptops
          </Link>

          <Link
            href="/#klarone-select"
            className="text-sm font-semibold text-blue-600 transition-colors hover:text-blue-700"
          >
            Klarone Select
          </Link>

          <Link
            href="/#support"
            className="text-sm font-medium text-slate-700 transition-colors hover:text-slate-950"
          >
            Support
          </Link>
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/laptops"
            className="hidden rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-600 sm:inline-flex"
          >
            Browse laptops
          </Link>

          {!isAuthLoading &&
            (isAuthenticated && customer ? (
              <>
                <Link
                  href="/account/orders"
                  className="hidden rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-800 transition-colors hover:border-slate-400 hover:bg-slate-50 sm:inline-flex"
                >
                  Account
                </Link>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="hidden rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-800 transition-colors hover:border-slate-400 hover:bg-slate-50 sm:inline-flex"
                >
                  Log out
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="hidden rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-800 transition-colors hover:border-slate-400 hover:bg-slate-50 sm:inline-flex"
              >
                Sign in
              </Link>
            ))}

          <CartLink />

          <button
            type="button"
            aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={isMobileMenuOpen}
            onClick={() => setIsMobileMenuOpen((open) => !open)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-700 transition-colors hover:bg-slate-50 md:hidden"
          >
            <span className="sr-only">
              {isMobileMenuOpen ? "Close menu" : "Open menu"}
            </span>

            <span className="flex w-4 flex-col gap-1">
              <span
                className={`h-0.5 w-full bg-current transition-transform ${
                  isMobileMenuOpen
                    ? "translate-y-1.5 rotate-45"
                    : ""
                }`}
              />
              <span
                className={`h-0.5 w-full bg-current transition-opacity ${
                  isMobileMenuOpen ? "opacity-0" : "opacity-100"
                }`}
              />
              <span
                className={`h-0.5 w-full bg-current transition-transform ${
                  isMobileMenuOpen
                    ? "-translate-y-1.5 -rotate-45"
                    : ""
                }`}
              />
            </span>
          </button>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div className="border-t border-slate-200 bg-white md:hidden">
          <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
            <nav className="space-y-1">
              <Link
                href="/laptops"
                onClick={closeMobileMenu}
                className="flex items-center justify-between rounded-2xl px-4 py-3.5 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-50"
              >
                <span>Laptops</span>
                <span className="text-slate-400">→</span>
              </Link>

              <Link
                href="/#klarone-select"
                onClick={closeMobileMenu}
                className="flex items-center justify-between rounded-2xl bg-blue-50 px-4 py-3.5 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-100"
              >
                <span>Klarone Select</span>
                <span>→</span>
              </Link>

              <Link
                href="/#support"
                onClick={closeMobileMenu}
                className="flex items-center justify-between rounded-2xl px-4 py-3.5 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-50"
              >
                <span>Support</span>
                <span className="text-slate-400">→</span>
              </Link>

              <Link
                href="/laptops"
                onClick={closeMobileMenu}
                className="mt-3 flex items-center justify-center rounded-full bg-slate-950 px-4 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-blue-600"
              >
                Browse laptops
              </Link>

              {!isAuthLoading &&
                (isAuthenticated && customer ? (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <Link
                      href="/account/orders"
                      onClick={closeMobileMenu}
                      className="flex items-center justify-center rounded-full border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-50"
                    >
                      Account
                    </Link>

                    <button
                      type="button"
                      onClick={handleLogout}
                      className="rounded-full border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-50"
                    >
                      Log out
                    </button>
                  </div>
                ) : (
                  <Link
                    href="/login"
                    onClick={closeMobileMenu}
                    className="mt-3 flex items-center justify-center rounded-full border border-slate-300 px-4 py-3.5 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-50"
                  >
                    Sign in
                  </Link>
                ))}
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}
