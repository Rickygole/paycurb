import { fromCents } from "@paycurb/shared";
import { config } from "./config";

const sandboxBase = "https://api-m.sandbox.paypal.com";
const sandboxTestCard = { number: "4111111111111111", expiry: "2030-12", security_code: "123", name: "Sandbox Buyer" };

export interface OrderItem {
  sku?: string;
  name: string;
  quantity: number;
  unitCents: number;
}

export interface OrderResult {
  id: string;
  status: string;
  captureId: string | null;
}

export interface RefundResult {
  id: string;
  status: string;
}

export interface PayPalGateway {
  createOrder(input: { amountCents: number; currency: string; items: OrderItem[]; requestId: string }): Promise<OrderResult>;
  getOrder(id: string): Promise<OrderResult>;
  refund(input: { captureId: string; amountCents: number; currency: string; note?: string; requestId: string }): Promise<RefundResult>;
}

export class PayPalError extends Error {
  constructor(public httpStatus: number, public issue: string) {
    super(`PayPal ${httpStatus} ${issue}`);
  }
}

function readOrder(body: any): OrderResult {
  const capture = body.purchase_units?.[0]?.payments?.captures?.[0];
  return { id: body.id, status: capture?.status ?? body.status, captureId: capture?.id ?? null };
}

export function createPayPalGateway(fetchImpl: typeof fetch = fetch): PayPalGateway {
  const { clientId, clientSecret } = config.paypal();
  let token: { value: string; expiresAt: number } | null = null;

  async function accessToken(): Promise<string> {
    if (token && token.expiresAt > Date.now() + 30_000) return token.value;
    const response = await fetchImpl(`${sandboxBase}/v1/oauth2/token`, {
      method: "POST",
      headers: { Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: "grant_type=client_credentials",
    });
    if (!response.ok) throw new PayPalError(response.status, "authentication failed");
    const body: any = await response.json();
    token = { value: body.access_token, expiresAt: Date.now() + body.expires_in * 1000 };
    return token.value;
  }

  async function send(method: string, path: string, requestId?: string, payload?: unknown) {
    const response = await fetchImpl(`${sandboxBase}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${await accessToken()}`,
        "Content-Type": "application/json",
        ...(requestId ? { "PayPal-Request-Id": requestId } : {}),
      },
      body: payload === undefined ? undefined : JSON.stringify(payload),
    });
    const body: any = await response.json().catch(() => ({}));
    if (!response.ok) throw new PayPalError(response.status, body.details?.[0]?.issue ?? body.name ?? "request failed");
    return body;
  }

  return {
    async createOrder({ amountCents, currency, items, requestId }) {
      const total = { currency_code: currency, value: fromCents(amountCents) };
      const body = await send("POST", "/v2/checkout/orders", requestId, {
        intent: "CAPTURE",
        purchase_units: [
          {
            amount: { ...total, breakdown: { item_total: total } },
            items: items.map((item) => ({
              name: item.name.slice(0, 127),
              sku: item.sku?.slice(0, 127),
              quantity: String(item.quantity),
              unit_amount: { currency_code: currency, value: fromCents(item.unitCents) },
            })),
          },
        ],
        payment_source: { card: sandboxTestCard },
      });
      return readOrder(body);
    },
    async getOrder(id) {
      return readOrder(await send("GET", `/v2/checkout/orders/${encodeURIComponent(id)}`));
    },
    async refund({ captureId, amountCents, currency, note, requestId }) {
      const body = await send("POST", `/v2/payments/captures/${encodeURIComponent(captureId)}/refund`, requestId, {
        amount: { currency_code: currency, value: fromCents(amountCents) },
        note_to_payer: note?.slice(0, 255),
      });
      return { id: body.id, status: body.status };
    },
  };
}
