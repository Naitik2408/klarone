import { Header } from "@/components/site/header";
import { OrderDetail } from "@/components/orders/order-detail";

interface OrderDetailPageProps {
  params: Promise<{
    orderNumber: string;
  }>;
}

export default async function OrderDetailPage({
  params,
}: OrderDetailPageProps) {
  const { orderNumber } = await params;

  return (
    <>
      <Header />

      <main className="min-h-[calc(100vh-73px)] bg-neutral-50 px-4 py-10 sm:py-12">
        <OrderDetail
          orderNumber={orderNumber}
        />
      </main>
    </>
  );
}