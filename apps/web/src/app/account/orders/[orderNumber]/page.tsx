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
    <div className="min-h-screen bg-white">
      <StorefrontHeader />

      <main className="mx-auto max-w-6xl px-4 pt-28 pb-16 sm:px-6 md:pt-36 lg:px-8">
        <OrderDetail
          orderNumber={orderNumber}
        />
      </main>

      <StorefrontFooter />
    </div>
  );
}