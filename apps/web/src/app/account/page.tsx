import type { Metadata } from "next";
import { StorefrontHeader } from "@/components/storefront/header";
import { StorefrontFooter } from "@/components/storefront/newsletter-and-footer";
import { AccountHub } from "@/components/account/account-hub";

export const metadata: Metadata = {
  title: "My Account — Klarone",
  description: "View your profile, track shipments, and review order history.",
};

export default function AccountPage() {
  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      <StorefrontHeader />

      <main className="mx-auto max-w-6xl px-4 pt-24 pb-20 sm:px-6 sm:pt-28 md:pt-36 md:pb-24 lg:px-8 overflow-x-hidden">
        <AccountHub />
      </main>

      <StorefrontFooter />
    </div>
  );
}
