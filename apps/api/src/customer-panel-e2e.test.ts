import path from "node:path";
import dotenv from "dotenv";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "./database/prisma.service";
import { CustomerAuthService } from "./modules/customer-auth/customer-auth.service";
import { DevCustomerAuthProvider } from "./modules/customer-auth/providers/dev-customer-auth-provider";
import { RecommendationsService } from "./modules/recommendations/recommendations.service";
import { RecommendationEngineService } from "./modules/recommendations/recommendation-engine.service";
import { GeminiRequirementExtractor } from "./modules/recommendations/gemini-requirement-extractor.service";
import { GeminiAdvisorExplainerService } from "./modules/recommendations/gemini-advisor-explainer.service";
import { CartService } from "./modules/cart/cart.service";
import { CheckoutService } from "./modules/checkout/checkout.service";
import { PaymentsService } from "./modules/payments/payments.service";
import { CodPaymentProvider } from "./modules/payments/providers/cod-payment-provider";
import { RazorpayPaymentProvider } from "./modules/payments/providers/razorpay-payment-provider";
import { OrdersService } from "./modules/orders/orders.service";

dotenv.config({
  path: path.resolve(process.cwd(), "../../.env"),
});

async function runCustomerPanelE2ETest() {
  console.log("=================================================");
  console.log("🚀 STARTING COMPLETE CUSTOMER PANEL INTEGRATION TEST");
  console.log("=================================================\n");

  const results: Record<string, { status: "PASS" | "FAIL"; details?: any; error?: string }> = {};

  const configService = new ConfigService();
  const prisma = new PrismaService(configService);
  await prisma.$connect();

  const jwtService = new JwtService({
    secret: configService.getOrThrow<string>("CUSTOMER_AUTH_JWT_SECRET"),
  });

  // 1. Customer Auth
  const devAuthProvider = new DevCustomerAuthProvider(prisma);
  const customerAuthService = new CustomerAuthService(
    prisma,
    jwtService,
    configService,
    devAuthProvider,
  );

  let customerUser: any;
  let testPhone = "+919999988888";

  console.log("1️⃣ Testing Customer Authentication & Session Issuance...");
  try {
    const otpRequest = await customerAuthService.requestOtp(testPhone);
    const authResult = await customerAuthService.verifyOtp({
      challengeId: otpRequest.challengeId,
      phone: testPhone,
      code: "1234",
    });

    customerUser = {
      userAccountId: authResult.customer.userAccountId,
      customerId: authResult.customer.customerId,
      personId: authResult.customer.personId,
      tokenType: "customer-access" as const,
    };

    results["Customer Auth (OTP & Token)"] = {
      status: "PASS",
      details: {
        customerId: customerUser.customerId,
        tokenType: authResult.tokenType,
        hasAccessToken: Boolean(authResult.accessToken),
      },
    };
    console.log("   ✅ Customer Auth: Authenticated Customer ID:", customerUser.customerId);
  } catch (err: any) {
    results["Customer Auth (OTP & Token)"] = { status: "FAIL", error: err.message };
    console.error("   ❌ Customer Auth Failed:", err.message);
  }

  // 2. AI Laptop Recommendations
  console.log("\n2️⃣ Testing AI Recommendations Advisor (Gemini/Groq Requirement Extraction + Ranking)...");
  let recommendedVariantId: string | null = null;
  try {
    const engineService = new RecommendationEngineService();
    const extractorService = new GeminiRequirementExtractor(configService);
    const explainerService = new GeminiAdvisorExplainerService(configService);

    const recService = new RecommendationsService(
      prisma,
      extractorService,
      engineService,
      explainerService,
    );

    const recResult = await recService.startRecommendation({
      message: "I need a high performance coding laptop with at least 16GB RAM for under 150000 INR",
    });

    const recommendations = (recResult as any).results || [];
    if (recommendations.length > 0) {
      recommendedVariantId = recommendations[0].variant?.id || recommendations[0].productVariantId;
    }

    results["AI Recommendation Engine"] = {
      status: recommendations.length > 0 ? "PASS" : "FAIL",
      details: {
        recommendedCount: recommendations.length,
        topPick: recommendations[0]?.product?.name || "None",
        topVariantId: recommendedVariantId,
        topScore: recommendations[0]?.overallScore,
        aiReply: (recResult as any).conversationalReply?.slice(0, 100),
      },
    };
    console.log(`   ✅ Recommendations: Found ${recommendations.length} recommendations. Top pick: ${recommendations[0]?.product?.name}`);
  } catch (err: any) {
    results["AI Recommendation Engine"] = { status: "FAIL", error: err.message };
    console.error("   ❌ Recommendation Engine Failed:", err.message);
  }

  // Fallback to active variant in database if recommendation had no results
  if (!recommendedVariantId) {
    const fallbackVariant = await prisma.productVariant.findFirst({
      where: {
        status: "ACTIVE",
        product: { status: "PUBLISHED" },
      },
      include: { inventories: true },
    });
    if (fallbackVariant) {
      recommendedVariantId = fallbackVariant.id.toString();
    }
  }

  // 3. Cart Management (Add, Update, Get)
  console.log("\n3️⃣ Testing Customer Cart Management...");
  const cartService = new CartService(prisma);
  let addedCartItemId: string | null = null;

  try {
    // Clear any leftover cart first
    await cartService.clearCart(customerUser);

    // Add recommended product to cart
    if (!recommendedVariantId) throw new Error("No variant available to add to cart");

    const cartAfterAdd = await cartService.addItem(customerUser, {
      variantId: recommendedVariantId,
      quantity: 1,
    });

    const items = (cartAfterAdd as any).items || [];
    addedCartItemId = items[0]?.id;

    // Update quantity
    const cartAfterUpdate = await cartService.updateItem(customerUser, addedCartItemId!, {
      quantity: 2,
    });

    results["Cart Management"] = {
      status: "PASS",
      details: {
        itemsCount: (cartAfterUpdate as any).items?.length,
        quantity: (cartAfterUpdate as any).items[0]?.quantity,
        cartSubtotal: (cartAfterUpdate as any).subtotal,
      },
    };
    console.log(`   ✅ Cart: Added & updated variant ${recommendedVariantId}. Total items: ${(cartAfterUpdate as any).items?.length}`);
  } catch (err: any) {
    results["Cart Management"] = { status: "FAIL", error: err.message };
    console.error("   ❌ Cart Management Failed:", err.message);
  }

  // 4. Checkout Order Creation & Stock Reservation
  console.log("\n4️⃣ Testing Checkout & Order Placement...");
  const checkoutService = new CheckoutService(prisma);
  let createdOrder: any = null;

  try {
    const orderResult = await checkoutService.createOrder(customerUser);
    createdOrder = orderResult.order;

    results["Checkout & Order Creation"] = {
      status: "PASS",
      details: {
        orderId: createdOrder.id,
        orderNumber: createdOrder.orderNumber,
        status: createdOrder.status,
        paymentStatus: createdOrder.paymentStatus,
        totalAmount: createdOrder.totalAmount,
      },
    };
    console.log(`   ✅ Checkout: Created Order #${createdOrder.orderNumber} with status ${createdOrder.status}`);
  } catch (err: any) {
    results["Checkout & Order Creation"] = { status: "FAIL", error: err.message };
    console.error("   ❌ Checkout Failed:", err.message);
  }

  // 5. Payment Initiation (Razorpay + COD)
  console.log("\n5️⃣ Testing Payment Providers (Razorpay Order Generation & COD)...");
  const codProvider = new CodPaymentProvider();
  const razorpayProvider = new RazorpayPaymentProvider(configService);
  const paymentsService = new PaymentsService(prisma, codProvider, razorpayProvider);

  try {
    if (!createdOrder) throw new Error("No order available for payment initiation");

    // Initiate Razorpay payment
    const razorpayInit = await paymentsService.initiatePayment(customerUser, {
      orderNumber: createdOrder.orderNumber,
      paymentMethod: "RAZORPAY",
    });

    results["Razorpay Payment Initiation"] = {
      status: razorpayInit.payment.providerOrderId ? "PASS" : "FAIL",
      details: {
        paymentId: razorpayInit.payment.id,
        providerOrderId: razorpayInit.payment.providerOrderId,
        status: razorpayInit.payment.status,
        checkoutKeyId: razorpayInit.payment.checkoutKeyId,
      },
    };
    console.log(`   ✅ Razorpay: Order successfully created on Razorpay API. Razorpay Order ID: ${razorpayInit.payment.providerOrderId}`);
  } catch (err: any) {
    results["Razorpay Payment Initiation"] = { status: "FAIL", error: err.message };
    console.error("   ❌ Razorpay Payment Initiation Failed:", err.message);
  }

  // 6. Admin Order Verification (Check that the order is received in Staff/Admin Order system)
  console.log("\n6️⃣ Verifying Order in Admin / Staff Order Management...");
  const ordersService = new OrdersService(prisma);

  try {
    if (!createdOrder) throw new Error("No order to verify in admin panel");

    const staffOrders = await ordersService.listStaffOrders({
      search: createdOrder.orderNumber,
      page: 1,
      pageSize: 10,
    });

    const foundInAdmin = staffOrders.orders.find((o: any) => o.orderNumber === createdOrder.orderNumber);

    results["Admin Order Reception"] = {
      status: foundInAdmin ? "PASS" : "FAIL",
      details: {
        orderNumber: foundInAdmin?.orderNumber,
        customerName: foundInAdmin?.customer ? `${foundInAdmin.customer.person.firstName} ${foundInAdmin.customer.person.lastName ?? ""}`.trim() : "Guest",
        paymentStatus: foundInAdmin?.paymentStatus,
        fulfillmentStatus: foundInAdmin?.fulfillmentStatus,
      },
    };

    if (foundInAdmin) {
      console.log(`   ✅ Admin: Order #${createdOrder.orderNumber} is visible in staff/admin portal with status ${foundInAdmin.status}`);
    } else {
      console.error(`   ❌ Admin: Order #${createdOrder.orderNumber} not found in staff order query`);
    }
  } catch (err: any) {
    results["Admin Order Reception"] = { status: "FAIL", error: err.message };
    console.error("   ❌ Admin Order Reception Failed:", err.message);
  }

  console.log("\n=================================================");
  console.log("📊 SUMMARY OF CUSTOMER PANEL INTEGRATION TESTS");
  console.log("=================================================");
  console.log(JSON.stringify(results, null, 2));

  await prisma.$disconnect();
}

runCustomerPanelE2ETest().catch((e) => {
  console.error("Fatal test runner error:", e);
  process.exit(1);
});
