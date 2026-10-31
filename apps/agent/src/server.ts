import { serve } from "@hono/node-server";
import { app } from "./app";

const port = Number(process.env.AGENT_PORT ?? 4100);
serve({ fetch: app.fetch, port });
console.log(`agent listening on ${port}`);
