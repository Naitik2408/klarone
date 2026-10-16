import type { Metadata } from "next";
import { StorefrontHeader } from "@/components/storefront/header";
import { StorefrontFooter } from "@/components/storefront/newsletter-and-footer";
import { CheckoutReview } from "@/components/checkout/checkout-review";

export const metadata: Metadata = {
  title: "Secure Checkout — Klarone Buy",
  description:
    "Review your order, select delivery across Kolkata, and pay securely with Razorpay or Cash on Delivery with Klarone.",
};

export default function CheckoutPage() {
  return (
    <div className="min-h-screen bg-[#fafafa] overflow-x-hidden">
      <StorefrontHeader />

      <main className="mx-auto max-w-7xl px-4 pt-[76px] pb-20 sm:px-6 sm:pt-20 md:pt-24 md:pb-20 lg:px-8 overflow-x-hidden">
        <CheckoutReview />
      </main>

      <StorefrontFooter />
    </div>
  );
}