"use client";

import { FormEvent, useState, useId } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";
import {
  setStaffAccessToken,
  staffLogin,
} from "../../../lib/staff-auth-api";

export default function StaffLoginPage() {
  const router = useRouter();
  const emailInputId = useId();
  const passwordInputId = useId();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isEmailFocused, setIsEmailFocused] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);

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

  const isFormValid = email.trim().length > 0 && password.length > 0;
  const hasEmailValue = isEmailFocused || email.length > 0;
  const hasPasswordValue = isPasswordFocused || password.length > 0;

  return (
    <main className="relative flex min-h-dvh w-full overflow-x-hidden bg-white text-[#0F2A22]">
      {/* Two-Column Layout Grid */}
      <div className="grid min-h-dvh w-full grid-cols-1 lg:grid-cols-2">
        {/* Left Form Column */}
        <section className="relative flex flex-col justify-between px-6 py-8 sm:px-12 sm:py-10 md:px-16 lg:px-20 xl:px-24">
          {/* Header Row: Left-aligned Logo & Top-right Back Link */}
          <div className="flex w-full items-center justify-between pb-8">
            <Link
              href="/"
              className="group inline-flex items-center gap-1 font-serif text-2xl font-normal tracking-tight text-[#0F2A22] transition-opacity hover:opacity-85 sm:text-3xl"
            >
              klarone
            </Link>

            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#5C6B63] transition-colors hover:text-[#0F2A22] focus-visible:outline-2 focus-visible:outline-[#0F2A22] focus-visible:outline-offset-2 rounded-md px-2 py-1"
            >
              <span>Return to Storefront</span>
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6l6 6-6 6" />
              </svg>
            </Link>
          </div>

          {/* Centered Main Form Container (max-width 400px, all left-aligned) */}
          <div className="mx-auto my-auto w-full max-w-[400px] py-4 text-left">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="w-full text-left"
            >
              {/* Staff Portal Badge & Heading */}
              <div className="mb-8">

                <h1 className="text-3xl font-semibold tracking-tight text-[#0F2A22] sm:text-4xl">
                  Staff sign in
                </h1>
                <p className="mt-2 text-sm text-[#5C6B63]">
                  Enter your work credentials to access operations
                </p>
              </div>

              {/* Dismissible Error Alert */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-5 flex items-start justify-between gap-3 rounded-[12px] border border-[#B3261E]/20 bg-[#FDECEA] p-3.5 text-xs text-[#B3261E]"
                  >
                    <div className="flex items-start gap-2">
                      <svg className="mt-0.5 h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <span className="leading-relaxed">{error}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setError("")}
                      aria-label="Dismiss error"
                      className="text-[#B3261E] hover:opacity-75 transition"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Credentials Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Work Email Field with Floating Label */}
                <div className="relative w-full">
                  <div
                    className={`group relative flex min-h-[48px] w-full items-center rounded-[12px] border bg-white transition-all duration-150 ${
                      isEmailFocused
                        ? "border-[#0F2A22] ring-3 ring-[#D4F07A]/40"
                        : "border-[#DDE3D8] hover:border-[#C5D0B5]"
                    }`}
                  >
                    <label
                      htmlFor={emailInputId}
                      className={`pointer-events-none absolute left-4 transition-all duration-150 ease-out select-none ${
                        hasEmailValue
                          ? "-top-2.5 bg-white px-1.5 text-[11px] font-medium text-[#5C6B63]"
                          : "top-3 text-base text-[#5C6B63]"
                      }`}
                    >
                      Work email
                    </label>

                    <input
                      id={emailInputId}
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onFocus={() => setIsEmailFocused(true)}
                      onBlur={() => setIsEmailFocused(false)}
                      autoComplete="username email"
                      required
                      disabled={loading}
                      placeholder="name@klarone.in"
                      className="h-[48px] w-full rounded-[12px] bg-transparent px-4 text-base text-[#0F2A22] outline-none transition placeholder-transparent disabled:cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* Password Field with Floating Label & Toggle */}
                <div className="relative w-full">
                  <div
                    className={`group relative flex min-h-[48px] w-full items-center rounded-[12px] border bg-white transition-all duration-150 ${
                      isPasswordFocused
                        ? "border-[#0F2A22] ring-3 ring-[#D4F07A]/40"
                        : "border-[#DDE3D8] hover:border-[#C5D0B5]"
                    }`}
                  >
                    <label
                      htmlFor={passwordInputId}
                      className={`pointer-events-none absolute left-4 transition-all duration-150 ease-out select-none ${
                        hasPasswordValue
                          ? "-top-2.5 bg-white px-1.5 text-[11px] font-medium text-[#5C6B63]"
                          : "top-3 text-base text-[#5C6B63]"
                      }`}
                    >
                      Password
                    </label>

                    <input
                      id={passwordInputId}
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onFocus={() => setIsPasswordFocused(true)}
                      onBlur={() => setIsPasswordFocused(false)}
                      autoComplete="current-password"
                      required
                      disabled={loading}
                      placeholder="••••••••••••"
                      className="h-[48px] w-full rounded-[12px] bg-transparent px-4 pr-16 text-base text-[#0F2A22] outline-none transition placeholder-transparent disabled:cursor-not-allowed"
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                      className="absolute right-3 text-xs font-semibold text-[#0F2A22] hover:underline"
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>

                {/* Keep me signed in & 12h shift notice */}
                <div className="flex items-center justify-between pt-1 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-[#5C6B63] hover:text-[#0F2A22] transition">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="h-4 w-4 rounded border-[#DDE3D8] text-[#0F2A22] accent-[#0F2A22] focus:ring-0"
                    />
                    <span>Keep me signed in</span>
                  </label>
                  <span className="text-[#5C6B63]/80">12h Active Shift</span>
                </div>

                {/* Submit Action Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading || !isFormValid}
                    className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-[12px] bg-[#0F2A22] text-sm font-semibold text-white shadow-2xs transition-all duration-150 hover:bg-[#1a4237] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-[#0F2A22] focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:bg-[#F7F8F4] disabled:text-[#A5B3AA]"
                  >
                    {loading ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        <span>Verifying credentials...</span>
                      </>
                    ) : (
                      <span>Continue to Operations</span>
                    )}
                  </button>
                </div>
              </form>

              {/* Security & Access Restriction Notice */}
              <div className="mt-8 border-t border-[#DDE3D8] pt-4 text-left">
                <p className="text-xs leading-relaxed text-[#5C6B63]">
                  Restricted to authorized Klarone personnel and inventory managers.
                </p>
              </div>
            </motion.div>
          </div>

          {/* Bottom Footer Spacer */}
          <div className="h-6" />
        </section>

        {/* Right Column: Full-Height Inset Photographic Image Panel (Desktop only) */}
        <section className="relative hidden p-6 lg:block">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="relative h-full w-full overflow-hidden rounded-[24px] bg-[#F7F8F4] shadow-sm"
          >
            <Image
              src="/mobile.png"
              alt="Klarone Operational Workspace"
              fill
              priority
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-cover object-center transition-transform duration-1000 scale-[1.01]"
            />
            {/* Subtle atmospheric vignette over image */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent pointer-events-none" />
          </motion.div>
        </section>
      </div>
    </main>
  );
}
