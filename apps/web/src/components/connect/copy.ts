export const connect = {
  meta: {
    title: "Connect your agent",
    description: "Point an MCP client at the Paycurb proxy, call create_order, and handle the three answers: allowed, held for the owner, or blocked.",
  },
  title: "Connect your agent",
  intro: "Paycurb is an MCP tool server. Your agent calls create_order on Paycurb instead of on PayPal. Paycurb checks the order against your policy, and only then talks to PayPal.",
  endpointLabel: "Sandbox endpoint",
  endpointNote: "This is the proxy this site is set up with. It only talks to the PayPal sandbox. To run your own, start the proxy with pnpm proxy and use its address.",
  sandboxTitle: "Sandbox only",
  sandbox: (limit: number) =>
    `The /mcp endpoint has no caller authentication. Anyone who can reach it can ask for payments, and they still get only what the policy allows. It is rate limited to ${limit} calls a minute per client address. Run it where only your agent can reach it.`,
  quickTitle: "Quickstart",
  quick: [
    { title: "Write the policy in plain English.", text: "Open the policy page in the demo. A model drafts the rules, you read them back, and nothing applies until you confirm.", href: "/policy", link: "Open the policy" },
    { title: "Point your agent at the endpoint.", text: "Add Paycurb as an MCP server. The tool names match the PayPal agent toolkit: create_order, get_order and create_refund.", href: "#config", link: "See the config" },
    { title: "Watch decisions in the feed.", text: "Every call shows up live with its rule, its reason and its PayPal reference.", href: "/feed", link: "Open the feed" },
    { title: "Approve held orders.", text: "Orders over your approval line wait for the owner. Approve, and the agent repeats the same call to pay.", href: "/approvals", link: "Open approvals" },
  ],
  configTitle: "1. Add the MCP server",
  configText: "Any MCP client that speaks streamable HTTP works. The x-agent-id header names the agent in the log. Without it the agent is recorded as demo-agent.",
  configJson: "MCP client config",
  configSdk: "Or connect from code with the MCP TypeScript SDK",
  callTitle: "2. Call create_order",
  callText: "Costs are in dollars, as in PayPal. payee is the merchant's payee reference. Paycurb hashes the whole order, so the approval for it covers this exact order and nothing else.",
  callLabel: "Tool call",
  answersTitle: "3. Handle the answer",
  answersText: "Every result is one JSON text block with decision, rule_id and reason. The reason is plain English, so the agent can pass it to the person it works for.",
  answers: [
    {
      id: "allow",
      title: "Allowed",
      text: "The order went to the PayPal sandbox and was captured. order.id is the PayPal order and capture_id is the capture.",
    },
    {
      id: "escalate",
      title: "Held",
      text: "Nothing is paid yet. The owner approves it on the approvals page. Then the agent repeats the identical call, optionally with approval_id, and Paycurb pays it. Calling again before a decision returns the same hold. The approval is single use and expires.",
    },
    {
      id: "block",
      title: "Blocked",
      text: "Nothing reached PayPal. rule_id says which rule stopped it and reason says why. The block is written to the audit log like everything else.",
    },
  ],
  idsNote: "ORDER_ID, CAPTURE_ID and APPROVAL_ID stand in for the ids your run returns. Rules and reasons come from the demo policy.",
  copy: "Copy",
  copied: "Copied",
};
