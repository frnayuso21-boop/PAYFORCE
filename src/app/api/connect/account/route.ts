import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe }                    from "@/lib/stripe";
import { db }                        from "@/lib/db";
import { requireAuth, AuthError }    from "@/lib/auth";
import { resolveConnectStatus }      from "@/lib/connect";
import type { CreateAccountRequest, CreateAccountResponse, ApiError } from "@/types/stripe";

// ─── Logger (mismo patrón que webhook) ───────────────────────────────────────
const log = {
  info:  (event: string, data?: Record<string, unknown>) =>
    console.log(JSON.stringify({ level: "INFO",  event, ...data, ts: new Date().toISOString() })),
  error: (event: string, data?: Record<string, unknown>) =>
    console.error(JSON.stringify({ level: "ERROR", event, ...data, ts: new Date().toISOString() })),
};

// ─── Países soportados por Stripe Connect ──────────────────────────────────────
// https://stripe.com/docs/connect/custom-accounts#supported-countries
const SUPPORTED_COUNTRIES = new Set([
  "AT","BE","BG","CY","CZ","DE","DK","EE","ES","FI",
  "FR","GB","GR","HR","HU","IE","IT","LT","LU","LV",
  "MT","NL","PL","PT","RO","SE","SI","SK","US","CA",
  "AU","NZ","SG","HK","JP","MX","BR",
]);

// ─── Validación de input ──────────────────────────────────────────────────────
function validate(body: unknown): { data: CreateAccountRequest } | { error: string } {
  if (!body || typeof body !== "object") {
    return { error: "Request body must be a JSON object" };
  }

  const b = body as Record<string, unknown>;

  // email
  if (!b.email || typeof b.email !== "string") {
    return { error: "email is required and must be a string" };
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(b.email)) {
    return { error: "email format is invalid" };
  }

  // country (opcional, default ES)
  if (b.country !== undefined) {
    if (typeof b.country !== "string" || b.country.length !== 2) {
      return { error: "country must be a 2-letter ISO-3166 code (e.g. ES, DE, US)" };
    }
    if (!SUPPORTED_COUNTRIES.has(b.country.toUpperCase())) {
      return { error: `country "${b.country}" is not supported by Stripe Connect` };
    }
  }

  // businessType (opcional, default individual)
  if (b.businessType !== undefined && b.businessType !== "individual" && b.businessType !== "company") {
    return { error: 'businessType must be "individual" or "company"' };
  }

  return {
    data: {
      email:        b.email.trim().toLowerCase(),
      country:      (b.country as string | undefined)?.toUpperCase() ?? "ES",
      businessType: (b.businessType as "individual" | "company" | undefined) ?? "individual",
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/connect/account
//
// Crea una cuenta conectada Stripe con controller properties (enfoque moderno)
// y devuelve su accountId (acct_xxx).
//
// Modelo white-label con controller properties:
//   → controller.stripe_dashboard.type: "none"  — sin Express Dashboard para el merchant
//   → controller.fees.payer: "application"       — PayForce gestiona las tarifas
//   → controller.losses.payments: "application"  — PayForce asume las pérdidas
//   → Stripe gestiona KYC y compliance vía embedded Account Onboarding component
//   → Compatible con destination charges y application_fee_amount
//   → El merchant NUNCA sale de PayForce para onboarding ni gestión
// ═══════════════════════════════════════════════════════════════════════════════
export async function POST(req: NextRequest) {
  const startedAt = Date.now();

  // ── 0. Autenticación ──────────────────────────────────────────────────────────
  let userId: string;
  let sessionEmail: string | undefined;
  try {
    const session = await requireAuth(req);
    userId       = session.user.id;
    sessionEmail = session.user.email;   // email del usuario autenticado como fallback
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json<ApiError>({ error: err.message }, { status: err.status });
    }
    throw err;
  }

  // ── 1. Parsear body ───────────────────────────────────────────────────────────
  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    rawBody = {};
  }

  // ── 2. Rellenar email desde sesión si el body no lo trae ─────────────────────
  // Evita el error "email is required" cuando el frontend no lo envía
  const bodyObj = (rawBody && typeof rawBody === "object")
    ? rawBody as Record<string, unknown>
    : {};
  if (!bodyObj.email && sessionEmail) {
    bodyObj.email = sessionEmail;
  }

  // ── 3. Validar input ──────────────────────────────────────────────────────────
  const validation = validate(bodyObj);
  if ("error" in validation) {
    log.error("connect.account.validation_failed", { error: validation.error });
    return NextResponse.json<ApiError>({ error: validation.error }, { status: 422 });
  }

  const { email, country, businessType } = validation.data;

  log.info("connect.account.creating", { email, country, businessType });

  // ── 3. Idempotency key ────────────────────────────────────────────────────────
  // Incluye userId para evitar colisiones si dos usuarios distintos usan el mismo email.
  const idempotencyKey = `connect_account_${userId}_${email}_${country}`;

  // ── 4. Crear Express account en Stripe ───────────────────────────────────────
  let account: Stripe.Account;
  try {
    account = await stripe.accounts.create(
      {
        // White-label: controller properties (Stripe Connect moderno)
        // NO se usa type: "express" — el merchant nunca ve el Express Dashboard
        controller: {
          stripe_dashboard: { type: "none" },   // sin dashboard hosteado por Stripe
          fees:             { payer: "application" },
          losses:           { payments: "application" },
        },
        email,
        country,
        business_type: businessType,

        capabilities: {
          // card_payments: cobros con Visa, Mastercard, Amex, etc.
          card_payments: { requested: true },
          // transfers: recibir destination charges desde la plataforma
          transfers: { requested: true },
        },

        settings: {
          payouts: {
            // Liquidación automática semanal cada lunes
            schedule: {
              interval:      "weekly",
              weekly_anchor: "monday",
            },
          },
        },
      },
      { idempotencyKey }
    );
  } catch (err) {
    return handleStripeError(err, startedAt);
  }

  const duration = Date.now() - startedAt;
  log.info("connect.account.created", {
    accountId: account.id,
    email,
    country,
    businessType,
    durationMs: duration,
  });

  // ── 5. Persistir en BD ────────────────────────────────────────────────────────
  const status          = resolveConnectStatus(account);
  const businessName    = account.business_profile?.name ?? "";
  const defaultCurrency = (account.default_currency as string) ?? "eur";

  try {
    // Si el usuario tiene un placeholder local_ migrarlo al acct_xxx real
    // (para no duplicar registros ni romper las FKs existentes)
    const placeholder = await db.connectedAccount.findFirst({
      where: { userId, stripeAccountId: { startsWith: "local_" } },
    });

    if (placeholder) {
      await db.connectedAccount.update({
        where: { id: placeholder.id },
        data:  {
          stripeAccountId:  account.id,
          email,
          country,
          businessName,
          defaultCurrency,
          status,
          chargesEnabled:   account.charges_enabled ?? false,
          payoutsEnabled:   account.payouts_enabled ?? false,
          detailsSubmitted: account.details_submitted ?? false,
        },
      });
    } else {
      await db.connectedAccount.upsert({
        where:  { stripeAccountId: account.id },
        create: {
          stripeAccountId:  account.id,
          userId,
          email,
          country,
          businessName,
          defaultCurrency,
          status,
          chargesEnabled:   account.charges_enabled ?? false,
          payoutsEnabled:   account.payouts_enabled ?? false,
          detailsSubmitted: account.details_submitted ?? false,
        },
        update: {
          userId,
          email,
          country,
          businessName,
          defaultCurrency,
          status,
          chargesEnabled:   account.charges_enabled ?? false,
          payoutsEnabled:   account.payouts_enabled ?? false,
          detailsSubmitted: account.details_submitted ?? false,
        },
      });
    }
  } catch (dbErr) {
    log.error("connect.account.db_error", { error: String(dbErr) });
    // No bloqueamos: el accountId ya existe en Stripe; el webhook lo sincronizará.
  }

  // ── 6. Respuesta ──────────────────────────────────────────────────────────────
  return NextResponse.json<CreateAccountResponse>(
    { accountId: account.id },
    { status: 201 }
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/connect/account
//
// Devuelve la(s) ConnectedAccount(s) del usuario autenticado.
// Responde con { accounts: ConnectedAccount[] } — normalmente 1 cuenta por usuario.
// ═══════════════════════════════════════════════════════════════════════════════
export async function GET(req: NextRequest) {
  try {
    const { user } = await requireAuth(req);

    const accounts = await db.connectedAccount.findMany({
      where:   { userId: user.id },
      orderBy: { createdAt: "asc" },
      select: {
        id:               true,
        stripeAccountId:  true,
        businessName:     true,
        email:            true,
        country:          true,
        defaultCurrency:  true,
        status:           true,
        chargesEnabled:   true,
        payoutsEnabled:   true,
        detailsSubmitted: true,
        payoutSchedule:   true,
        createdAt:        true,
        updatedAt:        true,
      },
    });

    return NextResponse.json({ accounts });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// ─── Manejo de errores de Stripe ──────────────────────────────────────────────
// Stripe diferencia varios tipos de error. Traducimos cada uno a un status HTTP
// y un mensaje legible para el cliente.
function handleStripeError(err: unknown, startedAt: number): NextResponse {
  const duration = Date.now() - startedAt;

  if (err instanceof Stripe.errors.StripeInvalidRequestError) {
    // Datos inválidos enviados a Stripe (ej. país no soportado, email duplicado)
    log.error("connect.account.stripe_invalid_request", {
      code:      err.code,
      param:     err.param,
      message:   err.message,
      durationMs: duration,
    });
    return NextResponse.json<ApiError>(
      { error: err.message, code: err.code ?? undefined },
      { status: 422 }
    );
  }

  if (err instanceof Stripe.errors.StripeAuthenticationError) {
    // STRIPE_SECRET_KEY incorrecta o revocada
    log.error("connect.account.stripe_auth_error", { message: err.message, durationMs: duration });
    return NextResponse.json<ApiError>(
      { error: "Stripe authentication failed. Check STRIPE_SECRET_KEY." },
      { status: 500 }
    );
  }

  if (err instanceof Stripe.errors.StripeConnectionError) {
    // Timeout o error de red hacia la API de Stripe
    log.error("connect.account.stripe_connection_error", { message: err.message, durationMs: duration });
    return NextResponse.json<ApiError>(
      { error: "Could not connect to Stripe. Please try again." },
      { status: 503 }
    );
  }

  if (err instanceof Stripe.errors.StripeRateLimitError) {
    log.error("connect.account.stripe_rate_limit", { message: err.message, durationMs: duration });
    return NextResponse.json<ApiError>(
      { error: "Too many requests to Stripe. Please retry in a few seconds." },
      { status: 429 }
    );
  }

  // Error genérico no esperado
  const message = err instanceof Error ? err.message : "Internal server error";
  log.error("connect.account.unexpected_error", { error: message, durationMs: duration });
  return NextResponse.json<ApiError>({ error: "Internal server error" }, { status: 500 });
}
