export interface VerifyRazorpayPaymentDto {
  orderNumber: string;
  razorpayPaymentId: string;
  razorpayOrderId: string;
  razorpaySignature: string;
}
