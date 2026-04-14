-- ─────────────────────────────────────────────────────────────────────────────
-- PayForce — Migración: tabla products + campos extendidos de customers
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Tabla products (catálogo de productos)
CREATE TABLE IF NOT EXISTS "products" (
  "id"                 TEXT          NOT NULL PRIMARY KEY,
  "connectedAccountId" TEXT          NOT NULL,
  "name"               TEXT          NOT NULL,
  "description"        TEXT,
  "imageUrl"           TEXT,
  "sku"                TEXT,
  "category"           TEXT,
  "price"              INTEGER       NOT NULL,
  "currency"           TEXT          NOT NULL DEFAULT 'eur',
  "unit"               TEXT          NOT NULL DEFAULT 'unit',
  "taxRate"            DOUBLE PRECISION NOT NULL DEFAULT 0,
  "stock"              INTEGER,
  "active"             BOOLEAN       NOT NULL DEFAULT true,
  "createdAt"          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  "updatedAt"          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT "products_connectedAccountId_fkey"
    FOREIGN KEY ("connectedAccountId")
    REFERENCES "connected_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "products_connectedAccountId_idx" ON "products" ("connectedAccountId");
CREATE INDEX IF NOT EXISTS "products_active_idx"             ON "products" ("active");

-- 2. Campos extendidos en customers
-- Account data
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "language"     TEXT DEFAULT 'es';
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "description"  TEXT;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "companyName"  TEXT;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "contactName"  TEXT;

-- Billing data
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "billingEmail"    TEXT;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "billingCountry"  TEXT;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "phonePrefix"     TEXT;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "timezone"        TEXT DEFAULT 'Europe/Madrid';

-- Tax data
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "taxStatus"    TEXT;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "taxId"        TEXT;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "taxIdType"    TEXT;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "taxIdCountry" TEXT;

-- Shipping data
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "shippingName"        TEXT;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "shippingAddress"     TEXT;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "shippingCity"        TEXT;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "shippingPostalCode"  TEXT;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "shippingState"       TEXT;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "shippingCountry"     TEXT;

-- Invoice settings
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "invoiceTemplate" TEXT DEFAULT 'default';

-- 3. stripeCustomerId: hacerlo nullable para clientes creados localmente
-- (sin Stripe todavía)
ALTER TABLE "customers" ALTER COLUMN "stripeCustomerId" DROP NOT NULL;
