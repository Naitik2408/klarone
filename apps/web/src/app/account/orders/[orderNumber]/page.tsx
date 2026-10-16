import { StorefrontHeader } from "@/components/storefront/header";
import { StorefrontFooter } from "@/components/storefront/newsletter-and-footer";
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
    <div className="min-h-screen bg-white overflow-x-hidden">
      <StorefrontHeader />

      <main className="mx-auto max-w-6xl px-4 pt-24 pb-20 sm:px-6 sm:pt-28 md:pt-36 md:pb-24 lg:px-8 overflow-x-hidden">
        <OrderDetail
          orderNumber={orderNumber}
        />
      </main>

      <StorefrontFooter />
    </div>
  );
}