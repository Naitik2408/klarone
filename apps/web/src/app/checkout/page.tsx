import type { Metadata } from "next";
import { Header } from "../../components/site/header";
import { CheckoutReview } from "../../components/checkout/checkout-review";

export const metadata: Metadata = {
  title: "Checkout",
  description:
    "Review your Klarone order before secure checkout.",
};

export default function CheckoutPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Header />

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <CheckoutReview />
      </main>
    </div>
  );
}