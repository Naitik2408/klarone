import Link from "next/link";
import { CartLink } from "../cart/cart-link";

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex items-center gap-2"
          aria-label="Klarone home"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-sm font-bold text-white">
            K
          </span>

          <span className="text-xl font-semibold tracking-tight text-slate-950">
            Klarone
          </span>
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          <Link
            href="/laptops"
            className="text-sm font-medium text-slate-700 transition-colors hover:text-slate-950"
          >
            Laptops
          </Link>

          <Link
            href="/#klarone-select"
            className="text-sm font-medium text-slate-700 transition-colors hover:text-slate-950"
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

        <div className="flex items-center gap-3">
          <Link
            href="/laptops"
            className="hidden rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-800 transition-colors hover:border-slate-400 hover:bg-slate-50 sm:inline-flex"
          >
            Browse laptops
          </Link>

          <CartLink />
        </div>
      </div>
    </header>
  );
}