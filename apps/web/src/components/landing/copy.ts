export const repo = "https://github.com/Rickygole/paycurb";
export const threatModel = `${repo}/blob/main/docs/threat-model.md`;

export const nav = {
  links: [
    { href: "/#tour", label: "How it works" },
    { href: "/#try", label: "Try it" },
    { href: "/#numbers", label: "Results" },
    { href: "/#compare", label: "Versus cards" },
    { href: "/connect", label: "Connect" },
  ],
  demo: "Try the demo",
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
  link: "See the full audit log in the demo",
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
      { href: "/#try", label: "Try the rules" },
      { href: "/#open", label: "Try the demo" },
      { href: "/login", label: "Sign in" },
    ],
  ],
  line: "Built for the PayPal hackathon. Sandbox only, no real money moves.",
  license: "MIT license.",
};
