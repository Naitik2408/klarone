"use client";

import { useEffect, useState, useRef, useId } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";
import { requestCustomerOtp, updateCustomerProfile, getCustomerMe } from "@/lib/customer-auth-api";
import { useCustomerAuth } from "./customer-auth-provider";

type FormState = "idle" | "typing" | "invalid" | "submitting" | "success" | "error";
type LoginFlowView = "FORM" | "OTP" | "DETAILS";

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

function isValidEmail(val: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { verifyOtpAndSignIn, refreshCustomer, isAuthenticated } = useCustomerAuth();

  const emailInputId = useId();
  const errorAnnouncementId = useId();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const successHeadingRef = useRef<HTMLHeadingElement>(null);

  // High-level navigation / completion flow
  const [flowView, setFlowView] = useState<LoginFlowView>("FORM");
  const [formState, setFormState] = useState<FormState>("idle");

  // Email form state
  const [email, setEmail] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  // OTP Verification & Challenge
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const isVerifyingRef = useRef(false);

  // Resend Countdown timer
  const [resendSeconds, setResendSeconds] = useState(30);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Post-OTP Customer Details
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  // Detect desktop for conditional autofocus (prevent keyboard pop on mobile)
  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsDesktop(window.innerWidth >= 1024);
    }
  }, []);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && flowView !== "DETAILS" && !isVerifyingRef.current && formState !== "submitting") {
      router.replace(getSafeReturnPath());
    }
  }, [isAuthenticated, router, flowView, formState]);

  // Read URL search params for errors & notices
  useEffect(() => {
    const errorParam = searchParams.get("error");
    if (errorParam) {
      if (errorParam === "state_mismatch" || errorParam === "state_not_found") {
        setServerError("Sign-in session timed out or was interrupted. Please try again.");
      } else {
        setServerError(`Authentication error: ${errorParam}`);
      }
      setFormState("error");
    }

    const storedNotice = sessionStorage.getItem(AUTH_NOTICE_STORAGE_KEY);
    if (storedNotice) {
      setServerError(storedNotice);
      setFormState("error");
      sessionStorage.removeItem(AUTH_NOTICE_STORAGE_KEY);
    }
  }, [searchParams]);

  // Handle Resend countdown
  useEffect(() => {
    if (formState === "success" || flowView === "OTP") {
      setResendSeconds(30);
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setResendSeconds((prev) => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [formState, flowView]);

  // Accessibility: Focus success heading when entering success confirmation
  useEffect(() => {
    if (formState === "success") {
      successHeadingRef.current?.focus();
    }
  }, [formState]);

  // Keyboard navigation: Escape clears active error
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setServerError(null);
        setValidationError(null);
        if (formState === "invalid" || formState === "error") {
          setFormState(email.trim() ? "typing" : "idle");
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [formState, email]);

  // Email Validation on Blur
  function handleEmailBlur() {
    setIsFocused(false);
    const trimmed = email.trim();
    if (!trimmed) {
      setValidationError(null);
      setFormState("idle");
      return;
    }
    if (!isValidEmail(trimmed)) {
      setValidationError("Enter a valid email address");
      setFormState("invalid");
    } else {
      setValidationError(null);
      setFormState("typing");
    }
  }

  function handleEmailChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setEmail(val);
    setServerError(null);
    if (validationError) {
      setValidationError(null);
    }
    setFormState(val.trim() ? "typing" : "idle");
  }

  // Submit Email to request OTP
  async function handleEmailSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setServerError(null);

    const trimmed = email.trim();
    if (!trimmed || !isValidEmail(trimmed)) {
      setValidationError("Enter a valid email address");
      setFormState("invalid");
      return;
    }

    setFormState("submitting");
    try {
      const response = await requestCustomerOtp(trimmed);
      setChallengeId(response.challengeId);
      setOtpDigits(["", "", "", "", "", ""]);
      setFormState("success");
      setFlowView("FORM"); // Shows crossfaded confirmation state first
    } catch (err) {
      setServerError(
        err instanceof Error
          ? err.message
          : "Unable to send verification code. Please check your email and try again."
      );
      setFormState("error");
    }
  }

  // Resend OTP
  async function handleResendCode() {
    if (resendSeconds > 0 || isResending) return;
    setServerError(null);
    setIsResending(true);
    try {
      const response = await requestCustomerOtp(email.trim());
      setChallengeId(response.challengeId);
      setOtpDigits(["", "", "", "", "", ""]);
      setResendSeconds(30);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Failed to resend code.");
    } finally {
      setIsResending(false);
    }
  }

  // Proceed from confirmation to OTP digits entry
  function handleProceedToOtpEntry() {
    setFlowView("OTP");
    setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 100);
  }

  // Continue with Google
  async function handleGoogleAuth() {
    setServerError(null);
    setValidationError(null);
    setIsGoogleSubmitting(true);
    try {
      const { authClient } = await import("@/lib/auth-client");
      const returnPath = getSafeReturnPath();
      const frontendOrigin =
        typeof window !== "undefined" ? window.location.origin : "http://localhost:3001";
      const fullCallbackUrl = `${frontendOrigin}${returnPath}`;

      await authClient.signIn.social({
        provider: "google",
        callbackURL: fullCallbackUrl,
      });
    } catch (err) {
      setIsGoogleSubmitting(false);
      setServerError(
        err instanceof Error
          ? err.message
          : "Unable to connect with Google. Please enter your email below to log in."
      );
      setFormState("error");
    }
  }

  // OTP Digits Handlers
  const handleDigitChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newDigits = [...otpDigits];
    newDigits[index] = value.slice(-1);
    setOtpDigits(newDigits);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    const combined = newDigits.join("");
    if (combined.length === 6 && !isVerifyingRef.current) {
      void verifyCode(combined);
    }
  };

  const handleDigitKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleDigitPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
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
      setServerError("Your verification session has expired. Please request a new code.");
      setFlowView("FORM");
      setFormState("error");
      return;
    }

    isVerifyingRef.current = true;
    setFormState("submitting");
    setServerError(null);

    try {
      const authResult = await verifyOtpAndSignIn({
        challengeId,
        phone: email.trim(),
        code: codeToVerify,
      });

      if (authResult.isNewUser) {
        setFlowView("DETAILS");
        setFormState("idle");
        isVerifyingRef.current = false;
        return;
      }

      let personName = "";
      let personPhone = "";
      try {
        const me = await getCustomerMe(authResult.accessToken);
        personName = (me.customer.person.firstName || "").trim();
        personPhone = (me.customer.person.phone || "").trim();
      } catch {
        // Continue
      }

      const isNewOrIncomplete = !personName || personName.toLowerCase() === "customer";
      if (isNewOrIncomplete) {
        setName("");
        setPhone(personPhone);
        setFlowView("DETAILS");
        setFormState("idle");
        isVerifyingRef.current = false;
        return;
      }

      const returnPath = getSafeReturnPath();
      router.push(returnPath);
      router.refresh();
    } catch (verifyError) {
      isVerifyingRef.current = false;
      setServerError(
        verifyError instanceof Error
          ? verifyError.message
          : "Invalid verification code. Please try again."
      );
      setFormState("error");
    }
  }

  // Save new user profile details
  async function handleSaveDetails(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setFormState("submitting");

    try {
      const trimmedName = name.trim();
      const parts = trimmedName ? trimmedName.split(" ") : [];
      const fallbackName = email.includes("@") ? email.split("@")[0] : "Customer";
      const firstName = parts[0] || fallbackName;
      const lastName = parts.slice(1).join(" ") || undefined;
      const phoneNumber = phone.trim() || undefined;

      await updateCustomerProfile({
        firstName,
        lastName,
        email: email.trim(),
        phone: phoneNumber,
      });

      await refreshCustomer();
    } catch {
      // Continue even if update had minor failure
    } finally {
      const returnPath = getSafeReturnPath();
      router.push(returnPath);
      router.refresh();
    }
  }

  const isEmailValid = isValidEmail(email);
  const isInputDisabled = formState === "submitting" || isGoogleSubmitting;
  const hasValueOrFocus = isFocused || email.length > 0;

  return (
    <main className="relative flex min-h-dvh w-full overflow-x-hidden bg-white text-[#0F2A22]">
      {/* Invisible screen reader announcer for errors and status changes */}
      <div
        id={errorAnnouncementId}
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {validationError || serverError || ""}
      </div>

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
              <span>Back to Klarone</span>
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6l6 6-6 6" />
              </svg>
            </Link>
          </div>

          {/* Centered Main Form Container (max-width 400px, all left-aligned) */}
          <div className="mx-auto my-auto w-full max-w-[400px] py-4">
            <AnimatePresence mode="wait">
              {/* STATE 1: Default Sign-In Form */}
              {flowView === "FORM" && formState !== "success" && (
                <motion.div
                  key="form-view"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="w-full text-left"
                >
                  {/* Staggered Heading */}
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.06 }}
                    className="mb-8"
                  >
                    <h1
                      ref={headingRef}
                      className="text-3xl font-semibold tracking-tight text-[#0F2A22] sm:text-4xl"
                    >
                      Sign in
                    </h1>
                    <p className="mt-2 text-sm text-[#5C6B63]">
                      Sign in or create an account
                    </p>
                  </motion.div>

                  {/* Dismissible Server or Google Error Alert */}
                  {serverError && (
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
                        <span className="leading-relaxed">{serverError}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setServerError(null)}
                        aria-label="Dismiss error"
                        className="text-[#B3261E] hover:opacity-75 transition"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </motion.div>
                  )}

                  {/* "Continue with Google" Button */}
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.12 }}
                  >
                    <button
                      type="button"
                      onClick={handleGoogleAuth}
                      disabled={isInputDisabled}
                      className="group flex min-h-[48px] w-full items-center justify-center gap-3 rounded-[12px] border border-[#DDE3D8] bg-white px-5 text-sm font-medium text-[#0F2A22] shadow-2xs transition-all duration-150 hover:border-[#C5D0B5] hover:bg-[#F7F8F4] hover:shadow-xs active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-[#0F2A22] focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isGoogleSubmitting ? (
                        <>
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#0F2A22] border-t-transparent" />
                          <span>Opening Google...</span>
                        </>
                      ) : (
                        <>
                          <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
                          </svg>
                          <span>Continue with Google</span>
                        </>
                      )}
                    </button>
                  </motion.div>

                  {/* "or" divider with #DDE3D8 lines */}
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.18 }}
                    className="relative my-6 flex items-center justify-center"
                  >
                    <div className="w-full border-t border-[#DDE3D8]" />
                    <span className="absolute bg-white px-3 text-xs text-[#5C6B63]">
                      or
                    </span>
                  </motion.div>

                  {/* Email Input Form with Floating Label and Validated Arrow Button */}
                  <motion.form
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.24 }}
                    onSubmit={handleEmailSubmit}
                    noValidate
                    className="space-y-2 text-left"
                  >
                    <div className="relative w-full">
                      <div
                        className={`group relative flex min-h-[48px] w-full items-center rounded-[12px] border bg-white transition-all duration-150 ${
                          validationError
                            ? "border-[#B3261E] focus-within:border-[#B3261E] focus-within:ring-3 focus-within:ring-[#B3261E]/20"
                            : isFocused
                            ? "border-[#0F2A22] ring-3 ring-[#D4F07A]/40"
                            : "border-[#DDE3D8] hover:border-[#C5D0B5]"
                        }`}
                      >
                        {/* Real <label> that floats up cleanly */}
                        <label
                          htmlFor={emailInputId}
                          className={`pointer-events-none absolute left-4 transition-all duration-150 ease-out select-none ${
                            hasValueOrFocus
                              ? "-top-2.5 bg-white px-1.5 text-[11px] font-medium text-[#5C6B63]"
                              : "top-3 text-base text-[#5C6B63]"
                          } ${validationError ? "text-[#B3261E]" : ""}`}
                        >
                          Email
                        </label>

                        <input
                          id={emailInputId}
                          type="email"
                          autoComplete="email"
                          inputMode="email"
                          autoFocus={isDesktop}
                          readOnly={formState === "submitting"}
                          value={email}
                          onChange={handleEmailChange}
                          onFocus={() => setIsFocused(true)}
                          onBlur={handleEmailBlur}
                          aria-invalid={Boolean(validationError)}
                          aria-describedby={validationError ? errorAnnouncementId : undefined}
                          className="h-[48px] w-full rounded-[12px] bg-transparent px-4 pr-13 text-base text-[#0F2A22] outline-none transition placeholder-transparent disabled:cursor-not-allowed"
                          placeholder="Email"
                        />

                        {/* Arrow Submit Button: Disabled & grey until valid, then deep green with white arrow */}
                        <button
                          type="submit"
                          disabled={!isEmailValid || formState === "submitting"}
                          aria-label="Submit email"
                          className={`group/btn absolute right-1.5 flex h-9 w-9 items-center justify-center rounded-[10px] transition-all duration-200 ${
                            isEmailValid
                              ? "bg-[#0F2A22] text-white shadow-2xs hover:bg-[#1a4237] active:scale-95"
                              : "bg-[#F7F8F4] text-[#A5B3AA] cursor-not-allowed"
                          } focus-visible:outline-2 focus-visible:outline-[#0F2A22] focus-visible:outline-offset-2`}
                        >
                          {formState === "submitting" ? (
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          ) : (
                            <svg
                              className={`h-4 w-4 transition-transform duration-150 ${
                                isEmailValid ? "group-hover/btn:translate-x-0.75" : ""
                              }`}
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

                      {/* Inline Validation Error: 13px text, icon, subtle shake */}
                      {validationError && (
                        <motion.div
                          initial={{ opacity: 0, x: -4 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.15 }}
                          className="mt-1.5 flex items-center gap-1.5 px-1 text-[13px] text-[#B3261E]"
                        >
                          <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>{validationError}</span>
                        </motion.div>
                      )}
                    </div>
                  </motion.form>

                  {/* Consent & Privacy Policy Link */}
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.3 }}
                    className="mt-8 text-left text-xs leading-relaxed text-[#5C6B63]"
                  >
                    <span>By continuing, you agree to our </span>
                    <Link
                      href="/privacy"
                      className="text-[#5C6B63] underline underline-offset-3 transition-colors hover:text-[#0F2A22]"
                    >
                      Privacy policy
                    </Link>
                    .
                  </motion.div>
                </motion.div>
              )}

              {/* STATE 2: Crossfade Success Confirmation */}
              {flowView === "FORM" && formState === "success" && (
                <motion.div
                  key="success-view"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className="w-full text-left"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-[12px] bg-[#D4F07A]/40 text-[#2F6B46] mb-5">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>

                  <h1
                    ref={successHeadingRef}
                    tabIndex={-1}
                    className="text-2xl font-semibold tracking-tight text-[#0F2A22] sm:text-3xl outline-none"
                  >
                    Check your inbox
                  </h1>

                  <p className="mt-2 text-sm leading-relaxed text-[#5C6B63]">
                    We sent a 6-digit verification code to{" "}
                    <strong className="font-semibold text-[#0F2A22]">{email}</strong>.
                  </p>

                  <div className="mt-6 flex flex-col gap-3">
                    <button
                      type="button"
                      onClick={handleProceedToOtpEntry}
                      className="flex min-h-[48px] w-full items-center justify-center rounded-[12px] bg-[#0F2A22] text-sm font-semibold text-white shadow-2xs transition-all duration-150 hover:bg-[#1a4237] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-[#0F2A22] focus-visible:outline-offset-2"
                    >
                      Enter 6-digit code
                    </button>

                    <div className="flex items-center justify-between text-xs text-[#5C6B63] pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setFormState("idle");
                          setServerError(null);
                        }}
                        className="text-[#5C6B63] underline underline-offset-3 hover:text-[#0F2A22] transition"
                      >
                        Use a different email
                      </button>

                      <button
                        type="button"
                        onClick={handleResendCode}
                        disabled={resendSeconds > 0 || isResending}
                        className="font-medium text-[#0F2A22] disabled:text-[#A5B3AA] disabled:cursor-not-allowed hover:underline transition"
                      >
                        {resendSeconds > 0 ? `Resend code in ${resendSeconds}s` : "Resend code"}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* STATE 3: OTP 6-Digit Code Verification Screen */}
              {flowView === "OTP" && (
                <motion.div
                  key="otp-view"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25 }}
                  className="w-full text-left"
                >
                  <div className="mb-6">
                    <h1 className="text-2xl font-semibold tracking-tight text-[#0F2A22] sm:text-3xl">
                      Enter code
                    </h1>
                    <div className="mt-1.5 flex items-center gap-1.5 text-sm text-[#5C6B63]">
                      <span>Sent to {email}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setFlowView("FORM");
                          setFormState("idle");
                          setServerError(null);
                        }}
                        className="font-medium text-[#0F2A22] underline underline-offset-2 hover:opacity-80 transition"
                      >
                        Change
                      </button>
                    </div>
                  </div>

                  {serverError && (
                    <div className="mb-4 rounded-[12px] border border-[#B3261E]/20 bg-[#FDECEA] p-3 text-xs text-[#B3261E]">
                      {serverError}
                    </div>
                  )}

                  {/* 6 Individual Code Boxes */}
                  <div className="my-6 flex items-center justify-between gap-2">
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
                        disabled={formState === "submitting"}
                        onChange={(e) => handleDigitChange(idx, e.target.value)}
                        onKeyDown={(e) => handleDigitKeyDown(idx, e)}
                        onPaste={idx === 0 ? handleDigitPaste : undefined}
                        className={`h-14 w-11 sm:h-16 sm:w-12 rounded-[12px] border text-center text-xl font-semibold text-[#0F2A22] outline-none transition-all duration-150 disabled:opacity-50 ${
                          digit
                            ? "border-[#0F2A22] bg-[#F7F8F4]"
                            : "border-[#DDE3D8] bg-white hover:border-[#C5D0B5] focus:border-[#0F2A22] focus:ring-3 focus:ring-[#D4F07A]/40"
                        }`}
                      />
                    ))}
                  </div>

                  {formState === "submitting" && (
                    <div className="mb-4 flex items-center justify-center gap-2 rounded-[12px] bg-[#F7F8F4] py-3 text-xs font-medium text-[#0F2A22]">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#0F2A22] border-t-transparent" />
                      <span>Verifying code...</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 text-xs text-[#5C6B63]">
                    <button
                      type="button"
                      onClick={handleResendCode}
                      disabled={resendSeconds > 0 || formState === "submitting"}
                      className="font-medium text-[#0F2A22] disabled:text-[#A5B3AA] disabled:cursor-not-allowed hover:underline transition"
                    >
                      {resendSeconds > 0 ? `Resend code in ${resendSeconds}s` : "Resend code"}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setFlowView("FORM");
                        setFormState("idle");
                      }}
                      className="underline underline-offset-2 hover:text-[#0F2A22]"
                    >
                      Back
                    </button>
                  </div>
                </motion.div>
              )}

              {/* STATE 4: New User Basic Details */}
              {flowView === "DETAILS" && (
                <motion.div
                  key="details-view"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25 }}
                  className="w-full text-left"
                >
                  <div className="mb-6">
                    <h1 className="text-2xl font-semibold tracking-tight text-[#0F2A22] sm:text-3xl">
                      Welcome to Klarone
                    </h1>
                    <p className="mt-1.5 text-sm text-[#5C6B63]">
                      Please complete your profile to continue.
                    </p>
                  </div>

                  <form onSubmit={handleSaveDetails} className="space-y-4">
                    <div>
                      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[#5C6B63]">
                        Full Name
                      </label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Rahul Sen"
                        className="h-[48px] w-full rounded-[12px] border border-[#DDE3D8] bg-white px-4 text-base text-[#0F2A22] outline-none transition focus:border-[#0F2A22] focus:ring-3 focus:ring-[#D4F07A]/40"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[#5C6B63]">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="e.g. +91 98765 43210"
                        className="h-[48px] w-full rounded-[12px] border border-[#DDE3D8] bg-white px-4 text-base text-[#0F2A22] outline-none transition focus:border-[#0F2A22] focus:ring-3 focus:ring-[#D4F07A]/40"
                      />
                    </div>

                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={formState === "submitting"}
                        className="flex min-h-[48px] w-full items-center justify-center rounded-[12px] bg-[#0F2A22] text-sm font-semibold text-white shadow-2xs transition-all hover:bg-[#1a4237] disabled:opacity-50"
                      >
                        {formState === "submitting" ? "Saving..." : "Continue to Account"}
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer Bottom Spacer to keep layout balanced */}
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
              alt="Klarone Workspace & Laptop Experience"
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
