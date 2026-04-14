/**
 * Validación centralizada de variables de entorno.
 *
 * Importar en cualquier módulo crítico que necesite garantizar
 * que el entorno está bien configurado antes de arrancar.
 *
 * Uso:
 *   import "@/lib/env";          // solo valida, no exporta nada
 *   import { env } from "@/lib/env"; // accede a vars ya validadas
 */

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.startsWith("REEMPLAZA") || value.includes("TU_PROYECTO")) {
    const isProduction = process.env.NODE_ENV === "production";
    const msg = `[env] Variable de entorno requerida no configurada: ${name}`;
    if (isProduction) {
      throw new Error(msg);
    } else {
      console.warn(`\x1b[33m${msg}\x1b[0m`);
      return "";
    }
  }
  return value;
}

function requiredInProduction(name: string): string {
  const value = process.env[name];
  if (!value && process.env.NODE_ENV === "production") {
    throw new Error(`[env] Variable de entorno requerida en producción no configurada: ${name}`);
  }
  if (!value) {
    console.warn(`\x1b[33m[env] ${name} no configurada — funcionalidad limitada en local\x1b[0m`);
    return "";
  }
  return value;
}

export const env = {
  // ── App ────────────────────────────────────────────────────────────────────
  APP_URL:                    required("NEXT_PUBLIC_APP_URL"),

  // ── Stripe ─────────────────────────────────────────────────────────────────
  STRIPE_SECRET_KEY:          required("STRIPE_SECRET_KEY"),
  STRIPE_PUBLISHABLE_KEY:     required("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"),
  STRIPE_WEBHOOK_SECRET:      requiredInProduction("STRIPE_WEBHOOK_SECRET"),

  // ── Base de datos ──────────────────────────────────────────────────────────
  DATABASE_URL:               required("DATABASE_URL"),

  // ── Supabase ───────────────────────────────────────────────────────────────
  SUPABASE_URL:               required("NEXT_PUBLIC_SUPABASE_URL"),
  SUPABASE_ANON_KEY:          required("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
} as const;
