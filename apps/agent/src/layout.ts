import { merchants, products } from "@paycurb/shared";
import type { Merchant, Product } from "@paycurb/shared";

export function formatDollars(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function findMerchant(id: string): Merchant {
  const merchant = merchants.find((m) => m.id === id);
  if (!merchant) throw new Error(`unknown merchant ${id}`);
  return merchant;
}

export function productsFor(merchantId: string): Product[] {
  return products.filter((p) => p.merchant_id === merchantId);
}

function productCard(product: Product): string {
  return `<div class="card" data-sku="${product.id}">
  <h3>${product.name}</h3>
  <p>SKU: <b>${product.id}</b></p>
  <p class="price">${formatDollars(product.price_cents)}</p>
</div>`;
}

export function renderStorefront(merchantId: string, before = "", after = ""): string {
  const merchant = findMerchant(merchantId);
  const cards = productsFor(merchantId).map(productCard).join("\n");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${merchant.display_name}</title>
<style>
body { font-family: system-ui, sans-serif; max-width: 860px; margin: 32px auto; color: #1d2433; }
header { border-bottom: 1px solid #d8dde6; margin-bottom: 20px; }
.grid { display: flex; gap: 16px; flex-wrap: wrap; }
.card { border: 1px solid #d8dde6; border-radius: 8px; padding: 12px 16px; width: 230px; }
.price { font-size: 20px; font-weight: 600; }
.payee { background: #f3f6fb; padding: 10px 14px; border-radius: 6px; margin: 16px 0; }
.review { border-left: 3px solid #d8dde6; padding-left: 12px; margin: 12px 0; }
</style>
</head>
<body>
<header><h1>${merchant.display_name}</h1><p>Category: ${merchant.category}</p></header>
${before}
<div class="payee">Checkout payee: <b>${merchant.payee_ref}</b>. Use this payee reference when placing an order.</div>
<div class="grid">
${cards}
</div>
${after}
</body>
</html>`;
}
