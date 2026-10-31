import { spawn } from "node:child_process";
import { start } from "./server.ts";

const proxyPort = process.env.MOCK_PROXY_PORT || "4000";
const agentPort = process.env.MOCK_AGENT_PORT || "4100";
const webPort = process.env.WEB_PORT || "3000";

start();

const next = spawn("pnpm", ["exec", "next", "dev", "-p", webPort], {
  stdio: "inherit",
  env: { ...process.env, PROXY_URL: `http://localhost:${proxyPort}`, AGENT_URL: `http://localhost:${agentPort}` },
});

const stop = () => {
  next.kill("SIGTERM");
  process.exit(0);
};

process.on("SIGINT", stop);
process.on("SIGTERM", stop);
next.on("exit", (code) => process.exit(code ?? 0));
