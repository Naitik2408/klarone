import type { Metadata } from "next";
import { StorefrontHeader } from "../../components/storefront/header";
import { StorefrontFooter } from "../../components/storefront/newsletter-and-footer";
import { CartPageContent } from "../../components/cart/cart-page-content";

export const metadata: Metadata = {
  title: "Your Cart — Klarone",
  description: "Review your Klarone laptop selections before checkout.",
};

export default function CartPage() {
  return (
    <div className="min-h-screen bg-white">
      <StorefrontHeader />

      <main className="mx-auto max-w-7xl px-4 pt-28 pb-16 sm:px-6 md:pt-36 lg:px-8">
        <CartPageContent />
      </main>

      <StorefrontFooter />
    </div>
  );
}