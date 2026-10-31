import type { OrderResult, PayPalGateway, RefundResult } from "../src/paypal";

export interface FakeGateway extends PayPalGateway {
  orders: { amountCents: number; requestId: string }[];
  refunds: { captureId: string; amountCents: number }[];
  failNext: boolean;
}

export function fakeGateway(): FakeGateway {
  let counter = 0;
  const gateway: FakeGateway = {
    orders: [],
    refunds: [],
    failNext: false,
    async createOrder({ amountCents, requestId }): Promise<OrderResult> {
      if (gateway.failNext) {
        gateway.failNext = false;
        throw new Error("paypal down");
      }
      counter += 1;
      gateway.orders.push({ amountCents, requestId });
      return { id: `ORDER${counter}`, status: "COMPLETED", captureId: `CAP${counter}` };
    },
    async getOrder(id): Promise<OrderResult> {
      return { id, status: "COMPLETED", captureId: null };
    },
    async refund({ captureId, amountCents }): Promise<RefundResult> {
      counter += 1;
      gateway.refunds.push({ captureId, amountCents });
      return { id: `REFUND${counter}`, status: "COMPLETED" };
    },
  };
  return gateway;
}
