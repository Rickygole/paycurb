import { spawn } from "node:child_process";

const repoRoot = new URL("../../", import.meta.url).pathname;
let running = false;

export function startAttackRun(): void {
  if (running) return;
  running = true;
  const child = spawn("pnpm", ["--filter", "@paycurb/attacks", "start"], { cwd: repoRoot, env: process.env, stdio: "ignore", detached: true });
  child.on("exit", () => {
    running = false;
  });
  child.on("error", () => {
    running = false;
  });
  child.unref();
}
