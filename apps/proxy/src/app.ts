import { Hono } from "hono";
import { createApp } from "./api";
import { assertRestrictedRole, inTransaction } from "./db";
import { createPayPalGateway } from "./paypal";
import { ensureDefaultPolicy, seedRegistry } from "./seed";

await assertRestrictedRole();
await inTransaction(async (client) => {
  await seedRegistry(client);
  await ensureDefaultPolicy(client);
});

const startAttackRun = process.env.VERCEL ? undefined : (await import("../../../attacks/src/start")).startAttackRun;

const inner = createApp({ deps: { gateway: createPayPalGateway(), now: () => new Date() }, startAttackRun });

export const app = new Hono().route("/", inner);

export default app;
