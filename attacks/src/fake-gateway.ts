import type { PayPalGateway } from "../../apps/proxy/src/paypal";

export function createFakeGateway(): PayPalGateway {
  let counter = 0;
  return {
    async createOrder() {
      counter += 1;
      return { id: `FAKEORDER${counter}`, status: "COMPLETED", captureId: `FAKECAP${counter}` };
    },
    async getOrder(id) {
      return { id, status: "COMPLETED", captureId: null };
    },
    async refund() {
      counter += 1;
      return { id: `FAKEREFUND${counter}`, status: "COMPLETED" };
    },
  };
}
