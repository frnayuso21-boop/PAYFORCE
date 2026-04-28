-- AlterTable: PayForce 2FA + security fields
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "twoFactorEnabled"       BOOLEAN   NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "twoFactorSecret"        TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "twoFactorPendingSecret" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "twoFactorVerifiedAt"    TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "twoFactorBackupCodes"   TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "lastLoginAt"            TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "lastLoginIp"            TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "loginAttempts"          INTEGER   NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "lockedUntil"            TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "recentLoginIps"         TEXT      NOT NULL DEFAULT '[]';
