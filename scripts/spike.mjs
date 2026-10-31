const base = "https://api-m.sandbox.paypal.com";
const { PAYPAL_CLIENT_ID: id, PAYPAL_CLIENT_SECRET: secret } = process.env;
const tok = (await (await fetch(`${base}/v1/oauth2/token`, {
  method: "POST",
  headers: { Authorization: "Basic " + Buffer.from(`${id}:${secret}`).toString("base64"), "Content-Type": "application/x-www-form-urlencoded" },
  body: "grant_type=client_credentials",
})).json()).access_token;
const call = async (path, body, rid) => {
  const r = await fetch(`${base}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tok}`, "Content-Type": "application/json", "PayPal-Request-Id": rid },
    body: JSON.stringify(body),
  });
  return { status: r.status, body: await r.json() };
};
const units = [{ amount: { currency_code: "USD", value: "10.00" } }];
const a = await call("/v2/checkout/orders", { intent: "CAPTURE", purchase_units: units }, crypto.randomUUID());
console.log("create", a.status, a.body.status, a.body.links?.find((l) => l.rel === "payer-action")?.href ?? "");
const cap = await call(`/v2/checkout/orders/${a.body.id}/capture`, {}, crypto.randomUUID());
console.log("capture without approval", cap.status, cap.body.details?.[0]?.issue ?? cap.body.status);
const card = await call("/v2/checkout/orders", {
  intent: "CAPTURE", purchase_units: units,
  payment_source: { card: { number: "4111111111111111", expiry: "2030-12", security_code: "123", name: "Test Buyer" } },
}, crypto.randomUUID());
console.log("card source", card.status, card.body.status ?? card.body.details?.[0]?.issue ?? card.body.name);
