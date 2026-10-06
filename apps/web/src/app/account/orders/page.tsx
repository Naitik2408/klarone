import { Header } from "@/components/site/header";
import { OrdersList } from "@/components/orders/orders-list";

export default function OrdersPage() {
  return (
    <>
      <Header />

      <main className="min-h-[calc(100vh-73px)] bg-neutral-50 px-4 py-10 sm:py-12">
        <OrdersList />
      </main>
    </>
  );
}