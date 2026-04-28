/**
 * Cifrado AES-256-GCM para secretos TOTP en reposo.
 * Clave derivada de PAYFORCE_2FA_ENCRYPTION_KEY (cualquier longitud → SHA-256).
 */
import crypto from "crypto";

const ALGO = "aes-256-gcm";

function deriveKey(): Buffer {
  const raw = process.env.PAYFORCE_2FA_ENCRYPTION_KEY;
  if (!raw?.trim()) {
    throw new Error("PAYFORCE_2FA_ENCRYPTION_KEY no está configurada");
  }
  return crypto.createHash("sha256").update(raw, "utf8").digest();
}

export function encryptTotpSecret(plain: string): string {
  const key = deriveKey();
  const iv  = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64url");
}

export function decryptTotpSecret(payload: string): string {
  const key = deriveKey();
  const buf = Buffer.from(payload, "base64url");
  const iv  = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const enc = buf.subarray(28);
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
}
