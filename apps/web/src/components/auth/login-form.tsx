"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { requestCustomerOtp, updateCustomerProfile, getCustomerMe } from "@/lib/customer-auth-api";
import { useCustomerAuth } from "./customer-auth-provider";

type LoginStep = "IDENTIFIER" | "OTP" | "DETAILS";

const AUTH_NOTICE_STORAGE_KEY = "klarone-auth-notice";

function getSafeReturnPath(): string {
  if (typeof window === "undefined") {
    return "/";
  }

  const next = new URLSearchParams(window.location.search).get("next");
  if (next && next.startsWith("/") && !next.startsWith("//")) {
    return next;
  }

  return "/";
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { verifyOtpAndSignIn, refreshCustomer, isAuthenticated } = useCustomerAuth();

  const [step, setStep] = useState<LoginStep>("IDENTIFIER");
  const [identifier, setIdentifier] = useState("");
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [maskedPhone, setMaskedPhone] = useState<string | null>(null);

  // 6 separate OTP digit boxes
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Step 3 (New User Details): name, phone, etc.
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isVerifyingRef = useRef(false);

  useEffect(() => {
    // Only redirect automatically if the user is already authenticated on mount / external update
    // and not currently in the midst of OTP verification or filling details
    if (isAuthenticated && step !== "DETAILS" && !isVerifyingRef.current && !isSubmitting) {
      router.replace(getSafeReturnPath());
    }
  }, [isAuthenticated, router, step, isSubmitting]);

  useEffect(() => {
    const errorParam = searchParams.get("error");
    if (errorParam) {
      if (errorParam === "state_mismatch" || errorParam === "state_not_found") {
        setError("Sign-in session timed out or was interrupted. Please try clicking Continue with Google again.");
      } else {
        setError(`Authentication error: ${errorParam}`);
      }
    }

    const storedNotice = sessionStorage.getItem(AUTH_NOTICE_STORAGE_KEY);
    if (storedNotice) {
      setNotice(storedNotice);
      sessionStorage.removeItem(AUTH_NOTICE_STORAGE_KEY);
    }
  }, [searchParams]);

  async function handleRequestOtp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const raw = identifier.trim();
    if (!raw) {
      setError("Please enter your email or phone number.");
      return;
    }

    let normalized = raw;
    if (!normalized.startsWith("+") && /^\d{10}$/.test(normalized)) {
      normalized = `+91${normalized}`;
    }

    setIsSubmitting(true);
    try {
      const response = await requestCustomerOtp(normalized);
      setChallengeId(response.challengeId);
      setMaskedPhone(response.maskedPhone);
      setOtpDigits(["", "", "", "", "", ""]);
      setStep("OTP");
      setTimeout(() => inputRefs.current[0]?.focus(), 50);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to send verification code. Please check your input.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleDigitChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newDigits = [...otpDigits];
    newDigits[index] = value.slice(-1);
    setOtpDigits(newDigits);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    const combined = newDigits.join("");
    // Auto-verify only when all 6 digits are provided
    if (combined.length === 6 && !isVerifyingRef.current) {
      void verifyCode(combined);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;

    const newDigits = [...otpDigits];
    for (let i = 0; i < pasted.length; i++) {
      newDigits[i] = pasted[i];
    }
    setOtpDigits(newDigits);

    const targetIndex = Math.min(pasted.length, 5);
    inputRefs.current[targetIndex]?.focus();

    if (pasted.length === 6 && !isVerifyingRef.current) {
      void verifyCode(pasted);
    }
  };

  async function verifyCode(codeToVerify: string) {
    if (isVerifyingRef.current) return;
    if (!challengeId) {
      setError("Your session has expired. Please try again.");
      setStep("IDENTIFIER");
      return;
    }

    isVerifyingRef.current = true;
    setIsSubmitting(true);
    setError(null);
    try {
      let normalized = identifier.trim();
      const isPhoneInput = /^\+?\d{10,15}$/.test(normalized);
      if (!normalized.startsWith("+") && /^\d{10}$/.test(normalized)) {
        normalized = `+91${normalized}`;
      }

      const authResult = await verifyOtpAndSignIn({
        challengeId,
        phone: normalized,
        code: codeToVerify,
      });

      // Check if user is newly created or missing full name
      let personName = "";
      let personPhone = "";

      if (authResult.isNewUser) {
        setStep("DETAILS");
        setIsSubmitting(false);
        isVerifyingRef.current = false;
        return;
      }

      try {
        const me = await getCustomerMe(authResult.accessToken);
        personName = (me.customer.person.firstName || "").trim();
        personPhone = (me.customer.person.phone || "").trim();
      } catch {
        // fallback
      }

      // If user has default "Customer" name or missing name, ask for their name and phone
      const isNewOrIncomplete = !personName || personName.toLowerCase() === "customer";

      if (isNewOrIncomplete) {
        if (!isPhoneInput && normalized.includes("@")) {
          setName("");
          setPhone(personPhone);
        } else {
          setName("");
          setPhone(normalized);
        }
        setStep("DETAILS");
        setIsSubmitting(false);
        isVerifyingRef.current = false;
        return;
      }

      // Existing user: redirect immediately to respective return path
      const returnPath = getSafeReturnPath();
      router.push(returnPath);
      router.refresh();
    } catch (verifyError) {
      isVerifyingRef.current = false;
      setError(
        verifyError instanceof Error
          ? verifyError.message
          : "Invalid verification code. Please try again.",
      );
      setIsSubmitting(false);
    }
  }

  async function handleSaveDetails(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setIsSubmitting(true);

    try {
      const trimmedName = name.trim();
      const parts = trimmedName ? trimmedName.split(" ") : [];
      const fallbackName = identifier.includes("@") ? identifier.split("@")[0] : "Customer";
      const firstName = parts[0] || fallbackName;
      const lastName = parts.slice(1).join(" ") || undefined;
      const email = identifier.includes("@") ? identifier.trim() : undefined;
      const phoneNumber = phone.trim() || undefined;

      await updateCustomerProfile({
        firstName,
        lastName,
        email,
        phone: phoneNumber,
      });

      await refreshCustomer();
    } catch {
      // Continue even if update had a minor error
    } finally {
      setIsSubmitting(false);
      const returnPath = getSafeReturnPath();
      router.push(returnPath);
      router.refresh();
    }
  }

  async function handleGoogleAuth() {
    setError(null);
    setIsSubmitting(true);
    try {
      const { authClient } = await import("@/lib/auth-client");
      const returnPath = getSafeReturnPath();
      // Ensure redirect lands on frontend port (3001) instead of backend port (3000)
      const frontendOrigin =
        typeof window !== "undefined" ? window.location.origin : "http://localhost:3001";
      const fullCallbackUrl = `${frontendOrigin}${returnPath}`;

      await authClient.signIn.social({
        provider: "google",
        callbackURL: fullCallbackUrl,
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to connect with Google. Please enter your email below to log in.",
      );
      setIsSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-[480px] px-2.5 sm:px-4 py-6 sm:py-8">
      {/* Brand Header */}
      <div className="mb-8 sm:mb-14 text-center">
        <Link
          href="/"
          className="text-2xl sm:text-3xl font-serif tracking-tight text-slate-900 hover:opacity-85 transition"
        >
          klarone
        </Link>
      </div>

      <div className="w-full">
        {step === "IDENTIFIER" ? (
          <div>
            {/* Step 1: Identifier Entry */}
            <div className="mb-6">
              <h1 className="text-2xl font-bold tracking-tight text-slate-950">
                Sign in
              </h1>
              <p className="mt-1.5 text-sm text-stone-500">
                Sign in or create an account
              </p>
            </div>

            {notice ? (
              <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800">
                {notice}
              </div>
            ) : null}

            {/* Continue with Google */}
            <button
              type="button"
              onClick={handleGoogleAuth}
              className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-stone-200 bg-white px-5 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-stone-50 active:scale-[0.99]"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
              </svg>
              <span>Continue with Google</span>
            </button>

            <div className="relative my-6 flex items-center justify-center">
              <div className="w-full border-t border-stone-200" />
              <span className="absolute bg-white px-3 text-xs text-stone-400">
                or
              </span>
            </div>

            {/* Smart Phone / Email Input Form */}
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Email"
                  autoComplete="username tel email"
                  className="h-12 w-full rounded-xl border border-stone-300 bg-white px-4 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-stone-400 focus:border-slate-950 focus:ring-1 focus:ring-slate-950"
                />
                <button
                  type="submit"
                  disabled={isSubmitting || !identifier.trim()}
                  aria-label="Submit"
                  className="absolute right-1.5 flex h-9 w-9 items-center justify-center rounded-lg text-slate-700 transition hover:bg-stone-100 hover:text-slate-950 disabled:opacity-30 disabled:hover:bg-transparent"
                >
                  {isSubmitting ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-900 border-t-transparent" />
                  ) : (
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2.2"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M14 5l7 7m0 0l-7 7m7-7H3"
                      />
                    </svg>
                  )}
                </button>
              </div>

              {isSubmitting ? (
                <div className="flex items-center gap-2 text-xs text-stone-500 pt-1">
                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-stone-600 border-t-transparent" />
                  <span>Connecting to Klarone authentication...</span>
                </div>
              ) : null}

              {error ? (
                <p className="rounded-xl bg-red-50 px-3.5 py-2.5 text-xs text-red-600">
                  {error}
                </p>
              ) : null}
            </form>
          </div>
        ) : step === "OTP" ? (
          <div>
            {/* Step 2: Enter code (Matches reference screenshot) */}
            <div className="mb-6">
              <h1 className="text-2xl font-bold tracking-tight text-slate-950">
                Enter code
              </h1>
              <div className="mt-1.5 flex items-center gap-1.5 text-sm text-stone-500">
                <span>Sent to {identifier}</span>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => {
                    setStep("IDENTIFIER");
                    setError(null);
                  }}
                  className="text-blue-600 hover:underline font-medium disabled:opacity-50"
                >
                  Change
                </button>
              </div>
            </div>

            {/* 6 Individual Code Boxes */}
            <div className="flex items-center justify-between gap-1.5 sm:gap-2.5 my-6">
              {otpDigits.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => {
                    inputRefs.current[idx] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  disabled={isSubmitting}
                  onChange={(e) => handleDigitChange(idx, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(idx, e)}
                  onPaste={idx === 0 ? handlePaste : undefined}
                  className={`h-13 sm:h-16 w-10 sm:w-12 rounded-xl sm:rounded-2xl border text-center text-lg sm:text-xl font-semibold text-slate-950 outline-none transition duration-150 disabled:opacity-50 ${
                    digit
                      ? "border-slate-950 bg-stone-50"
                      : "border-stone-200 bg-white hover:border-stone-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  }`}
                />
              ))}
            </div>

            {isSubmitting ? (
              <div className="mb-4 flex items-center justify-center gap-2 rounded-xl bg-stone-100 py-3 text-xs font-medium text-slate-700">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-900 border-t-transparent" />
                <span>Verifying code and signing you in...</span>
              </div>
            ) : null}

            {error ? (
              <p className="rounded-xl bg-red-50 px-3.5 py-2.5 text-xs text-red-600 mb-4">
                {error}
              </p>
            ) : null}

            <p className="text-center text-xs text-stone-400 pt-2">
              Development code: <span className="font-semibold text-stone-700">123456</span>
            </p>
          </div>
        ) : (
          /* Step 3: New User Basic Details */
          <div>
            <div className="mb-6">
              <h1 className="text-2xl font-bold tracking-tight text-slate-950">
                Welcome to Klarone
              </h1>
              <p className="mt-1.5 text-sm text-stone-500">
                Please enter your name and phone number to complete your profile.
              </p>
            </div>

            <form onSubmit={handleSaveDetails} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500 mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Rahul Sen"
                  className="h-12 w-full rounded-xl border border-stone-300 bg-white px-4 text-sm text-slate-950 outline-none transition focus:border-slate-950 focus:ring-1 focus:ring-slate-950"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500 mb-1.5">
                  Phone Number
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +91 98765 43210"
                  className="h-12 w-full rounded-xl border border-stone-300 bg-white px-4 text-sm text-slate-950 outline-none transition focus:border-slate-950 focus:ring-1 focus:ring-slate-950"
                />
              </div>

              <div className="pt-2 space-y-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex h-12 w-full items-center justify-center rounded-xl bg-slate-950 text-sm font-semibold text-white transition hover:bg-stone-800 disabled:opacity-50"
                >
                  {isSubmitting ? "Saving..." : "Continue to Account"}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Footer Link matching reference */}
      <div className="mt-24 text-center">
        <Link
          href="/privacy"
          className="text-xs text-blue-600 hover:underline transition"
        >
          Privacy policy
        </Link>
      </div>
    </div>
  );
}