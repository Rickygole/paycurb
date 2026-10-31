const base = process.env.SMOKE_BASE ?? "http://localhost:3100";
const proxy = process.env.SMOKE_PROXY ?? "http://localhost:4000";
const password = process.env.OWNER_PASSWORD;
if (!password) throw new Error("OWNER_PASSWORD is required");

let cookie = "";
let failures = 0;

const check = (name, ok, detail = "") => {
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` ${detail}` : ""}`);
};

async function api(path, init = {}) {
  const response = await fetch(`${base}${path}`, { ...init, headers: { "content-type": "application/json", cookie, ...init.headers } });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null, headers: response.headers };
}

async function tool(name, args) {
  const response = await fetch(`${proxy}/mcp`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json, text/event-stream" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name, arguments: args } }),
  });
  if (!response.ok) throw new Error(`tool server returned ${response.status} for ${name}`);
  const payload = await response.json();
  return JSON.parse(payload.result.content[0].text);
}

const order = (sku, name, dollars, payee, extra = {}) => ({
  currencyCode: "USD",
  payee,
  items: [{ sku, name, quantity: 1, itemCost: dollars, itemTotal: dollars }],
  ...extra,
});
const acme = "acme-office@merchants.example";

const login = await api("/api/login", { method: "POST", body: JSON.stringify({ password }) });
check("owner login", login.status === 200);
cookie = login.headers.get("set-cookie")?.split(";")[0] ?? "";

check("reset demo", (await api("/api/demo/reset", { method: "POST" })).status === 200);

const small = await tool("create_order", order("PEN-12", "Pen refills", 12, acme));
check("small purchase is allowed and paid", small.decision === "allow" && small.order?.status === "COMPLETED", small.order?.capture_id);

const watch = await tool("create_order", order("WATCH-1", "Chronos X", 400, "luxury-watches@merchants.example"));
check("injected watch is blocked by R04", watch.decision === "block" && watch.rule_id === "R04" && !watch.order);

const lampArgs = order("LAMP-1", "Desk lamp", 75, acme);
const lamp = await tool("create_order", lampArgs);
check("lamp waits for approval", lamp.decision === "escalate" && Boolean(lamp.approval_id));

const tampered = await tool("create_order", order("CUSTOM-1", "Desk lamp", 450, acme, { approval_id: lamp.approval_id }));
check("changed order cannot reuse the approval", tampered.decision !== "allow");

const pending = await api("/api/approvals?status=pending");
check("approval card lists the exact amount", pending.body?.some((card) => card.id === lamp.approval_id && card.amount_cents === 7500));

const approved = await api(`/api/approvals/${lamp.approval_id}/approve`, { method: "POST" });
check("owner approves", approved.status === 200);

const executed = await tool("create_order", { ...lampArgs, approval_id: lamp.approval_id });
check("approved order executes once", executed.decision === "allow" && executed.order?.status === "COMPLETED", executed.order?.capture_id);

const replay = await tool("create_order", { ...lampArgs, approval_id: lamp.approval_id });
check("approval cannot be replayed", replay.decision !== "allow" || replay.order?.id === executed.order?.id);

const unknown = await tool("transfer_funds", {});
check("unknown tool is blocked", unknown.decision === "block" && unknown.rule_id === "R00");

const verify = await api("/api/audit/verify");
check("audit chain verifies", verify.body?.ok === true, `rows ${verify.body?.checked}`);

const stats = await api("/api/stats");
check("stats count spend and blocks", stats.body?.spent_today_cents === 8700 && stats.body?.blocked_count >= 3, JSON.stringify(stats.body));

console.log(failures === 0 ? "ALL PASSED" : `${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
