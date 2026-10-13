import type { Metadata } from "next";
import { StorefrontHeader } from "@/components/storefront/header";
import { StorefrontFooter } from "@/components/storefront/newsletter-and-footer";
import { OrdersList } from "@/components/orders/orders-list";

export const metadata: Metadata = {
  title: "My Account & Orders — Klarone",
  description: "View your profile, track shipments, and review order history.",
};

export default function AccountOrdersPage() {
  return (
    <div className="min-h-screen bg-white">
      <StorefrontHeader />

      <main className="mx-auto max-w-6xl px-4 pt-28 pb-16 sm:px-6 md:pt-36 lg:px-8">
        <OrdersList />
      </main>

      <StorefrontFooter />
    </div>
  );
}