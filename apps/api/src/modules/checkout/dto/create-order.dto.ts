export interface CreateOrderDto {
  // Reserved for the next checkout phase.
  // V1 creates the order from the authenticated customer's
  // active server cart and does not accept pricing data
  // from the browser.
}