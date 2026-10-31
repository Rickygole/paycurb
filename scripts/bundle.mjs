import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { build } from "esbuild";

const appDir = resolve(process.argv[2] ?? ".");
const manifest = JSON.parse(readFileSync(resolve(appDir, "package.json"), "utf8"));
const external = Object.keys({ ...manifest.dependencies }).filter((name) => !name.startsWith("@paycurb/"));

await build({
  entryPoints: [resolve(appDir, "src/app.ts")],
  outfile: resolve(appDir, "dist/app.mjs"),
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
  external,
  define: { "process.env.VERCEL": JSON.stringify("1") },
  logLevel: "info",
});
