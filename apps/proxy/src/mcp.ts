import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { handleCall, type Deps } from "./pipeline";

const tools = [
  {
    name: "create_order",
    description: "Create and pay a PayPal order for items from one merchant. Costs are in dollars. Spending rules are enforced before any money moves.",
    inputSchema: {
      type: "object",
      properties: {
        currencyCode: { type: "string", enum: ["USD"] },
        payee: { type: "string", description: "Payee reference shown on the merchant page" },
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              sku: { type: "string" },
              name: { type: "string" },
              quantity: { type: "number" },
              itemCost: { type: "number", description: "Cost of one item in dollars" },
              itemTotal: { type: "number", description: "quantity times itemCost in dollars" },
            },
            required: ["name", "quantity", "itemCost", "itemTotal"],
          },
        },
        approval_id: { type: "string", description: "Approval id from an earlier pending response, when repeating the same call" },
      },
      required: ["currencyCode", "payee", "items"],
    },
  },
  {
    name: "get_order",
    description: "Look up a PayPal order by id.",
    inputSchema: { type: "object", properties: { id: { type: "string" } }, required: ["id"] },
  },
  {
    name: "create_refund",
    description: "Refund part or all of a captured payment. Amount is in dollars.",
    inputSchema: {
      type: "object",
      properties: { capture_id: { type: "string" }, amount: { type: "number" }, note_to_payer: { type: "string" } },
      required: ["capture_id", "amount"],
    },
  },
];

function buildServer(deps: Deps, agentId: string): Server {
  const server = new Server({ name: "paycurb", version: "0.1.0" }, { capabilities: { tools: {} } });
  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const result = await handleCall(deps, { tool: request.params.name, args: request.params.arguments ?? {}, agentId });
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  });
  return server;
}

export async function handleMcpRequest(deps: Deps, request: Request): Promise<Response> {
  const agentId = request.headers.get("x-agent-id") ?? "demo-agent";
  const server = buildServer(deps, agentId);
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  await server.connect(transport);
  return transport.handleRequest(request);
}
