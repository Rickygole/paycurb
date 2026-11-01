export const repo = "https://github.com/Rickygole/paycurb";
export const threatModel = `${repo}/blob/main/docs/threat-model.md`;

export const nav = {
  links: [
    { href: "/#product", label: "Product" },
    { href: "/#tour", label: "How it works" },
    { href: "/connect", label: "Developers" },
    { href: "/docs", label: "Docs" },
    { href: "/#security", label: "Security" },
    { href: repo, label: "GitHub" },
  ],
  signIn: "Sign in",
  start: "Get started",
};

export const meta = {
  title: "Paycurb: guardrails for an AI agent that pays through PayPal",
  description: "Put fixed rules between your shopping or ops agent and PayPal. Rules see the merchant, items and quantity, approvals bind to the exact order, and every decision lands in a tamper evident log.",
};

export const story = {
  title: "A small business lets an agent reorder office supplies.",
  punch: "It cannot be talked into buying a watch.",
  body: "The agent has no PayPal credentials. It can only ask, and every ask hits the same rules.",
  cardTitle: "A product page told the agent to buy this",
  verdict: "Blocked before PayPal",
  raw: "View raw request",
  request: "Request",
  response: "Response",
  entry: "Audit entry",
  follows: "follows",
};

export const chain = {
  title: "Every decision is chained.",
  body: "Each entry carries the fingerprint of the one before it. Edit an old row and every row after it stops matching.",
  replay: "Replay of a real sandbox run, October 31, 2026, times in UTC",
  badge: "Chain verified, 12 entries. Entries 6 to 10 shown.",
  heads: ["No.", "Time", "What", "Amount", "Decision", "Entry", "Follows"],
  link: "Open the full audit log in your workspace",
};

export const footer = {
  columns: [
    {
      title: "Product",
      links: [
        { href: "/#tour", label: "How it works" },
        { href: "/#security", label: "Security" },
        { href: "/#compare", label: "Versus capped cards" },
        { href: "/login", label: "Sign in" },
      ],
    },
    {
      title: "Developers",
      links: [
        { href: "/connect", label: "Connect your agent" },
        { href: "/docs", label: "Docs" },
        { href: `${repo}/blob/main/docs/contracts.md`, label: "Interfaces" },
        { href: `${repo}/blob/main/docs/paypal-spike.md`, label: "What we learned from PayPal" },
      ],
    },
    {
      title: "Project",
      links: [
        { href: repo, label: "GitHub" },
        { href: `${repo}/blob/main/docs/architecture.md`, label: "Architecture" },
        { href: threatModel, label: "Threat model" },
        { href: `${repo}/blob/main/reports/attack-report.md`, label: "Attack report" },
        { href: `${repo}/blob/main/LICENSE`, label: "License (MIT)" },
      ],
    },
  ],
  line: "Sandbox workspace: PayPal sandbox only, no real money moves.",
};

