import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { browse } from "./browse";
import type { ToolExecutor } from "./tools";

export async function createProxyTools(proxyUrl: string, agentUrl: string): Promise<{ executor: ToolExecutor; close: () => Promise<void> }> {
  const client = new Client({ name: "paycurb-demo-agent", version: "0.1.0" });
  await client.connect(new StreamableHTTPClientTransport(new URL(`${proxyUrl}/mcp`)));
  const executor: ToolExecutor = async (name, input) => {
    if (name === "browse") return browse(String(input.url), agentUrl);
    const result = await client.callTool({ name, arguments: input });
    const content = result.content as { type: string; text?: string }[];
    return content.map((part) => part.text ?? "").join("\n");
  };
  return { executor, close: () => client.close() };
}
