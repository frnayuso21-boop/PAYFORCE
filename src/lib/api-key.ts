/**
 * src/lib/api-key.ts
 *
 * Utilidades para generar, hashear y verificar API Keys de PayForce.
 *
 * Formato: pf_live_<32 hex chars>   → 40 chars totales
 * Almacenado: SHA-256 del token completo (keyHash) + primeros 20 chars (keyPrefix)
 * El token completo NUNCA se guarda en BD — solo se devuelve una vez al crear la key.
 */

import { createHash, randomBytes } from "crypto";

const KEY_PREFIX_DISPLAY = 20; // chars del token que se muestran en UI para identificarlo

/** Genera un token de API en formato pf_live_<hex32> */
export function generateApiToken(): string {
  return `pf_live_${randomBytes(16).toString("hex")}`;
}

/** SHA-256 del token completo */
export function hashApiToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Prefijo visible para la UI (ej. "pf_live_a3b4c5d6e7f8…") */
export function getKeyPrefix(token: string): string {
  return token.slice(0, KEY_PREFIX_DISPLAY) + "…";
}

/** Verifica si un token en claro coincide con el hash almacenado */
export function verifyApiToken(token: string, storedHash: string): boolean {
  const hash = hashApiToken(token);
  // Comparación en tiempo constante para evitar timing attacks
  if (hash.length !== storedHash.length) return false;
  let diff = 0;
  for (let i = 0; i < hash.length; i++) {
    diff |= hash.charCodeAt(i) ^ storedHash.charCodeAt(i);
  }
  return diff === 0;
}
