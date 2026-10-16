import type { Metadata } from "next";
import { StorefrontHeader } from "@/components/storefront/header";
import { StorefrontFooter } from "@/components/storefront/newsletter-and-footer";
import { CheckoutReview } from "@/components/checkout/checkout-review";

export const metadata: Metadata = {
  title: "Secure Checkout — Klarone",
  description:
    "Review your Klarone order and pay securely online with Razorpay or Cash on Delivery.",
};

export default function CheckoutPage() {
  return (
    <div className="min-h-screen bg-[#fafafa]">
      <StorefrontHeader />

      <main className="mx-auto max-w-7xl px-4 pt-24 pb-16 sm:px-6 md:pt-32 lg:px-8">
        <CheckoutReview />
      </main>

      <StorefrontFooter />
    </div>
  );
}