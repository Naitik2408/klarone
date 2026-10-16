import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Sign in — Klarone Account",
  description: "Sign in to access your laptop orders, warranties, service requests, and profile with Klarone.",
};

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4">
      <Suspense fallback={<div className="w-full max-w-[480px] py-12 text-center text-sm text-slate-500">Loading sign in...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}