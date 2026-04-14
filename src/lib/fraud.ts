/**
 * src/lib/fraud.ts
 *
 * Titan 1.4.1 — Motor de Detección de Fraude de PayForce
 *
 * Calcula una puntuación de riesgo (0–100) para cada pago basándose en
 * 10+ señales comportamentales y de contexto.
 *
 * Arquitectura:
 *   1. Cada señal ("checker") devuelve { points, flag } si se dispara, o null.
 *   2. Los puntos se acumulan (cap 100).
 *   3. La severidad se asigna según umbrales.
 *   4. Si el score supera el umbral de bloqueo (o hay una regla BLOCK activa),
 *      el pago se marca como riskBlocked = true.
 *
 * Umbrales por defecto:
 *   0–20   LOW      → informativo
 *   21–50  MEDIUM   → marcar para revisión
 *   51–79  HIGH     → requiere acción
 *   80–100 CRITICAL → bloqueo automático
 */

import { db } from "@/lib/db";

// ─── Tipos públicos ────────────────────────────────────────────────────────────

export type RiskSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface RiskFlag {
  code:        string;   // p.ej. "HIGH_AMOUNT"
  label:       string;   // texto legible en ES
  points:      number;   // puntos que añade esta señal
  detail?:     string;   // detalle opcional (ej: país, importe)
}

export interface FraudScore {
  score:       number;        // 0–100
  severity:    RiskSeverity;
  flags:       RiskFlag[];
  blocked:     boolean;
}

// ─── Configuración ────────────────────────────────────────────────────────────

export const SEVERITY_THRESHOLDS = {
  LOW:      { min:  0, max: 20 },
  MEDIUM:   { min: 21, max: 50 },
  HIGH:     { min: 51, max: 79 },
  CRITICAL: { min: 80, max: 100 },
} as const;

// Puntuación a partir de la cual se bloquea automáticamente
const AUTO_BLOCK_THRESHOLD = 80;

// Países de alto riesgo (ISO 3166-1 alpha-2)
const HIGH_RISK_COUNTRIES = new Set([
  "NG", "GH", "KE", "PK", "BD", "VN", "ID", "PH", "UA", "RU", "BY",
  "IR", "IQ", "AF", "LY", "SY", "YE", "SO", "SD", "ZW",
]);

// Dominios de email desechables más comunes
const DISPOSABLE_EMAIL_DOMAINS = new Set([
  "mailinator.com", "guerrillamail.com", "tempmail.com", "throwam.com",
  "yopmail.com", "sharklasers.com", "guerrillamailblock.com", "grr.la",
  "guerrillamail.info", "guerrillamail.biz", "guerrillamail.de",
  "guerrillamail.net", "guerrillamail.org", "spam4.me", "trashmail.at",
  "trashmail.io", "trashmail.me", "trashmail.xyz", "dispostable.com",
  "mailnesia.com", "maildrop.cc", "fakeinbox.com", "tmpmail.net",
  "0-mail.com", "10minutemail.com", "20minutemail.com",
]);

// ─── Señales de riesgo ────────────────────────────────────────────────────────

/** 1. Importe alto */
function checkHighAmount(amount: number): RiskFlag | null {
  if (amount >= 300_000) { // ≥ 3.000 €
    return { code: "HIGH_AMOUNT_CRITICAL", label: "Importe muy elevado (≥3.000€)", points: 30,
      detail: `${(amount / 100).toFixed(2)} €` };
  }
  if (amount >= 100_000) { // ≥ 1.000 €
    return { code: "HIGH_AMOUNT", label: "Importe elevado (≥1.000€)", points: 15,
      detail: `${(amount / 100).toFixed(2)} €` };
  }
  return null;
}

/** 2. Importe redondo sospechoso (solo cifras redondas > 100€) */
function checkRoundAmount(amount: number): RiskFlag | null {
  if (amount < 10_000) return null;
  // Múltiplos exactos de 10.000 (100€), 50.000 (500€), etc.
  if (amount % 10_000 === 0) {
    return { code: "ROUND_AMOUNT", label: "Importe redondo exacto (patrón de fraude)", points: 8,
      detail: `${(amount / 100).toFixed(2)} €` };
  }
  return null;
}

/** 3. Hora nocturna (00:00–05:59 UTC) */
function checkNightTime(date: Date): RiskFlag | null {
  const h = date.getUTCHours();
  if (h >= 0 && h < 6) {
    return { code: "NIGHT_PAYMENT", label: "Pago en horario nocturno (00–06h UTC)", points: 12,
      detail: `${String(h).padStart(2, "0")}:${String(date.getUTCMinutes()).padStart(2, "0")} UTC` };
  }
  return null;
}

/** 4. País de alto riesgo */
function checkHighRiskCountry(country: string | null | undefined): RiskFlag | null {
  if (!country) return null;
  const code = country.toUpperCase();
  if (HIGH_RISK_COUNTRIES.has(code)) {
    return { code: "HIGH_RISK_COUNTRY", label: "País de alto riesgo", points: 20,
      detail: code };
  }
  return null;
}

/** 5. Email desechable */
function checkDisposableEmail(email: string | null | undefined): RiskFlag | null {
  if (!email) return null;
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  if (DISPOSABLE_EMAIL_DOMAINS.has(domain)) {
    return { code: "DISPOSABLE_EMAIL", label: "Email desechable / temporal", points: 25,
      detail: domain };
  }
  return null;
}

/** 6. Sin descripción en importe alto */
function checkNoDescription(amount: number, description: string | null | undefined): RiskFlag | null {
  if (amount >= 50_000 && !description) {
    return { code: "NO_DESCRIPTION", label: "Pago elevado sin descripción", points: 8 };
  }
  return null;
}

/** 7. Múltiples intentos fallidos antes de este pago (busca en BD) */
async function checkPriorFailures(
  connectedAccountId: string,
  customerEmail:      string | null | undefined,
  windowMs:           number = 30 * 60 * 1000, // 30 min
): Promise<RiskFlag | null> {
  if (!customerEmail) return null;
  const since = new Date(Date.now() - windowMs);
  const fails = await db.payment.count({
    where: {
      connectedAccountId,
      customerEmail:    { equals: customerEmail, mode: "insensitive" },
      status:           { in: ["FAILED", "CANCELED", "REQUIRES_PAYMENT_METHOD"] },
      createdAt:        { gte: since },
    },
  });
  if (fails >= 3) {
    return { code: "PRIOR_FAILURES_HIGH", label: "Múltiples intentos fallidos recientes", points: 30,
      detail: `${fails} intentos en últimos 30 min` };
  }
  if (fails >= 1) {
    return { code: "PRIOR_FAILURES", label: "Intentos fallidos recientes", points: 12,
      detail: `${fails} intento${fails > 1 ? "s" : ""} fallido${fails > 1 ? "s" : ""}` };
  }
  return null;
}

/** 8. Velocidad: mismo email, múltiples pagos en ventana corta */
async function checkVelocityEmail(
  connectedAccountId: string,
  customerEmail:      string | null | undefined,
  currentAmount:      number,
  windowMs:           number = 60 * 60 * 1000, // 1h
): Promise<RiskFlag | null> {
  if (!customerEmail) return null;
  const since = new Date(Date.now() - windowMs);
  const count = await db.payment.count({
    where: {
      connectedAccountId,
      customerEmail: { equals: customerEmail, mode: "insensitive" },
      status:        { in: ["SUCCEEDED", "PROCESSING", "REQUIRES_ACTION"] },
      createdAt:     { gte: since },
    },
  });
  if (count >= 5) {
    return { code: "VELOCITY_EMAIL_HIGH", label: "Alta velocidad de pagos por email", points: 25,
      detail: `${count} pagos del mismo email en 1h` };
  }
  if (count >= 2) {
    return { code: "VELOCITY_EMAIL", label: "Múltiples pagos del mismo email", points: 10,
      detail: `${count} pagos en la última hora` };
  }
  return null;
}

/** 9. Pago exactamente duplicado (mismo importe + email en < 5 min) */
async function checkDuplicatePayment(
  connectedAccountId: string,
  amount:             number,
  customerEmail:      string | null | undefined,
): Promise<RiskFlag | null> {
  if (!customerEmail) return null;
  const since = new Date(Date.now() - 5 * 60 * 1000);
  const dup = await db.payment.count({
    where: {
      connectedAccountId,
      amount,
      customerEmail: { equals: customerEmail, mode: "insensitive" },
      createdAt:     { gte: since },
    },
  });
  if (dup > 0) {
    return { code: "DUPLICATE_PAYMENT", label: "Pago duplicado detectado (mismo importe y email, <5 min)", points: 35 };
  }
  return null;
}

/** 10. Sin email del cliente en importe elevado */
function checkAnonymousHighValue(amount: number, email: string | null | undefined): RiskFlag | null {
  if (amount >= 50_000 && !email) {
    return { code: "ANONYMOUS_HIGH_VALUE", label: "Pago elevado sin identificar cliente", points: 10 };
  }
  return null;
}

// ─── Función principal de scoring ─────────────────────────────────────────────

export interface FraudInput {
  amount:             number;
  currency:           string;
  description?:       string | null;
  customerEmail?:     string | null;
  customerName?:      string | null;
  customerCountry?:   string | null;
  connectedAccountId: string;
  createdAt?:         Date;
}

export function getSeverity(score: number): RiskSeverity {
  if (score >= SEVERITY_THRESHOLDS.CRITICAL.min) return "CRITICAL";
  if (score >= SEVERITY_THRESHOLDS.HIGH.min)     return "HIGH";
  if (score >= SEVERITY_THRESHOLDS.MEDIUM.min)   return "MEDIUM";
  return "LOW";
}

export async function evaluateFraud(input: FraudInput): Promise<FraudScore> {
  const {
    amount, description, customerEmail,
    customerCountry, connectedAccountId,
    createdAt = new Date(),
  } = input;

  // ── Ejecutar todas las señales en paralelo donde sea posible ──────────────
  const [
    priorFailuresFlag,
    velocityEmailFlag,
    duplicateFlag,
  ] = await Promise.all([
    checkPriorFailures(connectedAccountId, customerEmail),
    checkVelocityEmail(connectedAccountId, customerEmail, amount),
    checkDuplicatePayment(connectedAccountId, amount, customerEmail),
  ]);

  // Señales síncronas
  const syncFlags: (RiskFlag | null)[] = [
    checkHighAmount(amount),
    checkRoundAmount(amount),
    checkNightTime(createdAt),
    checkHighRiskCountry(customerCountry),
    checkDisposableEmail(customerEmail),
    checkNoDescription(amount, description),
    checkAnonymousHighValue(amount, customerEmail),
  ];

  const allFlags: RiskFlag[] = [
    ...syncFlags,
    priorFailuresFlag,
    velocityEmailFlag,
    duplicateFlag,
  ].filter((f): f is RiskFlag => f !== null);

  // ── Sumar puntos ──────────────────────────────────────────────────────────
  const rawScore = allFlags.reduce((sum, f) => sum + f.points, 0);
  const score    = Math.min(100, rawScore);
  const severity = getSeverity(score);
  const blocked  = score >= AUTO_BLOCK_THRESHOLD;

  return { score, severity, flags: allFlags, blocked };
}

// ─── Persistir resultado en BD ────────────────────────────────────────────────

export async function persistFraudScore(
  paymentId:          string,
  connectedAccountId: string,
  result:             FraudScore,
): Promise<void> {
  const flagsJson = JSON.stringify(result.flags);

  await db.payment.update({
    where: { id: paymentId },
    data:  {
      riskScore:   result.score,
      riskFlags:   flagsJson,
      riskBlocked: result.blocked,
    },
  });

  // Solo crear alerta si el riesgo es MEDIUM o superior
  if (result.severity !== "LOW") {
    await db.fraudAlert.create({
      data: {
        paymentId,
        connectedAccountId,
        riskScore: result.score,
        severity:  result.severity,
        flags:     flagsJson,
        status:    result.blocked ? "BLOCKED" : "FLAGGED",
      },
    });
  }
}
