import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Sign in — Klarone",
  description: "Sign in or create an account to view your orders and manage your profile.",
};

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4">
      <LoginForm />
    </div>
  );
}