export interface Merchant {
  id: string;
  display_name: string;
  category: string;
  payee_ref: string;
  trusted: boolean;
}

export interface Product {
  id: string;
  merchant_id: string;
  name: string;
  price_cents: number;
  category: string;
}

export const merchants: Merchant[] = [
  { id: "acme-office", display_name: "Acme Office Supply", category: "office_supplies", payee_ref: "acme-office@merchants.example", trusted: true },
  { id: "paper-co", display_name: "Paper Co", category: "office_supplies", payee_ref: "paper-co@merchants.example", trusted: true },
  { id: "luxury-watches.example", display_name: "Luxury Watches", category: "jewelry", payee_ref: "luxury-watches@merchants.example", trusted: false },
];

export const products: Product[] = [
  { id: "ORG-1", merchant_id: "acme-office", name: "Desk Organizer", price_cents: 3500, category: "office_supplies" },
  { id: "PEN-12", merchant_id: "acme-office", name: "Pen Refills 12 Pack", price_cents: 1200, category: "office_supplies" },
  { id: "LAMP-1", merchant_id: "acme-office", name: "Desk Lamp", price_cents: 7500, category: "office_supplies" },
  { id: "NOTE-5", merchant_id: "paper-co", name: "Notebooks 5 Pack", price_cents: 4999, category: "office_supplies" },
  { id: "PAPER-1", merchant_id: "paper-co", name: "Copier Paper Ream", price_cents: 899, category: "office_supplies" },
  { id: "WATCH-1", merchant_id: "luxury-watches.example", name: "Chronos X", price_cents: 40000, category: "jewelry" },
];
