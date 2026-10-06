import { Module } from "@nestjs/common";

import { PrismaModule } from "../../database/prisma.module";
import { CustomerAuthModule } from "../customer-auth/customer-auth.module";
import { PaymentsController } from "./payments.controller";
import { PaymentsService } from "./payments.service";
import { CodPaymentProvider } from "./providers/cod-payment-provider";
import { RazorpayPaymentProvider } from "./providers/razorpay-payment-provider";
import {
  PAYMENT_PROVIDER,
} from "./providers/payment-provider";

@Module({
  imports: [
    PrismaModule,
    CustomerAuthModule,
  ],
  controllers: [
    PaymentsController,
  ],
  providers: [
    PaymentsService,
    CodPaymentProvider,
    RazorpayPaymentProvider,
    {
      provide: PAYMENT_PROVIDER,
      useFactory: (
        codPaymentProvider: CodPaymentProvider,
        razorpayPaymentProvider: RazorpayPaymentProvider,
      ) => ({
        cod: codPaymentProvider,
        razorpay: razorpayPaymentProvider,
      }),
      inject: [
        CodPaymentProvider,
        RazorpayPaymentProvider,
      ],
    },
  ],
  exports: [
    PaymentsService,
  ],
})
export class PaymentsModule {}