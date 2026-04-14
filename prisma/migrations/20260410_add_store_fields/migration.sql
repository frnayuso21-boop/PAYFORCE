-- ─────────────────────────────────────────────────────────────────────────────
-- PayForce — Migración completa
-- Incluye:
--   1. Campos de tienda personalizada en connected_accounts
--   2. Campos de fraude (Titan 1.4.1) en payments
--   3. Tablas fraud_alerts y fraud_rules
--
-- Ejecutar en tu terminal:
--   npx prisma migrate dev
-- O aplicar este SQL directamente en tu base de datos PostgreSQL.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Tienda personalizada (connected_accounts)
ALTER TABLE "connected_accounts"
  ADD COLUMN IF NOT EXISTS "slug"             TEXT        UNIQUE,
  ADD COLUMN IF NOT EXISTS "storeDescription" TEXT,
  ADD COLUMN IF NOT EXISTS "primaryColor"     TEXT,
  ADD COLUMN IF NOT EXISTS "storeEnabled"     BOOLEAN     NOT NULL DEFAULT false;

-- 2. Campos de Titan en payments
ALTER TABLE "payments"
  ADD COLUMN IF NOT EXISTS "riskScore"    INTEGER,
  ADD COLUMN IF NOT EXISTS "riskFlags"    TEXT,
  ADD COLUMN IF NOT EXISTS "riskBlocked"  BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "customerEmail" TEXT,
  ADD COLUMN IF NOT EXISTS "customerName"  TEXT;

CREATE INDEX IF NOT EXISTS "payments_riskScore_idx"   ON "payments" ("riskScore");
CREATE INDEX IF NOT EXISTS "payments_riskBlocked_idx" ON "payments" ("riskBlocked");

-- 3. Tabla fraud_alerts
CREATE TABLE IF NOT EXISTS "fraud_alerts" (
  "id"                 TEXT NOT NULL PRIMARY KEY,
  "paymentId"          TEXT NOT NULL,
  "connectedAccountId" TEXT NOT NULL,
  "riskScore"          INTEGER NOT NULL,
  "severity"           TEXT NOT NULL,
  "flags"              TEXT NOT NULL,
  "status"             TEXT NOT NULL DEFAULT 'FLAGGED',
  "reviewedBy"         TEXT,
  "reviewedAt"         TIMESTAMPTZ,
  "notes"              TEXT,
  "createdAt"          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "fraud_alerts_paymentId_fkey"
    FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "fraud_alerts_connectedAccountId_fkey"
    FOREIGN KEY ("connectedAccountId") REFERENCES "connected_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "fraud_alerts_connectedAccountId_idx" ON "fraud_alerts" ("connectedAccountId");
CREATE INDEX IF NOT EXISTS "fraud_alerts_paymentId_idx"          ON "fraud_alerts" ("paymentId");
CREATE INDEX IF NOT EXISTS "fraud_alerts_severity_idx"           ON "fraud_alerts" ("severity");
CREATE INDEX IF NOT EXISTS "fraud_alerts_status_idx"             ON "fraud_alerts" ("status");
CREATE INDEX IF NOT EXISTS "fraud_alerts_createdAt_idx"          ON "fraud_alerts" ("createdAt");

-- 4. Tabla fraud_rules
CREATE TABLE IF NOT EXISTS "fraud_rules" (
  "id"                 TEXT NOT NULL PRIMARY KEY,
  "connectedAccountId" TEXT NOT NULL,
  "name"               TEXT NOT NULL,
  "ruleType"           TEXT NOT NULL,
  "params"             TEXT NOT NULL,
  "riskPoints"         INTEGER NOT NULL DEFAULT 20,
  "action"             TEXT NOT NULL DEFAULT 'FLAG',
  "isActive"           BOOLEAN NOT NULL DEFAULT true,
  "createdAt"          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "fraud_rules_connectedAccountId_fkey"
    FOREIGN KEY ("connectedAccountId") REFERENCES "connected_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "fraud_rules_connectedAccountId_idx" ON "fraud_rules" ("connectedAccountId");
CREATE INDEX IF NOT EXISTS "fraud_rules_isActive_idx"           ON "fraud_rules" ("isActive");
