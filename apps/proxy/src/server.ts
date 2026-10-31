import { serve } from "@hono/node-server";
import { app } from "./app";
import { config } from "./config";

serve({ fetch: app.fetch, port: config.port });
console.log(`paycurb proxy listening on ${config.port}`);
