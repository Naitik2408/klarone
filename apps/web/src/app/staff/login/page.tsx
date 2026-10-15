"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  setStaffAccessToken,
  staffLogin,
} from "../../../lib/staff-auth-api";

export default function StaffLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setError("");

    try {
      const result = await staffLogin(email.trim(), password);
      setStaffAccessToken(result.accessToken, rememberMe);
      router.replace("/staff/inventory");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to sign in. Please verify your staff credentials.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4 selection:bg-stone-200">
      <div className="w-full max-w-[480px] px-4 py-8">
        {/* Brand Header matching Customer Login */}
        <div className="mb-12 text-center">
          <Link
            href="/"
            className="text-xl font-bold tracking-tight text-slate-900 hover:opacity-85 transition"
          >
            Klarone
          </Link>
          <div className="mt-2 flex items-center justify-center gap-1.5">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-medium uppercase tracking-widest text-stone-500">
              Staff Portal
            </span>
          </div>
        </div>

        {/* Form Container */}
        <div className="w-full">
          <div className="mb-6">
            <h1 className="text-2xl font-bold tracking-tight text-slate-950">
              Staff sign in
            </h1>
            <p className="mt-1.5 text-sm text-stone-500">
              Enter your work credentials to access operations
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Work Email Field */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 mb-1.5">
                Work Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="username email"
                required
                placeholder="name@klarone.in"
                className="h-12 w-full rounded-xl border border-stone-300 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-stone-400 focus:border-slate-950 focus:ring-1 focus:ring-slate-950"
              />
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  className="text-xs font-medium text-blue-600 hover:underline"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              <div className="relative flex items-center">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  required
                  placeholder="••••••••••••"
                  className="h-12 w-full rounded-xl border border-stone-300 bg-white px-4 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-stone-400 focus:border-slate-950 focus:ring-1 focus:ring-slate-950"
                />
              </div>
            </div>

            {/* Keep me signed in */}
            <div className="flex items-center justify-between pt-1 text-xs">
              <label className="flex items-center gap-2 cursor-pointer select-none text-stone-600 hover:text-slate-900 transition">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-stone-300 text-slate-950 focus:ring-slate-950"
                />
                <span>Keep me signed in</span>
              </label>
              <span className="text-stone-400">12h Active Shift</span>
            </div>

            {/* Error Message */}
            {error ? (
              <p className="rounded-xl bg-red-50 px-3.5 py-2.5 text-xs text-red-600">
                {error}
              </p>
            ) : null}

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading || !email.trim() || !password}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 text-sm font-semibold text-white shadow-sm transition hover:bg-stone-800 active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <svg className="h-4 w-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Verifying...</span>
                  </>
                ) : (
                  <span>Continue to Operations</span>
                )}
              </button>
            </div>
          </form>

          {/* Quick Notice */}
          <div className="mt-8 border-t border-stone-100 pt-4 text-center">
            <p className="text-xs text-stone-400">
              Restricted to authorized Klarone personnel and inventory managers.
            </p>
          </div>
        </div>

        {/* Footer Link matching customer login */}
        <div className="mt-20 text-center">
          <Link
            href="/"
            className="text-xs text-blue-600 hover:underline transition"
          >
            ← Return to Klarone Storefront
          </Link>
        </div>
      </div>
    </div>
  );
}
