"use client";

import {
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import {
  requestCustomerOtp,
} from "@/lib/customer-auth-api";
import { useCustomerAuth } from "./customer-auth-provider";

type LoginStep = "PHONE" | "OTP";

const AUTH_NOTICE_STORAGE_KEY =
  "klarone-auth-notice";

function getSafeReturnPath(): string {
  if (
    typeof window === "undefined"
  ) {
    return "/cart";
  }

  const next =
    new URLSearchParams(
      window.location.search,
    ).get("next");

  if (
    next &&
    next.startsWith("/") &&
    !next.startsWith("//")
  ) {
    return next;
  }

  return "/cart";
}

export function LoginForm() {
  const router = useRouter();

  const {
    verifyOtpAndSignIn,
  } = useCustomerAuth();

  const [step, setStep] =
    useState<LoginStep>("PHONE");

  const [phone, setPhone] = useState("");

  const [challengeId, setChallengeId] =
    useState<string | null>(null);

  const [maskedPhone, setMaskedPhone] =
    useState<string | null>(null);

  const [otp, setOtp] = useState("");

  const [error, setError] =
    useState<string | null>(null);

  const [notice, setNotice] =
    useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  useEffect(() => {
    const storedNotice =
      sessionStorage.getItem(
        AUTH_NOTICE_STORAGE_KEY,
      );

    if (storedNotice) {
      setNotice(storedNotice);

      sessionStorage.removeItem(
        AUTH_NOTICE_STORAGE_KEY,
      );
    }
  }, []);

  async function handleRequestOtp(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError(null);

    const normalizedPhone = phone.trim();

    if (!normalizedPhone) {
      setError("Enter your phone number.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response =
        await requestCustomerOtp(
          normalizedPhone,
        );

      setChallengeId(
        response.challengeId,
      );

      setMaskedPhone(
        response.maskedPhone,
      );

      setStep("OTP");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to send OTP.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleVerifyOtp(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError(null);

    if (!challengeId) {
      setError(
        "Your OTP session has expired. Request a new OTP.",
      );
      setStep("PHONE");
      return;
    }

    if (!otp.trim()) {
      setError("Enter the OTP.");
      return;
    }

    setIsSubmitting(true);

    try {
      await verifyOtpAndSignIn({
        challengeId,
        phone: phone.trim(),
        code: otp.trim(),
      });

      const returnPath =
        getSafeReturnPath();

      router.push(returnPath);
      router.refresh();
    } catch (verifyError) {
      setError(
        verifyError instanceof Error
          ? verifyError.message
          : "Unable to verify OTP.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleBackToPhone() {
    setStep("PHONE");
    setChallengeId(null);
    setMaskedPhone(null);
    setOtp("");
    setError(null);
  }

  return (
    <div className="w-full max-w-md rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
      <div className="mb-6">
        <p className="text-sm font-medium text-neutral-500">
          Klarone account
        </p>

        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-neutral-950">
          {step === "PHONE"
            ? "Sign in with your phone"
            : "Enter your OTP"}
        </h1>

        <p className="mt-2 text-sm leading-6 text-neutral-600">
          {step === "PHONE"
            ? "Use your phone number to access your Klarone account and cart."
            : `We sent a verification code to ${
                maskedPhone ?? phone
              }.`}
        </p>
      </div>

      {notice ? (
        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-5 text-amber-800">
          {notice}
        </div>
      ) : null}

      {step === "PHONE" ? (
        <form
          onSubmit={handleRequestOtp}
          className="space-y-4"
        >
          <div>
            <label
              htmlFor="phone"
              className="mb-2 block text-sm font-medium text-neutral-800"
            >
              Phone number
            </label>

            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(event) =>
                setPhone(event.target.value)
              }
              placeholder="+919876543210"
              autoComplete="tel"
              className="w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-neutral-950"
            />
          </div>

          {error ? (
            <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-2xl bg-neutral-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting
              ? "Sending OTP..."
              : "Continue"}
          </button>
        </form>
      ) : (
        <form
          onSubmit={handleVerifyOtp}
          className="space-y-4"
        >
          <div>
            <label
              htmlFor="otp"
              className="mb-2 block text-sm font-medium text-neutral-800"
            >
              OTP
            </label>

            <input
              id="otp"
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={otp}
              onChange={(event) =>
                setOtp(
                  event.target.value
                    .replace(/\D/g, "")
                    .slice(0, 6),
                )
              }
              placeholder="1234"
              autoComplete="one-time-code"
              className="w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-lg tracking-[0.35em] outline-none transition focus:border-neutral-950"
            />
          </div>

          {error ? (
            <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={
              isSubmitting ||
              otp.length === 0
            }
            className="w-full rounded-2xl bg-neutral-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting
              ? "Verifying..."
              : "Verify and sign in"}
          </button>

          <button
            type="button"
            onClick={handleBackToPhone}
            disabled={isSubmitting}
            className="w-full rounded-2xl border border-neutral-300 px-4 py-3 text-sm font-medium text-neutral-800 transition hover:bg-neutral-50 disabled:opacity-50"
          >
            Change phone number
          </button>

          <p className="text-center text-xs text-neutral-500">
            Development OTP: 1234
          </p>
        </form>
      )}
    </div>
  );
}