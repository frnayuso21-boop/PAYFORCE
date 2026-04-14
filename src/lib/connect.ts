/**
 * Utilidades compartidas para Stripe Connect.
 * Usado por connect/account, webhook y páginas /app/connect.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * EMAILS QUE STRIPE ENVÍA A LOS MERCHANTS (Express accounts)
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * ✅ EVITABLES (se pueden suprimir o controlar):
 *   · Email de bienvenida al crear la cuenta         → No se puede suprimir.
 *     Stripe lo envía siempre desde noreply@stripe.com.
 *     Workaround: usar un email genérico tuyo al crear la cuenta y luego
 *     el merchant actualiza su email en el dashboard.
 *
 *   · Notificaciones de payout recibido              → Se pueden desactivar
 *     desde el Stripe Dashboard de la cuenta Express:
 *     Express settings → Notification preferences → desactivar "Payouts".
 *     Con Custom accounts se podrían controlar programáticamente.
 *
 *   · Alertas de requisitos pendientes               → No se pueden suprimir.
 *     Stripe las envía para cumplir PSD2/KYC. Son emails de compliance.
 *
 * ❌ NO EVITABLES (requeridos por regulación):
 *   · Email de verificación de identidad (KYC)       → Requerido por ley.
 *   · Alertas de cuenta deshabilitada                → Requerido por ley.
 *   · Disputas y chargebacks                         → Requerido.
 *   · Cambios de contraseña del dashboard Express    → Requerido.
 *
 * 📌 LIMITACIÓN IMPORTANTE:
 *   Con Express accounts, el merchant SIEMPRE recibirá al menos:
 *     1. El email de bienvenida al crear su cuenta
 *     2. Emails de compliance/KYC si hay requisitos
 *   Para eliminar TODOS los emails de Stripe al merchant, se necesitan
 *   Custom accounts (mucho más complejo, requiere más compliance propio).
 *
 * 💡 RECOMENDACIÓN PARA WHITE-LABEL:
 *   · Usa branded emails en Stripe Dashboard (Settings → Branding → Email)
 *   · Configura un dominio propio para los emails de Stripe
 *   · Informa al merchant que recibirá "emails de verificación de cobros"
 *     sin mencionar Stripe explícitamente en tu UI
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type Stripe from "stripe";

export type ConnectStatus = "NOT_CONNECTED" | "PENDING" | "REQUIRES_ACTION" | "RESTRICTED" | "ENABLED" | "REJECTED";

/** Deriva el estado de la cuenta desde la respuesta de Stripe. */
export function resolveConnectStatus(account: Stripe.Account): ConnectStatus {
  if (!account.details_submitted) return "PENDING";
  if (account.charges_enabled && account.payouts_enabled) return "ENABLED";
  if (account.requirements?.disabled_reason) return "REJECTED";
  // Hay requisitos pendientes bloqueantes pero el onboarding fue completado
  if ((account.requirements?.currently_due?.length ?? 0) > 0) return "REQUIRES_ACTION";
  return "RESTRICTED";
}

/** Traduce requisitos técnicos de Stripe a español legible. */
const REQUIREMENT_LABELS: Record<string, string> = {
  external_account:                  "Cuenta bancaria (IBAN)",
  "individual.id_number":            "Número de identificación (DNI/NIE)",
  "individual.dob.day":              "Fecha de nacimiento",
  "individual.dob.month":            "Fecha de nacimiento",
  "individual.dob.year":             "Fecha de nacimiento",
  "individual.first_name":           "Nombre",
  "individual.last_name":            "Apellidos",
  "individual.address.line1":        "Dirección personal",
  "individual.address.city":         "Ciudad",
  "individual.address.postal_code":  "Código postal",
  "business_profile.url":            "URL del sitio web",
  "business_profile.mcc":             "Categoría de negocio",
};

export function formatRequirements(reqs: string[]): string[] {
  const translated = reqs.map((r) => {
    if (REQUIREMENT_LABELS[r]) return REQUIREMENT_LABELS[r];
    if (r.startsWith("company.")) return "Información de empresa";
    if (r.startsWith("person_")) return "Información del representante legal";
    if (r.startsWith("individual.")) return "Información personal";
    return r;
  });
  return [...new Set(translated)];
}
