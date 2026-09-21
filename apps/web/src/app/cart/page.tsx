import type { Metadata } from "next";
import { Header } from "../../components/site/header";
import { CartPageContent } from "../../components/cart/cart-page-content";

export const metadata: Metadata = {
  title: "Your Cart",
  description: "Review your Klarone laptop selections before checkout.",
};

export default function CartPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Header />

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <CartPageContent />
      </main>
    </div>
  );
}