import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Sign in — Klarone Account",
  description: "Sign in to access your laptop orders, warranties, service requests, and profile with Klarone.",
};

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh w-full items-center justify-center bg-white text-sm text-[#5C6B63]">
          Loading sign in...
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
