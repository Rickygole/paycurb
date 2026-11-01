export const repo = "https://github.com/Rickygole/paycurb";
export const threatModel = `${repo}/blob/main/docs/threat-model.md`;

export const nav = {
  links: [
    { href: "/#how", label: "How it works" },
    { href: "/connect", label: "Connect" },
    { href: "/#stops", label: "What it stops" },
    { href: threatModel, label: "Threat model" },
  ],
  demo: "Try the demo",
};

export const meta = {
  title: "Paycurb: guardrails for an AI agent that pays through PayPal",
  description: "Put fixed rules between your shopping or ops agent and PayPal. Rules see the merchant, items and quantity, approvals bind to the exact order, and every decision lands in a tamper evident log.",
};

export const hero = {
  lines: ["Your agent can ask.", "Paycurb decides."],
  support: "Every payment call goes through fixed rules before PayPal sees it. No model in the loop, no keys on the agent.",
  developer: "Building an agent that pays through PayPal? Point its payment tool at Paycurb. Same tool names, one new URL.",
  primary: "Try the demo",
  secondary: "Connect your agent",
  threatLink: "Read the threat model",
  diagramLabel: "An agent sends three payments toward PayPal. Paycurb lets one through, holds one for the owner and blocks one.",
  agent: "Agent",
  agentNote: "Untrusted. Has no PayPal keys.",
  gate: "Paycurb",
  gateNote: "Rules R00 to R15, in order",
  paypal: "PayPal",
  paypalNote: "Sandbox. Pays only what Paycurb passes.",
};

export const evidence = {
  label: "Measured results from the attack suite",
  protectedLabel: "attacks moved money with Paycurb in the way.",
  baselineLabel: "did when the agent paid PayPal directly.",
  latencyLabel: "median time Paycurb adds to a call, not counting PayPal.",
  source: "From the attack report",
};

export const story = {
  title: "A small business lets an agent reorder office supplies.",
  punch: "It cannot be talked into buying a watch.",
  body: "The agent has no PayPal credentials. It can only ask, and every ask hits the same rules.",
  steps: [
    { title: "The agent asks.", text: "A tool call arrives: who to pay, for what, and how much." },
    { title: "Paycurb decides.", text: "Sixteen rules, R00 to R15, run in order. No model gets a vote. An approval is tied to one order's fingerprint, so it covers nothing else." },
    { title: "PayPal pays, only if told to.", text: "Allowed calls go to the PayPal sandbox. Held calls wait for you. Blocked calls stop here." },
  ],
  cardTitle: "A product page told the agent to buy this",
  verdict: "Blocked before PayPal",
  raw: "View raw request",
  request: "Request",
  response: "Response",
  entry: "Audit entry",
  follows: "follows",
};

export const card = {
  title: "Why not just a virtual card?",
  body: "A card with a spend cap is a good tool. It sees a charge: an amount and a merchant. Paycurb sees the order the agent built, before anything is paid.",
  columns: ["What gets checked", "Spend capped card", "Paycurb"],
  rows: [
    ["Amount", "A cap per charge or per period", "Per order, per day, and per merchant per hour"],
    ["Merchant", "Some cards lock to one merchant or category", "Allowlist and blocklist by payee. Unknown payees are blocked."],
    ["Items and quantity", "Not visible. A charge has no cart.", "Every line item, with a cap on quantity per line"],
    ["Owner approval", "None. The charge clears or declines.", "Orders over your line wait for you"],
    ["Order changed after approval", "Nothing to compare against", "The approval covers one order hash, once. A changed order is checked again from the start."],
    ["Record", "A statement line after the charge", "A hash chained log of every decision, blocks included"],
    ["Where it works", "Anywhere the card is accepted", "Only calls that go through the proxy. PayPal sandbox only today."],
  ],
};

export const picker = {
  body: "Pick something for the agent to buy. The proxy's own policy engine decides, right here in your browser.",
  group: "What the agent tries to buy",
  verdicts: { allow: "Allowed", escalate: "Held for you", block: "Blocked" },
  words: { allow: "allowed", escalate: "held", block: "blocked" },
};

export const stops = {
  title: "What it stops",
  body: (total: number, baseline: number, lost: string, prot: number) =>
    `${total} scripted attacks against the PayPal sandbox. Pay PayPal directly and ${baseline} land, moving ${lost}. Put Paycurb in front and ${prot} do.`,
  control: (count: number) => `The ${count} honest purchases we mixed in all cleared. Blocking everything would be easy and useless.`,
  heads: ["Attack", "Paid direct", "Paid with Paycurb", "Lost direct"],
  groups: {
    A: "Hidden instructions on web pages",
    B: "Many small orders instead of one big one",
    C: "Reusing or changing an approved order",
    D: "Odd amounts and currencies",
    E: "Refunds and payouts",
    F: "Broken calls and tools nobody allowed",
    G: "Retries and double orders",
  } as Record<string, string>,
  limitsLead: "Limits.",
  limits: (items: string) => `Some things get through, and the report says so: ${items} Any path to PayPal that skips the proxy is outside what Paycurb can see.`,
  limitsLink: "Read the threat model.",
};

export const chain = {
  title: "Every decision is chained.",
  body: "Each entry carries the fingerprint of the one before it. Edit an old row and every row after it stops matching.",
  replay: "Replay of a real sandbox run, October 31, 2026, times in UTC",
  badge: "Chain verified, 12 entries. Entries 6 to 10 shown.",
  heads: ["No.", "Time", "What", "Amount", "Decision", "Entry", "Follows"],
  link: "See the full audit log in the demo",
};

export const cta = {
  title: "Try to break it.",
  body: "Sign in with the public demo password and watch decisions arrive live. It runs on the PayPal sandbox, so every dollar is play money. Break what you like. We can reset it.",
};

export const dialog = {
  title: "Try the demo",
  label: "Demo password",
  placeholder: "Demo password",
  hint: "The password is public on purpose. It's a sandbox, so no real money moves.",
  error: "Wrong password. Try again.",
  group: "Where to start",
  submit: "Try the demo",
  pending: "Opening...",
  destinations: [
    { id: "feed", label: "Live feed", path: "/feed" },
    { id: "agent", label: "Demo agent", path: "/agent" },
  ],
};

export const footer = {
  columns: [
    [
      { href: "/connect", label: "Connect your agent" },
      { href: repo, label: "GitHub repository" },
      { href: `${repo}/blob/main/docs/architecture.md`, label: "Architecture" },
    ],
    [
      { href: threatModel, label: "Threat model" },
      { href: `${repo}/blob/main/reports/attack-report.md`, label: "Attack report" },
      { href: `${repo}/blob/main/docs/contracts.md`, label: "Interfaces" },
      { href: `${repo}/blob/main/docs/paypal-spike.md`, label: "What we learned from PayPal" },
    ],
    [
      { href: "/#try", label: "Try to overspend" },
      { href: "/#open", label: "Try the demo" },
      { href: "/login", label: "Sign in" },
    ],
  ],
  line: "Built for the PayPal hackathon. Sandbox only, no real money moves.",
  license: "MIT license.",
};
