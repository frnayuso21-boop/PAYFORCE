-- Migration: add_instant_payout_fields
-- Ejecutar en Supabase SQL Editor si la migración automática falla

ALTER TABLE connected_accounts 
ADD COLUMN IF NOT EXISTS "instantPayoutsEnabled" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE connected_accounts 
ADD COLUMN IF NOT EXISTS "debitCardLast4" TEXT;

ALTER TABLE connected_accounts 
ADD COLUMN IF NOT EXISTS "debitCardBrand" TEXT;
