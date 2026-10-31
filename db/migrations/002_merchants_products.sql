CREATE TABLE merchants (
  id text PRIMARY KEY,
  display_name text NOT NULL,
  category text NOT NULL,
  payee_ref text NOT NULL UNIQUE,
  trusted boolean NOT NULL DEFAULT false
);
CREATE TABLE products (
  id text PRIMARY KEY,
  merchant_id text NOT NULL REFERENCES merchants (id),
  name text NOT NULL,
  price_cents integer NOT NULL CHECK (price_cents > 0),
  category text NOT NULL
);
