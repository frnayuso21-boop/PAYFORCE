// ──────────────────────────────────────────────────────────────────────────────
// PayForce — TypeScript types
//
// Espejo exacto del schema Prisma (prisma/schema.prisma).
// Convenciones:
//   · Enums: SCREAMING_SNAKE_CASE (igual que Prisma) — no usar strings literales
//   · Importes: number (Int en DB = céntimos)
//   · Fechas: Date (en runtime) — string ISO en JSON/mock
//   · Tipos *Row: forma que devuelve la DB (incluye timestamps)
//   · Tipos *Input: payload para crear/actualizar (sin id, sin timestamps)
// ──────────────────────────────────────────────────────────────────────────────

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  ENUMS                                                                       ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

export type UserRole = "ADMIN" | "MERCHANT" | "VIEWER";

export type AccountStatus =
  | "NOT_CONNECTED"
  | "PENDING"
  | "RESTRICTED"
  | "ENABLED"
  | "REJECTED";

export type PayoutSchedule = "DAILY" | "WEEKLY" | "MONTHLY" | "MANUAL";

export type PaymentStatus =
  | "REQUIRES_PAYMENT_METHOD"
  | "REQUIRES_CONFIRMATION"
  | "REQUIRES_ACTION"
  | "PROCESSING"
  | "SUCCEEDED"
  | "FAILED"
  | "CANCELED";

export type PayoutStatus =
  | "PENDING"
  | "IN_TRANSIT"
  | "PAID"
  | "FAILED"
  | "CANCELED";

export type PayoutMethod = "STANDARD" | "INSTANT";

export type DisputeStatus =
  | "NEEDS_RESPONSE"
  | "UNDER_REVIEW"
  | "WARNING_NEEDS_RESPONSE"
  | "WARNING_UNDER_REVIEW"
  | "WARNING_CLOSED"
  | "WON"
  | "LOST"
  | "CHARGE_REFUNDED";

export type WebhookEventStatus = "PROCESSED" | "FAILED" | "SKIPPED";

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  USER                                                                        ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl?: string | null;
  createdAt: string; // ISO date
  updatedAt: string;
  deletedAt?: string | null;
  // passwordHash omitido — nunca exponer al cliente
}

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  CONNECTED ACCOUNT                                                           ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

export interface ConnectedAccount {
  id: string;
  userId: string;
  stripeAccountId: string;    // acct_xxx
  businessName: string;
  email: string;
  country: string;            // ISO-3166 alpha-2
  defaultCurrency: string;    // ISO-4217
  status: AccountStatus;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  payoutSchedule: PayoutSchedule;
  stripeMetadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

// ── Tipo simplificado para el mock y componentes de UI ──────────────────────
// Usa "currency" (no "defaultCurrency") y status en minúsculas para
// alinearse con la respuesta de la API de Stripe (account.default_currency).
export interface ConnectAccount {
  id:               string;
  stripeAccountId:  string;
  businessName:     string;
  email:            string;
  country:          string;
  currency:         string;
  status:           "enabled" | "pending" | "restricted" | "rejected" | "not_connected";
  chargesEnabled:   boolean;
  payoutsEnabled:   boolean;
  detailsSubmitted: boolean;
  createdAt:        string;
  updatedAt?:       string;
}

// ── Backward-compat aliases ──────────────────────────────────────────────────
export type ConnectAccountStatus = AccountStatus;

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  CUSTOMER                                                                    ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

export interface Customer {
  id: string;
  stripeCustomerId: string;   // cus_xxx
  connectedAccountId: string;
  name: string;
  email: string;
  phone?: string | null;
  currency: string;
  totalSpend: number;         // Céntimos — desnormalizado
  createdAt: string;
  updatedAt: string;
}

export type CustomerStatus = "active" | "inactive" | "blocked";

// ── Campos de UI (no en DB) ──────────────────────────────────────────────────
export interface CustomerWithUI extends Customer {
  avatar?: string;
  status: CustomerStatus;
  subscriptionPlan?: "starter" | "pro" | "enterprise";
}

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  PAYMENT                                                                     ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

export interface Payment {
  id: string;
  stripePaymentIntentId: string;  // pi_xxx
  stripeChargeId?: string | null; // ch_xxx
  connectedAccountId: string;
  customerId?: string | null;
  amount: number;                 // Céntimos
  currency: string;
  applicationFeeAmount: number;   // Céntimos — comisión de plataforma
  netAmount: number;              // Céntimos — tras fees
  status: PaymentStatus;
  description?: string | null;
  refundedAmount: number;         // Céntimos acumulados
  metadata?: Record<string, string> | null;
  failureCode?: string | null;
  failureMessage?: string | null;
  createdAt: string;
  updatedAt: string;
  capturedAt?: string | null;
}

// ── Alias semántico para tablas del dashboard ────────────────────────────────
export type Transaction = Payment & {
  customerName?: string; // JOIN desde Customer
};

// ── Tipos de transacción para UI (no en DB) ──────────────────────────────────
export type TransactionStatus = "succeeded" | "pending" | "failed" | "refunded";
export type TransactionType = "charge" | "refund" | "payout" | "transfer";

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  PAYOUT                                                                      ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

export interface Payout {
  id: string;
  stripePayoutId: string;     // po_xxx
  connectedAccountId: string;
  amount: number;             // Céntimos
  currency: string;
  status: PayoutStatus;
  method: PayoutMethod;
  arrivalDate: string;        // ISO date — puede ser futura
  description?: string | null;
  failureCode?: string | null;
  failureMessage?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  DISPUTE                                                                     ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

export interface Dispute {
  id: string;
  stripeDisputeId: string;    // dp_xxx
  paymentId: string;
  connectedAccountId: string;
  amount: number;             // Céntimos
  currency: string;
  status: DisputeStatus;
  reason: string;             // fraudulent | duplicate | product_not_received | …
  evidenceDueBy?: string | null;       // ISO date — deadline para responder
  evidenceSubmittedAt?: string | null; // ISO date — null si no enviada
  createdAt: string;
  updatedAt: string;
}

// ── Con datos del pago relacionado (JOIN) ────────────────────────────────────
export interface DisputeWithPayment extends Dispute {
  customerName?: string;
  paymentAmount?: number;
}

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  WEBHOOK EVENT                                                               ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

export interface WebhookEvent {
  id: string;               // evt_xxx — PK = idempotencia garantizada
  type: string;
  status: WebhookEventStatus;
  processedAt: string;
  error?: string | null;
}

// ─── Navigation ──────────────────────────────────────────────────────────────

export interface NavItem {
  label: string;
  href: string;
  icon: string;
  badge?: number;
}
