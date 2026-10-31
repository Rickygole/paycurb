import { serve } from "@hono/node-server";
import { createApp } from "./api";
import { config } from "./config";
import { inTransaction } from "./db";
import { createPayPalGateway } from "./paypal";
import { ensureDefaultPolicy, seedRegistry } from "./seed";

await inTransaction(async (client) => {
  await seedRegistry(client);
  await ensureDefaultPolicy(client);
});

const app = createApp({ deps: { gateway: createPayPalGateway(), now: () => new Date() } });
serve({ fetch: app.fetch, port: config.port });
console.log(`paycurb proxy listening on ${config.port}`);
